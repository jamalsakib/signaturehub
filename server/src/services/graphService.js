const { Client } = require('@microsoft/microsoft-graph-client');
const { acquireTokenClientCredentials } = require('../config/msal');
const logger = require('../utils/logger');

// Create an authenticated Graph client using client credentials (daemon flow)
async function getGraphClient() {
  const tokenResult = await acquireTokenClientCredentials();
  return Client.init({
    authProvider: (done) => done(null, tokenResult.accessToken),
    defaultVersion: 'v1.0',
  });
}

// Fetch all users in the tenant (handles pagination)
async function getAllUsers(fields = null) {
  const client = await getGraphClient();
  const selectFields = fields || [
    'id', 'displayName', 'givenName', 'surname', 'mail',
    'userPrincipalName', 'jobTitle', 'department', 'companyName',
    'officeLocation', 'mobilePhone', 'businessPhones', 'faxNumber',
    'streetAddress', 'city', 'state', 'country', 'postalCode',
    'accountEnabled',
  ].join(',');

  const users = [];
  let nextLink = `/users?$select=${selectFields}&$top=999&$filter=accountEnabled eq true`;

  while (nextLink) {
    const response = await client.api(nextLink).get();
    users.push(...response.value);
    nextLink = response['@odata.nextLink'] || null;
  }

  logger.info(`Graph API: fetched ${users.length} users`);
  return users;
}

// Fetch a single user by Azure AD object ID
async function getUserById(azureId) {
  const client = await getGraphClient();
  return client.api(`/users/${azureId}`).select([
    'id', 'displayName', 'givenName', 'surname', 'mail',
    'userPrincipalName', 'jobTitle', 'department', 'companyName',
    'officeLocation', 'mobilePhone', 'businessPhones', 'faxNumber',
    'streetAddress', 'city', 'state', 'country', 'postalCode',
  ].join(',')).get();
}

// Fetch group memberships for a user
async function getUserGroups(azureId) {
  const client = await getGraphClient();
  const groups = [];
  let nextLink = `/users/${azureId}/memberOf?$select=id,displayName`;

  while (nextLink) {
    const response = await client.api(nextLink).get();
    groups.push(
      ...response.value
        .filter((g) => g['@odata.type'] === '#microsoft.graph.group')
        .map((g) => g.displayName)
    );
    nextLink = response['@odata.nextLink'] || null;
  }

  return groups;
}

// Fetch user profile photo as base64 (returns null if not found)
async function getUserPhoto(azureId) {
  try {
    const client = await getGraphClient();
    const buffer = await client.api(`/users/${azureId}/photo/$value`).getStream();
    const chunks = [];
    for await (const chunk of buffer) chunks.push(chunk);
    return `data:image/jpeg;base64,${Buffer.concat(chunks).toString('base64')}`;
  } catch {
    return null;
  }
}

// Normalize Graph API user object → our DB schema
function normalizeGraphUser(graphUser) {
  return {
    azureId: graphUser.id,
    email: (graphUser.mail || graphUser.userPrincipalName || '').toLowerCase(),
    displayName: graphUser.displayName || '',
    firstName: graphUser.givenName || '',
    lastName: graphUser.surname || '',
    jobTitle: graphUser.jobTitle || '',
    department: graphUser.department || '',
    company: graphUser.companyName || '',
    officeLocation: graphUser.officeLocation || '',
    mobilePhone: graphUser.mobilePhone || '',
    businessPhone: (graphUser.businessPhones || [])[0] || '',
    faxNumber: graphUser.faxNumber || '',
    streetAddress: graphUser.streetAddress || '',
    city: graphUser.city || '',
    state: graphUser.state || '',
    country: graphUser.country || '',
    postalCode: graphUser.postalCode || '',
    userPrincipalName: graphUser.userPrincipalName || '',
    isActive: graphUser.accountEnabled !== false,
    lastSyncedAt: new Date(),
  };
}

module.exports = { getGraphClient, getAllUsers, getUserById, getUserGroups, getUserPhoto, normalizeGraphUser };
