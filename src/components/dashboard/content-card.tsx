"use client";

import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";

import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  CheckCircle2,
  Clock,
  Edit,
  Linkedin,
  MoreVertical,
  Trash2,
  Copy,
  CalendarDays,
  Globe,
  Sparkles,
  User,
} from "lucide-react";

type ContentItem = {
  id: string;
  brandId: string;
  platform: string;
  contentType: string;
  status: string;
  textContent: string | null;
  hashtags: string[] | null;
  scheduledFor: Date | null;
  publishedAt: Date | null;
  aiModelUsed: string | null;
  contentPillar: string | null;
  createdBy: string;
  createdAt: Date;
};

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  draft: { label: "Draft", variant: "secondary" },
  pending_review: { label: "Pending Review", variant: "outline" },
  approved: { label: "Approved", variant: "default" },
  scheduled: { label: "Scheduled", variant: "default" },
  published: { label: "Published", variant: "default" },
  failed: { label: "Failed", variant: "destructive" },
};

const PLATFORM_ICONS: Record<string, typeof Linkedin> = {
  linkedin: Linkedin,
  x: Globe,
  instagram: Globe,
  tiktok: Globe,
  youtube: Globe,
  threads: Globe,
};

function formatDate(date: Date | null) {
  if (!date) return null;
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function ContentCard({ item }: { item: ContentItem }) {
  const utils = trpc.useUtils();

  const updateStatus = trpc.content.updateStatus.useMutation({
    onSuccess: () => {
      utils.content.list.invalidate();
      utils.content.countByStatus.invalidate();
    },
  });

  const deleteContent = trpc.content.delete.useMutation({
    onSuccess: () => {
      toast.success("Content deleted");
      utils.content.list.invalidate();
      utils.content.countByStatus.invalidate();
    },
  });

  const statusConfig = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.draft;
  const PlatformIcon = PLATFORM_ICONS[item.platform] ?? Globe;
  const preview = item.textContent
    ? item.textContent.length > 200
      ? item.textContent.slice(0, 200) + "..."
      : item.textContent
    : "No text content";

  return (
    <Card className="group pixie-card">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <PlatformIcon className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-medium capitalize text-muted-foreground">
              {item.platform}
            </span>
            <span className="text-xs text-muted-foreground">·</span>
            <span className="text-xs capitalize text-muted-foreground">
              {item.contentType}
            </span>
            {item.contentPillar && (
              <>
                <span className="text-xs text-muted-foreground">·</span>
                <span className="text-xs text-muted-foreground">
                  {item.contentPillar}
                </span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={statusConfig.variant} className="text-xs">
              {statusConfig.label}
            </Badge>
            <DropdownMenu>
              <DropdownMenuTrigger
                className="inline-flex items-center justify-center rounded-md h-6 w-6 opacity-0 group-hover:opacity-100 hover:bg-accent text-muted-foreground cursor-pointer"
              >
                <MoreVertical className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => {
                    if (item.textContent) {
                      navigator.clipboard.writeText(item.textContent);
                      toast.success("Copied to clipboard");
                    }
                  }}
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Copy Text
                </DropdownMenuItem>
                {(item.status === "draft" || item.status === "pending_review") && (
                  <DropdownMenuItem
                    onClick={() => updateStatus.mutate({ id: item.id, status: "approved" })}
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Approve
                  </DropdownMenuItem>
                )}
                {item.status === "approved" && (
                  <DropdownMenuItem
                    onClick={() => updateStatus.mutate({ id: item.id, status: "scheduled" })}
                  >
                    <CalendarDays className="mr-2 h-4 w-4" />
                    Schedule
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => deleteContent.mutate({ id: item.id })}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pb-3">
        <p className="text-sm whitespace-pre-wrap leading-relaxed">{preview}</p>
        {item.hashtags && item.hashtags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {item.hashtags.map((h) => (
              <Badge key={h} variant="secondary" className="text-xs font-normal">
                #{h}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-0 text-xs text-muted-foreground gap-3">
        {item.createdBy === "ai" ? (
          <span className="flex items-center gap-1">
            <Sparkles className="h-3 w-3" /> AI
          </span>
        ) : (
          <span className="flex items-center gap-1">
            <User className="h-3 w-3" /> Manual
          </span>
        )}
        {item.aiModelUsed && (
          <span>{item.aiModelUsed}</span>
        )}
        <span>{formatDate(item.createdAt)}</span>
        {item.scheduledFor && (
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" /> {formatDate(item.scheduledFor)}
          </span>
        )}
      </CardFooter>
    </Card>
  );
}
