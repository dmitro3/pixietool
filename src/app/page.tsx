import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  Zap,
  BarChart3,
  MessageSquare,
  Calendar,
  Brain,
  ArrowRight,
  Star,
} from "lucide-react";

const FEATURES = [
  {
    icon: Brain,
    title: "AI Content Engine",
    desc: "Generate platform-perfect posts with quality scoring, retry loops, and brand voice injection.",
  },
  {
    icon: Calendar,
    title: "Smart Scheduling",
    desc: "Visual calendar with optimal posting times. Autopilot or co-pilot — your choice.",
  },
  {
    icon: MessageSquare,
    title: "Engage Co-Pilot",
    desc: "AI-drafted replies for every comment and DM. You approve, we send.",
  },
  {
    icon: BarChart3,
    title: "Deep Analytics",
    desc: "Cross-platform performance tracking with AI-powered growth insights.",
  },
  {
    icon: Zap,
    title: "Cross-Platform Waterfall",
    desc: "Create once, repurpose everywhere. AI adapts content per platform automatically.",
  },
  {
    icon: Sparkles,
    title: "Strategy Playbooks",
    desc: "AI-generated growth plans with content pillars, milestones, and weekly recalibration.",
  },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* ─── Header ─── */}
      <header className="fixed top-0 w-full z-50 pixie-glass border-b border-border/50">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg pixie-gradient flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <span className="text-xl font-bold pixie-gradient-text">Pixie Social</span>
          </div>
          <nav className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" className="text-muted-foreground hover:text-foreground">
                Log in
              </Button>
            </Link>
            <Link href="/signup">
              <Button className="pixie-gradient border-0 text-white hover:opacity-90 transition-opacity gap-2">
                <Sparkles className="h-4 w-4" />
                Get Started
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* ─── Hero ─── */}
      <main className="flex flex-1 flex-col items-center pt-16">
        <section className="relative w-full overflow-hidden">
          {/* Background effects */}
          <div className="absolute inset-0 pixie-mesh" />
          <div className="absolute inset-0 pixie-dots opacity-40" />

          <div className="relative mx-auto max-w-4xl text-center px-4 py-28 sm:py-36">
            {/* Floating badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm text-primary mb-8 pixie-float">
              <Star className="h-3.5 w-3.5" />
              AI-Native Social Media Platform
            </div>

            <h1 className="text-5xl font-bold tracking-tight sm:text-7xl leading-tight">
              Your AI Social Media
              <br />
              <span className="pixie-gradient-text">Growth Engine</span>
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Pixie Social is your autonomous AI strategist, content creator, and
              distribution engine. Connect your accounts, set your goals, and let
              AI handle the rest.
            </p>
            <div className="mt-10 flex items-center justify-center gap-4">
              <Link href="/signup">
                <Button
                  size="lg"
                  className="pixie-gradient border-0 text-white text-base px-8 py-6 gap-2 pixie-glow hover:opacity-90 transition-all"
                >
                  <Sparkles className="h-5 w-5" />
                  Start Free Trial
                </Button>
              </Link>
              <Link href="/login">
                <Button
                  variant="outline"
                  size="lg"
                  className="text-base px-8 py-6 gap-2 border-primary/20 hover:border-primary/40 hover:bg-primary/5"
                >
                  Log In
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>

            {/* Trust indicators */}
            <p className="mt-8 text-xs text-muted-foreground/60">
              Free plan available · No credit card required · Set up in 2 minutes
            </p>
          </div>
        </section>

        {/* ─── Features ─── */}
        <section className="w-full py-24 px-4">
          <div className="container mx-auto max-w-6xl">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold">
                Every tool you need,{" "}
                <span className="pixie-gradient-text">powered by AI</span>
              </h2>
              <p className="mt-4 text-muted-foreground max-w-xl mx-auto">
                From content creation to engagement management — Pixie Social handles
                your entire social media workflow.
              </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((feature) => (
                <div
                  key={feature.title}
                  className="group relative rounded-xl border bg-card p-6 pixie-card pixie-shimmer"
                >
                  <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl pixie-gradient-subtle">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {feature.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── CTA ─── */}
        <section className="w-full py-24 px-4">
          <div className="container mx-auto max-w-3xl">
            <div className="relative rounded-2xl pixie-gradient p-px">
              <div className="rounded-2xl bg-card px-8 py-16 sm:px-16 text-center pixie-mesh">
                <Sparkles className="h-10 w-10 text-primary mx-auto mb-4 pixie-float" />
                <h2 className="text-3xl font-bold mb-4">
                  Ready to sprinkle some magic?
                </h2>
                <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                  Join creators and brands who are growing their audience 3x faster
                  with AI-powered social media management.
                </p>
                <Link href="/signup">
                  <Button
                    size="lg"
                    className="pixie-gradient border-0 text-white text-base px-8 py-6 gap-2 pixie-glow-strong hover:opacity-90"
                  >
                    <Sparkles className="h-5 w-5" />
                    Get Started for Free
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ─── Footer ─── */}
      <footer className="border-t border-border/50 py-8">
        <div className="container mx-auto px-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="h-5 w-5 rounded pixie-gradient flex items-center justify-center">
              <Sparkles className="h-3 w-3 text-white" />
            </div>
            Pixie Social — Part of the Pixiedust ecosystem
          </div>
          <p className="text-xs text-muted-foreground/50">
            Built with AI, for humans
          </p>
        </div>
      </footer>
    </div>
  );
}
