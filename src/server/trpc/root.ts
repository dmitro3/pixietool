import { createTRPCRouter, createCallerFactory } from "./trpc";
import { authRouter } from "./routers/auth";
import { brandsRouter } from "./routers/brands";
import { contentRouter } from "./routers/content";
import { platformsRouter } from "./routers/platforms";
import { analyticsRouter } from "./routers/analytics";
import { engagementRouter } from "./routers/engagement";
import { strategyRouter } from "./routers/strategy";
import { billingRouter } from "./routers/billing";

export const appRouter = createTRPCRouter({
  auth: authRouter,
  brands: brandsRouter,
  content: contentRouter,
  platforms: platformsRouter,
  analytics: analyticsRouter,
  engagement: engagementRouter,
  strategy: strategyRouter,
  billing: billingRouter,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
