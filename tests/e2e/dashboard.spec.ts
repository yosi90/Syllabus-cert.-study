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
  await expect(page.getByText("No attempts yet", { exact: true })).toHaveCount(0);
  const resumeCard = page.locator(".dashboard-resume-card");
  if (isMobile) await expect(resumeCard).toBeHidden();
  else await expect(resumeCard).toBeVisible();
  await expect(page.getByRole("heading", { name: "Progress by chapter" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Progress by K-Level" })).toBeVisible();
  if (isMobile) await expect(page.getByText("Complete some questions to identify areas to reinforce.")).toBeHidden();
  else await expect(page.getByText("Complete some questions to identify areas to reinforce.")).toBeVisible();
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
});

test("chapter and K-Level progress separates correct and incorrect answers", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "One browser pass covers shared progress rendering.");
  await page.addInitScript(() => {
    const key = "istqb-ctfl-v4-trainer:v3";
    const progress = JSON.parse(window.localStorage.getItem(key) ?? "null");
    if (!progress) return;
    progress.questionProgress = {
      "A-01": { attempts: 1, correct: 1, lastCorrect: true, flagged: false, lastAnswers: ["c"], updatedAt: "2026-07-22" },
      "A-02": { attempts: 1, correct: 0, lastCorrect: false, flagged: false, lastAnswers: ["a"], updatedAt: "2026-07-22" },
    };
    window.localStorage.setItem(key, JSON.stringify(progress));
  });
  await page.goto("/");

  const chapterProgress = page.getByRole("progressbar", { name: /FL-1.*Correct 1, Wrong 1/ });
  await expect(chapterProgress).toBeVisible();
  await expect(chapterProgress.locator(".is-correct")).toHaveCount(1);
  await expect(chapterProgress.locator(".is-incorrect")).toHaveCount(1);
});

test("K-Level help works by click and explains each cognitive level", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "What does K-Level mean?" }).click();
  await expect(page.getByRole("tooltip").filter({ hasText: "cognitive skill" })).toBeVisible();

  await page.locator(".dashboard-breakdown-label").filter({ hasText: /^K2/ }).getByRole("button").click();
  await expect(page.getByRole("tooltip").filter({ hasText: "K2 · Understand" })).toBeVisible();
});

test("response metrics live on the dedicated metrics page", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "One browser pass covers shared timing calculations.");
  await page.addInitScript(() => {
    const key = "istqb-ctfl-v4-trainer:v3";
    const progress = JSON.parse(window.localStorage.getItem(key) ?? "null");
    if (!progress) return;
    progress.questionProgress = {
      "A-01": {
        attempts: 2,
        correct: 1,
        lastCorrect: false,
        flagged: false,
        lastAnswers: ["a"],
        updatedAt: "2026-07-22",
        totalActiveMs: 30_000,
        lastActiveMs: 20_000,
        timedAttempts: 2,
      },
      "A-02": {
        attempts: 1,
        correct: 1,
        lastCorrect: true,
        flagged: false,
        lastAnswers: ["b"],
        updatedAt: "2026-07-22",
        totalActiveMs: 12_000,
        lastActiveMs: 12_000,
        timedAttempts: 1,
      },
    };
    progress.attemptHistory = [
      {
        id: "one",
        questionId: "A-01",
        answeredAt: "2026-07-22T10:00:00.000Z",
        attemptNumber: 1,
        selectedAnswers: ["a"],
        isCorrect: false,
        activeMs: 20_000,
        context: "adaptive-study",
        sessionId: "study",
        bankVersion: "test",
      },
      {
        id: "two",
        questionId: "A-01",
        answeredAt: "2026-07-22T10:01:00.000Z",
        attemptNumber: 2,
        selectedAnswers: ["a"],
        isCorrect: true,
        activeMs: 10_000,
        context: "adaptive-study",
        sessionId: "study",
        bankVersion: "test",
      },
      {
        id: "three",
        questionId: "A-02",
        answeredAt: "2026-07-22T10:02:00.000Z",
        attemptNumber: 1,
        selectedAnswers: ["b"],
        isCorrect: true,
        activeMs: 12_000,
        context: "adaptive-study",
        sessionId: "study",
        bankVersion: "test",
      },
    ];
    window.localStorage.setItem(key, JSON.stringify(progress));
  });
  await page.goto("/#/metrics");

  await expect(page.getByRole("heading", { name: "Learning metrics" })).toBeVisible();
  await expect(page.locator(".metrics-section").filter({ has: page.getByRole("heading", { name: "Summary" }) }).getByText("12 s", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Learning signals" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Performance explorer" })).toBeVisible();
  await expect(page.locator(".performance-table-header span")).toHaveText([
    "Chapter",
    "Accuracy",
    "Recent",
    "Trend",
    "Median",
    "Review",
  ]);
});

test("the performance explorer becomes bounded cards on mobile", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-chromium", "This behavior is specific to the mobile layout.");
  await page.goto("/#/metrics");

  await expect(page.getByRole("heading", { name: "Performance explorer" })).toBeVisible();
  await expect(page.locator(".performance-table-header")).toBeHidden();
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
});

test("mobile home keeps its summary and study actions compact", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-chromium", "This behavior is specific to the mobile layout.");
  await page.goto("/");

  await expect(page.locator(".quick-study-card .quick-study-eyebrow")).toBeHidden();
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
    const label = element.querySelector(".dashboard-section-title")!;
    const value = element.querySelector(".dashboard-snapshot-value")!;
    const labelRect = label.getBoundingClientRect();
    const valueRect = value.getBoundingClientRect();
    return {
      labelFontSize: getComputedStyle(label).fontSize,
      valueFontSize: getComputedStyle(value).fontSize,
      centerDifference: Math.abs((labelRect.top + labelRect.height / 2) - (valueRect.top + valueRect.height / 2)),
    };
  });
  expect(parseFloat(snapshotTitle.valueFontSize)).toBeGreaterThan(parseFloat(snapshotTitle.labelFontSize));
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

    await expect(page.locator(".quick-study-card .quick-study-eyebrow")).toBeHidden();
    await expect(page.locator(".quick-study-description")).toBeHidden();
    const dimensions = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);

    if (width === 320) {
      const statusBoxes = await page.locator(".dashboard-status-grid article").evaluateAll((elements) =>
        elements.map((element) => element.getBoundingClientRect()).map(({ left, top }) => ({ left, top })),
      );
      expect(new Set(statusBoxes.map(({ left }) => Math.round(left))).size).toBe(1);
      expect(new Set(statusBoxes.map(({ top }) => Math.round(top))).size).toBe(3);
    }
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

test("completed loose practice does not offer a session to continue", async ({ page }) => {
  await page.goto("/#/practice");
  await page.getByRole("radio").first().check();
  await page.getByRole("button", { name: "Check" }).click();
  const mobileHome = page.locator(".mobile-primary-nav").getByRole("link", { name: "Home" });
  if (await mobileHome.isVisible()) {
    await mobileHome.click();
  } else {
    await page.locator(".mode-tabs").getByRole("link", { name: "Home" }).click();
  }
  await expect(page.getByRole("button", { name: "Continue practice" })).toBeHidden();
});

test("the marked counter opens practice with the marked filter active", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "Dashboard routing only needs one browser pass.");
  await page.addInitScript(() => {
    const key = "istqb-ctfl-v4-trainer:v3";
    const progress = JSON.parse(window.localStorage.getItem(key) ?? "null");
    if (!progress) return;
    progress.questionProgress["A-03"] = {
      attempts: 1,
      correct: 0,
      lastCorrect: false,
      flagged: true,
      flaggedCorrectPrompted: false,
      lastAnswers: ["a"],
      updatedAt: "2026-07-25T00:00:00.000Z",
    };
    window.localStorage.setItem(key, JSON.stringify(progress));
  });
  await page.goto("/");

  await page.getByRole("button", { name: "Open marked questions in practice: 1" }).click();

  await expect(page).toHaveURL(/#\/practice$/);
  await expect(page.getByRole("group", { name: "Status" }).getByLabel("Flagged")).toBeChecked();
  await expect(page.getByText("1/1", { exact: true })).toBeVisible();
  await expect(page.locator(".question-meta").getByText("A-03", { exact: true })).toBeVisible();
});
