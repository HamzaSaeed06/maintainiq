const rateLimit = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const { getRedisClient, isRedisAvailable } = require('../config/redis');

/**
 * Build a rate limiter that lazily decides the store on each request.
 * If Redis is connected and healthy, keys are stored in Redis.
 * If Redis is down/unavailable, falls back silently to in-memory store.
 */
const buildLimiter = ({ windowMs, max, message: msgText }) => {
  // A minimal in-memory fallback limiter (singleton per endpoint)
  const memoryLimiter = rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    skipFailedRequests: false,
    handler: (_req, res) => {
      res.status(429).json({
        success: false,
        error: {
          message: msgText,
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: Math.ceil(windowMs / 1000),
        },
      });
    },
  });

  // Cache the Redis-backed limiter once Redis is confirmed up
  let redisLimiter = null;

  return (req, res, next) => {
    // Build/cache the Redis limiter on first successful connection
    if (isRedisAvailable() && !redisLimiter) {
      try {
        const client = getRedisClient();
        redisLimiter = rateLimit({
          windowMs,
          max,
          standardHeaders: true,
          legacyHeaders: false,
          skipFailedRequests: false,
          store: new RedisStore({
            sendCommand: (...args) => client.call(...args),
          }),
          handler: (_req, res) => {
            res.status(429).json({
              success: false,
              error: {
                message: msgText,
                code: 'RATE_LIMIT_EXCEEDED',
                retryAfter: Math.ceil(windowMs / 1000),
              },
            });
          },
        });
      } catch (err) {
        // Redis store construction failed — stick with memory
        console.warn('⚠️  RedisStore construction failed, using memory store:', err.message);
        redisLimiter = null;
      }
    }

    // If Redis goes down after being up, reset so we rebuild next time it's back
    if (!isRedisAvailable() && redisLimiter) {
      redisLimiter = null;
    }

    const activeLimiter = redisLimiter || memoryLimiter;
    activeLimiter(req, res, next);
  };
};

// ── Auth endpoints (login / register): 5 req / 1 min per IP ──────────────────
const authLimiter = buildLimiter({
  windowMs: 60 * 1000,
  max: 5,
  message: 'Too many login attempts. Please wait a minute before trying again.',
});

// ── Public: issue-report endpoint: 10 req / 1 min per IP ─────────────────────
const publicPostIssueLimiter = buildLimiter({
  windowMs: 60 * 1000,
  max: 10,
  message: 'Too many issue reports from this IP. Please wait before submitting another.',
});

// ── AI-triage endpoint: 5 req / 1 min per IP ─────────────────────────────────
const aiTriageLimiter = buildLimiter({
  windowMs: 60 * 1000,
  max: 5,
  message: 'AI triage request limit reached. Please wait a minute before analysing again.',
});

// ── Public GET (asset scan): 30 req / 15 min per IP ──────────────────────────
const publicGetLimiter = buildLimiter({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: 'Too many asset scan requests. Please try again later.',
});

// ── General API: 100 req / 15 min per IP ─────────────────────────────────────
const generalLimiter = buildLimiter({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests. Please try again in a few minutes.',
});

module.exports = {
  authLimiter,
  publicPostIssueLimiter,
  aiTriageLimiter,
  publicGetLimiter,
  generalLimiter,
};
