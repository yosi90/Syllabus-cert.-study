import { expect, test } from "@playwright/test";
import { prepareApp } from "./fixtures";

test("language, theme, filters and current practice question survive a reload", async ({ page }, testInfo) => {
  await prepareApp(page);
  await page.addInitScript(() => {
    window.localStorage.setItem("istqb-ctfl-v4-spanish-translation-notice-seen", "true");
  });
  await page.goto("/#/practice");

  if (testInfo.project.name === "mobile-chromium") {
    await page.getByRole("button", { name: "Open menu" }).click();
  }

  await page.getByRole("button", { name: "Español" }).click();
  await page.getByRole("switch", { name: "Modo oscuro" }).click();
  const modelFilters = page.locator(".filter-group").filter({ hasText: "Modelo" });
  await modelFilters.getByLabel("B", { exact: true }).check();
  if (testInfo.project.name === "mobile-chromium") {
    await page.locator(".mobile-menu-toggle").click();
  }
  await page.getByRole("button", { name: "Siguiente" }).click();
  await expect(page.getByText("2/40", { exact: true })).toBeVisible();

  await page.reload();

  await expect(page.getByRole("heading", { name: "Preguntas sueltas" })).toBeVisible();
  await expect(page.getByRole("switch", { name: "Modo oscuro" })).toBeChecked();
  await expect(modelFilters.getByLabel("B", { exact: true })).toBeChecked();
  await expect(page.getByText("2/40", { exact: true })).toBeVisible();
});

test("an active exam restores its answers, position and timer after reload", async ({ page }) => {
  await prepareApp(page);
  await page.goto("/#/exam");
  await page.getByRole("button", { name: /Model A/ }).click();
  await page.getByRole("radio").first().check();
  await page.getByRole("button", { name: "Next" }).click();
  await expect(page.getByText("2/40", { exact: true })).toBeVisible();

  await page.reload();

  await expect(page.getByRole("heading", { name: "Modelo A" })).toBeVisible();
  await expect(page.getByText("1/40", { exact: true })).toBeVisible();
  await expect(page.getByText("2/40", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Previous" }).click();
  await expect(page.getByRole("radio").first()).toBeChecked();
});

test("an exam whose timer expired while closed is restored as time up", async ({ page }) => {
  await prepareApp(page);
  await page.goto("/#/exam");
  await page.getByRole("button", { name: /Model A/ }).click();
  await page.evaluate(() => {
    const key = "istqb-ctfl-v4-trainer:v2";
    const progress = JSON.parse(window.localStorage.getItem(key) ?? "null");
    progress.activeExam.endsAt = Date.now() - 1_000;
    progress.activeExam.timerMode = "standard";
    progress.preferences.lastRoute = "/exam";
    window.localStorage.setItem(key, JSON.stringify(progress));
  });

  await page.reload();

  await expect(page.getByText("Time is up.", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Finish" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Cancel" })).toBeVisible();
});

test("the last route is restored when reopening the application root", async ({ page }) => {
  await prepareApp(page);
  await page.goto("/#/review");
  await expect(page.getByRole("heading", { name: "Recent history" })).toBeVisible();
  await expect.poll(async () => {
    return page.evaluate(() => JSON.parse(window.localStorage.getItem("istqb-ctfl-v4-trainer:v2") ?? "null")?.preferences.lastRoute);
  }).toBe("/review");

  await page.goto("/");

  await expect(page).toHaveURL(/#\/review$/);
  await expect(page.getByRole("heading", { name: "Recent history" })).toBeVisible();
});
