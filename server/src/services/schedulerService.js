const cron = require('node-cron');
const Campaign = require('../models/Campaign');
const { syncAllUsers } = require('./syncService');
const { cacheDelPattern } = require('../config/redis');
const logger = require('../utils/logger');

function initScheduler() {
  // Full user sync from Azure AD (default: every 6 hours)
  const syncSchedule = process.env.USER_SYNC_SCHEDULE || '0 */6 * * *';
  cron.schedule(syncSchedule, async () => {
    logger.info('Scheduled user sync starting...');
    try {
      const result = await syncAllUsers();
      logger.info('Scheduled sync complete:', result);
      // Invalidate all cached signatures after a sync
      await cacheDelPattern('sig:*');
    } catch (err) {
      logger.error('Scheduled user sync failed:', err.message);
    }
  });

  // Update campaign statuses every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    try {
      const now = new Date();

      await Campaign.updateMany(
        { status: 'scheduled', startDate: { $lte: now } },
        { $set: { status: 'active' } }
      );

      await Campaign.updateMany(
        { status: 'active', endDate: { $lt: now } },
        { $set: { status: 'expired' } }
      );
    } catch (err) {
      logger.error('Campaign status update failed:', err.message);
    }
  });

  logger.info(`Scheduler initialized. User sync: "${syncSchedule}"`);
}

module.exports = { initScheduler };
