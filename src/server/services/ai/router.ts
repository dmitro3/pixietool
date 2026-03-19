import { AI_MODELS } from "@/server/lib/constants";
import { logger } from "@/server/lib/logger";

type AITask =
  | "short_content"
  | "long_strategy"
  | "brand_voice"
  | "multimodal"
  | "fast_cheap"
  | "engagement_reply"
  | "diagnostic";

interface ModelSelection {
  primary: string;
  fallback: string;
}

const TASK_MODEL_MAP: Record<AITask, ModelSelection> = {
  short_content: {
    primary: AI_MODELS.GPT4O,
    fallback: AI_MODELS.CLAUDE_SONNET,
  },
  long_strategy: {
    primary: AI_MODELS.CLAUDE_OPUS,
    fallback: AI_MODELS.GPT4O,
  },
  brand_voice: {
    primary: AI_MODELS.CLAUDE_SONNET,
    fallback: AI_MODELS.GPT4O,
  },
  multimodal: {
    primary: AI_MODELS.GEMINI_PRO,
    fallback: AI_MODELS.GPT4O,
  },
  fast_cheap: {
    primary: AI_MODELS.GPT4O_MINI,
    fallback: AI_MODELS.CLAUDE_HAIKU,
  },
  engagement_reply: {
    primary: AI_MODELS.GPT4O,
    fallback: AI_MODELS.CLAUDE_SONNET,
  },
  diagnostic: {
    primary: AI_MODELS.CLAUDE_OPUS,
    fallback: AI_MODELS.GPT4O,
  },
};

export function selectModel(task: AITask): ModelSelection {
  const selection = TASK_MODEL_MAP[task];
  logger.debug("AI model selected", { task, model: selection.primary });
  return selection;
}

export type { AITask };
