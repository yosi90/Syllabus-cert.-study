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

test("practice supports keyboard answer navigation, checking and question movement", async ({ page }) => {
  await page.goto("/#/practice");

  const answers = page.getByRole("radio");
  await answers.first().focus();
  await page.keyboard.press("Tab");
  await expect(answers.nth(1)).toBeFocused();

  await page.keyboard.press("Space");
  await expect(answers.nth(1)).toBeChecked();
  await page.keyboard.press("Enter");
  await expect(page.locator(".feedback")).toBeVisible();

  await page.keyboard.press("ArrowRight");
  await expect(page.getByText("2/160", { exact: true })).toBeVisible();
  await page.keyboard.press("ArrowLeft");
  await expect(page.getByText("1/160", { exact: true })).toBeVisible();
});

test("space checks an already selected single-answer option", async ({ page }) => {
  await page.goto("/#/practice");

  const answer = page.getByRole("radio").first();
  await answer.check();
  await expect(answer).toBeFocused();
  await expect(page.getByRole("button", { name: "Check" })).toBeEnabled();
  await page.keyboard.press("Space");

  await expect(page.locator(".feedback")).toBeVisible();
});

test("a model exam can be started", async ({ page }) => {
  await page.goto("/#/exam");

  await expect(page.getByRole("heading", { name: "40-question exam" })).toBeVisible();
  await page.getByRole("button", { name: /Model A/ }).click();

  await expect(page.getByRole("heading", { name: "Modelo A" })).toBeVisible();
  await expect(page.getByText("1/40", { exact: true })).toBeVisible();
  await page.keyboard.press("ArrowRight");
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
