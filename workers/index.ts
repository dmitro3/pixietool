import { Worker } from "bullmq";
import { publishScheduledContent } from "@/server/services/scheduling/publisher";
import { collectAccountAnalytics } from "@/server/services/analytics/collector";
import { pollEngagement } from "@/server/services/engagement/monitor";
import { logger } from "@/server/lib/logger";

function getConnectionOpts() {
  const url = new URL(process.env.UPSTASH_REDIS_URL!);
  return {
    host: url.hostname,
    port: Number(url.port) || 6379,
    password: url.password || undefined,
    tls: url.protocol === "rediss:" ? {} : undefined,
    maxRetriesPerRequest: null as null,
  };
}

const connection = getConnectionOpts();

// Scheduled posts worker
const schedulerWorker = new Worker(
  "scheduled-posts",
  async (job) => {
    logger.info("Processing scheduled post", { jobId: job.id });
    await publishScheduledContent(job.data.contentItemId);
  },
  { connection, concurrency: 5 }
);

// Analytics collection worker
const analyticsWorker = new Worker(
  "analytics-collection",
  async (job) => {
    logger.info("Collecting analytics", { jobId: job.id });
    await collectAccountAnalytics(job.data.platformAccountId);
  },
  { connection, concurrency: 3 }
);

// Engagement monitoring worker
const engagementWorker = new Worker(
  "engagement-monitoring",
  async (job) => {
    logger.info("Polling engagement", { jobId: job.id });
    await pollEngagement(job.data.platformAccountId);
  },
  { connection, concurrency: 3 }
);

// Graceful shutdown
async function shutdown() {
  logger.info("Shutting down workers...");
  await Promise.all([
    schedulerWorker.close(),
    analyticsWorker.close(),
    engagementWorker.close(),
  ]);
  process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

logger.info("Workers started", {
  queues: ["scheduled-posts", "analytics-collection", "engagement-monitoring"],
});
