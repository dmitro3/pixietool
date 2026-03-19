"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Plus,
  Building2,
  Edit,
  Trash2,
  Loader2,
  Mic2,
  Target,
  Users,
  Sparkles,
} from "lucide-react";

export default function BrandsPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const { data: brands, isLoading } = trpc.brands.list.useQuery();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Brands</h1>
          <p className="text-muted-foreground">
            Manage your brands and their voice profiles.
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 cursor-pointer">
            <Plus className="h-4 w-4" />
            Add Brand
          </DialogTrigger>
          <CreateBrandForm onClose={() => setCreateOpen(false)} />
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-4 w-60" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : brands && brands.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {brands.map((brand) => (
            <BrandCard key={brand.id} brand={brand} />
          ))}
        </div>
      ) : (
        <Card>
          <CardHeader className="items-center text-center py-12">
            <Building2 className="h-12 w-12 text-muted-foreground/40 mb-2" />
            <CardTitle>No brands yet</CardTitle>
            <CardDescription>
              Create your first brand to start connecting social media accounts
              and generating content.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center pb-8">
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger className="inline-flex items-center justify-center gap-2 rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent cursor-pointer">
                <Building2 className="h-4 w-4" />
                Create Brand
              </DialogTrigger>
              <CreateBrandForm onClose={() => setCreateOpen(false)} />
            </Dialog>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function CreateBrandForm({ onClose }: { onClose: () => void }) {
  const utils = trpc.useUtils();
  const [name, setName] = useState("");
  const [niche, setNiche] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [voiceDescription, setVoiceDescription] = useState("");

  // We need user's org ID — get it from the profile or first org
  const { data: profile } = trpc.auth.getProfile.useQuery();

  const createMutation = trpc.brands.create.useMutation({
    onSuccess: () => {
      toast.success("Brand created!");
      utils.brands.list.invalidate();
      onClose();
      setName("");
      setNiche("");
      setTargetAudience("");
      setVoiceDescription("");
    },
    onError: (err) => toast.error(err.message),
  });

  // For now, use first org — in production this would be selected
  const orgId = profile?.id; // user ID used as org lookup — the create endpoint verifies membership

  return (
    <DialogContent className="sm:max-w-[520px]">
      <DialogHeader>
        <DialogTitle>Create Brand</DialogTitle>
        <DialogDescription>
          Set up a new brand with its identity and voice.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Brand Name *</Label>
          <Input
            placeholder="e.g., Acme Corp"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Niche / Industry</Label>
          <Input
            placeholder="e.g., SaaS, Fintech, Health & Wellness"
            value={niche}
            onChange={(e) => setNiche(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Target Audience</Label>
          <Textarea
            placeholder="e.g., B2B decision-makers in tech companies, 25-45 year old founders..."
            value={targetAudience}
            onChange={(e) => setTargetAudience(e.target.value)}
            className="min-h-[80px]"
          />
        </div>

        <div className="space-y-2">
          <Label>Brand Voice</Label>
          <Textarea
            placeholder="e.g., Professional but approachable, data-driven, thought leadership focused..."
            value={voiceDescription}
            onChange={(e) => setVoiceDescription(e.target.value)}
            className="min-h-[80px]"
          />
        </div>
      </div>

      <DialogFooter>
        <Button
          disabled={!name.trim() || createMutation.isPending || !orgId}
          onClick={() => {
            if (!orgId) return;
            createMutation.mutate({
              orgId,
              name: name.trim(),
              niche: niche || undefined,
              targetAudience: targetAudience || undefined,
              voiceDescription: voiceDescription || undefined,
            });
          }}
          className="gap-2"
        >
          {createMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Building2 className="h-4 w-4" />
          )}
          Create Brand
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

function BrandCard({
  brand,
}: {
  brand: {
    id: string;
    name: string;
    niche: string | null;
    targetAudience: string | null;
    voiceDescription: string | null;
    orgId: string;
    createdAt: Date;
  };
}) {
  const utils = trpc.useUtils();
  const [editing, setEditing] = useState(false);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [editName, setEditName] = useState(brand.name);
  const [editNiche, setEditNiche] = useState(brand.niche ?? "");
  const [editAudience, setEditAudience] = useState(brand.targetAudience ?? "");
  const [editVoice, setEditVoice] = useState(brand.voiceDescription ?? "");

  const updateMutation = trpc.brands.update.useMutation({
    onSuccess: () => {
      toast.success("Brand updated!");
      utils.brands.list.invalidate();
      setEditing(false);
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = trpc.brands.delete.useMutation({
    onSuccess: () => {
      toast.success("Brand deleted");
      utils.brands.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const { data: platforms } = trpc.platforms.listByBrand.useQuery({
    brandId: brand.id,
  });

  const { data: voiceProfile } = trpc.brands.getVoiceProfile.useQuery({
    brandId: brand.id,
  });

  const connectedCount = platforms?.length ?? 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            {editing ? (
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="text-lg font-semibold h-8 mb-1"
              />
            ) : (
              <CardTitle>{brand.name}</CardTitle>
            )}
            <div className="flex items-center gap-2 mt-1">
              {brand.niche && (
                <Badge variant="secondary" className="text-xs">
                  {brand.niche}
                </Badge>
              )}
              <Badge variant="outline" className="text-xs">
                {connectedCount} platform{connectedCount !== 1 ? "s" : ""}
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => setEditing(!editing)}
            >
              <Edit className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon-xs"
              className="text-destructive hover:text-destructive"
              onClick={() => deleteMutation.mutate({ id: brand.id })}
              disabled={deleteMutation.isPending}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {editing ? (
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Niche</Label>
              <Input
                value={editNiche}
                onChange={(e) => setEditNiche(e.target.value)}
                placeholder="Industry niche"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Target Audience</Label>
              <Textarea
                value={editAudience}
                onChange={(e) => setEditAudience(e.target.value)}
                className="min-h-[60px]"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Voice Description</Label>
              <Textarea
                value={editVoice}
                onChange={(e) => setEditVoice(e.target.value)}
                className="min-h-[60px]"
              />
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                disabled={updateMutation.isPending}
                onClick={() =>
                  updateMutation.mutate({
                    id: brand.id,
                    name: editName,
                    niche: editNiche || undefined,
                    targetAudience: editAudience || undefined,
                    voiceDescription: editVoice || undefined,
                  })
                }
              >
                {updateMutation.isPending && (
                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                )}
                Save
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setEditing(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <>
            {brand.targetAudience && (
              <div className="flex items-start gap-2">
                <Target className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <p className="text-sm text-muted-foreground">
                  {brand.targetAudience}
                </p>
              </div>
            )}
            {brand.voiceDescription && (
              <div className="flex items-start gap-2">
                <Mic2 className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <p className="text-sm text-muted-foreground">
                  {brand.voiceDescription}
                </p>
              </div>
            )}
          </>
        )}

        {/* Voice Profile Summary */}
        {voiceProfile && (
          <>
            <Separator />
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Sparkles className="h-3 w-3" />
                Voice Profile
              </p>
              {voiceProfile.toneDescriptors && voiceProfile.toneDescriptors.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {voiceProfile.toneDescriptors.map((tone) => (
                    <Badge key={tone} variant="secondary" className="text-xs">
                      {tone}
                    </Badge>
                  ))}
                </div>
              )}
              {voiceProfile.topicsToAvoid && voiceProfile.topicsToAvoid.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Avoids: {voiceProfile.topicsToAvoid.join(", ")}
                </p>
              )}
            </div>
          </>
        )}
      </CardContent>

      <CardFooter className="pt-0">
        <VoiceProfileEditor brandId={brand.id} voiceProfile={voiceProfile} />
      </CardFooter>
    </Card>
  );
}

function VoiceProfileEditor({
  brandId,
  voiceProfile,
}: {
  brandId: string;
  voiceProfile: {
    toneDescriptors: string[] | null;
    topicsToAvoid: string[] | null;
    vocabularyPreferences: unknown;
    examplePosts: unknown;
  } | null | undefined;
}) {
  const utils = trpc.useUtils();
  const [open, setOpen] = useState(false);
  const [tones, setTones] = useState(
    voiceProfile?.toneDescriptors?.join(", ") ?? ""
  );
  const [avoided, setAvoided] = useState(
    voiceProfile?.topicsToAvoid?.join(", ") ?? ""
  );
  const [preferred, setPreferred] = useState(
    ((voiceProfile?.vocabularyPreferences as { preferred?: string[] })?.preferred ?? []).join(", ")
  );
  const [exampleText, setExampleText] = useState(
    ((voiceProfile?.examplePosts as { platform: string; text: string }[]) ?? [])
      .map((e) => e.text)
      .join("\n\n---\n\n")
  );

  const upsertMutation = trpc.brands.upsertVoiceProfile.useMutation({
    onSuccess: () => {
      toast.success("Voice profile saved!");
      utils.brands.getVoiceProfile.invalidate();
      setOpen(false);
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="inline-flex items-center justify-center gap-2 rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-accent cursor-pointer">
        <Mic2 className="h-3 w-3" />
        {voiceProfile ? "Edit Voice Profile" : "Set Up Voice Profile"}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[520px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Voice Profile</DialogTitle>
          <DialogDescription>
            Configure how AI generates content for this brand.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Tone Descriptors (comma-separated)</Label>
            <Input
              placeholder="e.g., Professional, Witty, Data-driven, Conversational"
              value={tones}
              onChange={(e) => setTones(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              These guide the AI's writing style.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Topics to Avoid (comma-separated)</Label>
            <Input
              placeholder="e.g., Politics, Competitors, Controversial takes"
              value={avoided}
              onChange={(e) => setAvoided(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Preferred Vocabulary (comma-separated)</Label>
            <Input
              placeholder="e.g., innovate, empower, scale, leverage"
              value={preferred}
              onChange={(e) => setPreferred(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Example Posts</Label>
            <Textarea
              placeholder="Paste example posts that represent your brand voice. Separate with --- on a new line."
              value={exampleText}
              onChange={(e) => setExampleText(e.target.value)}
              className="min-h-[120px]"
            />
            <p className="text-xs text-muted-foreground">
              These are used as few-shot examples for AI generation.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            disabled={upsertMutation.isPending}
            onClick={() => {
              const toneArr = tones
                .split(",")
                .map((t) => t.trim())
                .filter(Boolean);
              const avoidArr = avoided
                .split(",")
                .map((t) => t.trim())
                .filter(Boolean);
              const prefArr = preferred
                .split(",")
                .map((t) => t.trim())
                .filter(Boolean);
              const examples = exampleText
                .split("---")
                .map((t) => t.trim())
                .filter(Boolean)
                .map((text) => ({ platform: "general", text }));

              upsertMutation.mutate({
                brandId,
                toneDescriptors: toneArr.length > 0 ? toneArr : undefined,
                topicsToAvoid: avoidArr.length > 0 ? avoidArr : undefined,
                vocabularyPreferences:
                  prefArr.length > 0
                    ? { preferred: prefArr }
                    : undefined,
                examplePosts: examples.length > 0 ? examples : undefined,
              });
            }}
            className="gap-2"
          >
            {upsertMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            Save Voice Profile
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
