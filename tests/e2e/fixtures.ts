import type { Page } from "@playwright/test";

const progress = {
  version: 1,
  certification: "ctfl-v4",
  questionProgress: {},
  sessions: [],
  preferences: {
    lastMode: "study",
    tutorialCompleted: true,
    tutorialCompletedAt: "2026-01-01T00:00:00.000Z",
  },
};

export async function prepareApp(page: Page, theme: "light" | "dark" = "light") {
  await page.addInitScript(
    ({ storedProgress, selectedTheme }) => {
      window.localStorage.setItem("istqb-ctfl-v4-trainer:v1", JSON.stringify(storedProgress));
      window.localStorage.setItem("istqb-ctfl-v4-theme", selectedTheme);
    },
    { storedProgress: progress, selectedTheme: theme },
  );
}
