const { createClient } = require('redis');
const logger = require('../utils/logger');

let client;

async function connectRedis() {
  let attempts = 0;
  client = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    socket: {
      connectTimeout: 2000,
      reconnectStrategy: (retries) => {
        if (retries >= 1) return false; // Give up after 1 retry
        return 500;
      },
    },
  });

  client.on('error', () => { /* suppress — handled below */ });
  client.on('connect', () => logger.info('Redis connected'));

  try {
    await client.connect();
  } catch {
    logger.warn('Redis unavailable — running without cache');
    client = null;
  }
}

function getRedisClient() {
  return client || null;
}

async function cacheGet(key) {
  if (!client) return null;
  try {
    const data = await client.get(key);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

async function cacheSet(key, value, ttlSeconds = 300) {
  if (!client) return;
  try {
    await client.setEx(key, ttlSeconds, JSON.stringify(value));
  } catch (err) {
    logger.warn('Redis cache set failed:', err.message);
  }
}

async function cacheDel(key) {
  if (!client) return;
  try {
    await client.del(key);
  } catch (err) {
    logger.warn('Redis cache del failed:', err.message);
  }
}

async function cacheDelPattern(pattern) {
  if (!client) return;
  try {
    const keys = await client.keys(pattern);
    if (keys.length > 0) await client.del(keys);
  } catch (err) {
    logger.warn('Redis cache delPattern failed:', err.message);
  }
}

module.exports = { connectRedis, getRedisClient, cacheGet, cacheSet, cacheDel, cacheDelPattern };
