export interface ContentTemplate {
  name: string;
  platform: string;
  contentType: string;
  structure: string;
  description: string;
}

export const CONTENT_TEMPLATES: ContentTemplate[] = [
  {
    name: "LinkedIn Thought Leadership",
    platform: "linkedin",
    contentType: "text",
    structure: `[Bold opening hook — 1 line]

[Supporting context — 2-3 lines]

[3-5 key points, each on its own line]

[Personal insight or lesson learned]

[Call-to-action question]

[3-5 relevant hashtags]`,
    description: "Long-form text post establishing expertise in your niche",
  },
  {
    name: "LinkedIn Storytelling",
    platform: "linkedin",
    contentType: "text",
    structure: `[Surprising or emotional opening line]

[Set the scene — what happened]

[The challenge or conflict]

[What you did / the turning point]

[The result or lesson]

[Universal takeaway for the audience]

[Question to encourage comments]`,
    description: "Narrative-driven post that creates emotional connection",
  },
  {
    name: "LinkedIn Listicle",
    platform: "linkedin",
    contentType: "text",
    structure: `[Hook: "X things I learned about [topic]" or similar]

1. [Point one]
↳ [Brief explanation]

2. [Point two]
↳ [Brief explanation]

[Continue for 5-7 points]

Which resonates most? Comment below.

#hashtag1 #hashtag2`,
    description: "Numbered list format that performs well for engagement",
  },
  {
    name: "X Thread Opener",
    platform: "x",
    contentType: "thread",
    structure: `[Strong hook that makes people want to read more]

🧵 A thread on [topic]:`,
    description: "Opening tweet for an X/Twitter thread",
  },
  {
    name: "Instagram Carousel Outline",
    platform: "instagram",
    contentType: "carousel",
    structure: `Slide 1: [Hook / Title — bold, eye-catching]
Slide 2: [Problem statement]
Slide 3-6: [Key points / steps / tips — one per slide]
Slide 7: [Summary or recap]
Slide 8: [CTA — Follow, Save, Share]`,
    description: "Educational carousel structure for Instagram",
  },
];
