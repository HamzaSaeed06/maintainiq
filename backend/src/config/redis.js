const Redis = require('ioredis');

let redisClient = null;
let redisAvailable = false;

const REDIS_URL = process.env.REDIS_URL;

if (REDIS_URL) {
  try {
    redisClient = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 1,
      connectTimeout: 3000,
      lazyConnect: true,
    });

    redisClient.on('connect', () => {
      redisAvailable = true;
      const safeUrl = REDIS_URL.replace(/\/\/[^@]+@/, '//***@');
      console.log('✅ Redis connected:', safeUrl);
    });

    redisClient.on('error', (err) => {
      if (redisAvailable) {
        console.warn('⚠️  Redis error — rate limiting falling back to memory store:', err.message);
      }
      redisAvailable = false;
    });

    redisClient.on('close', () => { redisAvailable = false; });

    // Non-blocking connect: if Redis isn't up, the app still starts
    redisClient.connect().catch((err) => {
      console.warn('⚠️  Redis unavailable at startup — rate limiting will use in-memory store:', err.message);
      redisAvailable = false;
    });
  } catch (err) {
    console.warn('⚠️  Redis client init failed — using in-memory store:', err.message);
    redisClient = null;
  }
} else {
  console.warn('⚠️  REDIS_URL not set — rate limiting will use in-memory store');
}

module.exports = {
  getRedisClient: () => redisClient,
  isRedisAvailable: () => redisAvailable,
};
