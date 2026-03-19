import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Sparkles, Home, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 pixie-mesh">
      <div className="absolute inset-0 pixie-dots opacity-20" />
      <div className="relative text-center max-w-md">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl pixie-gradient mb-6 pixie-float shadow-lg shadow-primary/25">
          <Sparkles className="h-8 w-8 text-white" />
        </div>
        <h1 className="text-8xl font-bold pixie-gradient-text mb-2">404</h1>
        <h2 className="text-2xl font-semibold mb-3">Page not found</h2>
        <p className="text-muted-foreground mb-8">
          This page must have vanished into pixie dust.
          Let&apos;s get you back on track.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link href="/overview">
            <Button className="pixie-gradient border-0 text-white gap-2 hover:opacity-90">
              <Home className="h-4 w-4" />
              Dashboard
            </Button>
          </Link>
          <Link href="/">
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
