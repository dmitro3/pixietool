"use client";

import { trpc } from "@/lib/trpc/client";
import { useBrandStore } from "@/hooks/use-brand";
import { toast } from "sonner";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { BrandSelector } from "@/components/dashboard/brand-selector";
import {
  Linkedin,
  Globe,
  Unplug,
  RefreshCw,
  ExternalLink,
  Loader2,
  CheckCircle2,
  Users,
} from "lucide-react";

const PLATFORM_META: Record<
  string,
  { label: string; icon: typeof Linkedin; color: string; available: boolean }
> = {
  linkedin: {
    label: "LinkedIn",
    icon: Linkedin,
    color: "text-blue-600",
    available: true,
  },
  x: {
    label: "X (Twitter)",
    icon: Globe,
    color: "text-foreground",
    available: true,
  },
  instagram: {
    label: "Instagram",
    icon: Globe,
    color: "text-pink-600",
    available: true,
  },
  tiktok: {
    label: "TikTok",
    icon: Globe,
    color: "text-foreground",
    available: false,
  },
  youtube: {
    label: "YouTube",
    icon: Globe,
    color: "text-red-600",
    available: false,
  },
  threads: {
    label: "Threads",
    icon: Globe,
    color: "text-foreground",
    available: false,
  },
};

export default function SettingsPage() {
  const activeBrandId = useBrandStore((s) => s.activeBrandId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground">
            Manage your account, billing, and preferences.
          </p>
        </div>
        <BrandSelector />
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
            <CardDescription>Your personal account settings.</CardDescription>
          </CardHeader>
          <CardContent>
            <ProfileSection />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Connected Platforms</CardTitle>
            <CardDescription>
              Connect your social media accounts to start publishing and tracking.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {activeBrandId ? (
              <PlatformConnections brandId={activeBrandId} />
            ) : (
              <p className="text-sm text-muted-foreground">
                Select a brand above to manage platform connections.
              </p>
            )}
          </CardContent>
        </Card>

        <BillingSection />
      </div>
    </div>
  );
}

function ProfileSection() {
  const { data: profile, isLoading } = trpc.auth.getProfile.useQuery();

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-4 w-32" />
      </div>
    );
  }

  if (!profile) {
    return (
      <p className="text-sm text-muted-foreground">
        Sign in to view your account settings.
      </p>
    );
  }

  return (
    <div className="space-y-1">
      <p className="text-sm font-medium">{profile.name}</p>
      <p className="text-sm text-muted-foreground">{profile.email}</p>
      <p className="text-xs text-muted-foreground capitalize mt-2">
        Plan: {profile.planTier}
      </p>
    </div>
  );
}

function PlatformConnections({ brandId }: { brandId: string }) {
  const utils = trpc.useUtils();

  const { data: accounts, isLoading } = trpc.platforms.listByBrand.useQuery({
    brandId,
  });

  const connectMutation = trpc.platforms.getConnectUrl.useMutation({
    onSuccess: (data) => {
      // Redirect to OAuth flow
      window.location.href = data.url;
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const syncMutation = trpc.platforms.syncProfile.useMutation({
    onSuccess: () => {
      toast.success("Profile synced!");
      utils.platforms.listByBrand.invalidate();
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const disconnectMutation = trpc.platforms.disconnect.useMutation({
    onSuccess: () => {
      toast.success("Platform disconnected");
      utils.platforms.listByBrand.invalidate();
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  const connectedPlatforms = new Set<string>(accounts?.map((a) => a.platform) ?? []);

  return (
    <div className="space-y-3">
      {/* Connected accounts */}
      {accounts?.map((account) => {
        const meta = PLATFORM_META[account.platform] ?? PLATFORM_META.x;
        const Icon = meta.icon;

        return (
          <div
            key={account.id}
            className="flex items-center justify-between rounded-lg border p-4"
          >
            <div className="flex items-center gap-3">
              <div className={`${meta.color}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">
                    {account.displayName ?? account.username ?? meta.label}
                  </p>
                  <Badge variant="default" className="text-xs gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Connected
                  </Badge>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                  {account.username && <span>@{account.username}</span>}
                  {(account.followerCount ?? 0) > 0 && (
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {account.followerCount!.toLocaleString()} followers
                    </span>
                  )}
                  {account.lastSyncedAt && (
                    <span>
                      Synced{" "}
                      {new Date(account.lastSyncedAt).toLocaleDateString(
                        "en-US",
                        { month: "short", day: "numeric" }
                      )}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="gap-1"
                disabled={syncMutation.isPending}
                onClick={() => syncMutation.mutate({ id: account.id })}
              >
                {syncMutation.isPending ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <RefreshCw className="h-3 w-3" />
                )}
                Sync
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1 text-destructive hover:text-destructive"
                disabled={disconnectMutation.isPending}
                onClick={() => disconnectMutation.mutate({ id: account.id })}
              >
                <Unplug className="h-3 w-3" />
                Disconnect
              </Button>
            </div>
          </div>
        );
      })}

      {/* Available to connect */}
      {Object.entries(PLATFORM_META)
        .filter(([key]) => !connectedPlatforms.has(key))
        .map(([key, meta]) => {
          const Icon = meta.icon;
          return (
            <div
              key={key}
              className="flex items-center justify-between rounded-lg border border-dashed p-4"
            >
              <div className="flex items-center gap-3">
                <div className="text-muted-foreground">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-medium">{meta.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {meta.available ? "Ready to connect" : "Coming soon"}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                disabled={!meta.available || connectMutation.isPending}
                onClick={() =>
                  connectMutation.mutate({
                    brandId,
                    platform: key as "linkedin",
                  })
                }
              >
                {connectMutation.isPending ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <ExternalLink className="h-3 w-3" />
                )}
                {meta.available ? "Connect" : "Coming Soon"}
              </Button>
            </div>
          );
        })}
    </div>
  );
}

const PLAN_DETAILS: Record<string, { label: string; posts: string; platforms: string; credits: string }> = {
  free: { label: "Free", posts: "10/month", platforms: "1", credits: "50" },
  creator: { label: "Creator", posts: "60/month", platforms: "3", credits: "500" },
  pro: { label: "Pro", posts: "300/month", platforms: "6", credits: "2,000" },
  agency: { label: "Agency", posts: "1,000/month", platforms: "6", credits: "10,000" },
  enterprise: { label: "Enterprise", posts: "Unlimited", platforms: "6", credits: "Unlimited" },
};

function BillingSection() {
  const { data: subscription, isLoading } = trpc.billing.getSubscription.useQuery();
  const portalMutation = trpc.billing.createPortalSession.useMutation({
    onSuccess: (data) => {
      if (data.url) window.location.href = data.url;
    },
    onError: (err) => toast.error(err.message),
  });

  const plan = subscription?.plan ?? "free";
  const details = PLAN_DETAILS[plan] ?? PLAN_DETAILS.free;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Billing</CardTitle>
        <CardDescription>
          Manage your subscription and payment methods.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <Skeleton className="h-12 w-full" />
        ) : (
          <>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm">
                  Current plan: <strong>{details.label}</strong>
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {details.posts} posts · {details.platforms} platform{details.platforms !== "1" ? "s" : ""} · {details.credits} AI credits
                </p>
                {subscription?.cancelAtPeriodEnd && subscription.cancelAt && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Cancels on{" "}
                    {new Date(subscription.cancelAt).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                )}
              </div>
              {plan !== "free" ? (
                <Button
                  variant="outline"
                  onClick={() => portalMutation.mutate()}
                  disabled={portalMutation.isPending}
                >
                  {portalMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  Manage Billing
                </Button>
              ) : (
                <Button variant="outline" disabled>
                  Upgrade (Coming Soon)
                </Button>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
