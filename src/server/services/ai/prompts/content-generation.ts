import { PLATFORM_LIMITS } from "@/server/lib/constants";
import { CONTENT_TEMPLATES, type ContentTemplate } from "@/server/services/content/templates";

interface ContentPromptInput {
  platform: string;
  contentType: string;
  contentPillar: string;
  brandVoice: string;
  targetAudience: string;
  niche: string;
  topic?: string;
  additionalContext?: string;
  templateName?: string;
  toneDescriptors?: string[];
  topicsToAvoid?: string[];
  examplePosts?: string[];
}

function getCharacterLimit(platform: string, contentType: string): number {
  const limits = PLATFORM_LIMITS[platform as keyof typeof PLATFORM_LIMITS];
  if (!limits) return 3000;

  // Map content types to the right limit key
  const limitMap: Record<string, Record<string, string>> = {
    linkedin: { text: "textPost", carousel: "textPost", image: "textPost" },
    x: { text: "tweet", thread: "tweet", image: "tweet" },
    instagram: { image: "caption", carousel: "caption", reel: "caption", story: "caption" },
    tiktok: { video: "caption" },
    youtube: { video: "description", short: "description" },
    threads: { text: "post", image: "post" },
  };

  const key = limitMap[platform]?.[contentType] ?? Object.keys(limits)[0];
  return (limits as Record<string, number>)[key] ?? 3000;
}

function findTemplate(platform: string, contentType: string, templateName?: string): ContentTemplate | undefined {
  if (templateName) {
    return CONTENT_TEMPLATES.find((t) => t.name === templateName);
  }
  // Pick a random matching template for variety
  const matching = CONTENT_TEMPLATES.filter(
    (t) => t.platform === platform && t.contentType === contentType
  );
  if (matching.length === 0) return undefined;
  return matching[Math.floor(Math.random() * matching.length)];
}

function buildFewShotSection(examplePosts: string[]): string {
  if (examplePosts.length === 0) return "";

  const examples = examplePosts
    .slice(0, 3) // Max 3 examples
    .map((post, i) => `--- Example ${i + 1} ---\n${post}`)
    .join("\n\n");

  return `\nHere are examples of the brand's best-performing posts. Match this style:\n\n${examples}\n`;
}

export function buildContentGenerationPrompt(input: ContentPromptInput) {
  const charLimit = getCharacterLimit(input.platform, input.contentType);
  const template = findTemplate(input.platform, input.contentType, input.templateName);
  const fewShot = buildFewShotSection(input.examplePosts ?? []);

  const toneSection = input.toneDescriptors?.length
    ? `TONE: ${input.toneDescriptors.join(", ")}`
    : "";

  const avoidSection = input.topicsToAvoid?.length
    ? `NEVER mention or reference: ${input.topicsToAvoid.join(", ")}`
    : "";

  const templateSection = template
    ? `\nFOLLOW THIS STRUCTURE:\n${template.structure}\n`
    : "";

  const systemPrompt = `You are an expert social media content creator specializing in ${input.niche}.
You create platform-native content that drives engagement and growth.

BRAND VOICE: ${input.brandVoice}
TARGET AUDIENCE: ${input.targetAudience}
${toneSection}
${avoidSection}

PLATFORM RULES for ${input.platform}:
- Maximum ${charLimit} characters for the main text
- Content MUST be optimized for the ${input.platform} algorithm
- Use platform-native formatting (line breaks, spacing, emoji usage appropriate to ${input.platform})
${input.platform === "linkedin" ? "- LinkedIn rewards long-form thoughtful posts with strong hooks\n- Use line breaks every 1-2 sentences for mobile readability\n- First line is critical — it appears before the 'see more' fold" : ""}
${input.platform === "x" ? "- Keep it punchy and conversational\n- Threads should have a killer first tweet" : ""}
${input.platform === "instagram" ? "- Captions support longer text but the hook must be visible above the fold\n- Use emojis strategically\n- End with a CTA" : ""}
${fewShot}
OUTPUT FORMAT: Return valid JSON with this exact schema:
{
  "text": "The post text content (MUST be under ${charLimit} chars)",
  "hashtags": ["relevant", "hashtags", "max5"],
  "hookType": "question|statistic|story|bold_claim|curiosity_gap",
  "cta": "The call-to-action text embedded in the post",
  "contentPillar": "${input.contentPillar}",
  "estimatedReadTime": "30s|1m|2m|3m+"
}`;

  const userPrompt = `Create a ${input.contentType} post for ${input.platform}.

CONTENT PILLAR: ${input.contentPillar}
${input.topic ? `TOPIC: ${input.topic}` : ""}
${input.additionalContext ? `ADDITIONAL CONTEXT: ${input.additionalContext}` : ""}
${templateSection}
Requirements:
- Match the brand voice EXACTLY — this is non-negotiable
- First line must be a scroll-stopping hook
- End with a clear call-to-action that encourages engagement
- Stay UNDER ${charLimit} characters for the text field
- Use line breaks for mobile readability
- Hashtags should be relevant to ${input.niche} and not generic
- Do NOT use AI-sounding phrases like "in today's fast-paced world" or "let's dive in"`;

  return { systemPrompt, userPrompt };
}
