"use client";

import { useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { BrandSelector } from "@/components/dashboard/brand-selector";
import {
  MessageSquare,
  CheckCircle2,
  SkipForward,
  Edit,
  Loader2,
  AlertCircle,
  AtSign,
  Mail,
  Reply,
  ArrowUpCircle,
} from "lucide-react";

type StatusTab = "pending" | "approved" | "sent" | "skipped";

const TABS: { value: StatusTab; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "sent", label: "Sent" },
  { value: "skipped", label: "Skipped" },
];

const TYPE_ICONS: Record<string, typeof MessageSquare> = {
  comment: MessageSquare,
  mention: AtSign,
  dm: Mail,
  reply: Reply,
};

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  high: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300",
  medium: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  low: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
};

export default function EngagePage() {
  const [activeTab, setActiveTab] = useState<StatusTab>("pending");
  const activeBrandId = useBrandStore((s) => s.activeBrandId);

  const { data: items, isLoading } = trpc.engagement.list.useQuery(
    {
      brandId: activeBrandId!,
      status: activeTab,
      limit: 50,
    },
    { enabled: !!activeBrandId }
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            Engage <Badge variant="secondary">Co-Pilot</Badge>
          </h1>
          <p className="text-muted-foreground">
            AI-drafted replies for your review. Every response needs your approval.
          </p>
        </div>
        <BrandSelector />
      </div>

      <Tabs value={activeTab} onValueChange={(v) => { if (v) setActiveTab(v as StatusTab); }}>
        <TabsList>
          {TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {TABS.map((tab) => (
          <TabsContent key={tab.value} value={tab.value} className="mt-4">
            {!activeBrandId ? (
              <Card>
                <CardHeader>
                  <CardTitle>Select a brand</CardTitle>
                  <CardDescription>
                    Choose a brand to see engagement items.
                  </CardDescription>
                </CardHeader>
              </Card>
            ) : isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Card key={i}>
                    <CardHeader>
                      <Skeleton className="h-4 w-48" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-20 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : items && items.length > 0 ? (
              <div className="space-y-4">
                {items.map((item) => (
                  <EngagementCard key={item.id} item={item} />
                ))}
              </div>
            ) : (
              <Card>
                <CardHeader className="items-center text-center py-12">
                  <MessageSquare className="h-12 w-12 text-muted-foreground/40 mb-2" />
                  <CardTitle>
                    {tab.value === "pending"
                      ? "No items awaiting review"
                      : `No ${tab.label.toLowerCase()} items`}
                  </CardTitle>
                  <CardDescription>
                    {tab.value === "pending"
                      ? "Connect a platform to start monitoring comments, mentions, and DMs."
                      : `Engagement items marked as "${tab.label}" will appear here.`}
                  </CardDescription>
                </CardHeader>
              </Card>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function EngagementCard({ item }: { item: {
  id: string;
  type: string;
  platform: string;
  originalText: string;
  authorName: string | null;
  authorHandle: string | null;
  aiSuggestedReply: string | null;
  replyStatus: string;
  priority: string;
  sentimentScore: number | null;
} }) {
  const utils = trpc.useUtils();
  const [editing, setEditing] = useState(false);
  const [editedReply, setEditedReply] = useState(item.aiSuggestedReply ?? "");

  const approveMutation = trpc.engagement.approve.useMutation({
    onSuccess: () => {
      toast.success("Reply approved!");
      utils.engagement.list.invalidate();
      setEditing(false);
    },
    onError: (err) => toast.error(err.message),
  });

  const skipMutation = trpc.engagement.skip.useMutation({
    onSuccess: () => {
      toast.success("Skipped");
      utils.engagement.list.invalidate();
    },
  });

  const TypeIcon = TYPE_ICONS[item.type] ?? MessageSquare;
  const priorityClass = PRIORITY_COLORS[item.priority] ?? PRIORITY_COLORS.medium;
  const isPending = item.replyStatus === "pending";

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <TypeIcon className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-medium capitalize text-muted-foreground">
              {item.type}
            </span>
            <span className="text-xs text-muted-foreground">·</span>
            <span className="text-xs capitalize text-muted-foreground">
              {item.platform}
            </span>
            {item.authorHandle && (
              <>
                <span className="text-xs text-muted-foreground">·</span>
                <span className="text-xs text-muted-foreground">
                  @{item.authorHandle}
                </span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Badge className={`text-xs ${priorityClass}`}>
              {item.priority}
            </Badge>
            {item.sentimentScore !== null && (
              <Badge
                variant="outline"
                className="text-xs"
              >
                {item.sentimentScore > 0.3
                  ? "Positive"
                  : item.sentimentScore < -0.3
                    ? "Negative"
                    : "Neutral"}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Original message */}
        <div className="rounded-lg bg-muted/50 p-3">
          <p className="text-xs font-medium text-muted-foreground mb-1">
            {item.authorName ?? "Unknown"} wrote:
          </p>
          <p className="text-sm">{item.originalText}</p>
        </div>

        {/* AI suggested reply */}
        {item.aiSuggestedReply && (
          <div className="rounded-lg border p-3">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-medium text-muted-foreground">
                AI-Drafted Reply
              </p>
              {isPending && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs gap-1"
                  onClick={() => setEditing(!editing)}
                >
                  <Edit className="h-3 w-3" />
                  {editing ? "Cancel" : "Edit"}
                </Button>
              )}
            </div>
            {editing ? (
              <Textarea
                value={editedReply}
                onChange={(e) => setEditedReply(e.target.value)}
                className="min-h-[80px] text-sm"
              />
            ) : (
              <p className="text-sm">{item.aiSuggestedReply}</p>
            )}
          </div>
        )}

        {/* Actions */}
        {isPending && (
          <div className="flex items-center gap-2 pt-1">
            <Button
              size="sm"
              className="gap-2"
              disabled={approveMutation.isPending}
              onClick={() =>
                approveMutation.mutate({
                  id: item.id,
                  editedReply: editing && editedReply !== item.aiSuggestedReply
                    ? editedReply
                    : undefined,
                })
              }
            >
              {approveMutation.isPending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <CheckCircle2 className="h-3 w-3" />
              )}
              Approve & Send
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              disabled={skipMutation.isPending}
              onClick={() => skipMutation.mutate({ id: item.id })}
            >
              <SkipForward className="h-3 w-3" />
              Skip
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
