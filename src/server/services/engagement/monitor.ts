import { db } from "@/server/db/client";
import { platformAccounts, engagementItems } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { decrypt } from "@/server/lib/encryption";
import { LinkedInAdapter } from "@/server/services/platforms/linkedin";
import { logger } from "@/server/lib/logger";
import type { PlatformAdapter } from "@/server/services/platforms/types";

function getAdapter(platform: string): PlatformAdapter {
  switch (platform) {
    case "linkedin":
      return new LinkedInAdapter();
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }
}

export async function pollEngagement(platformAccountId: string) {
  const [account] = await db
    .select()
    .from(platformAccounts)
    .where(eq(platformAccounts.id, platformAccountId))
    .limit(1);

  if (!account) {
    logger.error("Platform account not found", { platformAccountId });
    return;
  }

  const adapter = getAdapter(account.platform);
  const tokens = {
    accessToken: decrypt(account.accessToken),
    refreshToken: account.refreshToken
      ? decrypt(account.refreshToken)
      : undefined,
  };

  try {
    // Get recent posts and check for new comments
    const recentPosts = await adapter.getRecentPosts(tokens, 10);

    for (const post of recentPosts) {
      const comments = await adapter.getComments(tokens, post.id);

      for (const comment of comments) {
        // Check if we already have this engagement item
        const existing = await db
          .select()
          .from(engagementItems)
          .where(eq(engagementItems.platformItemId, comment.id))
          .limit(1);

        if (existing.length === 0) {
          await db.insert(engagementItems).values({
            brandId: account.brandId,
            platform: account.platform,
            platformAccountId: account.id,
            type: "comment",
            platformItemId: comment.id,
            originalText: comment.text,
            authorName: comment.authorName,
            authorHandle: comment.authorHandle,
            replyStatus: "pending",
            priority: "medium",
          });
        }
      }
    }

    logger.info("Engagement polling complete", {
      platformAccountId,
      platform: account.platform,
    });
  } catch (error) {
    logger.error("Engagement polling failed", {
      platformAccountId,
      error: String(error),
    });
  }
}
