export interface ContentTemplate {
  id: string;
  name: string;
  description: string;
  platform: "linkedin" | "x" | "instagram" | "any";
  contentType: "text" | "carousel" | "thread" | "poll";
  category: "thought-leadership" | "engagement" | "promotion" | "storytelling" | "educational";
  promptTemplate: string;
  exampleOutput: string;
}

export const CONTENT_TEMPLATES: ContentTemplate[] = [
  // ─── LinkedIn ─────────────────────────────────────
  {
    id: "li-hot-take",
    name: "Hot Take",
    description: "A bold opinion that sparks discussion",
    platform: "linkedin",
    contentType: "text",
    category: "thought-leadership",
    promptTemplate: "Write a bold, contrarian opinion about {{topic}} that challenges conventional wisdom. Open with a provocative one-liner. Support with 2-3 specific observations. End with a question that invites debate.",
    exampleOutput: "Most companies don't have a hiring problem.\n\nThey have a management problem.\n\nI've watched 3 startups this year hire 50+ people while their best performers quietly left. Every time, the exit interviews said the same thing:\n\n→ No clear growth path\n→ Decisions made without context\n→ Meetings about meetings\n\nYou can't out-hire bad leadership.\n\nWhat's the #1 reason you've seen top talent leave?",
  },
  {
    id: "li-lesson-learned",
    name: "Lesson Learned",
    description: "A personal story with a clear takeaway",
    platform: "linkedin",
    contentType: "text",
    category: "storytelling",
    promptTemplate: "Share a personal professional experience about {{topic}}. Start with the situation (1-2 lines). Describe what happened. Reveal the lesson. Make it specific and vulnerable, not generic advice.",
    exampleOutput: "Last year I turned down a $200K contract.\n\nThe client wanted us to build something we knew wouldn't work. We could have taken the money, delivered exactly what they asked for, and walked away.\n\nInstead, I spent 30 minutes explaining why their approach would fail and what they should do instead.\n\nThey went with another vendor.\n\n6 months later, they came back. The other vendor built exactly what they asked for. It didn't work.\n\nWe rebuilt it properly.\n\nThe lesson: Short-term honesty beats long-term regret. Every time.",
  },
  {
    id: "li-framework",
    name: "Framework / How-To",
    description: "A step-by-step framework others can use",
    platform: "linkedin",
    contentType: "text",
    category: "educational",
    promptTemplate: "Create a practical framework for {{topic}}. Name it something memorable. Break it into 3-5 clear steps. Each step should be one sentence with an actionable detail. End with why this matters.",
    exampleOutput: "The 3-2-1 Content Rule that grew my audience 4x:\n\n3 — Value posts per week (teach something specific)\n2 — Story posts per week (share a real experience)\n1 — Ask post per week (engage your audience directly)\n\nWhy this works:\n→ Value builds authority\n→ Stories build connection\n→ Asks build community\n\nConsistency > virality. Every time.\n\nSave this and try it for 30 days.",
  },
  {
    id: "li-myth-busting",
    name: "Myth Buster",
    description: "Debunk a common misconception",
    platform: "linkedin",
    contentType: "text",
    category: "thought-leadership",
    promptTemplate: "Debunk a widely-held belief about {{topic}}. State the myth clearly. Explain why people believe it. Then present the reality with evidence or experience. Keep it punchy.",
    exampleOutput: "\"You need to post every day to grow on LinkedIn.\"\n\nThis is terrible advice.\n\nI grew from 2K to 50K followers posting 3x/week. Here's what actually matters:\n\n1. Quality > quantity (one great post beats five mediocre ones)\n2. Consistency > frequency (same 3 days every week beats random daily)\n3. Engagement > posting (spend 20 min commenting for every post you write)\n\nStop chasing the algorithm. Start helping people.\n\nThe growth follows.",
  },
  {
    id: "li-list-post",
    name: "Numbered List",
    description: "A list of tips, tools, or insights",
    platform: "linkedin",
    contentType: "text",
    category: "educational",
    promptTemplate: "Create a numbered list of {{count}} insights about {{topic}}. Each item should be one specific, actionable point. Open with a hook that promises value. Close with a save/share CTA.",
    exampleOutput: "7 things I wish I knew before my first product launch:\n\n1. Your first 100 users will find bugs you never imagined\n2. The feature you're most proud of will be the least used\n3. Support emails teach you more than analytics\n4. Price higher than you think — you can always discount\n5. Launch day matters less than launch week\n6. Your landing page needs one CTA, not five\n7. Nobody cares about your tech stack, only your solution\n\nSave this for your next launch.\n\nWhat would you add?",
  },

  // ─── X / Twitter ──────────────────────────────────
  {
    id: "x-thread-starter",
    name: "Thread Opener",
    description: "A hook tweet that starts a viral thread",
    platform: "x",
    contentType: "text",
    category: "engagement",
    promptTemplate: "Write a compelling thread opener about {{topic}} in under 280 characters. It should create curiosity and make people click 'Show more'. Use a bold statement, a surprising stat, or a counterintuitive claim.",
    exampleOutput: "I studied 100 viral tweets last month.\n\n90% followed the same 3 patterns.\n\nHere's the formula nobody talks about: 🧵",
  },
  {
    id: "x-engagement-bait",
    name: "Engagement Hook",
    description: "A tweet designed to drive replies",
    platform: "x",
    contentType: "text",
    category: "engagement",
    promptTemplate: "Write a tweet about {{topic}} that naturally invites replies. Use a question, a fill-in-the-blank, or a 'wrong answers only' format. Keep under 200 characters for quote-tweet room.",
    exampleOutput: "Unpopular opinion:\n\nThe best career advice you ever received was ___",
  },

  // ─── Instagram ────────────────────────────────────
  {
    id: "ig-carousel-outline",
    name: "Carousel Outline",
    description: "A 5-7 slide carousel structure",
    platform: "instagram",
    contentType: "carousel",
    category: "educational",
    promptTemplate: "Create a carousel outline about {{topic}}. Slide 1: bold hook. Slides 2-6: one key point each with a short explanation. Slide 7: CTA to save/share. Each slide should be one sentence max.",
    exampleOutput: "Slide 1: 5 pricing mistakes killing your conversions\nSlide 2: Offering too many plans (3 max)\nSlide 3: Hiding your prices (always show them)\nSlide 4: No annual discount (offer 20% off)\nSlide 5: Feature-based pricing (use outcome-based)\nSlide 6: No free trial or money-back (reduce risk)\nSlide 7: Save this → Fix these and watch conversions climb",
  },

  // ─── Universal ────────────────────────────────────
  {
    id: "any-poll",
    name: "Quick Poll",
    description: "A simple poll that drives engagement",
    platform: "any",
    contentType: "poll",
    category: "engagement",
    promptTemplate: "Create a poll about {{topic}} with a short intro question and 3-4 options. The question should be opinionated enough that people want to see results. Include one surprise/humorous option.",
    exampleOutput: "What's your biggest productivity killer?\n\n🔴 Meetings that should be emails\n🟡 Slack notifications\n🟢 Context switching between projects\n🔵 The existential dread of an empty Google Doc",
  },
  {
    id: "any-before-after",
    name: "Before / After",
    description: "Show transformation or improvement",
    platform: "any",
    contentType: "text",
    category: "promotion",
    promptTemplate: "Write a before/after comparison about {{topic}}. Paint the 'before' pain vividly. Show the 'after' transformation. Keep it concise — the contrast should be sharp and immediate.",
    exampleOutput: "Before:\n— 4 hours writing one LinkedIn post\n— Staring at blank screen\n— Zero engagement\n— Posting randomly\n\nAfter:\n— 15 minutes per post with AI assist\n— Content calendar filled for the month\n— 3x more comments and shares\n— Consistent schedule, growing audience\n\nThe difference? A system, not willpower.",
  },
];

export function getTemplatesByPlatform(platform: string): ContentTemplate[] {
  return CONTENT_TEMPLATES.filter(
    (t) => t.platform === platform || t.platform === "any"
  );
}

export function getTemplatesByCategory(category: string): ContentTemplate[] {
  return CONTENT_TEMPLATES.filter((t) => t.category === category);
}

export function getTemplateById(id: string): ContentTemplate | undefined {
  return CONTENT_TEMPLATES.find((t) => t.id === id);
}
