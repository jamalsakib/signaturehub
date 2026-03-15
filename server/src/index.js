require('dotenv').config();
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
