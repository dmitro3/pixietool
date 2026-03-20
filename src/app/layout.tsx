import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { TRPCProvider } from "@/lib/trpc/provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Pixie Social — AI Social Media Manager",
    template: "%s | Pixie Social",
  },
  description:
    "Your autonomous AI social media strategist, content creator, and distribution engine. Generate, schedule, and publish content across LinkedIn, X, and Instagram.",
  keywords: ["social media", "AI", "content creation", "scheduling", "LinkedIn", "analytics", "engagement"],
  authors: [{ name: "Pixiedust" }],
  creator: "Pixiedust",
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "Pixie Social",
    title: "Pixie Social — AI Social Media Manager",
    description: "Your autonomous AI social media strategist. Generate, schedule, and publish content across all platforms.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Pixie Social — AI Social Media Manager",
    description: "Your autonomous AI social media strategist. Generate, schedule, and publish content across all platforms.",
    creator: "@pixiedust",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <TRPCProvider>
            <TooltipProvider>
              {children}
              <Toaster />
            </TooltipProvider>
          </TRPCProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
