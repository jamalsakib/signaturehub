const User = require('../models/User');
const Rule = require('../models/Rule');
const { getAllUsers, getUserGroups, normalizeGraphUser } = require('./graphService');
const { evaluateRules } = require('./ruleEngine');
const logger = require('../utils/logger');

const BATCH_SIZE = 50;

async function syncAllUsers() {
  logger.info('Starting full user sync from Microsoft Graph API...');
  const startTime = Date.now();

  const graphUsers = await getAllUsers();
  const rules = await Rule.find({ isActive: true }).sort({ priority: 1 }).populate('assignTemplate assignBusinessUnit');

  let created = 0;
  let updated = 0;
  let deactivated = 0;
  const syncedAzureIds = new Set();

  // Process in batches to avoid memory spikes
  for (let i = 0; i < graphUsers.length; i += BATCH_SIZE) {
    const batch = graphUsers.slice(i, i + BATCH_SIZE);
    await Promise.all(batch.map((gUser) => syncUser(gUser, rules, { created: { inc: () => created++ }, updated: { inc: () => updated++ } }, syncedAzureIds)));
  }

  // Deactivate users no longer in Azure AD
  const deactivatedResult = await User.updateMany(
    { azureId: { $nin: [...syncedAzureIds] }, isActive: true },
    { $set: { isActive: false } }
  );
  deactivated = deactivatedResult.modifiedCount;

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  logger.info(`User sync complete: ${created} created, ${updated} updated, ${deactivated} deactivated in ${duration}s`);

  return { created, updated, deactivated, total: graphUsers.length, durationSeconds: parseFloat(duration) };
}

async function syncUser(graphUser, rules, counters, syncedAzureIds) {
  try {
    const normalized = normalizeGraphUser(graphUser);

    // Fetch groups for rule evaluation
    let groups = [];
    try {
      groups = await getUserGroups(graphUser.id);
    } catch {
      // Non-fatal: continue without group data
    }

    normalized.groups = groups;

    // Apply rule engine
    const ruleResult = evaluateRules(rules, { ...normalized });
    if (ruleResult.template) normalized.assignedTemplate = ruleResult.template._id;
    if (ruleResult.businessUnit) normalized.businessUnit = ruleResult.businessUnit._id;

    const existing = await User.findOne({ azureId: normalized.azureId });

    if (existing) {
      // Preserve manual overrides
      const update = { ...normalized };
      if (existing.role !== 'viewer') delete update.role; // Don't downgrade manual role assignments
      if (existing.assignedTemplate && !ruleResult.template) delete update.assignedTemplate;

      await User.updateOne({ _id: existing._id }, { $set: update });
      counters.updated.inc();
    } else {
      await User.create(normalized);
      counters.created.inc();
    }

    if (syncedAzureIds) syncedAzureIds.add(normalized.azureId);
  } catch (err) {
    logger.error(`Failed to sync user ${graphUser.id}:`, err.message);
  }
}

// Sync a single user by azureId (used for on-demand refresh)
async function syncSingleUser(azureId) {
  const { getUserById, getUserGroups, normalizeGraphUser } = require('./graphService');
  const rules = await Rule.find({ isActive: true }).sort({ priority: 1 }).populate('assignTemplate assignBusinessUnit');

  const graphUser = await getUserById(azureId);
  const groups = await getUserGroups(azureId).catch(() => []);
  const normalized = normalizeGraphUser(graphUser);
  normalized.groups = groups;

  const ruleResult = evaluateRules(rules, normalized);
  if (ruleResult.template) normalized.assignedTemplate = ruleResult.template._id;
  if (ruleResult.businessUnit) normalized.businessUnit = ruleResult.businessUnit._id;

  return User.findOneAndUpdate(
    { azureId },
    { $set: normalized },
    { upsert: true, new: true, runValidators: true }
  );
}

module.exports = { syncAllUsers, syncSingleUser };
