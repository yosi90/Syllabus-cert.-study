import { expect, test } from "@playwright/test";
import { prepareApp } from "./fixtures";

test("the first visit has a three-step tutorial", async ({ page }) => {
  await page.goto("/");

  const dialog = page.locator(".tutorial-modal");
  await expect(dialog).toBeVisible();
  await expect(dialog.locator(".tutorial-dot")).toHaveCount(3);
  await dialog.getByRole("button", { name: "Next" }).click();
  await expect(page.getByRole("heading", { name: "Practice with feedback" })).toBeVisible();
  await dialog.getByRole("button", { name: "Next" }).click();
  await expect(page.getByRole("heading", { name: "Official exam practice" })).toBeVisible();
  await page.getByRole("button", { name: "Start studying" }).click();
  await expect(dialog).toBeHidden();
});

test("the tutorial owns focus and closes with Escape", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("button", { name: "Skip tutorial" })).toBeFocused();
  await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe("hidden");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe("");
});

test("the tutorial is fully translated into Spanish", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "The desktop language selector is directly available.");
  await prepareApp(page);
  await page.addInitScript(() => {
    window.localStorage.setItem("istqb-ctfl-v4-spanish-translation-notice-seen", "true");
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Español" }).click();
  await page.getByRole("button", { name: "Tutorial", exact: true }).click();

  await expect(page.getByRole("heading", { name: "Bienvenida" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Omitir tutorial" })).toBeVisible();
  await expect(page.getByRole("dialog", { name: "Bienvenida" }).getByRole("button", { name: "Siguiente" })).toBeVisible();
});

test("the tutorial fits a 390px mobile viewport", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "A single canonical 390px snapshot is enough.");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  await expect(page.getByRole("dialog", { name: "Welcome" })).toBeVisible();
  await expect(page).toHaveScreenshot("tutorial-390.png", { animations: "disabled" });
});
