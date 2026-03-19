"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { useBrandStore } from "@/hooks/use-brand";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CreateContentDialog } from "@/components/dashboard/create-content-dialog";
import { ContentCard } from "@/components/dashboard/content-card";
import { BrandSelector } from "@/components/dashboard/brand-selector";
import { Plus, Sparkles, FileText } from "lucide-react";

type StatusTab = "all" | "draft" | "pending_review" | "approved" | "scheduled" | "published";

const TABS: { value: StatusTab; label: string }[] = [
  { value: "all", label: "All" },
  { value: "draft", label: "Drafts" },
  { value: "pending_review", label: "Pending Review" },
  { value: "approved", label: "Approved" },
  { value: "scheduled", label: "Scheduled" },
  { value: "published", label: "Published" },
];

export default function ContentPage() {
  const [activeTab, setActiveTab] = useState<StatusTab>("all");
  const activeBrandId = useBrandStore((s) => s.activeBrandId);

  const { data: items, isLoading } = trpc.content.list.useQuery(
    {
      brandId: activeBrandId!,
      status: activeTab === "all" ? undefined : activeTab,
      limit: 50,
    },
    { enabled: !!activeBrandId }
  );

  const { data: counts } = trpc.content.countByStatus.useQuery(
    { brandId: activeBrandId! },
    { enabled: !!activeBrandId }
  );

  const totalCount = counts
    ? Object.values(counts).reduce((a, b) => a + b, 0)
    : 0;

  function getTabCount(tab: StatusTab) {
    if (!counts) return 0;
    if (tab === "all") return totalCount;
    return counts[tab] ?? 0;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Content</h1>
          <p className="text-muted-foreground">
            Create, review, and manage your content pipeline.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <BrandSelector />
          <CreateContentDialog>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Create Post
            </Button>
          </CreateContentDialog>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => { if (v) setActiveTab(v as StatusTab); }}>
        <TabsList>
          {TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value} className="gap-2">
              {tab.label}
              {counts && (
                <Badge variant="secondary" className="h-5 min-w-5 justify-center text-xs">
                  {getTabCount(tab.value)}
                </Badge>
              )}
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
                    Choose a brand from the selector above to see content.
                  </CardDescription>
                </CardHeader>
              </Card>
            ) : isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Card key={i}>
                    <CardHeader>
                      <Skeleton className="h-4 w-[200px]" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-16 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : items && items.length > 0 ? (
              <div className="space-y-4">
                {items.map((item) => (
                  <ContentCard key={item.id} item={item} />
                ))}
              </div>
            ) : (
              <Card>
                <CardHeader className="items-center text-center py-12">
                  <FileText className="h-12 w-12 text-muted-foreground/40 mb-2" />
                  <CardTitle>
                    {tab.value === "all" ? "No content yet" : `No ${tab.label.toLowerCase()} content`}
                  </CardTitle>
                  <CardDescription>
                    {tab.value === "all"
                      ? "Generate your first AI-powered post or create one manually."
                      : `Content with "${tab.label}" status will appear here.`}
                  </CardDescription>
                </CardHeader>
                {tab.value === "all" && (
                  <CardContent className="flex justify-center pb-8">
                    <CreateContentDialog>
                      <Button variant="outline" className="gap-2">
                        <Sparkles className="h-4 w-4" />
                        Generate with AI
                      </Button>
                    </CreateContentDialog>
                  </CardContent>
                )}
              </Card>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
