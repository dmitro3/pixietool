import { logger } from "@/server/lib/logger";
import { generateWithOpenAI } from "@/server/services/ai/providers/openai";

type Sentiment = "positive" | "neutral" | "negative" | "question";
type Priority = "low" | "medium" | "high" | "urgent";

interface ClassificationResult {
  sentiment: Sentiment;
  sentimentScore: number; // -1.0 to 1.0
  priority: Priority;
}

export async function classifyEngagement(
  text: string,
  authorFollowerCount?: number
): Promise<ClassificationResult> {
  // Try AI classification first, fall back to heuristics
  try {
    const result = await generateWithOpenAI({
      model: "gpt-4o-mini",
      systemPrompt: `You are a sentiment classifier for social media engagement. Classify the sentiment and return JSON only.`,
      userPrompt: `Classify this social media comment/message:

"${text.slice(0, 500)}"

Return JSON: { "sentiment": "positive"|"neutral"|"negative"|"question", "sentimentScore": <float -1.0 to 1.0> }`,
      temperature: 0.1,
      maxTokens: 100,
      responseFormat: "json",
    });

    const cleaned = result.content.replace(/```json\n?|```\n?/g, "").trim();
    const parsed = JSON.parse(cleaned) as {
      sentiment: Sentiment;
      sentimentScore: number;
    };

    const priority = calculatePriority(
      parsed.sentiment,
      parsed.sentimentScore,
      authorFollowerCount
    );

    logger.debug("AI engagement classification", {
      sentiment: parsed.sentiment,
      score: parsed.sentimentScore,
      priority,
    });

    return {
      sentiment: parsed.sentiment,
      sentimentScore: parsed.sentimentScore,
      priority,
    };
  } catch (error) {
    logger.warn("AI classification failed, using heuristics", {
      error: String(error),
    });
    return classifyWithHeuristics(text, authorFollowerCount);
  }
}

function classifyWithHeuristics(
  text: string,
  authorFollowerCount?: number
): ClassificationResult {
  const lower = text.toLowerCase();

  let sentiment: Sentiment = "neutral";
  let sentimentScore = 0;

  if (/\?/.test(text) && !/!/.test(text)) {
    sentiment = "question";
    sentimentScore = 0;
  } else if (
    /love|great|amazing|awesome|thank|congrats|excellent|brilliant|insightful|helpful|inspiring|well\s*said/i.test(
      lower
    )
  ) {
    sentiment = "positive";
    sentimentScore = 0.7;
    // Stronger positivity
    if (/love|amazing|brilliant|inspiring/i.test(lower)) sentimentScore = 0.9;
  } else if (
    /hate|terrible|awful|worst|disappointed|scam|fake|misleading|wrong|spam/i.test(
      lower
    )
  ) {
    sentiment = "negative";
    sentimentScore = -0.7;
    if (/hate|scam|fake|awful/i.test(lower)) sentimentScore = -0.9;
  } else if (/agree|true|right|yes|exactly|indeed/i.test(lower)) {
    sentiment = "positive";
    sentimentScore = 0.4;
  } else if (/disagree|no|wrong|but|however/i.test(lower)) {
    sentiment = "negative";
    sentimentScore = -0.3;
  }

  const priority = calculatePriority(
    sentiment,
    sentimentScore,
    authorFollowerCount
  );

  logger.debug("Heuristic engagement classification", {
    sentiment,
    priority,
  });

  return { sentiment, sentimentScore, priority };
}

function calculatePriority(
  sentiment: Sentiment,
  score: number,
  authorFollowerCount?: number
): Priority {
  let priority: Priority = "medium";

  // Negative sentiment → high priority (needs attention)
  if (sentiment === "negative" || score < -0.5) priority = "high";

  // Questions → high priority (engagement opportunity)
  if (sentiment === "question") priority = "high";

  // Very positive from high-follower accounts → high (amplification opportunity)
  if (sentiment === "positive" && score > 0.7 && authorFollowerCount && authorFollowerCount > 5000) {
    priority = "high";
  }

  // High-follower authors escalate one level
  if (authorFollowerCount && authorFollowerCount > 10000) {
    if (priority === "high") priority = "urgent";
    else if (priority === "medium") priority = "high";
  }

  // Very negative + influential → urgent
  if (score < -0.7 && authorFollowerCount && authorFollowerCount > 5000) {
    priority = "urgent";
  }

  return priority;
}
