import { expect, test } from "@playwright/test";
import { prepareApp } from "./fixtures";

test.beforeEach(async ({ page }) => {
  await prepareApp(page);
});

test("status uses square multi-select checkboxes with OR semantics", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "The shared filter behavior only needs one browser pass.");
  await page.addInitScript(() => {
    const key = "istqb-ctfl-v4-trainer:v3";
    const progress = JSON.parse(window.localStorage.getItem(key) ?? "null");
    if (!progress) return;
    progress.questionProgress = {
      "A-01": { attempts: 1, correct: 1, lastCorrect: true, flagged: false, lastAnswers: ["c"], updatedAt: "2026-07-25" },
      "A-02": { attempts: 1, correct: 0, lastCorrect: false, flagged: true, lastAnswers: ["a"], updatedAt: "2026-07-25" },
      "A-03": { attempts: 1, correct: 0, lastCorrect: false, flagged: false, lastAnswers: ["a"], updatedAt: "2026-07-25" },
    };
    window.localStorage.setItem(key, JSON.stringify(progress));
  });
  await page.goto("/#/practice");

  const statusGroup = page.getByRole("group", { name: "Status" });
  await expect(statusGroup.getByRole("checkbox")).toHaveCount(4);
  await statusGroup.getByLabel("Last correct").check();
  await expect(page.locator(".header-metrics .metric").filter({ hasText: "Filtered" }).locator("strong")).toHaveText("1");

  await statusGroup.getByLabel("Flagged").check();
  await expect(page.locator(".header-metrics .metric").filter({ hasText: "Filtered" }).locator("strong")).toHaveText("2");

  const indicator = statusGroup.getByLabel("Flagged").locator("xpath=..").locator(".check-indicator");
  await expect(indicator).toBeVisible();
  expect(await indicator.evaluate((element) => getComputedStyle(element).borderRadius)).toBe("4px");
});
