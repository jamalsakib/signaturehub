require('dotenv').config();

// ── Environment validation ─────────────────────────────────────────────────
const REQUIRED_ENV = ['MONGODB_URI', 'JWT_SECRET', 'JWT_REFRESH_SECRET'];
const missing = REQUIRED_ENV.filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`[startup] Missing required environment variables: ${missing.join(', ')}`);
  process.exit(1);
}

const app = require('./app');
const { connectDB } = require('./config/database');
const { connectRedis } = require('./config/redis');
const { initScheduler } = require('./services/schedulerService');
const logger = require('./utils/logger');

const PORT = process.env.PORT || 5000;

async function bootstrap() {
  try {
    await connectDB();
    await connectRedis();

    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
    });

    initScheduler();
  } catch (err) {
    logger.error('Failed to start server:', err);
    process.exit(1);
  }
}

bootstrap();

process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Rejection:', err);
  process.exit(1);
});
