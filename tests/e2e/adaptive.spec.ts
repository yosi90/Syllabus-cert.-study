import { expect, test } from "@playwright/test";
import { prepareApp } from "./fixtures";

test.beforeEach(async ({ page }) => {
  await prepareApp(page);
});

test("reinforcement actions prioritize weak questions and persist active answer time", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "One Chromium pass covers shared timing behavior.");
  await page.addInitScript(() => {
    const key = "istqb-ctfl-v4-trainer:v2";
    const progress = JSON.parse(window.localStorage.getItem(key) ?? "null");
    if (!progress) return;
    progress.questionProgress = {
      "A-01": {
        attempts: 1,
        correct: 0,
        lastCorrect: false,
        flagged: false,
        lastAnswers: ["a"],
        updatedAt: "2026-07-22T00:00:00.000Z",
      },
    };
    window.localStorage.setItem(key, JSON.stringify(progress));
  });
  await page.goto("/");

  await expect(page.getByRole("button", { name: "Reinforcement · 10" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Full reinforcement · 20" })).toBeVisible();
  await page.getByRole("button", { name: "Reinforcement · 10" }).click();

  await expect(page.getByRole("heading", { name: "Reinforcement · 10" })).toBeVisible();
  await expect(page.locator(".question-meta").getByText("A-01", { exact: true })).toBeVisible();
  const timer = page.locator(".header-metrics .question-timer");
  await expect(timer).toBeVisible();
  await expect.poll(async () => timer.innerText()).toMatch(/00:0[1-9]/);

  await page.locator('.option-row input[type="radio"], .option-row input[type="checkbox"]').first().check();
  await page.getByRole("button", { name: "Check" }).click();
  const stoppedTime = await timer.getAttribute("aria-label");
  await page.waitForTimeout(1_100);
  await expect(timer).toHaveAttribute("aria-label", stoppedTime!);
  await expect.poll(async () => page.evaluate(() => {
    const progress = JSON.parse(window.localStorage.getItem("istqb-ctfl-v4-trainer:v2") ?? "null");
    return progress?.questionProgress?.["A-01"]?.totalActiveMs ?? 0;
  })).toBeGreaterThan(900);
});

test("exam questions also stop and persist their individual timer on first answer", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "One Chromium pass covers shared timing behavior.");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/#/exam");
  await page.getByRole("button", { name: /Model A/ }).click();
  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth,
  }));
  expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport);

  const timer = page.locator(".header-metrics .question-timer");
  await expect.poll(async () => timer.getAttribute("aria-label")).toMatch(/00:0[1-9]/);
  await page.locator('.option-row input[type="radio"]').first().check();
  const stoppedTime = await timer.getAttribute("aria-label");
  await page.waitForTimeout(1_100);
  await expect(timer).toHaveAttribute("aria-label", stoppedTime!);

  await page.getByRole("button", { name: "Finish" }).click();
  await expect.poll(async () => page.evaluate(() => {
    const progress = JSON.parse(window.localStorage.getItem("istqb-ctfl-v4-trainer:v2") ?? "null");
    return progress?.questionProgress?.["A-01"]?.timedAttempts ?? 0;
  })).toBe(1);
});

test("question timing pauses while the browser window is unfocused", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "One Chromium pass covers window focus timing.");
  await page.goto("/#/practice");
  const timer = page.locator(".header-metrics .question-timer");
  await expect.poll(async () => timer.getAttribute("aria-label")).toMatch(/00:0[1-9]/);

  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  await page.waitForTimeout(350);
  const pausedTime = await timer.getAttribute("aria-label");
  await page.waitForTimeout(1_200);
  await expect(timer).toHaveAttribute("aria-label", pausedTime!);

  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect.poll(async () => timer.getAttribute("aria-label")).not.toBe(pausedTime);
});

test("question timing survives a page reload without counting unloaded time", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "One Chromium pass covers session timing persistence.");
  await page.goto("/#/practice");
  const timer = page.locator(".header-metrics .question-timer");
  await expect.poll(async () => timer.getAttribute("aria-label")).toMatch(/00:0[1-9]/);
  const timerSeconds = async () => {
    const label = await timer.getAttribute("aria-label") ?? "00:00";
    const match = label.match(/(\d+):(\d+)$/);
    return match ? Number(match[1]) * 60 + Number(match[2]) : 0;
  };
  const beforeReload = await timerSeconds();

  await page.reload();
  await expect.poll(timerSeconds).toBeGreaterThanOrEqual(beforeReload);
  const restored = await timerSeconds();
  expect(restored).toBeLessThanOrEqual(beforeReload + 1);
  await expect.poll(timerSeconds).toBeGreaterThan(restored);
});

test("a ten-question adaptive session survives leaving and reloading", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Quick · 10" }).click();
  await expect(page.getByRole("heading", { name: "Adaptive session · 10" })).toBeVisible();

  await page.locator('.option-row input[type="radio"], .option-row input[type="checkbox"]').first().check();
  await page.getByRole("button", { name: "Check" }).click();
  await page.getByRole("button", { name: "Next" }).click();
  await expect(page.getByText("2/10", { exact: true })).toBeVisible();
  const optionOrderBeforeReload = await page.locator(".option-row").allTextContents();

  const beforeReload = await page.evaluate(() => {
    const progress = JSON.parse(window.localStorage.getItem("istqb-ctfl-v4-trainer:v2") ?? "null");
    return { seed: progress.activeStudySession.seed, questionIds: progress.activeStudySession.questionIds };
  });
  await page.reload();
  await expect(page.getByRole("heading", { name: "Adaptive session · 10" })).toBeVisible();
  await expect(page.getByText("2/10", { exact: true })).toBeVisible();
  await expect(page.locator(".option-row")).toHaveText(optionOrderBeforeReload);
  const afterReload = await page.evaluate(() => {
    const progress = JSON.parse(window.localStorage.getItem("istqb-ctfl-v4-trainer:v2") ?? "null");
    return { seed: progress.activeStudySession.seed, questionIds: progress.activeStudySession.questionIds };
  });
  expect(afterReload).toEqual(beforeReload);

  await page.getByRole("button", { name: "Leave and continue later" }).click();
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await page.getByRole("button", { name: "Continue practice" }).click();
  await expect(page.getByText("2/10", { exact: true })).toBeVisible();
});

test("a recovered twenty-question session finishes and enters history", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Full · 20" }).click();
  await page.locator(".question-list summary").click();
  const railButtons = page.locator(".question-rail .rail-button");
  await expect(railButtons).toHaveCount(20);
  await railButtons.nth(19).click();
  await expect(page.getByText("20/20", { exact: true })).toBeVisible();
  await expect.poll(async () => page.evaluate(() => {
    const progress = JSON.parse(window.localStorage.getItem("istqb-ctfl-v4-trainer:v2") ?? "null");
    return progress?.activeStudySession?.currentIndex;
  })).toBe(19);
  await page.reload();

  await expect(page.getByText("20/20", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Finish session" }).click();
  await expect(page).toHaveURL(/#\/review$/);
  await expect(page.getByRole("heading", { name: "Adaptive session · 20" })).toBeVisible();
  await expect(page.locator(".result-banner").getByText("Session completed", { exact: true })).toBeVisible();
  await expect(page.getByText("Recommended review:", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Back to history" }).click();
  const session = page.locator(".session-row").filter({ hasText: "Adaptive session · 20" });
  await expect(session.getByText("Adaptive session", { exact: true })).toBeVisible();
  await expect(session.getByText(/Session completed/)).toBeVisible();
  await page.reload();
  const restoredSession = page.locator(".session-row").filter({ hasText: "Adaptive session · 20" });
  await expect(restoredSession).toBeVisible();
  await restoredSession.getByRole("button", { name: "Open review" }).click();
  await expect(page.locator(".result-banner").getByText("Session completed", { exact: true })).toBeVisible();
});
