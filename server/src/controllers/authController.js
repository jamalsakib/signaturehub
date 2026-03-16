const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { getAuthCodeUrl, acquireTokenByCode } = require('../config/msal');
const { Client } = require('@microsoft/microsoft-graph-client');
const User = require('../models/User');
const { cacheSet, cacheDel } = require('../config/redis');
const logger = require('../utils/logger');

function signTokens(userId) {
  const accessToken = jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  });
  const refreshToken = jwt.sign({ userId, type: 'refresh' }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  });
  return { accessToken, refreshToken };
}

// GET /api/auth/login
async function login(req, res, next) {
  try {
    const state = uuidv4();
    await cacheSet(`oauth_state:${state}`, true, 600);
    const url = await getAuthCodeUrl(state);
    res.json({ loginUrl: url });
  } catch (err) {
    next(err);
  }
}

// GET /api/auth/callback
async function callback(req, res, next) {
  try {
    const { code, error, error_description } = req.query;
    if (error) return res.status(400).json({ error: error_description || error });
    if (!code) return res.status(400).json({ error: 'Missing auth code' });

    const tokenResult = await acquireTokenByCode(code);
    const { accessToken: msAccessToken } = tokenResult;

    const graphClient = Client.init({ authProvider: (done) => done(null, msAccessToken) });
    const graphUser = await graphClient
      .api('/me')
      .select('id,displayName,givenName,surname,mail,userPrincipalName,jobTitle,department,companyName,officeLocation,mobilePhone,businessPhones')
      .get();

    const email = (graphUser.mail || graphUser.userPrincipalName || '').toLowerCase();
    if (!email) return res.status(400).json({ error: 'Could not determine user email' });

    const update = {
      displayName: graphUser.displayName || '',
      firstName: graphUser.givenName || '',
      lastName: graphUser.surname || '',
      jobTitle: graphUser.jobTitle || '',
      department: graphUser.department || '',
      company: graphUser.companyName || '',
      officeLocation: graphUser.officeLocation || '',
      mobilePhone: graphUser.mobilePhone || '',
      businessPhone: (graphUser.businessPhones || [])[0] || '',
      userPrincipalName: graphUser.userPrincipalName || '',
      isActive: true,
      lastLoginAt: new Date(),
      lastSyncedAt: new Date(),
    };

    const user = await User.findOneAndUpdate(
      { azureId: graphUser.id },
      { $set: update, $setOnInsert: { azureId: graphUser.id, email } },
      { upsert: true, new: true, runValidators: true }
    );

    const tokens = signTokens(user._id.toString());
    await cacheSet(`refresh:${user._id}`, tokens.refreshToken, 60 * 60 * 24 * 7);

    logger.info(`User logged in: ${email}`);
    // Redirect to frontend with tokens in URL hash (SPA auth flow)
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
    const params = new URLSearchParams({
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
    });
    res.redirect(302, `${clientUrl}/auth/callback#${params.toString()}`);
  } catch (err) {
    next(err);
  }
}

// POST /api/auth/refresh
async function refresh(req, res, next) {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ error: 'Refresh token required' });

    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
    if (decoded.type !== 'refresh') return res.status(401).json({ error: 'Invalid token type' });

    const user = await User.findById(decoded.userId).lean();
    if (!user || !user.isActive) return res.status(401).json({ error: 'User inactive' });

    const tokens = signTokens(user._id.toString());
    await cacheSet(`refresh:${user._id}`, tokens.refreshToken, 60 * 60 * 24 * 7);
    res.json(tokens);
  } catch (err) {
    next(err);
  }
}

// POST /api/auth/logout
async function logout(req, res, next) {
  try {
    if (req.user) {
      await cacheDel(`refresh:${req.user._id}`);
      await cacheDel(`user:${req.user._id}`);
    }
    res.json({ message: 'Logged out' });
  } catch (err) {
    next(err);
  }
}

// GET /api/auth/me  (requires authenticate middleware on the route)
async function me(req, res) {
  res.json(req.user);
}

// POST /api/auth/dev-login  — local/admin login (no Azure required)
async function devLogin(req, res, next) {
  try {
    const { email = 'admin@signaturehub.local', password, role = 'admin' } = req.body;

    // In production, require a matching ADMIN_PASSWORD env var
    if (process.env.NODE_ENV !== 'development') {
      const adminPassword = process.env.ADMIN_PASSWORD;
      if (!adminPassword || password !== adminPassword) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
    }

    const normalizedEmail = email.toLowerCase();
    const azureId = `local-${normalizedEmail.replace(/[^a-z0-9]/gi, '-')}`;

    const user = await User.findOneAndUpdate(
      { email: normalizedEmail },
      {
        $set: {
          displayName: normalizedEmail.split('@')[0],
          firstName: normalizedEmail.split('@')[0],
          lastName: '',
          jobTitle: 'Administrator',
          department: 'Administration',
          company: 'SignatureHub',
          role,
          isActive: true,
          lastLoginAt: new Date(),
        },
        $setOnInsert: { azureId, email: normalizedEmail },
      },
      { upsert: true, new: true, runValidators: false }
    );

    const tokens = signTokens(user._id.toString());
    logger.info(`Local login: ${normalizedEmail}`);
    res.json({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: { id: user._id, email: user.email, role: user.role, displayName: user.displayName },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { login, callback, refresh, logout, me, devLogin };
