"use client";

import { useMemo, useState } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BrandSelector } from "@/components/dashboard/brand-selector";
import { CreateContentDialog } from "@/components/dashboard/create-content-dialog";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  CalendarDays,
  Linkedin,
  Globe,
} from "lucide-react";

const PLATFORM_ICONS: Record<string, typeof Linkedin> = {
  linkedin: Linkedin,
};

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function getCalendarDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const days: { date: Date; currentMonth: boolean }[] = [];

  // Previous month trailing days
  for (let i = firstDay - 1; i >= 0; i--) {
    days.push({
      date: new Date(year, month - 1, daysInPrevMonth - i),
      currentMonth: false,
    });
  }

  // Current month
  for (let d = 1; d <= daysInMonth; d++) {
    days.push({
      date: new Date(year, month, d),
      currentMonth: true,
    });
  }

  // Next month leading days (fill to 42 cells = 6 rows)
  const remaining = 42 - days.length;
  for (let d = 1; d <= remaining; d++) {
    days.push({
      date: new Date(year, month + 1, d),
      currentMonth: false,
    });
  }

  return days;
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export default function SchedulePage() {
  const activeBrandId = useBrandStore((s) => s.activeBrandId);
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  // Fetch scheduled + approved content
  const { data: scheduledItems, isLoading } = trpc.content.list.useQuery(
    { brandId: activeBrandId!, status: "scheduled", limit: 100 },
    { enabled: !!activeBrandId }
  );

  const { data: approvedItems } = trpc.content.list.useQuery(
    { brandId: activeBrandId!, status: "approved", limit: 100 },
    { enabled: !!activeBrandId }
  );

  const { data: publishedItems } = trpc.content.list.useQuery(
    { brandId: activeBrandId!, status: "published", limit: 100 },
    { enabled: !!activeBrandId }
  );

  const allItems = useMemo(() => {
    return [
      ...(scheduledItems ?? []),
      ...(approvedItems ?? []),
      ...(publishedItems ?? []),
    ];
  }, [scheduledItems, approvedItems, publishedItems]);

  const calendarDays = useMemo(() => getCalendarDays(year, month), [year, month]);

  function getItemsForDay(date: Date) {
    return allItems.filter((item) => {
      const itemDate = item.scheduledFor
        ? new Date(item.scheduledFor)
        : item.publishedAt
          ? new Date(item.publishedAt)
          : null;
      return itemDate && isSameDay(itemDate, date);
    });
  }

  function prevMonth() {
    if (month === 0) {
      setMonth(11);
      setYear(year - 1);
    } else {
      setMonth(month - 1);
    }
  }

  function nextMonth() {
    if (month === 11) {
      setMonth(0);
      setYear(year + 1);
    } else {
      setMonth(month + 1);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Schedule</h1>
          <p className="text-muted-foreground">
            Your content calendar and publishing schedule.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <BrandSelector />
          <CreateContentDialog>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Schedule Post
            </Button>
          </CreateContentDialog>
        </div>
      </div>

      {!activeBrandId ? (
        <Card>
          <CardHeader>
            <CardTitle>Select a brand</CardTitle>
            <CardDescription>Choose a brand to see scheduled content.</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" onClick={prevMonth}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <h2 className="text-lg font-semibold min-w-[180px] text-center">
                  {MONTHS[month]} {year}
                </h2>
                <Button variant="outline" size="icon" onClick={nextMonth}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-primary" />
                  Scheduled
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-green-500" />
                  Published
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-yellow-500" />
                  Approved
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[500px] w-full" />
            ) : (
              <div className="border rounded-lg overflow-hidden">
                {/* Day headers */}
                <div className="grid grid-cols-7 bg-muted/50">
                  {DAYS.map((day) => (
                    <div
                      key={day}
                      className="py-2 text-center text-xs font-medium text-muted-foreground border-b"
                    >
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar grid */}
                <div className="grid grid-cols-7">
                  {calendarDays.map((day, i) => {
                    const dayItems = getItemsForDay(day.date);
                    const isToday = isSameDay(day.date, today);

                    return (
                      <div
                        key={i}
                        className={`min-h-[100px] border-b border-r p-1.5 ${
                          !day.currentMonth ? "bg-muted/30" : ""
                        } ${i % 7 === 0 ? "border-l" : ""}`}
                      >
                        <div
                          className={`text-xs font-medium mb-1 ${
                            isToday
                              ? "bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center"
                              : day.currentMonth
                                ? "text-foreground"
                                : "text-muted-foreground/50"
                          }`}
                        >
                          {day.date.getDate()}
                        </div>
                        <div className="space-y-0.5">
                          {dayItems.slice(0, 3).map((item) => {
                            const PlatformIcon =
                              PLATFORM_ICONS[item.platform] ?? Globe;
                            const dotColor =
                              item.status === "published"
                                ? "bg-green-500"
                                : item.status === "scheduled"
                                  ? "bg-primary"
                                  : "bg-yellow-500";

                            return (
                              <div
                                key={item.id}
                                className="flex items-center gap-1 rounded px-1 py-0.5 text-[10px] bg-accent/50 truncate"
                                title={item.textContent?.slice(0, 100) ?? ""}
                              >
                                <span
                                  className={`h-1.5 w-1.5 rounded-full shrink-0 ${dotColor}`}
                                />
                                <PlatformIcon className="h-2.5 w-2.5 shrink-0 text-muted-foreground" />
                                <span className="truncate">
                                  {item.textContent?.slice(0, 30) ?? item.contentType}
                                </span>
                              </div>
                            );
                          })}
                          {dayItems.length > 3 && (
                            <p className="text-[10px] text-muted-foreground px-1">
                              +{dayItems.length - 3} more
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Upcoming list */}
      {scheduledItems && scheduledItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Posts</CardTitle>
            <CardDescription>
              Next {scheduledItems.length} scheduled post{scheduledItems.length > 1 ? "s" : ""}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {scheduledItems
                .sort(
                  (a, b) =>
                    new Date(a.scheduledFor!).getTime() -
                    new Date(b.scheduledFor!).getTime()
                )
                .slice(0, 10)
                .map((item) => {
                  const PlatformIcon =
                    PLATFORM_ICONS[item.platform] ?? Globe;
                  return (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 rounded-lg border p-3"
                    >
                      <PlatformIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">
                          {item.textContent?.slice(0, 80) ?? "No text"}
                        </p>
                      </div>
                      <div className="text-xs text-muted-foreground shrink-0">
                        {new Date(item.scheduledFor!).toLocaleDateString(
                          "en-US",
                          {
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          }
                        )}
                      </div>
                      <Badge variant="secondary" className="text-xs shrink-0 capitalize">
                        {item.contentType}
                      </Badge>
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
