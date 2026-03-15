/**
 * Azure Function: Scheduled User Sync
 * Trigger: Timer (every 6 hours via CRON expression)
 *
 * This is an alternative to the built-in node-cron scheduler,
 * suitable for Azure Functions consumption plan deployments.
 *
 * Deploy with: func azure functionapp publish <your-app-name>
 */

const mongoose = require('mongoose');
const { syncAllUsers } = require('../../server/src/services/syncService');
const { connectDB } = require('../../server/src/config/database');
const logger = require('../../server/src/utils/logger');

let isDbConnected = false;

module.exports = async function (context, timer) {
  if (timer.isPastDue) {
    context.log.warn('Timer function is running late');
  }

  try {
    if (!isDbConnected) {
      await connectDB();
      isDbConnected = true;
    }

    context.log('Starting Azure Function user sync...');
    const result = await syncAllUsers();
    context.log('Sync complete:', JSON.stringify(result));

    context.bindings.outputBlob = JSON.stringify({
      timestamp: new Date().toISOString(),
      ...result,
    });
  } catch (err) {
    context.log.error('Sync function failed:', err.message);
    throw err;
  }
};
