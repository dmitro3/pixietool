"use client";

import { useNotifications } from "@/hooks/use-notifications";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bell, Check, Trash2, Sparkles, AlertTriangle, MessageSquare, CreditCard } from "lucide-react";
import type { NotificationType } from "@/server/lib/notifications";

const ICON_MAP: Record<NotificationType, typeof Sparkles> = {
  content_generated: Sparkles,
  content_published: Check,
  content_failed: AlertTriangle,
  engagement_new: MessageSquare,
  engagement_replied: MessageSquare,
  billing_payment_failed: CreditCard,
  platform_disconnected: AlertTriangle,
  system: Bell,
};

export function NotificationBell() {
  const { notifications, unreadCount, markRead, markAllRead, clearAll } =
    useNotifications();

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 rounded-full pixie-gradient text-[10px] font-bold text-white flex items-center justify-center px-1">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </Button>
        }
      />
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-3 border-b">
          <h4 className="text-sm font-semibold">Notifications</h4>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={markAllRead}
              >
                <Check className="h-3 w-3 mr-1" />
                Read all
              </Button>
            )}
            {notifications.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-muted-foreground"
                onClick={clearAll}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>

        <ScrollArea className="max-h-[300px]">
          {notifications.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              No notifications yet
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((n) => {
                const Icon = ICON_MAP[n.type] ?? Bell;
                return (
                  <button
                    key={n.id}
                    className={`w-full text-left p-3 hover:bg-accent/50 transition-colors flex gap-3 ${
                      !n.read ? "bg-primary/5" : ""
                    }`}
                    onClick={() => markRead(n.id)}
                  >
                    <div
                      className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                        !n.read ? "pixie-gradient text-white" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium truncate">{n.title}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {n.message}
                      </p>
                      <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                        {formatTimeAgo(n.createdAt)}
                      </p>
                    </div>
                    {!n.read && (
                      <span className="h-2 w-2 rounded-full pixie-gradient shrink-0 mt-1" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
