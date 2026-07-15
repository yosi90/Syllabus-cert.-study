import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { prepareApp } from "./fixtures";

async function openSidebarOnMobile(page: Page, testInfo: TestInfo, language: "en" | "es" = "en") {
  if (testInfo.project.name === "mobile-chromium") {
    await page.getByRole("button", { name: language === "es" ? "Abrir menú" : "Open menu" }).click();
  }
}

for (const theme of ["light", "dark"] as const) {
  for (const language of ["en", "es"] as const) {
    test(`${language} ${theme} renders the main routes without overflow`, async ({ page }, testInfo) => {
      await prepareApp(page, theme);
      await page.addInitScript(() => {
        window.localStorage.setItem("istqb-ctfl-v4-spanish-translation-notice-seen", "true");
      });
      await page.goto("/");

      if (language === "es") {
        await openSidebarOnMobile(page, testInfo);
        await page.getByRole("button", { name: "Español" }).click();
      }

      await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
      await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();

      const routes = language === "es"
        ? [["/#/practice", "Preguntas sueltas"], ["/#/exam", "Examen de 40 preguntas"], ["/#/review", "Historial reciente"]]
        : [["/#/practice", "Single questions"], ["/#/exam", "40-question exam"], ["/#/review", "Recent history"]];

      for (const [route, heading] of routes) {
        await page.goto(route);
        await expect(page.getByRole("heading", { name: heading })).toBeVisible();
        const width = await page.evaluate(() => ({
          viewport: document.documentElement.clientWidth,
          content: document.documentElement.scrollWidth,
        }));
        expect(width.content).toBeLessThanOrEqual(width.viewport);
      }
    });
  }
}

test("a random exam contains forty unique questions and opens its review", async ({ page }) => {
  await prepareApp(page);
  await page.goto("/#/exam");
  await page.getByRole("button", { name: "Random" }).click();

  const activeExam = await page.evaluate(() => {
    const progress = JSON.parse(window.localStorage.getItem("istqb-ctfl-v4-trainer:v2") ?? "null");
    return progress?.activeExam;
  });
  expect(activeExam.blueprint.questionIds).toHaveLength(40);
  expect(new Set(activeExam.blueprint.questionIds).size).toBe(40);
  expect(activeExam.optionMode).toBe("original");

  await page.getByRole("button", { name: "Finish" }).click();
  await expect(page).toHaveURL(/#\/review$/);
  await expect(page.getByRole("heading", { name: "Simulacro aleatorio" })).toBeVisible();
  await expect(page.locator(".review-item")).toHaveCount(40);
});

test("an exported practice state can be imported and restored", async ({ page }, testInfo) => {
  await prepareApp(page);
  await page.goto("/#/practice");
  await page.getByRole("radio").first().check();
  await page.getByRole("button", { name: "Check" }).click();
  await openSidebarOnMobile(page, testInfo);

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export", exact: true }).click();
  const download = await downloadPromise;
  const exportPath = await download.path();
  expect(exportPath).toBeTruthy();

  await page.evaluate(() => {
    const key = "istqb-ctfl-v4-trainer:v2";
    const progress = JSON.parse(window.localStorage.getItem(key) ?? "null");
    progress.questionProgress = {};
    progress.study.answers = {};
    progress.study.revealed = false;
    window.localStorage.setItem(key, JSON.stringify(progress));
  });
  await page.reload();
  await page.locator('input[type="file"]').setInputFiles(exportPath!);
  await openSidebarOnMobile(page, testInfo);
  await expect(page.getByRole("status")).toContainText("Progress imported successfully.");

  await page.reload();
  await expect(page.getByRole("radio").first()).toBeChecked();
  await expect(page.locator(".feedback")).toBeVisible();
});

test("production routes do not emit console or runtime errors", async ({ page }) => {
  await prepareApp(page);
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));

  for (const route of ["/", "/#/practice", "/#/exam", "/#/review"]) {
    await page.goto(route);
    await expect(page.locator("main")).toBeVisible();
  }

  expect(errors).toEqual([]);
});
