import { test, expect } from "@playwright/test";

test.describe("Health Check", () => {
  test("returns JSON with status and checks", async ({ request }) => {
    const res = await request.get("/api/health");
    const body = await res.json();

    expect(body.status).toBeDefined();
    expect(body.timestamp).toBeDefined();
    expect(body.version).toBe("0.1.0");
    expect(body.checks).toBeDefined();
    expect(body.checks.environment).toBe("ok");
  });
});

test.describe("404 Page", () => {
  test("shows custom not-found page", async ({ page }) => {
    await page.goto("/nonexistent-page-xyz");
    await expect(page.getByText("404")).toBeVisible();
    await expect(page.getByText("Page not found")).toBeVisible();
    await expect(page.getByRole("link", { name: /Dashboard/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Home/i })).toBeVisible();
  });
});
