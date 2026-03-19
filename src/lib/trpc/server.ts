import "server-only";
import { createCaller, type AppRouter } from "@/server/trpc/root";
import { createTRPCContext } from "@/server/trpc/trpc";

// Server-side caller for use in Server Components
export async function createServerCaller() {
  const context = await createTRPCContext();
  return createCaller(context);
}
