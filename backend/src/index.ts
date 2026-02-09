import dotenv from 'dotenv';
dotenv.config();

import app from './app';
import { logger } from './utils/logger';
import { prisma } from './utils/prisma';
import { redis } from './utils/redis';
import { getScheduler } from './services/scheduler/scheduler.service';

const PORT = process.env.PORT || 3001;

async function main() {
  try {
    // Test database connection
    await prisma.$connect();
    logger.info('Database connected successfully');

    // Test Redis connection
    await redis.ping();
    logger.info('Redis connected successfully');

    app.listen(PORT, async () => {
      logger.info(`Server running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);

      // Start scheduled jobs (auto-discovery)
      try {
        const scheduler = getScheduler();
        await scheduler.startScheduledJobs();
        logger.info('Scheduler started successfully');
      } catch (error) {
        logger.error('Failed to start scheduler:', error);
        // Don't exit - the app can still function without auto-discovery
      }
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await prisma.$disconnect();
  await redis.quit();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  await prisma.$disconnect();
  await redis.quit();
  process.exit(0);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
  logger.error('Unhandled Promise Rejection:', { reason, promise: String(promise) });
  // Don't exit - let the app continue running but log the error
});

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception:', { error: error.message, stack: error.stack });
  // Exit on uncaught exceptions as the app may be in an inconsistent state
  process.exit(1);
});

main();
// Trigger deploy 1770631245
