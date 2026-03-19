import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

let redis: Redis | null = null;

function getRedis(): Redis {
  if (!redis) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_URL!,
      token: process.env.UPSTASH_REDIS_TOKEN!,
    });
  }
  return redis;
}

// General API rate limiter: 100 requests per 10 seconds
export const apiRateLimiter = new Ratelimit({
  redis: getRedis(),
  limiter: Ratelimit.slidingWindow(100, "10 s"),
  analytics: true,
  prefix: "ratelimit:api",
});

// AI generation rate limiter: 20 requests per minute
export const aiRateLimiter = new Ratelimit({
  redis: getRedis(),
  limiter: Ratelimit.slidingWindow(20, "1 m"),
  analytics: true,
  prefix: "ratelimit:ai",
});

// Publishing rate limiter: 10 posts per hour (per platform)
export const publishRateLimiter = new Ratelimit({
  redis: getRedis(),
  limiter: Ratelimit.slidingWindow(10, "1 h"),
  analytics: true,
  prefix: "ratelimit:publish",
});
