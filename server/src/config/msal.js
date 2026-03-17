const { ConfidentialClientApplication, CryptoProvider } = require('@azure/msal-node');

let msalInstance;
const cryptoProvider = new CryptoProvider();

function getMsalClient() {
  if (!msalInstance) {
    msalInstance = new ConfidentialClientApplication({
      auth: {
        clientId: process.env.AZURE_CLIENT_ID,
        clientSecret: process.env.AZURE_CLIENT_SECRET,
        authority: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}`,
      },
      cache: {
        cachePlugin: null,
      },
    });
  }
  return msalInstance;
}

// Generate PKCE verifier + challenge pair
async function generatePkceCodes() {
  return cryptoProvider.generatePkceCodes();
}

// Auth code URL for user login (delegated flow) — requires PKCE challenge
async function getAuthCodeUrl(state, codeChallenge) {
  const msalClient = getMsalClient();
  return msalClient.getAuthCodeUrl({
    scopes: ['openid', 'profile', 'email', 'User.Read', 'offline_access'],
    redirectUri: process.env.AZURE_REDIRECT_URI,
    state,
    codeChallenge,
    codeChallengeMethod: 'S256',
  });
}

// Exchange auth code for tokens — requires matching PKCE verifier
async function acquireTokenByCode(code, codeVerifier) {
  const msalClient = getMsalClient();
  return msalClient.acquireTokenByCode({
    code,
    scopes: ['openid', 'profile', 'email', 'User.Read', 'offline_access'],
    redirectUri: process.env.AZURE_REDIRECT_URI,
    codeVerifier,
  });
}

// Client credentials flow for background Graph API sync
async function acquireTokenClientCredentials() {
  const msalClient = getMsalClient();
  return msalClient.acquireTokenByClientCredential({
    scopes: [process.env.GRAPH_SCOPES || 'https://graph.microsoft.com/.default'],
  });
}

module.exports = { getMsalClient, generatePkceCodes, getAuthCodeUrl, acquireTokenByCode, acquireTokenClientCredentials };
