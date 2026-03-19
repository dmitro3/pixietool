"use client";

import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { toast } from "sonner";

interface ExportCsvButtonProps {
  brandId: string;
  status?: string;
}

export function ExportCsvButton({ brandId, status }: ExportCsvButtonProps) {
  const { refetch, isFetching } = trpc.content.exportCsv.useQuery(
    { brandId, status },
    { enabled: false } // Only fetch on demand
  );

  async function handleExport() {
    try {
      const { data } = await refetch();
      if (!data) {
        toast.error("No data to export");
        return;
      }

      const blob = new Blob([data], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `pixie-content-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);

      toast.success("Content exported to CSV");
    } catch {
      toast.error("Export failed");
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExport}
      disabled={isFetching}
      className="gap-2"
    >
      <Download className="h-3.5 w-3.5" />
      {isFetching ? "Exporting..." : "Export CSV"}
    </Button>
  );
}
