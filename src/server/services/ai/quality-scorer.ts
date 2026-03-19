import { PLATFORM_LIMITS } from "@/server/lib/constants";
import { logger } from "@/server/lib/logger";

interface ContentQualityInput {
  text: string;
  platform: string;
  contentType: string;
  brandVoice?: string;
  hashtags?: string[];
}

export interface QualityScore {
  overall: number; // 0-100
  pass: boolean; // true if overall >= threshold
  dimensions: {
    hook: number;
    clarity: number;
    brandAlignment: number;
    callToAction: number;
    platformFit: number;
  };
  suggestions: string[];
  violations: string[]; // Hard failures (char limit exceeded, etc.)
}

const QUALITY_THRESHOLD = 55;

// AI-sounding phrases that should be avoided
const AI_SLOP_PATTERNS = [
  /in today'?s (?:fast-paced|ever-changing|digital) world/i,
  /let'?s dive in/i,
  /without further ado/i,
  /game[ -]?changer/i,
  /it'?s no secret that/i,
  /buckle up/i,
  /here'?s the thing/i,
];

function getMaxLength(platform: string): number {
  const limits = PLATFORM_LIMITS[platform as keyof typeof PLATFORM_LIMITS];
  if (!limits) return 3000;
  return (Object.values(limits)[0] as number) ?? 3000;
}

function scoreHook(text: string, platform: string): { score: number; suggestions: string[] } {
  const suggestions: string[] = [];
  const firstLine = text.split("\n")[0] ?? "";
  let score = 50;

  if (firstLine.length === 0) {
    return { score: 0, suggestions: ["Post is empty"] };
  }

  if (firstLine.length >= 20 && firstLine.length <= 150) score += 15;
  else if (firstLine.length < 20) suggestions.push("Hook is too short — make it more compelling");

  if (/^[A-Z\p{Emoji}]/u.test(firstLine)) score += 10;
  if (/\?/.test(firstLine)) score += 10;
  if (/\d/.test(firstLine)) score += 5;
  if (/^(Stop|Don't|Why|How|What|I |The|Most|Nobody|Everyone)/i.test(firstLine)) score += 10;

  if (platform === "linkedin" && firstLine.length > 100) {
    suggestions.push("LinkedIn hook should be under 100 chars — gets cut off on mobile");
    score -= 10;
  }

  return { score: Math.min(score, 100), suggestions };
}

function scoreClarity(text: string): { score: number; suggestions: string[] } {
  const suggestions: string[] = [];
  let score = 50;

  const lineBreaks = (text.match(/\n/g) ?? []).length;
  if (lineBreaks >= 2) score += 15;
  else suggestions.push("Add more line breaks for mobile readability");

  const paragraphs = text.split(/\n\n+/);
  const avgParagraphLen = paragraphs.reduce((s, p) => s + p.length, 0) / paragraphs.length;
  if (avgParagraphLen < 200) score += 10;
  else suggestions.push("Break long paragraphs into shorter chunks");

  if (text.length >= 100) score += 10;
  else suggestions.push("Post is very short — consider adding more substance");

  const capsRatio = (text.match(/[A-Z]/g) ?? []).length / Math.max(text.length, 1);
  if (capsRatio > 0.5) {
    suggestions.push("Too much uppercase — reads as shouting");
    score -= 15;
  }

  return { score: Math.min(score, 100), suggestions };
}

function scoreCTA(text: string): { score: number; suggestions: string[] } {
  const suggestions: string[] = [];
  let score = 30;

  const ctaPatterns = [
    /\?/,
    /comment|share|follow|like|save/i,
    /what (?:do you|are your|would you)/i,
    /let me know/i,
    /agree|disagree/i,
    /link in (?:bio|comments)/i,
    /thoughts\??/i,
  ];

  const matches = ctaPatterns.filter((p) => p.test(text));
  score += Math.min(matches.length * 15, 60);

  if (matches.length === 0) {
    suggestions.push("Add a clear call-to-action (question, comment prompt, etc.)");
  }

  return { score: Math.min(score, 100), suggestions };
}

function scorePlatformFit(
  text: string,
  platform: string,
  hashtags?: string[]
): { score: number; suggestions: string[]; violations: string[] } {
  const suggestions: string[] = [];
  const violations: string[] = [];
  let score = 60;

  const maxLen = getMaxLength(platform);

  if (text.length > maxLen) {
    violations.push(`Text exceeds ${platform} limit: ${text.length}/${maxLen} characters`);
    score -= 30;
  }

  const hashtagCount = hashtags?.length ?? 0;
  if (platform === "linkedin") {
    if (hashtagCount > 5) suggestions.push("LinkedIn: use 3-5 hashtags max");
    if (hashtagCount === 0) suggestions.push("LinkedIn: add 3-5 relevant hashtags");
  } else if (platform === "instagram" && hashtagCount > 30) {
    violations.push("Instagram: maximum 30 hashtags");
  } else if (platform === "x" && hashtagCount > 2) {
    suggestions.push("X/Twitter: 1-2 hashtags perform best");
  }

  const slopMatches = AI_SLOP_PATTERNS.filter((p) => p.test(text));
  if (slopMatches.length > 0) {
    suggestions.push("Remove AI-sounding phrases for authenticity");
    score -= slopMatches.length * 8;
  }

  if (platform === "linkedin" && text.length < 200) {
    suggestions.push("LinkedIn: longer posts (500-1500 chars) tend to perform better");
  }

  return { score: Math.max(Math.min(score, 100), 0), suggestions, violations };
}

export function scoreContent(input: ContentQualityInput): QualityScore {
  const hookResult = scoreHook(input.text, input.platform);
  const clarityResult = scoreClarity(input.text);
  const ctaResult = scoreCTA(input.text);
  const platformResult = scorePlatformFit(input.text, input.platform, input.hashtags);

  const brandAlignment = 60; // Heuristic — full AI scoring is Phase 3

  const dimensions = {
    hook: hookResult.score,
    clarity: clarityResult.score,
    brandAlignment,
    callToAction: ctaResult.score,
    platformFit: platformResult.score,
  };

  const overall = Math.round(
    dimensions.hook * 0.25 +
    dimensions.clarity * 0.15 +
    dimensions.brandAlignment * 0.15 +
    dimensions.callToAction * 0.20 +
    dimensions.platformFit * 0.25
  );

  const suggestions = [
    ...hookResult.suggestions,
    ...clarityResult.suggestions,
    ...ctaResult.suggestions,
    ...platformResult.suggestions,
  ];

  const violations = platformResult.violations;
  const pass = violations.length === 0 && overall >= QUALITY_THRESHOLD;

  logger.debug("Content quality scored", {
    platform: input.platform,
    overall,
    pass,
    violationCount: violations.length,
  });

  return { overall, pass, dimensions, suggestions, violations };
}
