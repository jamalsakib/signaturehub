const router = require('express').Router();
const { authenticate } = require('../middleware/authenticate');
const { resetMsalClient } = require('../config/msal');
const logger = require('../utils/logger');

// GET /api/settings/azure-config — return current Azure env vars (no secret)
router.get('/azure-config', authenticate, (req, res) => {
  res.json({
    tenantId: process.env.AZURE_TENANT_ID || '',
    clientId: process.env.AZURE_CLIENT_ID || '',
    redirectUri: process.env.AZURE_REDIRECT_URI || '',
  });
});

// POST /api/settings/azure-config — update Azure credentials at runtime
router.post('/azure-config', authenticate, (req, res) => {
  const { tenantId, clientId, clientSecret, redirectUri } = req.body;

  if (tenantId) process.env.AZURE_TENANT_ID = tenantId;
  if (clientId) process.env.AZURE_CLIENT_ID = clientId;
  if (clientSecret) process.env.AZURE_CLIENT_SECRET = clientSecret;
  if (redirectUri) process.env.AZURE_REDIRECT_URI = redirectUri;

  // Reset MSAL so next request uses new credentials
  resetMsalClient();

  logger.info('Azure config updated at runtime');
  res.json({ success: true });
});

module.exports = router;
