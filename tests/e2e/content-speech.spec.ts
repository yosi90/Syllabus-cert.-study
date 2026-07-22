import { expect, test } from "@playwright/test";
import { prepareApp } from "./fixtures";

test.beforeEach(async ({ page }) => {
  await prepareApp(page);
});

async function installSpeechMock(page: import("@playwright/test").Page) {
  await page.addInitScript(() => {
    class MockUtterance {
      text: string;
      lang = "";
      voice: SpeechSynthesisVoice | null = null;
      onend: (() => void) | null = null;
      onerror: (() => void) | null = null;
      constructor(text: string) { this.text = text; }
    }
    const state = { spoken: [] as Array<{ text: string; lang: string }>, cancellations: 0 };
    Object.defineProperty(window, "SpeechSynthesisUtterance", { configurable: true, value: MockUtterance });
    Object.defineProperty(window, "speechSynthesis", {
      configurable: true,
      value: {
        speak(utterance: MockUtterance) { state.spoken.push({ text: utterance.text, lang: utterance.lang }); },
        cancel() { state.cancellations += 1; },
        getVoices() { return []; },
      },
    });
    (window as typeof window & { __speechState: typeof state }).__speechState = state;
  });
}

test("explanations use status chips without redundant status prefixes", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "One browser pass covers shared explanation rendering.");
  await page.goto("/#/practice");
  await page.getByText("To prove that there are no unfixed defects in the system under test", { exact: true }).click();
  await page.getByRole("button", { name: "Check" }).click();

  await expect(page.locator(".explanation-option")).toHaveCount(4);
  await expect(page.locator(".reason-pill.correct")).toHaveCount(1);
  await expect(page.locator(".reason-pill.incorrect")).toHaveCount(3);
  await expect(page.locator(".reason-pill.selected")).toHaveCount(1);
  await expect(page.locator(".explanation-option p")).not.toContainText(["Is correct", "Is not correct"]);
});

test("speech reads the question, then the wrong and correct explanations, and can stop", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "Speech behavior only needs one Chromium pass.");
  await installSpeechMock(page);
  await page.goto("/#/practice");

  await page.getByRole("button", { name: "Read prompt" }).click();
  let state = await page.evaluate(() => (window as typeof window & { __speechState: { spoken: Array<{ text: string; lang: string }>; cancellations: number } }).__speechState);
  expect(state.spoken.at(-1)?.lang).toBe("en-GB");
  expect(state.spoken.at(-1)?.text).toContain("Which of the following statements describe a valid test objective?");
  expect(state.spoken.at(-1)?.text).toMatch(/[A-D]\. To prove that there are no unfixed defects/);

  await page.getByText("To prove that there are no unfixed defects in the system under test", { exact: true }).click();
  await page.getByRole("button", { name: "Check" }).click();
  await page.getByRole("button", { name: "Read explanation" }).click();
  state = await page.evaluate(() => (window as typeof window & { __speechState: { spoken: Array<{ text: string; lang: string }>; cancellations: number } }).__speechState);
  expect(state.cancellations).toBeGreaterThan(0);
  expect(state.spoken.at(-1)?.text).toMatch(/^Incorrect\. Your answer\./);
  expect(state.spoken.at(-1)?.text.indexOf("Your answer")).toBeLessThan(state.spoken.at(-1)?.text.indexOf("Correct"));

  await page.getByRole("button", { name: "Stop reading" }).click();
  await expect(page.getByRole("button", { name: "Read explanation" })).toBeVisible();
});

test("speech controls are hidden when the browser API is unavailable", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "Feature detection only needs one browser pass.");
  await page.addInitScript(() => {
    Object.defineProperty(window, "speechSynthesis", { configurable: true, value: undefined });
    Object.defineProperty(window, "SpeechSynthesisUtterance", { configurable: true, value: undefined });
  });
  await page.goto("/#/practice");
  await expect(page.getByRole("button", { name: "Read prompt" })).toHaveCount(0);
});

test("C-31 renders a real fraction with an accessible localized description", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "Formula rendering only needs one browser pass.");
  await page.addInitScript(() => {
    const key = "istqb-ctfl-v4-trainer:v2";
    const progress = JSON.parse(window.localStorage.getItem(key) ?? "null");
    if (progress) {
      progress.study.currentQuestionId = "C-31";
      window.localStorage.setItem(key, JSON.stringify(progress));
    }
  });
  await page.goto("/#/practice");

  await expect(page.getByRole("img", { name: /all divided by four/i })).toBeVisible();
  await expect(page.locator(".math-expression .frac-line")).toBeVisible();
  await expect(page.locator(".prompt")).not.toContainText("A(n−2) 4");
});

test("Spanish technical terms expose translations without selecting an answer", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "One browser pass covers shared term interactions.");
  await page.addInitScript(() => {
    window.localStorage.setItem("istqb-ctfl-v4-spanish-translation-notice-seen", "true");
  });
  await page.goto("/#/practice");
  await page.getByRole("button", { name: "Español" }).click();

  const term = page.locator(".option-row .technical-term").first();
  await expect(term).toBeVisible();
  await term.click();

  await expect(term.locator(".technical-term-tooltip")).toBeVisible();
  await expect(page.locator('input[type="radio"]:checked')).toHaveCount(0);
});
