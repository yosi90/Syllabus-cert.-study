import { expect, test } from "@playwright/test";
import { prepareApp } from "./fixtures";

const firstQuestionOptions = {
  A: [
    "To prove that there are no unfixed defects in the system under test",
    "To prove that there will be no failures after the implementation of the system into production",
    "To reduce the risk level of the test object and to build confidence in the quality level",
    "To verify that there are no untested combinations of inputs",
  ],
  B: [
    "Dynamic testing increases quality by causing test objects to fail in ways that could never be achieved by the users",
    "Static testing is used by developers to identify failures in their code earlier than can be achieved through dynamic testing",
    "Static analysis provides evidence to customers that the elements of the system that provide no outputs are fit for release",
    "Reviews increase the quality of requirements specifications and lead to fewer changes being needed in derived work products",
  ],
  C: [
    "Validating that documented requirements are met",
    "Causing failures and identifying defects",
    "Initiating errors and identifying root causes",
    "Verifying the test object meets user expectations",
  ],
  D: [
    "Finding and fixing defects in the test object",
    "Maintaining effective communications with developers",
    "Validating that legal requirements have been met",
    "Building confidence in the quality of the test object",
  ],
} as const;

test.beforeEach(async ({ page }) => {
  await prepareApp(page);
});

for (const model of ["A", "B", "C", "D"] as const) {
  test(`model ${model} displays the first PDF question in its original option order`, async ({ page }) => {
    await page.goto("/#/exam");
    await page.getByRole("button", { name: new RegExp(`Model ${model}`) }).click();

    await expect(page.locator(".option-key")).toHaveText(["A", "B", "C", "D"]);
    const optionRows = page.locator(".option-row");
    for (let index = 0; index < firstQuestionOptions[model].length; index += 1) {
      await expect(optionRows.nth(index)).toContainText(firstQuestionOptions[model][index]);
    }
  });
}

test("an exam keeps the selected letter in its question, correction and review", async ({ page }) => {
  await page.goto("/#/exam");
  await page.getByRole("button", { name: /Model A/ }).click();
  await page.getByRole("radio").first().check();
  await page.getByRole("button", { name: "Finish" }).click();

  const firstReview = page.locator(".review-item").first();
  await expect(firstReview.locator(".answer-lines")).toContainText("Your answer: A");
  await expect(firstReview.locator(".explanation-option .option-key")).toHaveText(["A", "B", "C", "D"]);

  await page.reload();
  await expect(page.locator(".review-item").first().locator(".answer-lines")).toContainText("Your answer: A");
});

test("practice blocks checking an incomplete multiple selection", async ({ page }) => {
  await page.goto("/#/practice");
  const questionList = page.locator(".question-list");
  await questionList.locator("summary").click();
  await questionList.getByRole("button", { name: "A-06", exact: true }).click();

  const answers = page.locator('.option-row input[type="checkbox"]');
  await answers.first().check();
  await page.getByRole("button", { name: "Check" }).click();

  await expect(page.getByRole("alert")).toContainText("requires 2 answers");
  await expect(page.locator(".feedback")).toHaveCount(0);

  await answers.nth(1).check();
  await expect(page.getByRole("alert")).toHaveCount(0);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.locator(".feedback")).toBeVisible();
});

test("exam warns before leaving an incomplete multiple selection", async ({ page }) => {
  await page.goto("/#/exam");
  await page.getByRole("button", { name: /Model A/ }).click();
  const questionList = page.locator(".question-list");
  await questionList.locator("summary").click();
  await questionList.getByRole("button", { name: "6", exact: true }).click();

  await page.locator('.option-row input[type="checkbox"]').first().check();
  await page.getByRole("button", { name: "Next" }).click();

  const dialog = page.getByRole("alertdialog", { name: "Incomplete multiple selection" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Review answer" }).click();
  await expect(page.locator(".rail-button.active")).toHaveText("6");

  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Continue anyway" }).click();
  await expect(page.locator(".rail-button.active")).toHaveText("7");
});
