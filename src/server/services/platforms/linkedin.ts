import type {
  PlatformAdapter,
  OAuthTokens,
  ProfileData,
  DateRange,
  AnalyticsData,
  PostContent,
  MediaContent,
  PublishResult,
  Comment,
  DemographicData,
} from "./types";
import { logger } from "@/server/lib/logger";

const LINKEDIN_API = "https://api.linkedin.com/v2";
const LINKEDIN_OAUTH = "https://www.linkedin.com/oauth/v2";

// ─── Helpers ──────────────────────────────────────────────

function authHeaders(accessToken: string): Record<string, string> {
  return {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
    "X-Restli-Protocol-Version": "2.0.0",
    "LinkedIn-Version": "202401",
  };
}

async function linkedinFetch<T>(
  url: string,
  options: RequestInit
): Promise<T> {
  const res = await fetch(url, options);
  if (!res.ok) {
    const body = await res.text();
    logger.error("LinkedIn API error", {
      status: res.status,
      url,
      body: body.slice(0, 500),
    });
    throw new Error(`LinkedIn API ${res.status}: ${body.slice(0, 200)}`);
  }
  return res.json() as Promise<T>;
}

// ─── Adapter ──────────────────────────────────────────────

export class LinkedInAdapter implements PlatformAdapter {
  readonly platform = "linkedin";

  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;

  constructor() {
    this.clientId = process.env.LINKEDIN_CLIENT_ID!;
    this.clientSecret = process.env.LINKEDIN_CLIENT_SECRET!;
    this.redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback/linkedin`;
  }

  // ─── OAuth ────────────────────────────────────────────

  async connect(redirectUrl: string): Promise<string> {
    const scopes = [
      "openid",
      "profile",
      "email",
      "w_member_social",
    ].join(" ");

    const params = new URLSearchParams({
      response_type: "code",
      client_id: this.clientId,
      redirect_uri: redirectUrl || this.redirectUri,
      scope: scopes,
      state: crypto.randomUUID(),
    });

    return `${LINKEDIN_OAUTH}/authorization?${params}`;
  }

  async handleCallback(code: string): Promise<OAuthTokens> {
    const params = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: this.clientId,
      client_secret: this.clientSecret,
      redirect_uri: this.redirectUri,
    });

    const data = await linkedinFetch<{
      access_token: string;
      expires_in: number;
      refresh_token?: string;
      refresh_token_expires_in?: number;
      scope: string;
    }>(`${LINKEDIN_OAUTH}/accessToken`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    logger.info("LinkedIn OAuth tokens received", {
      expiresIn: data.expires_in,
      hasRefreshToken: !!data.refresh_token,
    });

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
      scope: data.scope,
    };
  }

  async refreshToken(tokens: OAuthTokens): Promise<OAuthTokens> {
    if (!tokens.refreshToken) {
      throw new Error("No refresh token available for LinkedIn");
    }

    const params = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: tokens.refreshToken,
      client_id: this.clientId,
      client_secret: this.clientSecret,
    });

    const data = await linkedinFetch<{
      access_token: string;
      expires_in: number;
      refresh_token?: string;
      scope: string;
    }>(`${LINKEDIN_OAUTH}/accessToken`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    logger.info("LinkedIn token refreshed", { expiresIn: data.expires_in });

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token ?? tokens.refreshToken,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
      scope: data.scope,
    };
  }

  // ─── Profile ──────────────────────────────────────────

  async getProfile(tokens: OAuthTokens): Promise<ProfileData> {
    // OpenID Connect userinfo endpoint (requires openid + profile + email scopes)
    const userInfo = await linkedinFetch<{
      sub: string;
      name: string;
      given_name: string;
      family_name: string;
      picture?: string;
      email?: string;
    }>("https://api.linkedin.com/v2/userinfo", {
      headers: authHeaders(tokens.accessToken),
    });

    return {
      platformUserId: userInfo.sub,
      username: userInfo.email ?? userInfo.sub,
      displayName: userInfo.name,
      avatarUrl: userInfo.picture,
      followerCount: 0, // Requires r_organization_followers for org pages
      bio: undefined,
    };
  }

  // ─── Publishing ───────────────────────────────────────

  async publishPost(
    tokens: OAuthTokens,
    content: PostContent
  ): Promise<PublishResult> {
    // Get the author URN from profile
    const profile = await this.getProfile(tokens);
    const authorUrn = `urn:li:person:${profile.platformUserId}`;

    const postBody: Record<string, unknown> = {
      author: authorUrn,
      lifecycleState: "PUBLISHED",
      specificContent: {
        "com.linkedin.ugc.ShareContent": {
          shareCommentary: {
            text: this.buildPostText(content),
          },
          shareMediaCategory: "NONE",
        },
      },
      visibility: {
        "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
      },
    };

    try {
      const result = await linkedinFetch<{ id: string }>(
        `${LINKEDIN_API}/ugcPosts`,
        {
          method: "POST",
          headers: authHeaders(tokens.accessToken),
          body: JSON.stringify(postBody),
        }
      );

      logger.info("LinkedIn post published", { postId: result.id });

      return {
        success: true,
        platformPostId: result.id,
        url: `https://www.linkedin.com/feed/update/${result.id}`,
      };
    } catch (error) {
      logger.error("LinkedIn publish failed", { error: String(error) });
      return {
        success: false,
        error: String(error),
      };
    }
  }

  async publishMedia(
    tokens: OAuthTokens,
    content: MediaContent
  ): Promise<PublishResult> {
    if (!content.mediaUrls?.length) {
      return this.publishPost(tokens, content);
    }

    const profile = await this.getProfile(tokens);
    const authorUrn = `urn:li:person:${profile.platformUserId}`;

    // Step 1: Register the upload for each media file
    const mediaAssets: string[] = [];

    for (const mediaUrl of content.mediaUrls) {
      const registerBody = {
        registerUploadRequest: {
          recipes: [
            content.mediaType === "video"
              ? "urn:li:digitalmediaRecipe:feedshare-video"
              : "urn:li:digitalmediaRecipe:feedshare-image",
          ],
          owner: authorUrn,
          serviceRelationships: [
            {
              relationshipType: "OWNER",
              identifier: "urn:li:userGeneratedContent",
            },
          ],
        },
      };

      try {
        const registered = await linkedinFetch<{
          value: {
            uploadMechanism: {
              "com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest": {
                uploadUrl: string;
              };
            };
            asset: string;
          };
        }>(`${LINKEDIN_API}/assets?action=registerUpload`, {
          method: "POST",
          headers: authHeaders(tokens.accessToken),
          body: JSON.stringify(registerBody),
        });

        const uploadUrl =
          registered.value.uploadMechanism[
            "com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"
          ].uploadUrl;

        // Step 2: Download the media and upload to LinkedIn
        const mediaResponse = await fetch(mediaUrl);
        const mediaBuffer = await mediaResponse.arrayBuffer();

        await fetch(uploadUrl, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${tokens.accessToken}`,
            "Content-Type": mediaResponse.headers.get("content-type") ?? "application/octet-stream",
          },
          body: mediaBuffer,
        });

        mediaAssets.push(registered.value.asset);
      } catch (error) {
        logger.error("LinkedIn media upload failed", {
          mediaUrl,
          error: String(error),
        });
      }
    }

    if (mediaAssets.length === 0) {
      return { success: false, error: "All media uploads failed" };
    }

    // Step 3: Create UGC post with media
    const postBody = {
      author: authorUrn,
      lifecycleState: "PUBLISHED",
      specificContent: {
        "com.linkedin.ugc.ShareContent": {
          shareCommentary: {
            text: this.buildPostText(content),
          },
          shareMediaCategory: content.mediaType === "video" ? "VIDEO" : "IMAGE",
          media: mediaAssets.map((asset) => ({
            status: "READY",
            media: asset,
          })),
        },
      },
      visibility: {
        "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
      },
    };

    try {
      const result = await linkedinFetch<{ id: string }>(
        `${LINKEDIN_API}/ugcPosts`,
        {
          method: "POST",
          headers: authHeaders(tokens.accessToken),
          body: JSON.stringify(postBody),
        }
      );

      logger.info("LinkedIn media post published", {
        postId: result.id,
        mediaCount: mediaAssets.length,
      });

      return {
        success: true,
        platformPostId: result.id,
        url: `https://www.linkedin.com/feed/update/${result.id}`,
      };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  // ─── Engagement ───────────────────────────────────────

  async getComments(
    tokens: OAuthTokens,
    postId: string
  ): Promise<Comment[]> {
    // URL-encode the post URN
    const encodedUrn = encodeURIComponent(postId);

    try {
      const data = await linkedinFetch<{
        elements: Array<{
          id: string;
          message: { text: string };
          actor: string;
          created: { time: number };
          parentComment?: string;
        }>;
      }>(
        `${LINKEDIN_API}/socialActions/${encodedUrn}/comments?count=50`,
        { headers: authHeaders(tokens.accessToken) }
      );

      return data.elements.map((c) => ({
        id: c.id,
        text: c.message.text,
        authorName: c.actor,
        authorHandle: c.actor,
        createdAt: new Date(c.created.time),
        parentId: c.parentComment,
      }));
    } catch (error) {
      logger.error("LinkedIn getComments failed", {
        postId,
        error: String(error),
      });
      return [];
    }
  }

  async replyToComment(
    tokens: OAuthTokens,
    commentId: string,
    text: string
  ): Promise<void> {
    // commentId format: "urn:li:comment:(urn:li:ugcPost:123,456)"
    // We need to extract the post URN to reply under the right post
    const postUrnMatch = commentId.match(
      /urn:li:comment:\((urn:li:(?:ugcPost|activity):[^,]+),/
    );
    const postUrn = postUrnMatch?.[1];

    if (!postUrn) {
      throw new Error(`Cannot extract post URN from comment: ${commentId}`);
    }

    const profile = await this.getProfile(tokens);
    const encodedUrn = encodeURIComponent(postUrn);

    await linkedinFetch(
      `${LINKEDIN_API}/socialActions/${encodedUrn}/comments`,
      {
        method: "POST",
        headers: authHeaders(tokens.accessToken),
        body: JSON.stringify({
          actor: `urn:li:person:${profile.platformUserId}`,
          message: { text },
          parentComment: commentId,
        }),
      }
    );

    logger.info("LinkedIn comment reply sent", { commentId });
  }

  async getRecentPosts(
    tokens: OAuthTokens,
    limit: number
  ): Promise<{ id: string; text: string; createdAt: Date }[]> {
    const profile = await this.getProfile(tokens);
    const authorUrn = encodeURIComponent(
      `urn:li:person:${profile.platformUserId}`
    );

    try {
      const data = await linkedinFetch<{
        elements: Array<{
          id: string;
          specificContent: {
            "com.linkedin.ugc.ShareContent": {
              shareCommentary: { text: string };
            };
          };
          created: { time: number };
        }>;
      }>(
        `${LINKEDIN_API}/ugcPosts?q=authors&authors=List(${authorUrn})&count=${limit}`,
        { headers: authHeaders(tokens.accessToken) }
      );

      return data.elements.map((post) => ({
        id: post.id,
        text:
          post.specificContent["com.linkedin.ugc.ShareContent"]?.shareCommentary
            ?.text ?? "",
        createdAt: new Date(post.created.time),
      }));
    } catch (error) {
      logger.error("LinkedIn getRecentPosts failed", {
        error: String(error),
      });
      return [];
    }
  }

  // ─── Analytics ────────────────────────────────────────

  async getAnalytics(
    tokens: OAuthTokens,
    dateRange: DateRange
  ): Promise<AnalyticsData> {
    // LinkedIn analytics requires organization admin permissions for full data.
    // For personal profiles, we aggregate from post-level stats.
    const posts = await this.getRecentPosts(tokens, 20);

    let totalImpressions = 0;
    let totalEngagement = 0;
    const topPosts: { postId: string; engagementRate: number }[] = [];

    for (const post of posts) {
      if (
        post.createdAt < dateRange.start ||
        post.createdAt > dateRange.end
      ) {
        continue;
      }

      const encodedUrn = encodeURIComponent(post.id);
      try {
        const stats = await linkedinFetch<{
          elements: Array<{
            totalShareStatistics: {
              impressionCount: number;
              likeCount: number;
              commentCount: number;
              shareCount: number;
              clickCount: number;
              engagement: number;
            };
          }>;
        }>(
          `${LINKEDIN_API}/organizationalEntityShareStatistics?q=organizationalEntity&shares=List(${encodedUrn})`,
          { headers: authHeaders(tokens.accessToken) }
        );

        const stat = stats.elements[0]?.totalShareStatistics;
        if (stat) {
          totalImpressions += stat.impressionCount;
          totalEngagement += stat.likeCount + stat.commentCount + stat.shareCount;
          const rate =
            stat.impressionCount > 0
              ? (stat.likeCount + stat.commentCount + stat.shareCount) /
                stat.impressionCount
              : 0;
          topPosts.push({ postId: post.id, engagementRate: rate });
        }
      } catch {
        // Stats may not be available for personal profiles — skip silently
      }
    }

    topPosts.sort((a, b) => b.engagementRate - a.engagementRate);

    return {
      impressions: totalImpressions,
      reach: totalImpressions, // LinkedIn doesn't distinguish reach from impressions
      engagement: totalEngagement,
      followerDelta: 0, // Requires organization API
      topPosts: topPosts.slice(0, 5),
    };
  }

  async getFollowerInsights(tokens: OAuthTokens): Promise<DemographicData> {
    // Full follower demographics require r_organization_followers on company pages.
    // For personal profiles, return placeholder data.
    logger.info("LinkedIn follower insights requested (limited for personal profiles)");

    return {
      ageRanges: [],
      topLocations: [],
      genderSplit: [],
    };
  }

  // ─── Private Helpers ──────────────────────────────────

  private buildPostText(content: PostContent): string {
    let text = content.text ?? "";

    if (content.hashtags?.length) {
      const hashtagStr = content.hashtags
        .map((h) => (h.startsWith("#") ? h : `#${h}`))
        .join(" ");
      text = `${text}\n\n${hashtagStr}`;
    }

    return text;
  }
}
