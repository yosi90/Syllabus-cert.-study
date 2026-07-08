import type { AnswerMap, SessionScore } from "../domain/scoring";

export const STORAGE_KEY = "istqb-ctfl-v4-trainer:v1";

export type QuestionProgress = {
  attempts: number;
  correct: number;
  lastCorrect: boolean;
  flagged: boolean;
  lastAnswers: string[];
  updatedAt: string;
};

export type StoredSession = {
  id: string;
  title: string;
  mode: "study" | "exam";
  questionIds: string[];
  answers: AnswerMap;
  score: Omit<SessionScore, "results">;
  completedAt: string;
};

export type ProgressState = {
  version: 1;
  certification: "ctfl-v4";
  questionProgress: Record<string, QuestionProgress>;
  sessions: StoredSession[];
  preferences: {
    lastMode: "study" | "exam";
    tutorialCompleted: boolean;
    tutorialCompletedAt: string | null;
  };
};

export type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function createEmptyProgress(): ProgressState {
  return {
    version: 1,
    certification: "ctfl-v4",
    questionProgress: {},
    sessions: [],
    preferences: {
      lastMode: "study",
      tutorialCompleted: false,
      tutorialCompletedAt: null,
    },
  };
}

function isProgressState(value: unknown): value is ProgressState {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<ProgressState>;
  return (
    candidate.version === 1 &&
    candidate.certification === "ctfl-v4" &&
    typeof candidate.questionProgress === "object" &&
    Array.isArray(candidate.sessions)
  );
}

function normalizeProgress(value: ProgressState): ProgressState {
  return {
    version: 1,
    certification: "ctfl-v4",
    questionProgress: value.questionProgress ?? {},
    sessions: value.sessions ?? [],
    preferences: {
      lastMode: value.preferences?.lastMode ?? "study",
      tutorialCompleted: value.preferences?.tutorialCompleted ?? false,
      tutorialCompletedAt: value.preferences?.tutorialCompletedAt ?? null,
    },
  };
}

export function loadProgress(storage: StorageLike = window.localStorage): ProgressState {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return createEmptyProgress();
    const parsed = JSON.parse(raw);
    return isProgressState(parsed) ? normalizeProgress(parsed) : createEmptyProgress();
  } catch {
    return createEmptyProgress();
  }
}

export function saveProgress(progress: ProgressState, storage: StorageLike = window.localStorage): void {
  storage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

export function clearProgress(storage: StorageLike = window.localStorage): ProgressState {
  storage.removeItem(STORAGE_KEY);
  return createEmptyProgress();
}

export function recordQuestionAttempt(
  progress: ProgressState,
  questionId: string,
  selectedAnswers: string[],
  isCorrect: boolean,
  now = new Date().toISOString(),
): ProgressState {
  const previous = progress.questionProgress[questionId];
  return {
    ...progress,
    questionProgress: {
      ...progress.questionProgress,
      [questionId]: {
        attempts: (previous?.attempts ?? 0) + 1,
        correct: (previous?.correct ?? 0) + (isCorrect ? 1 : 0),
        lastCorrect: isCorrect,
        flagged: previous?.flagged ?? false,
        lastAnswers: selectedAnswers,
        updatedAt: now,
      },
    },
  };
}

export function toggleFlag(progress: ProgressState, questionId: string, now = new Date().toISOString()): ProgressState {
  const previous = progress.questionProgress[questionId];
  return {
    ...progress,
    questionProgress: {
      ...progress.questionProgress,
      [questionId]: {
        attempts: previous?.attempts ?? 0,
        correct: previous?.correct ?? 0,
        lastCorrect: previous?.lastCorrect ?? false,
        flagged: !(previous?.flagged ?? false),
        lastAnswers: previous?.lastAnswers ?? [],
        updatedAt: now,
      },
    },
  };
}

export function addSession(progress: ProgressState, session: StoredSession): ProgressState {
  return {
    ...progress,
    sessions: [session, ...progress.sessions].slice(0, 20),
  };
}

export function setTutorialCompleted(
  progress: ProgressState,
  completed: boolean,
  now = new Date().toISOString(),
): ProgressState {
  return {
    ...progress,
    preferences: {
      ...progress.preferences,
      tutorialCompleted: completed,
      tutorialCompletedAt: completed ? now : null,
    },
  };
}

export function exportProgress(progress: ProgressState): string {
  return JSON.stringify(progress, null, 2);
}

export function importProgress(raw: string): ProgressState {
  const parsed = JSON.parse(raw);
  if (!isProgressState(parsed)) {
    throw new Error("El archivo no tiene el formato de progreso CTFL v4 esperado.");
  }
  return normalizeProgress(parsed);
}
