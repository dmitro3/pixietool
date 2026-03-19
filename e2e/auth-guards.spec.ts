import { test, expect } from "@playwright/test";

const PROTECTED_ROUTES = [
  "/overview",
  "/content",
  "/schedule",
  "/engage",
  "/analytics",
  "/strategy",
  "/brands",
  "/settings",
];

test.describe("Auth Guards", () => {
  for (const route of PROTECTED_ROUTES) {
    test(`redirects ${route} to login when unauthenticated`, async ({ page }) => {
      await page.goto(route);
      await expect(page).toHaveURL(/\/login\?redirect=/);
    });
  }
});
