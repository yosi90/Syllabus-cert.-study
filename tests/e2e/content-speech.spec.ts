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
  const formulaStyle = await page.locator(".math-expression").evaluate((element) => ({
    display: getComputedStyle(element).display,
    fontFamily: getComputedStyle(element).fontFamily,
    whiteSpace: getComputedStyle(element).whiteSpace,
  }));
  expect(formulaStyle.display).toBe("inline-flex");
  expect(formulaStyle.fontFamily).toContain("KaTeX_Main");
  expect(formulaStyle.whiteSpace).toBe("nowrap");
});

test("D-22 keeps its four test cases in one intact list card", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "Prompt rendering only needs one browser pass.");
  await page.addInitScript(() => {
    const key = "istqb-ctfl-v4-trainer:v2";
    const progress = JSON.parse(window.localStorage.getItem(key) ?? "null");
    if (progress) {
      progress.study.currentQuestionId = "D-22";
      window.localStorage.setItem(key, JSON.stringify(progress));
    }
  });
  await page.goto("/#/practice");

  await expect(page.locator(".question-prompt-list")).toHaveCount(1);
  await expect(page.locator(".question-prompt-list-item")).toHaveCount(4);
  await expect(page.locator(".question-prompt-list-item").first()).toContainText("category A.");
  await expect(page.locator(".question-prompt-list-item").last()).toContainText("category D.");
});

test("B-22 displays its five input test cases as one list", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "Prompt rendering only needs one browser pass.");
  await page.addInitScript(() => {
    const key = "istqb-ctfl-v4-trainer:v2";
    const progress = JSON.parse(window.localStorage.getItem(key) ?? "null");
    if (progress) {
      progress.study.currentQuestionId = "B-22";
      progress.preferences.language = "es";
      window.localStorage.setItem(key, JSON.stringify(progress));
      window.localStorage.setItem("istqb-ctfl-v4-spanish-translation-notice-seen", "true");
    }
  });
  await page.goto("/#/practice");

  await expect(page.locator(".question-prompt-list")).toHaveCount(1);
  await expect(page.locator(".question-prompt-list-item")).toHaveCount(5);
  await expect(page.locator(".question-prompt-list-marker")).toHaveText(["TC1:", "TC2:", "TC3:", "TC4:", "TC5:"]);
});

test("D-17 expands both lists in its explanation", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "Explanation rendering only needs one browser pass.");
  await page.addInitScript(() => {
    const key = "istqb-ctfl-v4-trainer:v2";
    const progress = JSON.parse(window.localStorage.getItem(key) ?? "null");
    if (progress) {
      progress.study.currentQuestionId = "D-17";
      progress.preferences.language = "es";
      window.localStorage.setItem(key, JSON.stringify(progress));
      window.localStorage.setItem("istqb-ctfl-v4-spanish-translation-notice-seen", "true");
    }
  });
  await page.goto("/#/practice");
  await page.getByText("4 – 5 – 3 – 1 – 2", { exact: true }).click();
  await page.getByRole("button", { name: "Comprobar" }).click();

  const lists = page.locator(".explanation-intro-list");
  await expect(lists).toHaveCount(2);
  await expect(page.locator(".explanation-intro-list-item")).toHaveCount(10);
  await expect(lists.first()).toContainText("comunicación y análisis");
  await expect(lists.last()).toContainText("Corrección y presentación de informes");
});

test("B-23 renders each detailed option explanation once", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "Explanation rendering only needs one browser pass.");
  await page.addInitScript(() => {
    const key = "istqb-ctfl-v4-trainer:v2";
    const progress = JSON.parse(window.localStorage.getItem(key) ?? "null");
    if (progress) {
      progress.study.currentQuestionId = "B-23";
      progress.preferences.language = "es";
      window.localStorage.setItem(key, JSON.stringify(progress));
      window.localStorage.setItem("istqb-ctfl-v4-spanish-translation-notice-seen", "true");
    }
  });
  await page.goto("/#/practice");
  await page.getByText("Agregar, agregar, agregar, quitar, quitar", { exact: true }).click();
  await page.getByRole("button", { name: "Comprobar" }).click();

  await expect(page.locator(".explanation-option")).toHaveCount(4);
  await expect(page.locator(".explanation-option p")).toHaveCount(4);
  await expect(page.locator(".explanation-option p").filter({ hasText: "se puede escribir" })).toHaveCount(3);
});

test("A-32 renders both three-point estimates as inline mathematical formulas in the explanation", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "Formula rendering only needs one browser pass.");
  await page.addInitScript(() => {
    const key = "istqb-ctfl-v4-trainer:v2";
    const progress = JSON.parse(window.localStorage.getItem(key) ?? "null");
    if (progress) {
      progress.study.currentQuestionId = "A-32";
      progress.preferences.language = "es";
      window.localStorage.setItem(key, JSON.stringify(progress));
    }
  });
  await page.goto("/#/practice");
  await page.locator('.option-row input[type="radio"]').first().check();
  await page.getByRole("button", { name: "Comprobar" }).click();

  const formulas = page.locator(".explanation-intro .math-expression");
  await expect(formulas).toHaveCount(2);
  await expect(formulas.first()).toHaveAttribute("aria-label", /optimista.*más probable.*pesimista/i);
  await expect(formulas.last()).toHaveAttribute("aria-label", /2.*4\*11.*14.*10/);
  await expect(page.locator(".explanation-intro .math-expression .frac-line")).toHaveCount(2);
  await expect(page.locator(".explanation-intro")).toContainText("Así:");
});

test("Spanish technical terms expose translations without selecting an answer", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "One browser pass covers shared term interactions.");
  await page.addInitScript(() => {
    window.localStorage.setItem("istqb-ctfl-v4-spanish-translation-notice-seen", "true");
    const key = "istqb-ctfl-v4-trainer:v2";
    const progress = JSON.parse(window.localStorage.getItem(key) ?? "null");
    if (progress) {
      progress.study.currentQuestionId = "C-26";
      window.localStorage.setItem(key, JSON.stringify(progress));
    }
  });
  await page.goto("/#/practice");
  await page.getByRole("button", { name: "Español" }).click();

  const term = page.locator(".option-row .technical-term").first();
  await expect(term).toBeVisible();
  await term.click();

  await expect(term.locator(".technical-term-tooltip")).toBeVisible();
  await expect(page.locator('input[type="radio"]:checked')).toHaveCount(0);
});
