const { ConfidentialClientApplication } = require('@azure/msal-node');

let msalInstance;

function getMsalClient() {
  if (!msalInstance) {
    msalInstance = new ConfidentialClientApplication({
      auth: {
        clientId: process.env.AZURE_CLIENT_ID,
        clientSecret: process.env.AZURE_CLIENT_SECRET,
        authority: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}`,
      },
      cache: {
        cachePlugin: null, // Use Redis for token caching in production
      },
    });
  }
  return msalInstance;
}

// Auth code URL for user login (delegated flow)
async function getAuthCodeUrl(state) {
  const msalClient = getMsalClient();
  return msalClient.getAuthCodeUrl({
    scopes: ['openid', 'profile', 'email', 'User.Read', 'offline_access'],
    redirectUri: process.env.AZURE_REDIRECT_URI,
    state,
  });
}

// Exchange auth code for tokens (delegated flow)
async function acquireTokenByCode(code) {
  const msalClient = getMsalClient();
  return msalClient.acquireTokenByCode({
    code,
    scopes: ['openid', 'profile', 'email', 'User.Read', 'offline_access'],
    redirectUri: process.env.AZURE_REDIRECT_URI,
  });
}

// Client credentials flow for background Graph API sync
async function acquireTokenClientCredentials() {
  const msalClient = getMsalClient();
  return msalClient.acquireTokenByClientCredential({
    scopes: [process.env.GRAPH_SCOPES || 'https://graph.microsoft.com/.default'],
  });
}

module.exports = { getMsalClient, getAuthCodeUrl, acquireTokenByCode, acquireTokenClientCredentials };
