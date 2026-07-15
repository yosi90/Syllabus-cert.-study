import { expect, test } from "@playwright/test";
import { prepareApp } from "./fixtures";

test.beforeEach(async ({ page }) => {
  await prepareApp(page);
});

test("home shows a neutral dashboard without progress", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Study dashboard" })).toBeVisible();
  await expect(page.getByText("0/160", { exact: true })).toBeVisible();
  await expect(page.getByText("No attempts yet", { exact: true })).toHaveCount(2);
  await expect(page.getByRole("heading", { name: "Progress by chapter" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Progress by K-Level" })).toBeVisible();
  await expect(page.getByText("Complete some questions to identify areas to reinforce.")).toBeVisible();
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
});

test("quick study actions open bounded practice sets", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Quick set · 10" }).click();

  await expect(page).toHaveURL(/#\/practice$/);
  await expect(page.getByRole("heading", { name: "Adaptive session · 10" })).toBeVisible();
  await expect(page.getByText("1/10", { exact: true })).toBeVisible();
});

test("the full study action opens twenty questions", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Full set · 20" }).click();

  await expect(page).toHaveURL(/#\/practice$/);
  await expect(page.getByText("1/20", { exact: true })).toBeVisible();
});

test("an active exam can be continued from home", async ({ page }) => {
  await page.goto("/#/exam");
  await page.getByRole("button", { name: /Model A/ }).click();
  const homeLink = page.locator(".mobile-primary-nav").getByRole("link", { name: "Home" });
  if (await homeLink.isVisible()) {
    await homeLink.click();
  } else {
    await page.locator(".mode-tabs").getByRole("link", { name: "Home" }).click();
  }
  await page.getByRole("button", { name: "Continue active exam" }).click();

  await expect(page).toHaveURL(/#\/exam$/);
  await expect(page.getByRole("heading", { name: "Modelo A" })).toBeVisible();
});

test("practice progress can be continued from home", async ({ page }) => {
  await page.goto("/#/practice");
  await page.getByRole("radio").first().check();
  await page.getByRole("button", { name: "Check" }).click();
  const mobileHome = page.locator(".mobile-primary-nav").getByRole("link", { name: "Home" });
  if (await mobileHome.isVisible()) {
    await mobileHome.click();
  } else {
    await page.locator(".mode-tabs").getByRole("link", { name: "Home" }).click();
  }
  await page.getByRole("button", { name: "Continue practice" }).click();

  await expect(page).toHaveURL(/#\/practice$/);
  await expect(page.getByRole("heading", { name: "Single questions" })).toBeVisible();
});
