import { expect, test } from "@playwright/test";
import { prepareApp } from "./fixtures";

test.beforeEach(async ({ page }) => {
  await prepareApp(page);
});

test("home shows a neutral dashboard without progress", async ({ page }, testInfo) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await expect(page.getByText("0/160", { exact: true })).toBeVisible();
  const isMobile = testInfo.project.name === "mobile-chromium";
  await expect(page.getByText("No attempts yet", { exact: true })).toHaveCount(2);
  const resumeHeading = page.getByRole("heading", { name: "Continue where you left off" });
  if (isMobile) await expect(resumeHeading).toBeHidden();
  else await expect(resumeHeading).toBeVisible();
  await expect(page.getByRole("heading", { name: "Progress by chapter" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Progress by K-Level" })).toBeVisible();
  await expect(page.getByText("Complete some questions to identify areas to reinforce.")).toBeVisible();
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
});

test("mobile home keeps its summary and study actions compact", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-chromium", "This behavior is specific to the mobile layout.");
  await page.goto("/");

  await expect(page.locator(".quick-study-eyebrow")).toBeHidden();
  await expect(page.locator(".quick-study-description")).toBeHidden();
  await expect(page.locator(".dashboard-resume-card")).toBeHidden();

  const headerMetrics = await page.locator(".header-metrics .metric").evaluateAll((elements) =>
    elements.map((element) => ({
      width: element.getBoundingClientRect().width,
      textAlign: getComputedStyle(element).textAlign,
    })),
  );
  expect(headerMetrics.every(({ width }) => width <= 52)).toBe(true);
  expect(headerMetrics.every(({ textAlign }) => textAlign === "center")).toBe(true);

  const snapshotTitle = await page.locator(".dashboard-snapshot-title").evaluate((element) => {
    const label = element.querySelector(".eyebrow")!;
    const value = element.querySelector("h3")!;
    const labelRect = label.getBoundingClientRect();
    const valueRect = value.getBoundingClientRect();
    return {
      labelFontSize: getComputedStyle(label).fontSize,
      valueFontSize: getComputedStyle(value).fontSize,
      centerDifference: Math.abs((labelRect.top + labelRect.height / 2) - (valueRect.top + valueRect.height / 2)),
    };
  });
  expect(snapshotTitle.valueFontSize).toBe(snapshotTitle.labelFontSize);
  expect(snapshotTitle.centerDifference).toBeLessThan(2);

  const quickButton = page.getByRole("button", { name: "Quick · 10" });
  const fullButton = page.getByRole("button", { name: "Full · 20" });
  const [quickBox, fullBox, statusBoxes] = await Promise.all([
    quickButton.boundingBox(),
    fullButton.boundingBox(),
    page.locator(".dashboard-status-grid article").evaluateAll((elements) =>
      elements.map((element) => {
        const rect = element.getBoundingClientRect();
        return { top: rect.top, right: rect.right };
      }),
    ),
  ]);

  expect(quickBox).not.toBeNull();
  expect(fullBox).not.toBeNull();
  expect(Math.abs(quickBox!.y - fullBox!.y)).toBeLessThan(2);
  expect(statusBoxes).toHaveLength(3);
  expect(Math.max(...statusBoxes.map(({ top }) => top)) - Math.min(...statusBoxes.map(({ top }) => top))).toBeLessThan(2);
  const viewportWidth = page.viewportSize()!.width;
  expect(Math.max(...statusBoxes.map(({ right }) => right))).toBeLessThanOrEqual(viewportWidth);

  await expect(page).toHaveScreenshot("home-mobile-compact.png", { animations: "disabled", fullPage: true });
});

for (const width of [320, 390, 768]) {
  test(`mobile home does not overflow at ${width}px`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chromium", "Each width only needs one Chromium pass.");
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/");

    await expect(page.locator(".quick-study-eyebrow")).toBeHidden();
    await expect(page.locator(".quick-study-description")).toBeHidden();
    const dimensions = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
  });
}

test("quick study actions open bounded practice sets", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Quick · 10" }).click();

  await expect(page).toHaveURL(/#\/practice$/);
  await expect(page.getByRole("heading", { name: "Adaptive session · 10" })).toBeVisible();
  await expect(page.getByText("1/10", { exact: true })).toBeVisible();
});

test("the full study action opens twenty questions", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Full · 20" }).click();

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
