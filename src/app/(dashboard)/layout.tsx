"use client";

import { Sidebar } from "@/components/dashboard/sidebar";
import { MobileNav } from "@/components/dashboard/mobile-nav";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen">
      {/* Desktop sidebar */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* Mobile top nav */}
      <div className="block md:hidden fixed top-0 left-0 right-0 z-50">
        <MobileNav />
      </div>

      <main className="flex-1 overflow-y-auto">
        <div className="container mx-auto px-4 py-6 md:px-6 md:py-8 mt-14 md:mt-0">
          {children}
        </div>
      </main>
    </div>
  );
}
