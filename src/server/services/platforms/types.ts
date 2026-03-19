export interface OAuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  scope?: string;
}

export interface ProfileData {
  platformUserId: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  followerCount: number;
  bio?: string;
}

export interface DateRange {
  start: Date;
  end: Date;
}

export interface AnalyticsData {
  impressions: number;
  reach: number;
  engagement: number;
  followerDelta: number;
  topPosts: { postId: string; engagementRate: number }[];
}

export interface PostContent {
  text?: string;
  mediaUrls?: string[];
  hashtags?: string[];
  scheduledFor?: Date;
}

export interface MediaContent extends PostContent {
  mediaType: "image" | "video" | "carousel";
}

export interface PublishResult {
  success: boolean;
  platformPostId?: string;
  url?: string;
  error?: string;
}

export interface Comment {
  id: string;
  text: string;
  authorName: string;
  authorHandle: string;
  createdAt: Date;
  parentId?: string;
}

export interface DemographicData {
  ageRanges: { range: string; percentage: number }[];
  topLocations: { location: string; percentage: number }[];
  genderSplit: { gender: string; percentage: number }[];
}

export interface PlatformAdapter {
  readonly platform: string;

  connect(redirectUrl: string): Promise<string>; // Returns OAuth URL
  handleCallback(code: string): Promise<OAuthTokens>;
  refreshToken(tokens: OAuthTokens): Promise<OAuthTokens>;

  getProfile(tokens: OAuthTokens): Promise<ProfileData>;
  getAnalytics(
    tokens: OAuthTokens,
    dateRange: DateRange
  ): Promise<AnalyticsData>;
  getRecentPosts(
    tokens: OAuthTokens,
    limit: number
  ): Promise<{ id: string; text: string; createdAt: Date }[]>;

  publishPost(tokens: OAuthTokens, content: PostContent): Promise<PublishResult>;
  publishMedia(
    tokens: OAuthTokens,
    content: MediaContent
  ): Promise<PublishResult>;

  getComments(tokens: OAuthTokens, postId: string): Promise<Comment[]>;
  replyToComment(
    tokens: OAuthTokens,
    commentId: string,
    text: string
  ): Promise<void>;

  getFollowerInsights(tokens: OAuthTokens): Promise<DemographicData>;
}
