"use client";

import { trpc } from "@/lib/trpc/client";
import { useBrandStore } from "@/hooks/use-brand";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { BrandSelector } from "@/components/dashboard/brand-selector";
import {
  Lightbulb,
  Target,
  CalendarDays,
  Trophy,
  Linkedin,
  Globe,
  TrendingUp,
  Layers,
  ArrowRight,
} from "lucide-react";

const PLATFORM_LABELS: Record<string, { label: string; icon: typeof Linkedin }> = {
  linkedin: { label: "LinkedIn", icon: Linkedin },
  x: { label: "X (Twitter)", icon: Globe },
  instagram: { label: "Instagram", icon: Globe },
  tiktok: { label: "TikTok", icon: Globe },
  youtube: { label: "YouTube", icon: Globe },
  threads: { label: "Threads", icon: Globe },
};

type Pillar = { name: string; description?: string; frequency?: string };
type ScheduleSlot = { day: string; time: string; type?: string };
type Milestone = { target: string; deadline?: string; metric?: string };

export default function StrategyPage() {
  const activeBrandId = useBrandStore((s) => s.activeBrandId);

  const { data: playbooks, isLoading } = trpc.strategy.getPlaybook.useQuery(
    { brandId: activeBrandId! },
    { enabled: !!activeBrandId }
  );

  const { data: brand } = trpc.brands.getById.useQuery(
    { id: activeBrandId! },
    { enabled: !!activeBrandId }
  );

  const { data: voiceProfile } = trpc.brands.getVoiceProfile.useQuery(
    { brandId: activeBrandId! },
    { enabled: !!activeBrandId }
  );

  const { data: platforms } = trpc.platforms.listByBrand.useQuery(
    { brandId: activeBrandId! },
    { enabled: !!activeBrandId }
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Strategy</h1>
          <p className="text-muted-foreground">
            AI-generated growth playbook and account diagnostics.
          </p>
        </div>
        <BrandSelector />
      </div>

      {!activeBrandId ? (
        <Card>
          <CardHeader>
            <CardTitle>Select a brand</CardTitle>
            <CardDescription>Choose a brand to see strategy playbooks.</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <>
          {/* Brand Overview */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-muted-foreground" />
                  <CardTitle className="text-lg">Brand Profile</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {brand ? (
                  <>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Brand</p>
                      <p className="text-sm font-medium">{brand.name}</p>
                    </div>
                    {brand.niche && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">Niche</p>
                        <p className="text-sm">{brand.niche}</p>
                      </div>
                    )}
                    {brand.targetAudience && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">Target Audience</p>
                        <p className="text-sm">{brand.targetAudience}</p>
                      </div>
                    )}
                    {brand.voiceDescription && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">Voice</p>
                        <p className="text-sm">{brand.voiceDescription}</p>
                      </div>
                    )}
                  </>
                ) : (
                  <Skeleton className="h-24 w-full" />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-muted-foreground" />
                  <CardTitle className="text-lg">Account Diagnostic</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {platforms && platforms.length > 0 ? (
                  <div className="space-y-2">
                    {platforms.map((p) => {
                      const meta = PLATFORM_LABELS[p.platform] ?? PLATFORM_LABELS.x;
                      const Icon = meta.icon;
                      return (
                        <div key={p.id} className="flex items-center justify-between rounded-lg border p-3">
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">{meta.label}</span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span>{(p.followerCount ?? 0).toLocaleString()} followers</span>
                            {p.accountHealthScore !== null && (
                              <Badge
                                variant={
                                  (p.accountHealthScore ?? 0) >= 70
                                    ? "default"
                                    : (p.accountHealthScore ?? 0) >= 40
                                      ? "secondary"
                                      : "destructive"
                                }
                                className="text-xs"
                              >
                                Health: {p.accountHealthScore}
                              </Badge>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    {voiceProfile?.toneDescriptors && voiceProfile.toneDescriptors.length > 0 && (
                      <div className="pt-2">
                        <p className="text-xs font-medium text-muted-foreground mb-1">Voice Tones</p>
                        <div className="flex flex-wrap gap-1">
                          {voiceProfile.toneDescriptors.map((tone) => (
                            <Badge key={tone} variant="secondary" className="text-xs">{tone}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Connect a platform to run your first diagnostic.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Playbooks */}
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-6 w-48" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-40 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : playbooks && playbooks.length > 0 ? (
            <div className="space-y-4">
              {playbooks.map((playbook) => {
                const meta = PLATFORM_LABELS[playbook.platform] ?? PLATFORM_LABELS.x;
                const Icon = meta.icon;
                const pillars = (playbook.contentPillars ?? []) as Pillar[];
                const schedule = (playbook.postingSchedule ?? []) as ScheduleSlot[];
                const milestones = (playbook.targetMilestones ?? []) as Milestone[];

                return (
                  <Card key={playbook.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Icon className="h-5 w-5 text-muted-foreground" />
                          <CardTitle className="text-lg">
                            {meta.label} Growth Playbook
                          </CardTitle>
                        </div>
                        <div className="flex items-center gap-2">
                          {playbook.currentPhase && (
                            <Badge variant="default" className="text-xs">
                              {playbook.currentPhase}
                            </Badge>
                          )}
                          <span className="text-xs text-muted-foreground">
                            Generated{" "}
                            {new Date(playbook.generatedAt).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-6">
                      {/* Content Pillars */}
                      {pillars.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold flex items-center gap-2 mb-3">
                            <Layers className="h-4 w-4 text-muted-foreground" />
                            Content Pillars
                          </h4>
                          <div className="grid gap-3 md:grid-cols-2">
                            {pillars.map((pillar, i) => (
                              <div key={i} className="rounded-lg border p-3">
                                <p className="text-sm font-medium">{pillar.name}</p>
                                {pillar.description && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {pillar.description}
                                  </p>
                                )}
                                {pillar.frequency && (
                                  <Badge variant="secondary" className="text-xs mt-2">
                                    {pillar.frequency}
                                  </Badge>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Posting Schedule */}
                      {schedule.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold flex items-center gap-2 mb-3">
                            <CalendarDays className="h-4 w-4 text-muted-foreground" />
                            Posting Schedule
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {schedule.map((slot, i) => (
                              <div key={i} className="rounded-lg border px-3 py-2 text-center">
                                <p className="text-xs font-medium">{slot.day}</p>
                                <p className="text-xs text-muted-foreground">{slot.time}</p>
                                {slot.type && (
                                  <Badge variant="outline" className="text-[10px] mt-1">
                                    {slot.type}
                                  </Badge>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Milestones */}
                      {milestones.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold flex items-center gap-2 mb-3">
                            <Trophy className="h-4 w-4 text-muted-foreground" />
                            Target Milestones
                          </h4>
                          <div className="space-y-2">
                            {milestones.map((milestone, i) => (
                              <div key={i} className="flex items-center gap-3 rounded-lg border p-3">
                                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                                  {i + 1}
                                </div>
                                <div className="flex-1">
                                  <p className="text-sm font-medium">{milestone.target}</p>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    {milestone.deadline && (
                                      <span className="text-xs text-muted-foreground">
                                        By {milestone.deadline}
                                      </span>
                                    )}
                                    {milestone.metric && (
                                      <Badge variant="secondary" className="text-xs">
                                        {milestone.metric}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card>
              <CardHeader className="items-center text-center py-12">
                <Lightbulb className="h-12 w-12 text-muted-foreground/40 mb-2" />
                <CardTitle>No playbooks yet</CardTitle>
                <CardDescription>
                  {platforms && platforms.length > 0
                    ? "Playbooks will be generated as the AI analyzes your account performance and audience."
                    : "Connect a platform and start creating content to generate your growth playbook."}
                </CardDescription>
              </CardHeader>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
