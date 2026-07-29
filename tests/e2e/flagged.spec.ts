import { expect, test } from "@playwright/test";
import { prepareApp } from "./fixtures";

test.beforeEach(async ({ page }) => {
  await prepareApp(page);
});

function installFlaggedQuestion(page: import("@playwright/test").Page, currentQuestionId = "A-01") {
  return page.addInitScript((questionId) => {
    const key = "istqb-ctfl-v4-trainer:v3";
    const progress = JSON.parse(window.localStorage.getItem(key) ?? "null");
    if (!progress) return;
    progress.study.currentQuestionId = questionId;
    progress.questionProgress["A-01"] = {
      attempts: 0,
      correct: 0,
      lastCorrect: false,
      flagged: true,
      flaggedCorrectPrompted: false,
      lastAnswers: [],
      updatedAt: "2026-07-25T00:00:00.000Z",
    };
    window.localStorage.setItem(key, JSON.stringify(progress));
  }, currentQuestionId);
}

test("a revisited marked question highlights its bookmark until it is unmarked", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "The animated emphasis only needs one browser pass.");
  await installFlaggedQuestion(page, "A-02");
  await page.goto("/#/practice");

  await page.getByText("Question list (160)", { exact: true }).click();
  await page.getByRole("button", { name: "A-01", exact: true }).click();

  const flagButton = page.getByRole("button", { name: "Remove question from flagged" });
  await expect(flagButton).toHaveClass(/flag-attention/);
  await expect(flagButton).toHaveCSS("color", "rgb(139, 101, 0)");

  await flagButton.click();
  const addFlagButton = page.getByRole("button", { name: "Flag question for review" });
  await expect(addFlagButton).not.toHaveClass(/flag-attention/);
});

test("the unmark proposal appears once per marked cycle after a correct answer", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "The modal lifecycle only needs one browser pass.");
  await installFlaggedQuestion(page);
  await page.goto("/#/practice");

  const correctOption = page.getByText(
    "To reduce the risk level of the test object and to build confidence in the quality level",
    { exact: true },
  );
  await correctOption.click();
  await page.getByRole("button", { name: "Check" }).click();

  await expect(page.getByRole("alertdialog")).toBeVisible();
  await expect(page.getByRole("heading", { name: "You got a marked question right" })).toBeVisible();
  await page.getByRole("button", { name: "Keep marked" }).click();
  await expect(page.getByRole("alertdialog")).toHaveCount(0);

  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("button", { name: "Previous" }).click();
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByRole("alertdialog")).toHaveCount(0);

  await page.getByRole("button", { name: "Remove question from flagged" }).click();
  await page.getByRole("button", { name: "Flag question for review" }).click();
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("button", { name: "Previous" }).click();
  await page.getByRole("button", { name: "Check" }).click();

  await expect(page.getByRole("alertdialog")).toBeVisible();
  await page.getByRole("button", { name: "Remove mark" }).click();
  await expect(page.getByRole("button", { name: "Flag question for review" })).toBeVisible();
});
