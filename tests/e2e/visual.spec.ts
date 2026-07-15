import { expect, test } from "@playwright/test";
import { prepareApp } from "./fixtures";

test.beforeEach(async ({}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "Desktop baselines are the canonical visual reference.");
});

test("practice light theme baseline", async ({ page }) => {
  await prepareApp(page, "light");
  await page.goto("/#/practice");
  await expect(page.getByRole("heading", { name: "Single questions" })).toBeVisible();
  await expect(page).toHaveScreenshot("practice-light.png", { fullPage: true, animations: "disabled" });
});

test("practice dark theme baseline", async ({ page }) => {
  await prepareApp(page, "dark");
  await page.goto("/#/practice");
  await expect(page.getByRole("heading", { name: "Single questions" })).toBeVisible();
  await expect(page).toHaveScreenshot("practice-dark.png", { fullPage: true, animations: "disabled" });
});

test("home light theme baseline", async ({ page }) => {
  await prepareApp(page, "light");
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Study dashboard" })).toBeVisible();
  await expect(page).toHaveScreenshot("home-light.png", { fullPage: true, animations: "disabled" });
});

test("home dark theme baseline", async ({ page }) => {
  await prepareApp(page, "dark");
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Study dashboard" })).toBeVisible();
  await expect(page).toHaveScreenshot("home-dark.png", { fullPage: true, animations: "disabled" });
});
