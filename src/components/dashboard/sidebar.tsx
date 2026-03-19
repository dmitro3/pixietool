"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  FileText,
  CalendarDays,
  MessageSquare,
  BarChart3,
  Lightbulb,
  Building2,
  Settings,
  LogOut,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

const navItems = [
  { href: "/overview", label: "Overview", icon: LayoutDashboard },
  { href: "/content", label: "Content", icon: FileText },
  { href: "/schedule", label: "Schedule", icon: CalendarDays },
  { href: "/engage", label: "Engage", icon: MessageSquare },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/strategy", label: "Strategy", icon: Lightbulb },
  { href: "/brands", label: "Brands", icon: Building2 },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <div className="flex h-screen w-64 flex-col border-r border-border/50 bg-sidebar">
      {/* Logo */}
      <div className="flex h-16 items-center border-b border-border/50 px-6">
        <Link href="/overview" className="flex items-center gap-2.5 group">
          <div className="h-8 w-8 rounded-lg pixie-gradient flex items-center justify-center shadow-lg shadow-primary/20 group-hover:shadow-primary/30 transition-shadow">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <span className="text-lg font-bold pixie-gradient-text">
            Pixie Social
          </span>
        </Link>
      </div>

      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link key={item.href} href={item.href}>
                <span
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-primary/10 text-primary pixie-glow"
                      : "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                >
                  <item.icon
                    className={cn(
                      "h-4 w-4 transition-colors",
                      isActive ? "text-primary" : ""
                    )}
                  />
                  {item.label}
                  {isActive && (
                    <span className="ml-auto h-1.5 w-1.5 rounded-full pixie-gradient" />
                  )}
                </span>
              </Link>
            );
          })}
        </nav>
      </ScrollArea>

      <Separator className="opacity-50" />
      <div className="p-3">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-sidebar-foreground/50 hover:text-destructive"
          onClick={handleSignOut}
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </div>
  );
}
