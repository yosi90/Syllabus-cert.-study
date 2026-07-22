import { expect, test } from "@playwright/test";
import { prepareApp } from "./fixtures";

test.beforeEach(async ({ page }) => {
  await prepareApp(page);
});

test("mobile primary navigation reaches every current mode", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-chromium", "This behavior is specific to the mobile layout.");
  await page.goto("/");

  const navigation = page.locator(".mobile-primary-nav");
  await expect(navigation).toBeVisible();
  await expect(navigation.getByRole("link")).toHaveCount(4);
  await navigation.getByRole("link", { name: "Practice" }).click();
  await expect(page).toHaveURL(/#\/practice$/);
  await navigation.getByRole("link", { name: "Exam" }).click();
  await expect(page).toHaveURL(/#\/exam$/);
  await navigation.getByRole("link", { name: "Review" }).click();
  await expect(page).toHaveURL(/#\/review$/);
  await navigation.getByRole("link", { name: "Practice" }).click();
  await expect(page).toHaveURL(/#\/practice$/);
  await navigation.getByRole("link", { name: "Home" }).click();
  await expect(page).toHaveURL(/#\/$/);
});

test("mobile primary navigation survives scrolling, route changes and viewport resizing", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-firefox", "This regression covers Firefox mobile viewport changes.");
  await page.goto("/#/practice");

  const navigation = page.locator(".mobile-primary-nav");
  const links = navigation.getByRole("link");
  const icons = navigation.locator("svg");

  for (const height of [720, 851, 760, 851]) {
    await page.setViewportSize({ width: 393, height });
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await expect(navigation).toBeVisible();
    await expect(links).toHaveCount(4);
    await expect(icons).toHaveCount(4);
    for (const link of await links.all()) await expect(link).toBeVisible();
    for (const icon of await icons.all()) await expect(icon).toBeVisible();
  }

  await navigation.getByRole("link", { name: "Exam" }).click();
  await expect(page).toHaveURL(/#\/exam$/);
  await expect(links).toHaveCount(4);
  for (const link of await links.all()) await expect(link).toBeVisible();
});

test("filters and secondary actions remain in the mobile side menu", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-chromium", "This behavior is specific to the mobile layout.");
  await page.goto("/");

  await page.getByRole("button", { name: "Open menu" }).click();
  await expect(page.locator("#main-menu")).toBeVisible();
  await expect(page.locator("#main-menu .mode-tabs")).toBeHidden();
  await expect(page.locator("#main-menu .progress-panel")).toBeHidden();
  await expect(page.locator("#main-menu").getByRole("heading", { name: "Trainer" })).toBeHidden();
  await expect(page.getByRole("button", { name: "Light theme" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Dark theme" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Export" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Import" })).toBeVisible();
  const lightMenuColor = await page.locator("#main-menu").evaluate((element) => getComputedStyle(element).backgroundColor);
  await expect(page).toHaveScreenshot("menu-mobile-open.png", { animations: "disabled" });
  await page.getByRole("button", { name: "Dark theme" }).click();
  const darkMenuColor = await page.locator("#main-menu").evaluate((element) => getComputedStyle(element).backgroundColor);
  expect(darkMenuColor).not.toBe(lightMenuColor);
  await page.locator(".mobile-menu-toggle").click();
  await expect(page.locator("#main-menu")).not.toHaveClass(/is-open/);
  await expect(page.locator(".menu-backdrop")).toHaveCount(0);
});

for (const width of [320, 390, 768]) {
  test(`the layout has no horizontal overflow at ${width}px`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chromium", "Each width only needs one Chromium pass.");
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/#/practice");

    await expect(page.locator(".mobile-primary-nav")).toBeVisible();
    const dimensions = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
    if (width === 390) {
      await expect(page).toHaveScreenshot("practice-mobile-390.png", { animations: "disabled" });
    }
  });
}
