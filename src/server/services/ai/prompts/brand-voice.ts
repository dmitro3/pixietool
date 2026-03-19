interface BrandVoiceInput {
  brandName: string;
  niche: string;
  existingContent: string[];
  targetAudience: string;
}

export function buildBrandVoicePrompt(input: BrandVoiceInput) {
  const systemPrompt = `You are a brand strategist who analyzes content to extract and define brand voice profiles.
Analyze the provided content samples and create a detailed voice profile.

OUTPUT FORMAT: Return valid JSON:
{
  "toneDescriptors": ["professional", "witty", ...],
  "vocabularyPreferences": {
    "preferred": ["words to use"],
    "avoided": ["words to avoid"],
    "jargon": ["industry-specific terms"]
  },
  "writingStyle": {
    "sentenceLength": "short|medium|long|varied",
    "formality": "casual|conversational|professional|formal",
    "humor": "none|subtle|moderate|heavy",
    "emojiUsage": "none|minimal|moderate|frequent"
  },
  "topicsToAvoid": ["..."],
  "examplePhrases": ["characteristic phrases from the content"]
}`;

  const userPrompt = `Analyze these content samples from ${input.brandName} (niche: ${input.niche}, audience: ${input.targetAudience}) and extract the brand voice:

${input.existingContent.map((content, i) => `--- Sample ${i + 1} ---\n${content}`).join("\n\n")}`;

  return { systemPrompt, userPrompt };
}
