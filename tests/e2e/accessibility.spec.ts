import { expect, test, type Page } from "@playwright/test";
import { prepareApp } from "./fixtures";

test.beforeEach(async ({ page }) => {
  await prepareApp(page);
});

async function openMobileMenu(page: Page) {
  const trigger = page.getByRole("button", { name: "Open menu" });
  if (await trigger.isVisible()) await trigger.click();
}

test("dialogs trap focus, close with Escape and return focus", async ({ page }) => {
  await page.goto("/#/exam");
  await page.getByRole("button", { name: /Model A/ }).click();
  const cancelTrigger = page.getByRole("button", { name: "Cancel" });
  await cancelTrigger.click();

  const dialog = page.getByRole("alertdialog", { name: "Cancel exam?" });
  const safeAction = dialog.getByRole("button", { name: "Go back" });
  const destructiveAction = dialog.getByRole("button", { name: "Cancel exam" });
  await expect(safeAction).toBeFocused();
  await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe("hidden");
  await page.keyboard.press("Shift+Tab");
  await expect(destructiveAction).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(safeAction).toBeFocused();
  await page.keyboard.press("Escape");

  await expect(dialog).toBeHidden();
  await expect(cancelTrigger).toBeFocused();
  await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe("");
});

test("theory dialog is keyboard accessible and restores its trigger", async ({ page }) => {
  await page.goto("/#/practice");
  await page.getByRole("radio").first().check();
  await page.getByRole("button", { name: "Check" }).click();
  const theoryTrigger = page.getByRole("button", { name: /View theory/ });
  await theoryTrigger.click();

  const dialog = page.getByRole("dialog", { name: "FL-1.1.1" });
  await expect(dialog.getByRole("button", { name: "Close" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(theoryTrigger).toBeFocused();
});

test("image dialog closes with Escape and restores its trigger", async ({ page }) => {
  await page.goto("/#/practice");
  await page.getByRole("textbox", { name: "Search text, LO or topic" }).fill("A-14");
  const imageTrigger = page.getByRole("button", { name: /Expand image/ });
  await imageTrigger.click();

  const dialog = page.getByRole("dialog", { name: "Test execution results table for TC1, TC2 and TC3." });
  await expect(dialog.getByRole("button", { name: "Close image" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(imageTrigger).toBeFocused();
});

test("mobile menu closes with Escape and returns focus", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const menuTrigger = page.getByRole("button", { name: "Open menu" });
  await menuTrigger.click();
  await expect(page.getByRole("complementary", { name: "Study controls" }).getByRole("button", { name: "English" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(menuTrigger).toBeFocused();
});

test("landmarks, headings and language controls have accessible names", async ({ page }) => {
  await page.goto("/#/practice");
  await expect(page.getByRole("main")).toHaveCount(1);
  await expect(page.getByRole("complementary", { name: "Study controls" })).toBeAttached();
  await expect(page.getByRole("group", { name: "Language" }).first()).toBeAttached();
  await expect(page.getByRole("heading", { level: 3, name: "Which of the following statements describe a valid test objective?" })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Search text, LO or topic" })).toBeAttached();
});

test("primary navigation is visible and operable from the keyboard", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "Mobile keyboard behavior is covered through its modal menu.");
  await page.goto("/");
  const navigation = page.getByRole("navigation", { name: "Modes" });
  const homeLink = navigation.getByRole("link", { name: "Home" });
  const practiceLink = navigation.getByRole("link", { name: "Practice" });

  await page.keyboard.press("Tab");
  await expect(homeLink).toBeFocused();
  const outlineWidth = await homeLink.evaluate((element) => Number.parseFloat(getComputedStyle(element).outlineWidth));
  expect(outlineWidth).toBeGreaterThanOrEqual(2);
  await page.keyboard.press("Tab");
  await expect(practiceLink).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#\/practice$/);
});

test("reduced motion disables interface transitions", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const duration = await page.locator(".theme-switch span").evaluate((element) =>
    Number.parseFloat(getComputedStyle(element).transitionDuration),
  );
  expect(duration).toBeLessThanOrEqual(0.001);
});

test("import and export report success and error without native alerts", async ({ page }) => {
  await page.goto("/");
  await openMobileMenu(page);
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles({ name: "invalid.json", mimeType: "application/json", buffer: Buffer.from("{}") });
  await expect(page.getByRole("alert")).toContainText("CTFL v4");

  const validProgress = await page.evaluate(() => window.localStorage.getItem("istqb-ctfl-v4-trainer:v2") ?? "");
  await fileInput.setInputFiles({ name: "progress.json", mimeType: "application/json", buffer: Buffer.from(validProgress) });
  await expect(page.getByRole("status")).toHaveText("Progress imported successfully.");

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export" }).click();
  await downloadPromise;
  await expect(page.getByRole("status")).toHaveText("Progress export downloaded.");
});

async function contrastRatio(page: Page, foregroundSelector: string, backgroundSelector: string) {
  return page.evaluate(({ foregroundSelector, backgroundSelector }) => {
    const parse = (value: string) => (value.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number);
    const luminance = (value: string) => {
      const channels = parse(value).map((channel) => {
        const normalized = channel / 255;
        return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
    };
    const foreground = getComputedStyle(document.querySelector(foregroundSelector)!).color;
    const background = getComputedStyle(document.querySelector(backgroundSelector)!).backgroundColor;
    const lighter = Math.max(luminance(foreground), luminance(background));
    const darker = Math.min(luminance(foreground), luminance(background));
    return (lighter + 0.05) / (darker + 0.05);
  }, { foregroundSelector, backgroundSelector });
}

for (const theme of ["light", "dark"] as const) {
  test(`key text meets WCAG AA contrast in ${theme} theme`, async ({ page }, testInfo) => {
    await page.goto("/");
    if (theme === "dark") {
      await openMobileMenu(page);
      if (testInfo.project.name === "mobile-chromium") {
        await page.getByRole("button", { name: "Dark theme" }).click();
      } else {
        await page.getByRole("switch", { name: "Dark mode" }).click();
      }
    }
    expect(await contrastRatio(page, ".workspace-header h2", ":root")).toBeGreaterThanOrEqual(4.5);
    expect(await contrastRatio(page, ".dashboard-section .eyebrow", ".dashboard-section")).toBeGreaterThanOrEqual(4.5);
    expect(await contrastRatio(page, ".dashboard-note", ".dashboard-section")).toBeGreaterThanOrEqual(4.5);
    expect(await contrastRatio(page, ".primary", ".primary")).toBeGreaterThanOrEqual(4.5);
  });
}
