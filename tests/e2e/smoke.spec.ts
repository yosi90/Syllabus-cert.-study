import { expect, test } from "@playwright/test";
import { prepareApp } from "./fixtures";

test.beforeEach(async ({ page }) => {
  await prepareApp(page);
});

test("practice allows answering and checking a question", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Single questions" })).toBeVisible();
  const answers = page.getByRole("radio");
  await expect(answers).toHaveCount(4);
  await answers.first().check();
  await page.getByRole("button", { name: "Check" }).click();

  await expect(page.locator(".feedback")).toBeVisible();
});

test("a model exam can be started", async ({ page }) => {
  await page.goto("/#/exam");

  await expect(page.getByRole("heading", { name: "40-question exam" })).toBeVisible();
  await page.getByRole("button", { name: /Model A/ }).click();

  await expect(page.getByRole("heading", { name: "Modelo A" })).toBeVisible();
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
