import Redis from 'ioredis';
import { logger } from './logger';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

export const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});

redis.on('connect', () => {
  logger.info('Redis client connected');
});

redis.on('error', (err) => {
  logger.error('Redis client error:', err);
});

redis.on('reconnecting', () => {
  logger.warn('Redis client reconnecting');
});

// Helper functions for common Redis operations
export const redisHelpers = {
  async setWithExpiry(key: string, value: string, expirySeconds: number): Promise<void> {
    await redis.setex(key, expirySeconds, value);
  },

  async get(key: string): Promise<string | null> {
    return redis.get(key);
  },

  async delete(key: string): Promise<void> {
    await redis.del(key);
  },

  async setJSON<T>(key: string, value: T, expirySeconds?: number): Promise<void> {
    const stringValue = JSON.stringify(value);
    if (expirySeconds) {
      await redis.setex(key, expirySeconds, stringValue);
    } else {
      await redis.set(key, stringValue);
    }
  },

  async getJSON<T>(key: string): Promise<T | null> {
    const value = await redis.get(key);
    if (!value) return null;
    return JSON.parse(value) as T;
  },
};
