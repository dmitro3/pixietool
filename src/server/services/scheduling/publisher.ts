import { eq } from "drizzle-orm";
import { db } from "@/server/db/client";
import { contentItems, platformAccounts } from "@/server/db/schema";
import { LinkedInAdapter } from "@/server/services/platforms/linkedin";
import { decrypt } from "@/server/lib/encryption";
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

export async function publishScheduledContent(contentItemId: string) {
  const [item] = await db
    .select()
    .from(contentItems)
    .where(eq(contentItems.id, contentItemId))
    .limit(1);

  if (!item) {
    logger.error("Content item not found for publishing", { contentItemId });
    return;
  }

  if (item.status !== "scheduled") {
    logger.warn("Content item not in scheduled status", {
      contentItemId,
      status: item.status,
    });
    return;
  }

  // Get platform account and tokens
  const [account] = await db
    .select()
    .from(platformAccounts)
    .where(eq(platformAccounts.brandId, item.brandId))
    .limit(1);

  if (!account) {
    await db
      .update(contentItems)
      .set({ status: "failed" })
      .where(eq(contentItems.id, contentItemId));
    logger.error("No platform account found for brand", {
      brandId: item.brandId,
    });
    return;
  }

  const adapter = getAdapter(item.platform);
  const tokens = {
    accessToken: decrypt(account.accessToken),
    refreshToken: account.refreshToken
      ? decrypt(account.refreshToken)
      : undefined,
  };

  try {
    const result = await adapter.publishPost(tokens, {
      text: item.textContent ?? undefined,
      mediaUrls: (item.mediaUrls as string[]) ?? undefined,
      hashtags: item.hashtags ?? undefined,
    });

    if (result.success) {
      await db
        .update(contentItems)
        .set({
          status: "published",
          publishedAt: new Date(),
          platformPostId: result.platformPostId,
        })
        .where(eq(contentItems.id, contentItemId));

      logger.info("Content published successfully", {
        contentItemId,
        platform: item.platform,
        platformPostId: result.platformPostId,
      });
    } else {
      throw new Error(result.error ?? "Unknown publish error");
    }
  } catch (error) {
    await db
      .update(contentItems)
      .set({ status: "failed" })
      .where(eq(contentItems.id, contentItemId));

    logger.error("Content publishing failed", {
      contentItemId,
      error: String(error),
    });
  }
}
