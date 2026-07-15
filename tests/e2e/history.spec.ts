import { expect, test } from "@playwright/test";
import { prepareApp } from "./fixtures";

const questionIds = Array.from({ length: 40 }, (_, index) => `A-${String(index + 1).padStart(2, "0")}`);

test.beforeEach(async ({ page }) => {
  await prepareApp(page);
  await page.addInitScript(({ ids }) => {
    if (window.localStorage.getItem("ctfl-history-fixture") === "ready") return;
    const raw = window.localStorage.getItem("istqb-ctfl-v4-trainer:v2");
    if (!raw) return;
    const progress = JSON.parse(raw);
    progress.sessions = [
      {
        id: "model-A-2026",
        title: "Modelo A",
        mode: "exam",
        sessionType: "official",
        sourceModel: "A",
        questionIds: ids,
        answers: {},
        score: { total: 40, answered: 0, blank: 40, correct: 0, incorrect: 0, score: 0, percent: 0, passed: false, passingScore: 26 },
        completedAt: "2026-07-15T10:30:00.000Z",
      },
      {
        id: "legacy-random",
        title: "Simulacro aleatorio",
        mode: "exam",
        questionIds: ["missing-question"],
        answers: {},
        score: { total: 1, answered: 0, blank: 1, correct: 0, incorrect: 0, score: 0, percent: 0, passed: false, passingScore: 26 },
        completedAt: "2026-07-14T10:30:00.000Z",
      },
    ];
    progress.review = { sessionId: null };
    window.localStorage.setItem("istqb-ctfl-v4-trainer:v2", JSON.stringify(progress));
    window.localStorage.setItem("ctfl-history-fixture", "ready");
  }, { ids: questionIds });
});

test("a historical review can be reopened before and after reload", async ({ page }) => {
  await page.goto("/#/review");

  await expect(page.getByRole("heading", { name: "Recent history" })).toBeVisible();
  const officialSession = page.locator(".session-row").filter({ hasText: "Modelo A" });
  await expect(officialSession.getByText("Official model", { exact: true })).toBeVisible();
  await expect(officialSession.getByText("0/40 · Failed", { exact: true })).toBeVisible();
  await officialSession.getByRole("button", { name: "Open review" }).click();

  await expect(page.getByRole("heading", { name: "Modelo A" })).toBeVisible();
  await expect(page.locator(".review-item")).toHaveCount(40);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Modelo A" })).toBeVisible();
  await expect(page.locator(".review-item")).toHaveCount(40);

  await page.getByRole("button", { name: "Back to history" }).click();
  await expect(page.getByRole("heading", { name: "Recent history" })).toBeVisible();
});

test("incompatible and legacy sessions are handled safely", async ({ page }) => {
  await page.goto("/#/review");

  const incompatibleSession = page.locator(".session-row").filter({ hasText: "Simulacro aleatorio" });
  await expect(incompatibleSession.getByText("Random exam", { exact: true })).toBeVisible();
  await expect(incompatibleSession.getByText(/review is unavailable/)).toBeVisible();
  await expect(incompatibleSession.getByRole("button", { name: "Open review" })).toBeDisabled();
});

test("cancel exam uses an accessible confirmation dialog", async ({ page }) => {
  await page.goto("/#/exam");
  await page.getByRole("button", { name: /Model A/ }).click();
  await page.getByRole("button", { name: "Cancel" }).click();

  const dialog = page.getByRole("alertdialog", { name: "Cancel exam?" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Go back" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(page.getByRole("heading", { name: "Modelo A" })).toBeVisible();

  await page.getByRole("button", { name: "Cancel" }).click();
  await page.getByRole("alertdialog", { name: "Cancel exam?" }).getByRole("button", { name: "Cancel exam" }).click();
  await expect(page.getByRole("heading", { name: "40-question exam" })).toBeVisible();
});

test("deleting progress uses an accessible confirmation dialog", async ({ page }) => {
  await page.goto("/");
  const menuButton = page.getByRole("button", { name: "Open menu" });
  if (await menuButton.isVisible()) await menuButton.click();
  await page.getByRole("button", { name: "Delete" }).click();

  const dialog = page.getByRole("alertdialog", { name: "Delete local progress?" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText("This will delete all progress stored by this site in this browser.")).toBeVisible();
  await dialog.getByRole("button", { name: "Go back" }).click();
  await expect(dialog).toBeHidden();
});
