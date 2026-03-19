"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
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
  Menu,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

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

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <div className="flex h-14 items-center justify-between border-b border-border/50 bg-background/95 backdrop-blur-sm px-4">
      {/* Logo */}
      <Link href="/overview" className="flex items-center gap-2">
        <div className="h-7 w-7 rounded-lg pixie-gradient flex items-center justify-center">
          <Sparkles className="h-3.5 w-3.5 text-white" />
        </div>
        <span className="text-base font-bold pixie-gradient-text">Pixie</span>
      </Link>

      {/* Menu trigger */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger className="inline-flex items-center justify-center rounded-md p-2 hover:bg-accent cursor-pointer">
          <Menu className="h-5 w-5" />
        </SheetTrigger>
        <SheetContent side="right" className="w-[280px] p-0">
          <div className="flex h-14 items-center border-b px-4">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg pixie-gradient flex items-center justify-center">
                <Sparkles className="h-3.5 w-3.5 text-white" />
              </div>
              <span className="text-base font-bold pixie-gradient-text">
                Pixie Social
              </span>
            </div>
          </div>

          <nav className="flex flex-col gap-1 p-3">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                >
                  <span
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                    {isActive && (
                      <span className="ml-auto h-1.5 w-1.5 rounded-full pixie-gradient" />
                    )}
                  </span>
                </Link>
              );
            })}
          </nav>

          <div className="absolute bottom-0 left-0 right-0 p-3 border-t">
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive"
              onClick={handleSignOut}
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
