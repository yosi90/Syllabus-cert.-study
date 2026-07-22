import type { KLevel, SourceModel } from "../data/types";
import type { AnswerMap, SessionScore } from "../domain/scoring";
import type { OptionMode } from "../domain/options";

export const STORAGE_KEY = "istqb-ctfl-v4-trainer:v2";
export const LEGACY_STORAGE_KEY = "istqb-ctfl-v4-trainer:v1";
export const UNKNOWN_ACTIVE_TIME_MS = ((999 * 60) + 59) * 1_000;

export type QuestionProgress = {
  attempts: number;
  correct: number;
  lastCorrect: boolean;
  flagged: boolean;
  lastAnswers: string[];
  updatedAt: string;
  totalActiveMs?: number;
  lastActiveMs?: number;
  timedAttempts?: number;
};

export type StoredSession = {
  id: string;
  title: string;
  mode: "study" | "exam";
  sessionType?: "official" | "random" | "adaptive";
  optionMode?: OptionMode;
  optionSeed?: string;
  sourceModel?: SourceModel;
  questionIds: string[];
  answers: AnswerMap;
  score: Omit<SessionScore, "results">;
  completedAt: string;
};

export type StoredFilters = {
  query: string;
  models: SourceModel[];
  chapters: string[];
  kLevels: KLevel[];
  references: string[];
  status: "all" | "unseen" | "correct" | "incorrect" | "flagged";
};

export type PersistedExam = {
  blueprint: {
    id: string;
    title: string;
    questionIds: string[];
  };
  currentIndex: number;
  answers: AnswerMap;
  timerMode: "off" | "standard" | "extended";
  endsAt: number | null;
  optionMode: "original";
  questionActiveMs?: Record<string, number>;
};

export type PersistedStudySession = {
  id: string;
  title: string;
  size: 10 | 20;
  seed: string;
  optionMode: "shuffled";
  optionSeed: string;
  questionIds: string[];
  currentIndex: number;
  answers: AnswerMap;
  revealed: boolean;
  checkedQuestionIds: string[];
  startedAt: string;
  studyMode?: "adaptive" | "reinforcement";
};

export type ProgressState = {
  version: 2;
  certification: "ctfl-v4";
  timingBackfillCompleted: boolean;
  questionProgress: Record<string, QuestionProgress>;
  sessions: StoredSession[];
  preferences: {
    lastMode: "study" | "exam";
    tutorialCompleted: boolean;
    tutorialCompletedAt: string | null;
    language: "en" | "es" | null;
    theme: "light" | "dark" | null;
    lastRoute: "/" | "/practice" | "/exam" | "/review";
  };
  study: {
    filters: StoredFilters;
    currentQuestionId: string | null;
    answers: AnswerMap;
    revealed: boolean;
  };
  activeExam: PersistedExam | null;
  activeStudySession: PersistedStudySession | null;
  review: {
    sessionId: string | null;
  };
};

type LegacyProgressState = {
  version: 1;
  certification: "ctfl-v4";
  questionProgress: Record<string, QuestionProgress>;
  sessions: StoredSession[];
  preferences?: {
    lastMode?: "study" | "exam";
    tutorialCompleted?: boolean;
    tutorialCompletedAt?: string | null;
  };
};

export type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

const emptyFilters: StoredFilters = {
  query: "",
  models: [],
  chapters: [],
  kLevels: [],
  references: [],
  status: "all",
};

export function createEmptyProgress(): ProgressState {
  return {
    version: 2,
    certification: "ctfl-v4",
    timingBackfillCompleted: true,
    questionProgress: {},
    sessions: [],
    preferences: {
      lastMode: "study",
      tutorialCompleted: false,
      tutorialCompletedAt: null,
      language: null,
      theme: null,
      lastRoute: "/",
    },
    study: {
      filters: { ...emptyFilters },
      currentQuestionId: null,
      answers: {},
      revealed: false,
    },
    activeExam: null,
    activeStudySession: null,
    review: {
      sessionId: null,
    },
  };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function isLegacyProgressState(value: unknown): value is LegacyProgressState {
  if (!isObject(value)) return false;
  return (
    value.version === 1 &&
    value.certification === "ctfl-v4" &&
    isObject(value.questionProgress) &&
    Array.isArray(value.sessions)
  );
}

function isProgressState(value: unknown): value is ProgressState {
  if (!isObject(value)) return false;
  return (
    value.version === 2 &&
    value.certification === "ctfl-v4" &&
    isObject(value.questionProgress) &&
    Array.isArray(value.sessions)
  );
}

function normalizeFilters(value: Partial<StoredFilters> | undefined): StoredFilters {
  const validStatuses = ["all", "unseen", "correct", "incorrect", "flagged"] as const;
  return {
    query: typeof value?.query === "string" ? value.query : "",
    models: Array.isArray(value?.models) ? value.models.filter((item): item is SourceModel => ["A", "B", "C", "D"].includes(item)) : [],
    chapters: Array.isArray(value?.chapters) ? value.chapters.filter((item): item is string => typeof item === "string") : [],
    kLevels: Array.isArray(value?.kLevels) ? value.kLevels.filter((item): item is KLevel => ["K1", "K2", "K3"].includes(item)) : [],
    references: Array.isArray(value?.references) ? value.references.filter((item): item is string => typeof item === "string") : [],
    status: validStatuses.includes(value?.status as (typeof validStatuses)[number])
      ? (value?.status as StoredFilters["status"])
      : "all",
  };
}

function normalizeProgress(value: ProgressState): ProgressState {
  const defaults = createEmptyProgress();
  const preferences = value.preferences ?? defaults.preferences;
  const study = value.study ?? defaults.study;
  const shouldBackfillTiming = value.timingBackfillCompleted !== true;
  return {
    version: 2,
    certification: "ctfl-v4",
    timingBackfillCompleted: true,
    questionProgress: Object.fromEntries(
      Object.entries(value.questionProgress ?? {}).map(([questionId, item]) => {
        const totalActiveMs = Number.isFinite(item.totalActiveMs) ? Math.max(0, item.totalActiveMs ?? 0) : 0;
        const lastActiveMs = Number.isFinite(item.lastActiveMs) ? Math.max(0, item.lastActiveMs ?? 0) : 0;
        const timedAttempts = Number.isFinite(item.timedAttempts) ? Math.max(0, item.timedAttempts ?? 0) : 0;
        const averageActiveMs = timedAttempts > 0 ? totalActiveMs / timedAttempts : 0;
        const needsUnknownTime = shouldBackfillTiming && item.attempts > 0 && averageActiveMs <= 1_000;
        return [questionId, {
          ...item,
          totalActiveMs: needsUnknownTime ? UNKNOWN_ACTIVE_TIME_MS : totalActiveMs,
          lastActiveMs: needsUnknownTime ? UNKNOWN_ACTIVE_TIME_MS : lastActiveMs,
          timedAttempts: needsUnknownTime ? 1 : timedAttempts,
        }];
      }),
    ),
    sessions: Array.isArray(value.sessions)
      ? value.sessions.map((session) => {
          if (!isObject(session)) return session as StoredSession;
          const type = session.sessionType === "adaptive" || session.mode === "study" ? "adaptive" : session.sessionType;
          return {
            ...(session as StoredSession),
            optionMode: session.optionMode === "shuffled" || session.optionMode === "original"
              ? session.optionMode
              : type === "adaptive" ? "shuffled" : "original",
            optionSeed: typeof session.optionSeed === "string" ? session.optionSeed : String(session.id ?? "legacy-session"),
          };
        })
      : [],
    preferences: {
      lastMode: preferences.lastMode === "exam" ? "exam" : "study",
      tutorialCompleted: preferences.tutorialCompleted ?? false,
      tutorialCompletedAt: preferences.tutorialCompletedAt ?? null,
      language: preferences.language === "en" || preferences.language === "es" ? preferences.language : null,
      theme: preferences.theme === "light" || preferences.theme === "dark" ? preferences.theme : null,
      lastRoute: ["/", "/practice", "/exam", "/review"].includes(preferences.lastRoute) ? preferences.lastRoute : "/",
    },
    study: {
      filters: normalizeFilters(study.filters),
      currentQuestionId: typeof study.currentQuestionId === "string" ? study.currentQuestionId : null,
      answers: isObject(study.answers) ? (study.answers as AnswerMap) : {},
      revealed: Boolean(study.revealed),
    },
    activeExam: isObject(value.activeExam)
      ? {
          ...(value.activeExam as PersistedExam),
          optionMode: "original",
          ...(isObject(value.activeExam.questionActiveMs)
            ? { questionActiveMs: Object.fromEntries(Object.entries(value.activeExam.questionActiveMs).filter((entry): entry is [string, number] => typeof entry[1] === "number" && Number.isFinite(entry[1]))) }
            : {}),
        }
      : null,
    activeStudySession: isObject(value.activeStudySession)
      ? {
          ...(value.activeStudySession as PersistedStudySession),
          optionMode: "shuffled",
          optionSeed: typeof value.activeStudySession.optionSeed === "string"
            ? value.activeStudySession.optionSeed
            : String(value.activeStudySession.seed ?? value.activeStudySession.id ?? "adaptive-session"),
          checkedQuestionIds: Array.isArray(value.activeStudySession.checkedQuestionIds)
            ? value.activeStudySession.checkedQuestionIds.filter((id): id is string => typeof id === "string")
            : [],
        }
      : null,
    review: {
      sessionId: typeof value.review?.sessionId === "string" ? value.review.sessionId : null,
    },
  };
}

function migrateLegacyProgress(value: LegacyProgressState): ProgressState {
  const migrated = createEmptyProgress();
  return normalizeProgress({
    ...migrated,
    timingBackfillCompleted: false,
    questionProgress: value.questionProgress ?? {},
    sessions: value.sessions ?? [],
    preferences: {
      ...migrated.preferences,
      lastMode: value.preferences?.lastMode === "exam" ? "exam" : "study",
      tutorialCompleted: value.preferences?.tutorialCompleted ?? false,
      tutorialCompletedAt: value.preferences?.tutorialCompletedAt ?? null,
    },
  });
}

function parseProgress(raw: string): ProgressState | null {
  const parsed: unknown = JSON.parse(raw);
  if (isProgressState(parsed)) return normalizeProgress(parsed);
  if (isLegacyProgressState(parsed)) return migrateLegacyProgress(parsed);
  return null;
}

export function loadProgress(storage: StorageLike = window.localStorage): ProgressState {
  try {
    const currentRaw = storage.getItem(STORAGE_KEY);
    if (currentRaw) return parseProgress(currentRaw) ?? createEmptyProgress();

    const legacyRaw = storage.getItem(LEGACY_STORAGE_KEY);
    if (!legacyRaw) return createEmptyProgress();
    const migrated = parseProgress(legacyRaw);
    if (!migrated) return createEmptyProgress();
    storage.setItem(STORAGE_KEY, JSON.stringify(migrated));
    return migrated;
  } catch {
    return createEmptyProgress();
  }
}

export function saveProgress(progress: ProgressState, storage: StorageLike = window.localStorage): void {
  storage.setItem(STORAGE_KEY, JSON.stringify(normalizeProgress(progress)));
}

export function clearProgress(storage: StorageLike = window.localStorage): ProgressState {
  storage.removeItem(STORAGE_KEY);
  storage.removeItem(LEGACY_STORAGE_KEY);
  return createEmptyProgress();
}

export function recordQuestionAttempt(
  progress: ProgressState,
  questionId: string,
  selectedAnswers: string[],
  isCorrect: boolean,
  now = new Date().toISOString(),
  activeMs?: number,
): ProgressState {
  const previous = progress.questionProgress[questionId];
  const measuredActiveMs = typeof activeMs === "number" && Number.isFinite(activeMs)
    ? Math.max(0, Math.round(activeMs))
    : null;
  const hasUnknownActiveTime = previous?.totalActiveMs === UNKNOWN_ACTIVE_TIME_MS
    && previous.lastActiveMs === UNKNOWN_ACTIVE_TIME_MS
    && previous.timedAttempts === 1;
  const replacesUnknownActiveTime = hasUnknownActiveTime && measuredActiveMs !== null;
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
        totalActiveMs: replacesUnknownActiveTime
          ? measuredActiveMs
          : (previous?.totalActiveMs ?? 0) + (measuredActiveMs ?? 0),
        lastActiveMs: measuredActiveMs ?? previous?.lastActiveMs ?? 0,
        timedAttempts: replacesUnknownActiveTime
          ? 1
          : (previous?.timedAttempts ?? 0) + (measuredActiveMs === null ? 0 : 1),
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
        totalActiveMs: previous?.totalActiveMs ?? 0,
        lastActiveMs: previous?.lastActiveMs ?? 0,
        timedAttempts: previous?.timedAttempts ?? 0,
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
  return JSON.stringify(normalizeProgress(progress), null, 2);
}

export function importProgress(raw: string): ProgressState {
  try {
    const parsed = parseProgress(raw);
    if (parsed) return parsed;
  } catch {
    // Use the same user-facing compatibility error for malformed JSON.
  }
  throw new Error("El archivo no tiene el formato de progreso CTFL v4 esperado.");
}
