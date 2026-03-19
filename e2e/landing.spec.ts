import { test, expect } from "@playwright/test";

test.describe("Landing Page", () => {
  test("loads with correct title", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Pixie Social/);
  });

  test("shows hero section with CTA", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Growth Engine");
    await expect(page.getByRole("link", { name: /Start Free Trial/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Log In/i })).toBeVisible();
  });

  test("shows all 6 feature cards", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("AI Content Engine")).toBeVisible();
    await expect(page.getByText("Smart Scheduling")).toBeVisible();
    await expect(page.getByText("Engage Co-Pilot")).toBeVisible();
    await expect(page.getByText("Deep Analytics")).toBeVisible();
    await expect(page.getByText("Cross-Platform Waterfall")).toBeVisible();
    await expect(page.getByText("Strategy Playbooks")).toBeVisible();
  });

  test("CTA links to signup", async ({ page }) => {
    await page.goto("/");
    const cta = page.getByRole("link", { name: /Start Free Trial/i });
    await expect(cta).toHaveAttribute("href", "/signup");
  });

  test("footer is visible", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Pixiedust ecosystem")).toBeVisible();
  });
});
