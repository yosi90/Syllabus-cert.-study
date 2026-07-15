import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import type { NavigateFunction } from "react-router-dom";
import type { QuestionFilters } from "../domain/filters";
import type { AnswerMap } from "../domain/scoring";
import { loadProgress, saveProgress, type ProgressState } from "../storage/progress";
import { THEME_STORAGE_KEY, type ExamState, type Language, type ReviewState, type Theme } from "../app/content";

export function useTrainerProgress() {
  const [progress, setProgress] = useState<ProgressState>(() => loadProgress());

  useEffect(() => {
    saveProgress(progress);
  }, [progress]);

  return [progress, setProgress] as const;
}

export function usePersistentTheme(savedPreference: Theme | null) {
  const [theme, setTheme] = useState<Theme>(() => {
    if (savedPreference) return savedPreference;
    const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (savedTheme === "light" || savedTheme === "dark") return savedTheme;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  return [theme, setTheme] as const;
}

export function useLastRouteRestoration(
  pathname: string,
  lastRoute: ProgressState["preferences"]["lastRoute"],
  navigate: NavigateFunction,
) {
  const routeWasRestored = useRef(false);

  useEffect(() => {
    if (routeWasRestored.current) return;
    routeWasRestored.current = true;
    if (pathname === "/" && lastRoute !== "/") navigate(lastRoute, { replace: true });
  }, [lastRoute, navigate, pathname]);
}

export function useWorkspacePersistence({
  setProgress,
  pathname,
  language,
  theme,
  filters,
  studyQuestionId,
  studyAnswers,
  studyRevealed,
  activeExam,
  review,
}: {
  setProgress: Dispatch<SetStateAction<ProgressState>>;
  pathname: string;
  language: Language;
  theme: Theme;
  filters: QuestionFilters;
  studyQuestionId: string | null;
  studyAnswers: AnswerMap;
  studyRevealed: boolean;
  activeExam: ExamState | null;
  review: ReviewState | null;
}) {
  useEffect(() => {
    const lastRoute = ["/", "/exam", "/review"].includes(pathname)
      ? (pathname as ProgressState["preferences"]["lastRoute"])
      : "/";
    setProgress((current) => ({
      ...current,
      preferences: {
        ...current.preferences,
        lastMode: lastRoute === "/exam" ? "exam" : "study",
        language,
        theme,
        lastRoute,
      },
      study: {
        filters,
        currentQuestionId: studyQuestionId,
        answers: studyAnswers,
        revealed: studyRevealed,
      },
      activeExam,
      review: { sessionId: review?.sessionId ?? null },
    }));
  }, [activeExam, filters, language, pathname, review?.sessionId, setProgress, studyAnswers, studyQuestionId, studyRevealed, theme]);
}
