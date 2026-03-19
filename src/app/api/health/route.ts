import { NextResponse } from "next/server";
import { db } from "@/server/db/client";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  const checks: Record<string, "ok" | "error"> = {};
  let healthy = true;

  // Database check
  try {
    await db.execute(sql`SELECT 1`);
    checks.database = "ok";
  } catch {
    checks.database = "error";
    healthy = false;
  }

  // Environment check
  checks.environment = process.env.NEXT_PUBLIC_APP_URL ? "ok" : "error";
  if (checks.environment === "error") healthy = false;

  return NextResponse.json(
    {
      status: healthy ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version ?? "0.1.0",
      checks,
    },
    { status: healthy ? 200 : 503 }
  );
}
