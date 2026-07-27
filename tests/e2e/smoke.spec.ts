import { expect, test } from "@playwright/test";
import { prepareApp } from "./fixtures";

test.beforeEach(async ({ page }) => {
  await prepareApp(page);
});

test("practice allows answering and checking a question", async ({ page }) => {
  await page.goto("/#/practice");

  await expect(page.getByRole("heading", { name: "Single questions" })).toBeVisible();
  const answers = page.getByRole("radio");
  await expect(answers).toHaveCount(4);
  await answers.first().check();
  await page.getByRole("button", { name: "Check" }).click();

  await expect(page.locator(".feedback")).toBeVisible();
});

test("radio answers support one-handed selection, checking and question movement", async ({ page }) => {
  await page.goto("/#/practice");

  const answers = page.getByRole("radio");
  await expect(answers).toHaveCount(4);
  await page.keyboard.press("ArrowUp");
  await expect(answers.first()).toBeFocused();
  await expect(answers.first()).toBeChecked();

  await page.keyboard.press("ArrowUp");
  await expect(answers.last()).toBeFocused();
  await expect(answers.last()).toBeChecked();

  await page.keyboard.press("ArrowDown");
  await expect(answers.first()).toBeFocused();
  await expect(answers.first()).toBeChecked();
  await page.keyboard.press("Enter");
  await expect(page.locator(".feedback")).toBeVisible();

  await page.keyboard.press("ArrowRight");
  await expect(page.getByText("2/160", { exact: true })).toBeVisible();
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("radio").last()).toBeFocused();
  await expect(page.getByRole("radio").last()).toBeChecked();
  await page.keyboard.press("ArrowLeft");
  await expect(page.getByText("1/160", { exact: true })).toBeVisible();
});

test("Tab leaves the answer group using the browser's standard focus order", async ({ page }) => {
  await page.goto("/#/practice");

  const answers = page.getByRole("radio");
  await answers.first().focus();
  await page.keyboard.press("Tab");

  await expect(answers.nth(1)).not.toBeFocused();
  await expect(page.locator(".options-list input:focus")).toHaveCount(0);
});

test("five-option checkbox answers use arrows for focus and Space for selection", async ({ page }) => {
  await page.goto("/#/practice");
  const questionList = page.locator(".question-list");
  await questionList.locator("summary").click();
  await questionList.getByRole("button", { name: "A-06", exact: true }).click();

  const answers = page.locator('.options-list input[type="checkbox"]');
  await expect(answers).toHaveCount(5);

  await page.keyboard.press("ArrowDown");
  await expect(answers.last()).toBeFocused();
  await expect(page.locator('.option-row input[type="checkbox"]:checked')).toHaveCount(0);

  await page.keyboard.press("ArrowDown");
  await expect(answers.first()).toBeFocused();
  await expect(page.locator('.option-row input[type="checkbox"]:checked')).toHaveCount(0);

  await page.keyboard.press("Space");
  await expect(answers.first()).toBeChecked();
  await page.keyboard.press("ArrowUp");
  await expect(answers.last()).toBeFocused();
  await expect(answers.first()).toBeChecked();
  await expect(answers.last()).not.toBeChecked();

  await page.keyboard.press("Space");
  await expect(answers.last()).toBeChecked();
  await expect(page.locator('.option-row input[type="checkbox"]:checked')).toHaveCount(2);
  await page.keyboard.press("Enter");
  await expect(page.locator(".feedback")).toBeVisible();
});

test("ArrowUp initializes an unanswered checkbox question at its first option", async ({ page }) => {
  await page.goto("/#/practice");
  const questionList = page.locator(".question-list");
  await questionList.locator("summary").click();
  await questionList.getByRole("button", { name: "A-06", exact: true }).click();

  const answers = page.locator('.options-list input[type="checkbox"]');
  await expect(answers).toHaveCount(5);
  await page.keyboard.press("ArrowUp");

  await expect(answers.first()).toBeFocused();
  await expect(page.locator('.option-row input[type="checkbox"]:checked')).toHaveCount(0);
});

test("answer controls are larger on desktop and retain their mobile size", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "Responsive sizing only needs one Chromium pass.");
  await page.goto("/#/practice");

  const answer = page.getByRole("radio").first();
  await expect(answer).toHaveCSS("width", "20px");
  await expect(answer).toHaveCSS("height", "20px");

  await page.setViewportSize({ width: 390, height: 844 });
  expect((await answer.boundingBox())?.width).toBeLessThan(20);
});

test("desktop action buttons reveal delayed keyboard shortcut tooltips", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "Keyboard hints are desktop-only.");
  await page.goto("/#/practice");

  const nextButton = page.getByRole("button", { name: "Next" });
  const tooltip = nextButton.locator(".keyboard-shortcut-tooltip");
  await expect(nextButton).toHaveAttribute("aria-keyshortcuts", "ArrowRight");
  await expect(page.getByRole("button", { name: "Check" })).toHaveAttribute("aria-keyshortcuts", "Enter");
  await expect(tooltip.locator("kbd")).toHaveText(["→"]);
  await expect(tooltip).toHaveCSS("opacity", "0");

  await nextButton.hover();
  await page.waitForTimeout(300);
  await expect(tooltip).toHaveCSS("opacity", "0");
  await expect(tooltip).toHaveCSS("opacity", "1", { timeout: 1_000 });

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(tooltip).toHaveCSS("display", "none");

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/#/exam");
  await page.getByRole("button", { name: /Model A/ }).click();
  const examNextButton = page.getByRole("button", { name: "Next" });
  await expect(examNextButton).toHaveAttribute("aria-keyshortcuts", "ArrowRight Enter");
  await expect(examNextButton.locator("kbd")).toHaveText(["→", "Enter"]);
});

test("a model exam can be started", async ({ page }) => {
  await page.goto("/#/exam");

  await expect(page.getByRole("heading", { name: "40-question exam" })).toBeVisible();
  await page.getByRole("button", { name: /Model A/ }).click();

  await expect(page.getByRole("heading", { name: "Modelo A" })).toBeVisible();
  await expect(page.getByText("1/40", { exact: true })).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(page.getByText("2/40", { exact: true })).toBeVisible();
  await page.keyboard.press("ArrowLeft");
  await expect(page.getByText("1/40", { exact: true })).toBeVisible();
});

test("finishing an exam opens its review", async ({ page }) => {
  await page.goto("/#/exam");
  await page.getByRole("button", { name: /Model A/ }).click();
  await page.getByRole("button", { name: "Finish" }).click();

  await expect(page).toHaveURL(/#\/review$/);
  await expect(page.getByRole("heading", { name: "Modelo A" })).toBeVisible();
  await expect(page.locator(".result-banner")).toBeVisible();
});
