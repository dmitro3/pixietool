// Platform character limits
export const PLATFORM_LIMITS = {
  linkedin: {
    textPost: 3000,
    articleTitle: 150,
    comment: 1250,
  },
  x: {
    tweet: 280,
    tweetPremium: 25000,
    dm: 10000,
  },
  instagram: {
    caption: 2200,
    bio: 150,
    comment: 2200,
  },
  tiktok: {
    caption: 2200,
    comment: 150,
  },
  youtube: {
    title: 100,
    description: 5000,
    comment: 10000,
  },
  threads: {
    post: 500,
    reply: 500,
  },
} as const;

// Content types per platform
export const PLATFORM_CONTENT_TYPES = {
  linkedin: ["text", "image", "carousel", "video", "poll"] as const,
  x: ["text", "image", "video", "thread", "poll"] as const,
  instagram: ["image", "carousel", "reel", "story"] as const,
  tiktok: ["video"] as const,
  youtube: ["video", "short"] as const,
  threads: ["text", "image"] as const,
} as const;

// Plan tier limits
export const PLAN_LIMITS = {
  free: {
    brands: 1,
    postsPerMonth: 10,
    platforms: 1,
    aiCredits: 50,
  },
  creator: {
    brands: 1,
    postsPerMonth: 60,
    platforms: 3,
    aiCredits: 500,
  },
  pro: {
    brands: 3,
    postsPerMonth: 300,
    platforms: 6,
    aiCredits: 2000,
  },
  agency: {
    brands: 10,
    postsPerMonth: 1000,
    platforms: 6,
    aiCredits: 10000,
  },
  enterprise: {
    brands: Infinity,
    postsPerMonth: Infinity,
    platforms: 6,
    aiCredits: Infinity,
  },
} as const;

// AI model identifiers
export const AI_MODELS = {
  GPT4O: "gpt-4o",
  GPT4O_MINI: "gpt-4o-mini",
  CLAUDE_OPUS: "claude-opus-4-6",
  CLAUDE_SONNET: "claude-sonnet-4-6",
  CLAUDE_HAIKU: "claude-haiku-4-5-20251001",
  GEMINI_PRO: "gemini-2.5-pro",
} as const;
