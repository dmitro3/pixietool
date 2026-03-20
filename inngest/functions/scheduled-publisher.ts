import { inngest } from "../client";
import { db } from "@/server/db/client";
import { contentItems, platformAccounts } from "@/server/db/schema";
import { eq, and, lte } from "drizzle-orm";
import { LinkedInAdapter } from "@/server/services/platforms/linkedin";
import { decrypt } from "@/server/lib/encryption";
import { logger } from "@/server/lib/logger";
import { notificationBus } from "@/server/lib/notifications";

/**
 * Cron: Runs every 5 minutes. Finds all content items with status "scheduled"
 * and scheduledFor <= now, then publishes them via the platform adapter.
 */
export const scheduledPostPublisher = inngest.createFunction(
  { id: "scheduled-post-publisher" },
  { cron: "*/5 * * * *" }, // Every 5 minutes
  async ({ step }) => {
    // Step 1: Find posts that are due
    const duePosts = await step.run("find-due-posts", async () => {
      const now = new Date();
      return db
        .select()
        .from(contentItems)
        .where(
          and(
            eq(contentItems.status, "scheduled"),
            lte(contentItems.scheduledFor, now)
          )
        )
        .limit(20); // Process up to 20 per run
    });

    if (duePosts.length === 0) return { published: 0 };

    let published = 0;
    let failed = 0;

    // Step 2: Publish each post
    for (const post of duePosts) {
      await step.run(`publish-${post.id}`, async () => {
        try {
          // Get platform account for this brand + platform
          const [account] = await db
            .select()
            .from(platformAccounts)
            .where(
              and(
                eq(platformAccounts.brandId, post.brandId),
                eq(platformAccounts.platform, post.platform)
              )
            )
            .limit(1);

          if (!account) {
            logger.error("No platform account found for scheduled post", {
              postId: post.id,
              brandId: post.brandId,
              platform: post.platform,
            });
            await db
              .update(contentItems)
              .set({ status: "failed" })
              .where(eq(contentItems.id, post.id));
            failed++;
            return;
          }

          const tokens = {
            accessToken: decrypt(account.accessToken),
            refreshToken: account.refreshToken ? decrypt(account.refreshToken) : undefined,
            expiresAt: account.tokenExpiresAt ?? undefined,
          };

          let result: { success: boolean; platformPostId?: string; error?: string };

          if (post.platform === "linkedin") {
            const adapter = new LinkedInAdapter();
            result = await adapter.publishPost(tokens, {
              text: post.textContent ?? "",
              hashtags: post.hashtags ?? [],
            });
          } else {
            // Other platforms — stub for now
            result = { success: false, error: `Platform ${post.platform} publishing not implemented` };
          }

          if (result.success) {
            await db
              .update(contentItems)
              .set({
                status: "published",
                publishedAt: new Date(),
                platformPostId: result.platformPostId,
              })
              .where(eq(contentItems.id, post.id));
            published++;

            // Notify the user
            notificationBus.emit(post.brandId, {
              type: "content_published",
              title: "Post Published",
              message: `Your ${post.platform} post is now live.`,
              brandId: post.brandId,
              actionUrl: `/content`,
            });
          } else {
            await db
              .update(contentItems)
              .set({ status: "failed" })
              .where(eq(contentItems.id, post.id));
            failed++;

            notificationBus.emit(post.brandId, {
              type: "content_failed",
              title: "Post Failed",
              message: result.error ?? "Publishing failed",
              brandId: post.brandId,
              actionUrl: `/content`,
            });
          }
        } catch (error) {
          logger.error("Scheduled post publish error", {
            postId: post.id,
            error: String(error),
          });
          await db
            .update(contentItems)
            .set({ status: "failed" })
            .where(eq(contentItems.id, post.id));
          failed++;
        }
      });
    }

    logger.info("Scheduled publisher run complete", { published, failed });
    return { published, failed, total: duePosts.length };
  }
);
