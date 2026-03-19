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
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { BrandSelector } from "@/components/dashboard/brand-selector";
import { CreateContentDialog } from "@/components/dashboard/create-content-dialog";
import { ContentCard } from "@/components/dashboard/content-card";
import {
  Users,
  FileText,
  TrendingUp,
  MessageSquare,
  Plus,
  Sparkles,
  Linkedin,
  Link,
  ArrowRight,
} from "lucide-react";

export default function OverviewPage() {
  const activeBrandId = useBrandStore((s) => s.activeBrandId);

  const { data: counts, isLoading: countsLoading } =
    trpc.content.countByStatus.useQuery(
      { brandId: activeBrandId! },
      { enabled: !!activeBrandId }
    );

  const { data: recentContent, isLoading: contentLoading } =
    trpc.content.list.useQuery(
      { brandId: activeBrandId!, limit: 5 },
      { enabled: !!activeBrandId }
    );

  const { data: platforms, isLoading: platformsLoading } =
    trpc.platforms.listByBrand.useQuery(
      { brandId: activeBrandId! },
      { enabled: !!activeBrandId }
    );

  const totalPosts = counts
    ? Object.values(counts).reduce((a, b) => a + b, 0)
    : 0;
  const pendingReview = counts?.pending_review ?? 0;
  const scheduledCount = counts?.scheduled ?? 0;
  const publishedCount = counts?.published ?? 0;

  const totalFollowers =
    platforms?.reduce((sum, p) => sum + (p.followerCount ?? 0), 0) ?? 0;
  const connectedCount = platforms?.length ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Overview</h1>
          <p className="text-muted-foreground">
            Your social media performance at a glance.
          </p>
        </div>
        <BrandSelector />
      </div>

      {/* ─── Metric Cards ─── */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Followers"
          icon={<Users className="h-4 w-4 text-muted-foreground" />}
          loading={platformsLoading}
          value={
            connectedCount > 0
              ? totalFollowers.toLocaleString()
              : "—"
          }
          subtitle={
            connectedCount > 0
              ? `Across ${connectedCount} platform${connectedCount > 1 ? "s" : ""}`
              : "Connect a platform to get started"
          }
        />
        <MetricCard
          title="Total Content"
          icon={<FileText className="h-4 w-4 text-muted-foreground" />}
          loading={countsLoading}
          value={totalPosts.toString()}
          subtitle={
            publishedCount > 0
              ? `${publishedCount} published, ${scheduledCount} scheduled`
              : "Create your first post"
          }
        />
        <MetricCard
          title="Pending Review"
          icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />}
          loading={countsLoading}
          value={pendingReview.toString()}
          subtitle="Awaiting your approval"
        />
        <MetricCard
          title="Connected Platforms"
          icon={<Link className="h-4 w-4 text-muted-foreground" />}
          loading={platformsLoading}
          value={connectedCount.toString()}
          subtitle={
            connectedCount > 0
              ? platforms!.map((p) => p.platform).join(", ")
              : "No platforms connected"
          }
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* ─── Recent Content ─── */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent Content</CardTitle>
                <CardDescription>Your latest posts and drafts</CardDescription>
              </div>
              <CreateContentDialog>
                <Button size="sm" variant="outline" className="gap-2">
                  <Plus className="h-3 w-3" />
                  New
                </Button>
              </CreateContentDialog>
            </div>
          </CardHeader>
          <CardContent>
            {!activeBrandId ? (
              <p className="text-sm text-muted-foreground">
                Select a brand to see content.
              </p>
            ) : contentLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : recentContent && recentContent.length > 0 ? (
              <div className="space-y-3">
                {recentContent.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start justify-between gap-3 rounded-lg border p-3"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">
                        {item.textContent?.slice(0, 80) ?? "No text"}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <span className="capitalize">{item.platform}</span>
                        <span>·</span>
                        <span>
                          {new Date(item.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      </div>
                    </div>
                    <Badge
                      variant={
                        item.status === "published"
                          ? "default"
                          : item.status === "failed"
                            ? "destructive"
                            : "secondary"
                      }
                      className="text-xs shrink-0"
                    >
                      {item.status.replace("_", " ")}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <FileText className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  No content yet. Create your first post!
                </p>
                <CreateContentDialog>
                  <Button variant="outline" size="sm" className="mt-3 gap-2">
                    <Sparkles className="h-3 w-3" />
                    Generate with AI
                  </Button>
                </CreateContentDialog>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ─── Quick Actions ─── */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <CreateContentDialog>
              <button className="w-full flex items-center gap-3 rounded-xl border border-primary/10 p-3 text-left hover:bg-primary/5 transition-all pixie-card cursor-pointer">
                <div className="rounded-lg pixie-gradient-subtle p-2.5">
                  <Sparkles className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Generate AI Content</p>
                  <p className="text-xs text-muted-foreground">
                    Create a post with AI assistance
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </button>
            </CreateContentDialog>

            <a
              href="/settings"
              className="flex items-center gap-3 rounded-lg border p-3 hover:bg-accent transition-colors"
            >
              <div className="rounded-md bg-blue-500/10 p-2">
                <Linkedin className="h-4 w-4 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Connect LinkedIn</p>
                <p className="text-xs text-muted-foreground">
                  {connectedCount > 0
                    ? "Manage connected platforms"
                    : "Link your account to start publishing"}
                </p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </a>

            <a
              href="/content"
              className="flex items-center gap-3 rounded-lg border p-3 hover:bg-accent transition-colors"
            >
              <div className="rounded-md bg-orange-500/10 p-2">
                <MessageSquare className="h-4 w-4 text-orange-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Review Pending</p>
                <p className="text-xs text-muted-foreground">
                  {pendingReview > 0
                    ? `${pendingReview} item${pendingReview > 1 ? "s" : ""} awaiting review`
                    : "No items pending review"}
                </p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </a>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricCard({
  title,
  icon,
  value,
  subtitle,
  loading,
}: {
  title: string;
  icon: React.ReactNode;
  value: string;
  subtitle: string;
  loading: boolean;
}) {
  return (
    <Card className="pixie-card pixie-shimmer">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardDescription className="text-sm font-medium">{title}</CardDescription>
        <div className="rounded-lg bg-primary/10 p-2">
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-24" />
        ) : (
          <div className="text-3xl font-bold">{value}</div>
        )}
        <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
      </CardContent>
    </Card>
  );
}
