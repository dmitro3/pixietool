"use client";

import { useState, useMemo } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BrandSelector } from "@/components/dashboard/brand-selector";
import {
  Eye,
  MousePointer,
  TrendingUp,
  Users,
  BarChart3,
  Linkedin,
  Globe,
  Heart,
  MessageSquare,
  Share2,
  Bookmark,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";

export default function AnalyticsPage() {
  const activeBrandId = useBrandStore((s) => s.activeBrandId);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);

  // Get connected platforms for this brand
  const { data: platforms, isLoading: platformsLoading } =
    trpc.platforms.listByBrand.useQuery(
      { brandId: activeBrandId! },
      { enabled: !!activeBrandId }
    );

  // Get published content for post-level metrics
  const { data: publishedContent } = trpc.content.list.useQuery(
    { brandId: activeBrandId!, status: "published", limit: 50 },
    { enabled: !!activeBrandId }
  );

  // Get content counts
  const { data: counts } = trpc.content.countByStatus.useQuery(
    { brandId: activeBrandId! },
    { enabled: !!activeBrandId }
  );

  // Get account analytics for the selected platform
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const { data: accountAnalytics, isLoading: analyticsLoading } =
    trpc.analytics.getAccountAnalytics.useQuery(
      {
        platformAccountId: selectedAccountId!,
        startDate: thirtyDaysAgo.toISOString().split("T")[0],
        endDate: now.toISOString().split("T")[0],
      },
      { enabled: !!selectedAccountId }
    );

  // Auto-select first platform
  const effectiveAccountId = selectedAccountId ?? platforms?.[0]?.id ?? null;

  // Calculate aggregate metrics
  const totalFollowers = platforms?.reduce(
    (sum, p) => sum + (p.followerCount ?? 0),
    0
  ) ?? 0;

  const totalPublished = counts?.published ?? 0;
  const totalContent = counts
    ? Object.values(counts).reduce((a, b) => a + b, 0)
    : 0;

  // Latest analytics snapshot
  const latestAnalytics = accountAnalytics?.length
    ? accountAnalytics[accountAnalytics.length - 1]
    : null;

  const earliestAnalytics = accountAnalytics?.length
    ? accountAnalytics[0]
    : null;

  const followerGrowth =
    latestAnalytics && earliestAnalytics
      ? (latestAnalytics.followerCount ?? 0) - (earliestAnalytics.followerCount ?? 0)
      : 0;

  const totalImpressions = accountAnalytics?.reduce(
    (sum, a) => sum + (a.totalImpressions ?? 0),
    0
  ) ?? 0;

  const avgEngagement = accountAnalytics?.length
    ? (
        accountAnalytics.reduce(
          (sum, a) => sum + (a.avgEngagementRate ?? 0),
          0
        ) / accountAnalytics.length
      ).toFixed(2)
    : "—";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analytics</h1>
          <p className="text-muted-foreground">
            Track performance across all your connected platforms.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {platforms && platforms.length > 1 && (
            <Select
              value={effectiveAccountId ?? undefined}
              onValueChange={(v) => { if (v) setSelectedAccountId(v); }}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select platform" />
              </SelectTrigger>
              <SelectContent>
                {platforms.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.displayName ?? p.platform}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <BrandSelector />
        </div>
      </div>

      {/* ─── Top Metrics ─── */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Impressions"
          icon={<Eye className="h-4 w-4 text-muted-foreground" />}
          value={
            totalImpressions > 0
              ? totalImpressions.toLocaleString()
              : "—"
          }
          subtitle="Last 30 days"
          loading={analyticsLoading}
        />
        <MetricCard
          title="Avg. Engagement Rate"
          icon={<MousePointer className="h-4 w-4 text-muted-foreground" />}
          value={avgEngagement !== "—" ? `${avgEngagement}%` : "—"}
          subtitle="Across all posts"
          loading={analyticsLoading}
        />
        <MetricCard
          title="Follower Growth"
          icon={<Users className="h-4 w-4 text-muted-foreground" />}
          value={
            followerGrowth !== 0
              ? `${followerGrowth > 0 ? "+" : ""}${followerGrowth}`
              : "—"
          }
          subtitle={`Total: ${totalFollowers.toLocaleString()}`}
          loading={platformsLoading}
          trend={followerGrowth > 0 ? "up" : followerGrowth < 0 ? "down" : undefined}
        />
        <MetricCard
          title="Posts Published"
          icon={<BarChart3 className="h-4 w-4 text-muted-foreground" />}
          value={totalPublished.toString()}
          subtitle={`${totalContent} total content items`}
          loading={false}
        />
      </div>

      {/* ─── Connected Platforms Overview ─── */}
      {platforms && platforms.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Platform Performance</CardTitle>
            <CardDescription>Metrics by connected platform</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {platforms.map((platform) => {
                const Icon =
                  platform.platform === "linkedin" ? Linkedin : Globe;
                return (
                  <div
                    key={platform.id}
                    className="flex items-center justify-between rounded-lg border p-4"
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">
                          {platform.displayName ?? platform.platform}
                        </p>
                        {platform.username && (
                          <p className="text-xs text-muted-foreground">
                            @{platform.username}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-6 text-sm">
                      <div className="text-center">
                        <p className="font-semibold">
                          {(platform.followerCount ?? 0).toLocaleString()}
                        </p>
                        <p className="text-xs text-muted-foreground">Followers</p>
                      </div>
                      <div className="text-center">
                        <p className="font-semibold">
                          {platform.accountHealthScore ?? "—"}
                        </p>
                        <p className="text-xs text-muted-foreground">Health</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">
                          {platform.lastSyncedAt
                            ? `Synced ${new Date(
                                platform.lastSyncedAt
                              ).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                              })}`
                            : "Not synced"}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── Published Content Performance ─── */}
      <Card>
        <CardHeader>
          <CardTitle>Published Content</CardTitle>
          <CardDescription>Performance of your published posts</CardDescription>
        </CardHeader>
        <CardContent>
          {!activeBrandId ? (
            <p className="text-sm text-muted-foreground">
              Select a brand to see content performance.
            </p>
          ) : publishedContent && publishedContent.length > 0 ? (
            <div className="space-y-3">
              {publishedContent.map((item) => {
                const Icon =
                  item.platform === "linkedin" ? Linkedin : Globe;
                return (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 rounded-lg border p-3"
                  >
                    <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">
                        {item.textContent?.slice(0, 80) ?? "No text"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Published{" "}
                        {item.publishedAt
                          ? new Date(item.publishedAt).toLocaleDateString(
                              "en-US",
                              { month: "short", day: "numeric" }
                            )
                          : "N/A"}
                      </p>
                    </div>
                    <Badge
                      variant="secondary"
                      className="text-xs capitalize shrink-0"
                    >
                      {item.contentType}
                    </Badge>
                    {item.aiModelUsed && (
                      <Badge variant="outline" className="text-xs shrink-0">
                        {item.aiModelUsed}
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <BarChart3 className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                No published content yet. Publish posts to see performance data.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── Analytics Timeline ─── */}
      {accountAnalytics && accountAnalytics.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Daily Metrics (Last 30 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2 pr-4 font-medium text-muted-foreground">Date</th>
                    <th className="pb-2 pr-4 font-medium text-muted-foreground text-right">Followers</th>
                    <th className="pb-2 pr-4 font-medium text-muted-foreground text-right">Impressions</th>
                    <th className="pb-2 font-medium text-muted-foreground text-right">Engagement</th>
                  </tr>
                </thead>
                <tbody>
                  {accountAnalytics.map((row) => (
                    <tr key={row.id} className="border-b last:border-0">
                      <td className="py-2 pr-4">
                        {new Date(row.date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </td>
                      <td className="py-2 pr-4 text-right tabular-nums">
                        {(row.followerCount ?? 0).toLocaleString()}
                      </td>
                      <td className="py-2 pr-4 text-right tabular-nums">
                        {(row.totalImpressions ?? 0).toLocaleString()}
                      </td>
                      <td className="py-2 text-right tabular-nums">
                        {(row.avgEngagementRate ?? 0).toFixed(2)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function MetricCard({
  title,
  icon,
  value,
  subtitle,
  loading,
  trend,
}: {
  title: string;
  icon: React.ReactNode;
  value: string;
  subtitle: string;
  loading: boolean;
  trend?: "up" | "down";
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardDescription className="text-sm font-medium">{title}</CardDescription>
        {icon}
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-24" />
        ) : (
          <div className="flex items-center gap-2">
            <div className="text-3xl font-bold">{value}</div>
            {trend === "up" && (
              <ArrowUpRight className="h-4 w-4 text-green-600" />
            )}
            {trend === "down" && (
              <ArrowDownRight className="h-4 w-4 text-red-600" />
            )}
          </div>
        )}
        <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
      </CardContent>
    </Card>
  );
}
