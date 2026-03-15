const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { cacheGet, cacheSet } = require('../config/redis');

async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.slice(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check cache first
    const cacheKey = `user:${decoded.userId}`;
    let user = await cacheGet(cacheKey);

    if (!user) {
      user = await User.findById(decoded.userId).select('-__v').lean();
      if (user) {
        await cacheSet(cacheKey, user, 300);
      }
    }

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'User not found or inactive' });
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

// API key auth for Outlook add-in / external signature generation
function authenticateApiKey(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey || apiKey !== process.env.API_KEY) {
    return res.status(401).json({ error: 'Invalid API key' });
  }
  next();
}

module.exports = { authenticate, authenticateApiKey };
