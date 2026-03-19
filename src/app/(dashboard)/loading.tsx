import { Sparkles } from "lucide-react";

export default function DashboardLoading() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl pixie-gradient mb-4 pixie-float shadow-lg shadow-primary/20">
          <Sparkles className="h-6 w-6 text-white" />
        </div>
        <p className="text-sm text-muted-foreground animate-pulse">
          Sprinkling magic...
        </p>
      </div>
    </div>
  );
}
