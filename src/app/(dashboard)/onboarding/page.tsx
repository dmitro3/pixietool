"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  Building2,
  Mic,
  Target,
  ArrowRight,
  ArrowLeft,
  Check,
  Linkedin,
  Globe,
} from "lucide-react";

const STEPS = [
  { title: "Create Your Brand", icon: Building2 },
  { title: "Define Your Voice", icon: Mic },
  { title: "Set Your Goals", icon: Target },
  { title: "Connect Platforms", icon: Globe },
];

const TONE_OPTIONS = [
  "Professional", "Casual", "Witty", "Inspirational",
  "Educational", "Bold", "Empathetic", "Authoritative",
  "Playful", "Minimalist",
];

const NICHE_OPTIONS = [
  "Tech/SaaS", "Marketing", "Finance", "Health & Wellness",
  "E-commerce", "Creator Economy", "Real Estate", "Education",
  "AI/ML", "Startup",
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);

  // Step 1: Brand
  const [brandName, setBrandName] = useState("");
  const [niche, setNiche] = useState("");
  const [targetAudience, setTargetAudience] = useState("");

  // Step 2: Voice
  const [selectedTones, setSelectedTones] = useState<string[]>([]);
  const [voiceDescription, setVoiceDescription] = useState("");
  const [topicsToAvoid, setTopicsToAvoid] = useState("");

  // Step 3: Goals
  const [goal, setGoal] = useState<"grow" | "engage" | "convert" | "">("");
  const [postFrequency, setPostFrequency] = useState("3");

  const createOrg = trpc.auth.createOrg.useMutation();

  const createBrand = trpc.brands.create.useMutation({
    onSuccess: () => {
      toast.success("Brand created! Welcome to Pixie Social.");
      router.push("/overview");
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  function toggleTone(tone: string) {
    setSelectedTones((prev) =>
      prev.includes(tone) ? prev.filter((t) => t !== tone) : [...prev, tone].slice(0, 4)
    );
  }

  function handleFinish() {
    if (!brandName.trim()) {
      toast.error("Brand name is required");
      setStep(0);
      return;
    }

    // Create org first, then brand
    createOrg.mutate(
      { name: `${brandName}'s Organization` },
      {
        onSuccess: (org) => {
          createBrand.mutate({
            orgId: org.id,
            name: brandName,
            niche: niche || undefined,
            targetAudience: targetAudience || undefined,
            voiceDescription:
              voiceDescription || selectedTones.join(", ") || undefined,
          });
        },
        onError: (err) => {
          toast.error(err.message);
        },
      }
    );
  }

  const canNext =
    step === 0
      ? brandName.trim().length > 0
      : step === 1
        ? selectedTones.length > 0
        : step === 2
          ? goal !== ""
          : true;

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      {/* Progress */}
      <div className="flex items-center justify-center gap-2 mb-8">
        {STEPS.map((s, i) => (
          <div key={i} className="flex items-center gap-2">
            <div
              className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                i < step
                  ? "pixie-gradient text-white"
                  : i === step
                    ? "ring-2 ring-primary bg-primary/10 text-primary"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              {i < step ? <Check className="h-4 w-4" /> : i + 1}
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`h-0.5 w-8 transition-colors ${
                  i < step ? "bg-primary" : "bg-muted"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      <Card className="pixie-card">
        <CardHeader className="text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl pixie-gradient mx-auto mb-3 shadow-lg shadow-primary/20">
            {(() => {
              const Icon = STEPS[step].icon;
              return <Icon className="h-6 w-6 text-white" />;
            })()}
          </div>
          <CardTitle className="text-2xl">{STEPS[step].title}</CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Step 1: Brand Info */}
          {step === 0 && (
            <>
              <div className="space-y-2">
                <Label htmlFor="brandName">Brand Name *</Label>
                <Input
                  id="brandName"
                  placeholder="e.g., Acme Corp, Your Name"
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Industry / Niche</Label>
                <div className="flex flex-wrap gap-2">
                  {NICHE_OPTIONS.map((n) => (
                    <Badge
                      key={n}
                      variant={niche === n ? "default" : "outline"}
                      className={`cursor-pointer transition-all ${
                        niche === n ? "pixie-gradient border-0 text-white" : "hover:bg-accent"
                      }`}
                      onClick={() => setNiche(niche === n ? "" : n)}
                    >
                      {n}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="audience">Target Audience</Label>
                <Input
                  id="audience"
                  placeholder="e.g., SaaS founders, marketing professionals"
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                />
              </div>
            </>
          )}

          {/* Step 2: Voice */}
          {step === 1 && (
            <>
              <div className="space-y-2">
                <Label>Pick up to 4 tone descriptors</Label>
                <div className="flex flex-wrap gap-2">
                  {TONE_OPTIONS.map((tone) => (
                    <Badge
                      key={tone}
                      variant={selectedTones.includes(tone) ? "default" : "outline"}
                      className={`cursor-pointer transition-all ${
                        selectedTones.includes(tone)
                          ? "pixie-gradient border-0 text-white"
                          : "hover:bg-accent"
                      }`}
                      onClick={() => toggleTone(tone)}
                    >
                      {tone}
                    </Badge>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  {selectedTones.length}/4 selected
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="voice">Describe your voice (optional)</Label>
                <Textarea
                  id="voice"
                  placeholder="e.g., We speak like a knowledgeable friend — direct, no jargon, with a dash of humor"
                  value={voiceDescription}
                  onChange={(e) => setVoiceDescription(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="avoid">Topics to avoid</Label>
                <Input
                  id="avoid"
                  placeholder="e.g., politics, competitors, controversy"
                  value={topicsToAvoid}
                  onChange={(e) => setTopicsToAvoid(e.target.value)}
                />
              </div>
            </>
          )}

          {/* Step 3: Goals */}
          {step === 2 && (
            <>
              <div className="space-y-3">
                <Label>What&apos;s your primary goal?</Label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: "grow", label: "Grow Audience", desc: "Increase followers and reach" },
                    { value: "engage", label: "Boost Engagement", desc: "More comments, shares, saves" },
                    { value: "convert", label: "Drive Conversions", desc: "Leads, signups, sales" },
                    { value: "authority", label: "Build Authority", desc: "Thought leadership positioning" },
                  ].map((g) => (
                    <button
                      key={g.value}
                      onClick={() => setGoal(g.value as typeof goal)}
                      className={`text-left rounded-lg border p-4 transition-all ${
                        goal === g.value
                          ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                          : "hover:bg-accent/50"
                      }`}
                    >
                      <p className="text-sm font-medium">{g.label}</p>
                      <p className="text-xs text-muted-foreground">{g.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="freq">Posts per week</Label>
                <Input
                  id="freq"
                  type="number"
                  min="1"
                  max="21"
                  value={postFrequency}
                  onChange={(e) => setPostFrequency(e.target.value)}
                />
              </div>
            </>
          )}

          {/* Step 4: Connect Platforms */}
          {step === 3 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                Connect your social accounts. You can always do this later in Settings.
              </p>
              <div className="space-y-3">
                {[
                  { name: "LinkedIn", icon: Linkedin, available: true },
                  { name: "X (Twitter)", icon: Globe, available: true },
                  { name: "Instagram", icon: Globe, available: true },
                ].map((platform) => (
                  <div
                    key={platform.name}
                    className="flex items-center justify-between rounded-lg border p-4"
                  >
                    <div className="flex items-center gap-3">
                      <platform.icon className="h-5 w-5 text-muted-foreground" />
                      <span className="text-sm font-medium">{platform.name}</span>
                    </div>
                    <Button variant="outline" size="sm" disabled>
                      Connect
                    </Button>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Platform connection requires Supabase auth. Skip for now and connect later.
              </p>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between pt-4">
            <Button
              variant="ghost"
              onClick={() => setStep(step - 1)}
              disabled={step === 0}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>

            {step < STEPS.length - 1 ? (
              <Button
                onClick={() => setStep(step + 1)}
                disabled={!canNext}
                className="gap-2 pixie-gradient border-0 text-white hover:opacity-90"
              >
                Next
                <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={handleFinish}
                disabled={createBrand.isPending || createOrg.isPending}
                className="gap-2 pixie-gradient border-0 text-white hover:opacity-90"
              >
                <Sparkles className="h-4 w-4" />
                {createBrand.isPending || createOrg.isPending ? "Creating..." : "Launch Pixie"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
