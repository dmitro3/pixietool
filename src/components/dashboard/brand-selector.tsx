"use client";

import { useEffect } from "react";
import { trpc } from "@/lib/trpc/client";
import { useBrandStore } from "@/hooks/use-brand";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Building2 } from "lucide-react";

export function BrandSelector() {
  const { activeBrandId, setActiveBrand } = useBrandStore();
  const { data: brands, isLoading } = trpc.brands.list.useQuery();

  // Auto-select first brand if none selected
  useEffect(() => {
    if (!activeBrandId && brands?.length) {
      setActiveBrand(brands[0].id);
    }
  }, [activeBrandId, brands, setActiveBrand]);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Building2 className="h-4 w-4" />
        Loading brands...
      </div>
    );
  }

  if (!brands?.length) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Building2 className="h-4 w-4" />
        No brands yet
      </div>
    );
  }

  if (brands.length === 1) {
    return (
      <div className="flex items-center gap-2 text-sm font-medium">
        <Building2 className="h-4 w-4 text-muted-foreground" />
        {brands[0].name}
      </div>
    );
  }

  return (
    <Select value={activeBrandId ?? undefined} onValueChange={(v) => { if (v) setActiveBrand(v); }}>
      <SelectTrigger className="w-[200px]">
        <Building2 className="h-4 w-4 mr-2 text-muted-foreground" />
        <SelectValue placeholder="Select brand" />
      </SelectTrigger>
      <SelectContent>
        {brands.map((brand) => (
          <SelectItem key={brand.id} value={brand.id}>
            {brand.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
