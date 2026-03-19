"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { useBrandStore } from "@/hooks/use-brand";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Sparkles,
  PenLine,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Copy,
  RotateCcw,
} from "lucide-react";

const PLATFORMS = [
  { value: "linkedin", label: "LinkedIn" },
  { value: "x", label: "X (Twitter)" },
  { value: "instagram", label: "Instagram" },
  { value: "tiktok", label: "TikTok" },
  { value: "youtube", label: "YouTube" },
  { value: "threads", label: "Threads" },
] as const;

const CONTENT_TYPES: Record<string, { value: string; label: string }[]> = {
  linkedin: [
    { value: "text", label: "Text Post" },
    { value: "image", label: "Image Post" },
    { value: "carousel", label: "Carousel" },
    { value: "poll", label: "Poll" },
  ],
  x: [
    { value: "text", label: "Tweet" },
    { value: "thread", label: "Thread" },
    { value: "image", label: "Image" },
  ],
  instagram: [
    { value: "image", label: "Image" },
    { value: "carousel", label: "Carousel" },
    { value: "reel", label: "Reel" },
    { value: "story", label: "Story" },
  ],
  tiktok: [{ value: "video", label: "Video" }],
  youtube: [
    { value: "video", label: "Video" },
    { value: "short", label: "Short" },
  ],
  threads: [
    { value: "text", label: "Text" },
    { value: "image", label: "Image" },
  ],
};

const CONTENT_PILLARS = [
  "Thought Leadership",
  "Educational",
  "Behind the Scenes",
  "Industry News",
  "Case Studies",
  "Tips & Tricks",
  "Community",
  "Product Updates",
  "Personal Story",
  "Trending Topic",
];

type GenerateResult = {
  id: string;
  text: string;
  hashtags: string[];
  hookType: string;
  cta: string;
  qualityScore: number;
  qualityPass: boolean;
  suggestions: string[];
  violations: string[];
  modelUsed: string;
  tokensUsed: number;
  durationMs: number;
  attempts: number;
};

export function CreateContentDialog({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"ai" | "manual">("ai");
  const activeBrandId = useBrandStore((s) => s.activeBrandId);
  const utils = trpc.useUtils();

  // AI generation state
  const [platform, setPlatform] = useState("linkedin");
  const [contentType, setContentType] = useState("text");
  const [contentPillar, setContentPillar] = useState("");
  const [topic, setTopic] = useState("");
  const [additionalContext, setAdditionalContext] = useState("");
  const [result, setResult] = useState<GenerateResult | null>(null);

  // Manual state
  const [manualText, setManualText] = useState("");
  const [manualHashtags, setManualHashtags] = useState("");

  const generateMutation = trpc.content.generate.useMutation({
    onSuccess: (data) => {
      setResult(data);
      toast.success("Content generated!");
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const createMutation = trpc.content.create.useMutation({
    onSuccess: () => {
      toast.success("Draft saved!");
      utils.content.list.invalidate();
      utils.content.countByStatus.invalidate();
      resetAndClose();
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const updateStatusMutation = trpc.content.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Content approved!");
      utils.content.list.invalidate();
      utils.content.countByStatus.invalidate();
      resetAndClose();
    },
  });

  function resetAndClose() {
    setResult(null);
    setPlatform("linkedin");
    setContentType("text");
    setContentPillar("");
    setTopic("");
    setAdditionalContext("");
    setManualText("");
    setManualHashtags("");
    setOpen(false);
  }

  function handleGenerate() {
    if (!activeBrandId) {
      toast.error("Select a brand first");
      return;
    }
    if (!contentPillar) {
      toast.error("Select a content pillar");
      return;
    }

    generateMutation.mutate({
      brandId: activeBrandId,
      platform: platform as "linkedin",
      contentType: contentType as "text",
      contentPillar,
      topic: topic || undefined,
      additionalContext: additionalContext || undefined,
    });
  }

  function handleSaveManual() {
    if (!activeBrandId) {
      toast.error("Select a brand first");
      return;
    }
    if (!manualText.trim()) {
      toast.error("Write some content first");
      return;
    }

    const hashtags = manualHashtags
      .split(",")
      .map((h) => h.trim())
      .filter(Boolean);

    createMutation.mutate({
      brandId: activeBrandId,
      platform: platform as "linkedin",
      contentType: contentType as "text",
      textContent: manualText,
      hashtags: hashtags.length > 0 ? hashtags : undefined,
      createdBy: "human",
    });
  }

  function handleApprove() {
    if (!result?.id) return;
    updateStatusMutation.mutate({ id: result.id, status: "approved" });
  }

  function handleRegenerate() {
    setResult(null);
    handleGenerate();
  }

  const isGenerating = generateMutation.isPending;
  const availableTypes = CONTENT_TYPES[platform] ?? CONTENT_TYPES.linkedin;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={children as React.ReactElement} />
      <DialogContent className="sm:max-w-[640px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Content</DialogTitle>
          <DialogDescription>
            Generate AI-powered content or compose manually.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={mode} onValueChange={(v) => { if (v) setMode(v as "ai" | "manual"); }}>
          <TabsList className="w-full">
            <TabsTrigger value="ai" className="flex-1 gap-2">
              <Sparkles className="h-4 w-4" />
              AI Generate
            </TabsTrigger>
            <TabsTrigger value="manual" className="flex-1 gap-2">
              <PenLine className="h-4 w-4" />
              Manual
            </TabsTrigger>
          </TabsList>

          {/* ─── Shared: Platform & Type ─── */}
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="space-y-2">
              <Label>Platform</Label>
              <Select value={platform} onValueChange={(v) => { if (!v) return; setPlatform(v); setContentType(CONTENT_TYPES[v]?.[0]?.value ?? "text"); }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PLATFORMS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Content Type</Label>
              <Select value={contentType} onValueChange={(v) => { if (v) setContentType(v); }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableTypes.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* ─── AI Generation Tab ─── */}
          <TabsContent value="ai" className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label>Content Pillar</Label>
              <Select value={contentPillar} onValueChange={(v) => { if (v) setContentPillar(v); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a content pillar..." />
                </SelectTrigger>
                <SelectContent>
                  {CONTENT_PILLARS.map((pillar) => (
                    <SelectItem key={pillar} value={pillar}>
                      {pillar}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Topic (optional)</Label>
              <Input
                placeholder="e.g., Remote work productivity tips"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Additional Context (optional)</Label>
              <Textarea
                placeholder="Any extra context, key points, or angles to cover..."
                value={additionalContext}
                onChange={(e) => setAdditionalContext(e.target.value)}
                className="min-h-[80px]"
              />
            </div>

            {/* ─── Generation Result ─── */}
            {result && (
              <>
                <Separator />
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-sm">Generated Content</h4>
                    <div className="flex items-center gap-2">
                      {result.qualityPass ? (
                        <Badge variant="default" className="gap-1 bg-green-600">
                          <CheckCircle2 className="h-3 w-3" />
                          Score: {result.qualityScore}
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          Score: {result.qualityScore}
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-xs">
                        {result.modelUsed}
                      </Badge>
                    </div>
                  </div>

                  <div className="rounded-lg border bg-muted/50 p-4 text-sm whitespace-pre-wrap">
                    {result.text}
                  </div>

                  {result.hashtags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {result.hashtags.map((h) => (
                        <Badge key={h} variant="secondary" className="text-xs">
                          #{h}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {result.violations.length > 0 && (
                    <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-3">
                      <p className="text-xs font-medium text-destructive mb-1">Quality Issues</p>
                      <ul className="text-xs text-destructive/80 space-y-0.5">
                        {result.violations.map((v, i) => (
                          <li key={i}>- {v}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {result.suggestions.length > 0 && (
                    <div className="rounded-lg border bg-blue-50 dark:bg-blue-950/20 p-3">
                      <p className="text-xs font-medium text-blue-700 dark:text-blue-300 mb-1">Suggestions</p>
                      <ul className="text-xs text-blue-600 dark:text-blue-400 space-y-0.5">
                        {result.suggestions.map((s, i) => (
                          <li key={i}>- {s}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{result.tokensUsed} tokens</span>
                    <span>·</span>
                    <span>{(result.durationMs / 1000).toFixed(1)}s</span>
                    <span>·</span>
                    <span>{result.attempts} attempt{result.attempts > 1 ? "s" : ""}</span>
                  </div>
                </div>
              </>
            )}

            <DialogFooter className="gap-2 sm:gap-0">
              {result ? (
                <>
                  <Button
                    variant="outline"
                    onClick={handleRegenerate}
                    disabled={isGenerating}
                    className="gap-2"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Regenerate
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(result.text);
                      toast.success("Copied to clipboard");
                    }}
                    className="gap-2"
                  >
                    <Copy className="h-4 w-4" />
                    Copy
                  </Button>
                  <Button onClick={handleApprove} className="gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    Approve
                  </Button>
                </>
              ) : (
                <Button
                  onClick={handleGenerate}
                  disabled={isGenerating || !contentPillar}
                  className="gap-2"
                >
                  {isGenerating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  {isGenerating ? "Generating..." : "Generate"}
                </Button>
              )}
            </DialogFooter>
          </TabsContent>

          {/* ─── Manual Tab ─── */}
          <TabsContent value="manual" className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label>Content</Label>
              <Textarea
                placeholder="Write your post..."
                value={manualText}
                onChange={(e) => setManualText(e.target.value)}
                className="min-h-[160px]"
              />
              <p className="text-xs text-muted-foreground text-right">
                {manualText.length} characters
              </p>
            </div>

            <div className="space-y-2">
              <Label>Hashtags (comma-separated)</Label>
              <Input
                placeholder="e.g., marketing, strategy, growth"
                value={manualHashtags}
                onChange={(e) => setManualHashtags(e.target.value)}
              />
            </div>

            <DialogFooter>
              <Button
                onClick={handleSaveManual}
                disabled={createMutation.isPending || !manualText.trim()}
                className="gap-2"
              >
                {createMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <PenLine className="h-4 w-4" />
                )}
                Save Draft
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
