import { test, expect } from "@playwright/test";

test.describe("Auth Pages", () => {
  test("login page renders form", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByText("Welcome back")).toBeVisible();
    await expect(page.getByPlaceholder("you@example.com")).toBeVisible();
    await expect(page.getByRole("button", { name: /Sign In/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Sign up/i })).toBeVisible();
  });

  test("signup page renders form", async ({ page }) => {
    await page.goto("/signup");
    await expect(page.getByText("Create your account")).toBeVisible();
    await expect(page.getByRole("button", { name: /Create Account/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Sign in/i })).toBeVisible();
  });

  test("login links to signup and vice versa", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("link", { name: /Sign up/i }).click();
    await expect(page).toHaveURL("/signup");

    await page.getByRole("link", { name: /Sign in/i }).click();
    await expect(page).toHaveURL("/login");
  });
});
