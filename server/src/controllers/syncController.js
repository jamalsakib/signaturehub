const { syncAllUsers, syncSingleUser } = require('../services/syncService');
const { cacheDelPattern, cacheGet, cacheSet } = require('../config/redis');
const logger = require('../utils/logger');

// POST /api/sync/all
async function triggerFullSync(req, res, next) {
  try {
    logger.info(`Full sync triggered by admin: ${req.user.email}`);
    // Run sync in background, return immediately
    syncAllUsers()
      .then(async (result) => {
        await cacheSet('sync:last_result', { ...result, completedAt: new Date() }, 60 * 60 * 24);
        await cacheDelPattern('sig:*');
      })
      .catch((err) => logger.error('Background sync failed:', err.message));

    res.json({ message: 'Sync started in background' });
  } catch (err) {
    next(err);
  }
}

// POST /api/sync/user/:azureId
async function triggerUserSync(req, res, next) {
  try {
    const { azureId } = req.params;
    const user = await syncSingleUser(azureId);
    await cacheDelPattern(`sig:${user.email}`);
    res.json(user);
  } catch (err) {
    next(err);
  }
}

// GET /api/sync/status
async function getSyncStatus(req, res, next) {
  try {
    const lastResult = await cacheGet('sync:last_result');
    res.json({ lastSync: lastResult || null });
  } catch (err) {
    next(err);
  }
}

module.exports = { triggerFullSync, triggerUserSync, getSyncStatus };
