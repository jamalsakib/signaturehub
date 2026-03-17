const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { getAuthCodeUrl, acquireTokenByCode, generatePkceCodes, acquireTokenClientCredentials } = require('../config/msal');
const { Client } = require('@microsoft/microsoft-graph-client');
const User = require('../models/User');
const { cacheSet, cacheGet, cacheDel } = require('../config/redis');

// In-memory PKCE store — fallback when Redis is unavailable
const pkceStore = new Map();
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
    const { verifier, challenge } = generatePkceCodes();

    // Store verifier in Redis + in-memory fallback (needed at callback time)
    await cacheSet(`pkce:${state}`, verifier, 600);
    pkceStore.set(state, verifier);
    setTimeout(() => pkceStore.delete(state), 600_000);

    const url = await getAuthCodeUrl(state, challenge);
    res.json({ loginUrl: url });
  } catch (err) {
    next(err);
  }
}

// GET /api/auth/callback
async function callback(req, res, next) {
  try {
    const { code, state, error, error_description } = req.query;
    if (error) return res.status(400).json({ error: error_description || error });
    if (!code) return res.status(400).json({ error: 'Missing auth code' });

    // Retrieve PKCE verifier — try Redis first, fall back to in-memory
    const codeVerifier = (await cacheGet(`pkce:${state}`)) || pkceStore.get(state);
    pkceStore.delete(state);

    const tokenResult = await acquireTokenByCode(code, codeVerifier);
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

    // Demo login — fixed credentials (no env var dependency)
    if (password !== 'Admin@SignHub2026') {
      return res.status(401).json({ error: 'Invalid credentials' });
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
    logger.error(`devLogin error: ${err.message}`);
    next(err);
  }
}

// GET /api/auth/test-connection — verify Azure AD credentials work
async function testConnection(req, res, next) {
  try {
    const missing = ['AZURE_CLIENT_ID', 'AZURE_CLIENT_SECRET', 'AZURE_TENANT_ID'].filter(k => !process.env[k]);
    if (missing.length) {
      return res.status(400).json({ success: false, error: `Missing env vars: ${missing.join(', ')}` });
    }

    const tokenResult = await acquireTokenClientCredentials();
    if (!tokenResult?.accessToken) {
      return res.status(400).json({ success: false, error: 'Failed to acquire access token from Azure' });
    }

    // Token acquired — credentials are valid. Try Graph API but don't fail if permissions missing.
    let orgName = 'Connected';
    try {
      const { Client } = require('@microsoft/microsoft-graph-client');
      const graphClient = Client.init({ authProvider: (done) => done(null, tokenResult.accessToken) });
      const org = await graphClient.api('/organization').select('displayName').get();
      orgName = org.value?.[0]?.displayName || 'Connected';
    } catch {
      // Graph API call failed (likely missing admin consent) — but credentials are valid
      orgName = 'Azure AD — credentials verified (grant admin consent for full Graph API access)';
    }

    logger.info(`Azure AD test connection successful`);
    res.json({ success: true, message: orgName });
  } catch (err) {
    logger.error(`Azure test connection failed: ${err.message}`);
    res.status(400).json({ success: false, error: err.message || 'Connection failed' });
  }
}

module.exports = { login, callback, refresh, logout, me, devLogin, testConnection };
