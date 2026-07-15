import type { Page } from "@playwright/test";

const progress = {
  version: 2,
  certification: "ctfl-v4",
  questionProgress: {},
  sessions: [],
  preferences: {
    lastMode: "study",
    tutorialCompleted: true,
    tutorialCompletedAt: "2026-01-01T00:00:00.000Z",
    language: "en",
    theme: "light",
    lastRoute: "/",
  },
  study: {
    filters: { query: "", models: [], chapters: [], kLevels: [], references: [], status: "all" },
    currentQuestionId: "A-01",
    answers: {},
    revealed: false,
  },
  activeExam: null,
};

export async function prepareApp(page: Page, theme: "light" | "dark" = "light") {
  await page.addInitScript(
    ({ storedProgress, selectedTheme }) => {
      const currentProgress = structuredClone(storedProgress);
      currentProgress.preferences.theme = selectedTheme;
      if (!window.localStorage.getItem("istqb-ctfl-v4-trainer:v2")) {
        window.localStorage.setItem("istqb-ctfl-v4-trainer:v2", JSON.stringify(currentProgress));
      }
      window.localStorage.setItem("istqb-ctfl-v4-theme", selectedTheme);
    },
    { storedProgress: progress, selectedTheme: theme },
  );
}
