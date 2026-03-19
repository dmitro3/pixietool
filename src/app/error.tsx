"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { Button } from "@/components/ui/button";
import { Sparkles, RefreshCw, Home } from "lucide-react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center px-4 pixie-mesh">
      <div className="absolute inset-0 pixie-dots opacity-20" />
      <div className="relative text-center max-w-md">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10 mb-6">
          <Sparkles className="h-8 w-8 text-destructive" />
        </div>
        <h1 className="text-3xl font-bold mb-3">Something went wrong</h1>
        <p className="text-muted-foreground mb-2">
          A pixie tripped over a wire. We&apos;re working on it.
        </p>
        {error.digest && (
          <p className="text-xs text-muted-foreground/50 mb-6 font-mono">
            Error ID: {error.digest}
          </p>
        )}
        <div className="flex items-center justify-center gap-3">
          <Button
            onClick={reset}
            className="pixie-gradient border-0 text-white gap-2 hover:opacity-90"
          >
            <RefreshCw className="h-4 w-4" />
            Try Again
          </Button>
          <Link href="/overview">
            <Button variant="outline" className="gap-2">
              <Home className="h-4 w-4" />
              Dashboard
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
