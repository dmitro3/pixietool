import { Queue } from "bullmq";
import { logger } from "@/server/lib/logger";

function getConnectionOpts() {
  // Parse Upstash Redis URL into host/port/password for BullMQ compatibility
  const url = new URL(process.env.UPSTASH_REDIS_URL!);
  return {
    host: url.hostname,
    port: Number(url.port) || 6379,
    password: url.password || undefined,
    tls: url.protocol === "rediss:" ? {} : undefined,
    maxRetriesPerRequest: null as null,
  };
}

// Scheduled posts queue
export const scheduledPostsQueue = new Queue("scheduled-posts", {
  connection: getConnectionOpts(),
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
    removeOnComplete: { count: 1000 },
    removeOnFail: { count: 5000 },
  },
});

// Analytics collection queue
export const analyticsQueue = new Queue("analytics-collection", {
  connection: getConnectionOpts(),
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: "fixed", delay: 10000 },
  },
});

// Engagement monitoring queue
export const engagementQueue = new Queue("engagement-monitoring", {
  connection: getConnectionOpts(),
  defaultJobOptions: {
    attempts: 2,
  },
});

// Media processing queue
export const mediaQueue = new Queue("media-processing", {
  connection: getConnectionOpts(),
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: "exponential", delay: 10000 },
  },
});

export async function schedulePost(
  contentItemId: string,
  scheduledFor: Date
): Promise<void> {
  const delay = scheduledFor.getTime() - Date.now();

  if (delay < 0) {
    logger.warn("Scheduled time is in the past, publishing immediately", {
      contentItemId,
    });
  }

  await scheduledPostsQueue.add(
    "publish",
    { contentItemId },
    { delay: Math.max(delay, 0) }
  );

  logger.info("Post scheduled in queue", {
    contentItemId,
    scheduledFor: scheduledFor.toISOString(),
    delayMs: delay,
  });
}
