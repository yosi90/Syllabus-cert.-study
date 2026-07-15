import { expect, test } from "@playwright/test";
import { prepareApp } from "./fixtures";

test.beforeEach(async ({ page }) => {
  await prepareApp(page);
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
