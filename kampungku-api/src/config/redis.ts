import Redis from 'ioredis';
import { env } from './env';

export const redis = new Redis(env.REDIS_URL, {
  lazyConnect: true,
});

redis.on('error', (err) => {
  console.error('Redis error:', err);
});
