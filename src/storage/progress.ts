import type { KLevel, SourceModel } from "../data/types";
import type { AnswerMap, SessionScore } from "../domain/scoring";
import type { OptionMode } from "../domain/options";

export const STORAGE_KEY = "istqb-ctfl-v4-trainer:v3";
export const PREVIOUS_STORAGE_KEY = "istqb-ctfl-v4-trainer:v2";
export const LEGACY_STORAGE_KEY = "istqb-ctfl-v4-trainer:v1";
export const UNKNOWN_ACTIVE_TIME_MS = ((999 * 60) + 59) * 1_000;
export const MAX_ATTEMPT_HISTORY = 5_000;

export type AttemptContext =
  | "question-bank"
  | "adaptive-study"
  | "reinforcement-study"
  | "official-exam"
  | "random-exam";

export type AttemptEvent = {
  id: string;
  questionId: string;
  answeredAt: string;
  attemptNumber: number;
  selectedAnswers: string[];
  isCorrect: boolean;
  activeMs: number | null;
  context: AttemptContext;
  sessionId: string | null;
  bankVersion: string;
};

export type AttemptMetadata = {
  context: AttemptContext;
  sessionId?: string | null;
  bankVersion?: string;
};

export type QuestionProgress = {
  attempts: number;
  correct: number;
  lastCorrect: boolean;
  flagged: boolean;
  flaggedCorrectPrompted?: boolean;
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
  status: Array<"unseen" | "correct" | "incorrect" | "flagged">;
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
  questionAnsweredAt?: Record<string, string>;
  timerSessionId?: string;
};

export type PersistedStudySession = {
  id: string;
  title: string;
  size: number;
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
  paused?: boolean;
};

export type ProgressState = {
  version: 3;
  certification: "ctfl-v4";
  timingBackfillCompleted: boolean;
  trackingStartedAt: string;
  attemptHistory: AttemptEvent[];
  questionProgress: Record<string, QuestionProgress>;
  sessions: StoredSession[];
  preferences: {
    lastMode: "study" | "exam";
    tutorialCompleted: boolean;
    tutorialCompletedAt: string | null;
    language: "en" | "es" | null;
    theme: "light" | "dark" | null;
    lastRoute: "/" | "/metrics" | "/practice" | "/exam" | "/review";
    filtersPanelOpen: boolean;
    progressPanelOpen: boolean;
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

type PreviousProgressState = Omit<ProgressState, "version" | "trackingStartedAt" | "attemptHistory"> & {
  version: 2;
};

export type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

const emptyFilters: StoredFilters = {
  query: "",
  models: [],
  chapters: [],
  kLevels: [],
  references: [],
  status: [],
};

export function createEmptyProgress(now = new Date().toISOString()): ProgressState {
  return {
    version: 3,
    certification: "ctfl-v4",
    timingBackfillCompleted: true,
    trackingStartedAt: now,
    attemptHistory: [],
    questionProgress: {},
    sessions: [],
    preferences: {
      lastMode: "study",
      tutorialCompleted: false,
      tutorialCompletedAt: null,
      language: null,
      theme: null,
      lastRoute: "/",
      filtersPanelOpen: true,
      progressPanelOpen: true,
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
    value.version === 3 &&
    value.certification === "ctfl-v4" &&
    isObject(value.questionProgress) &&
    Array.isArray(value.attemptHistory) &&
    Array.isArray(value.sessions)
  );
}

function isPreviousProgressState(value: unknown): value is PreviousProgressState {
  if (!isObject(value)) return false;
  return (
    value.version === 2 &&
    value.certification === "ctfl-v4" &&
    isObject(value.questionProgress) &&
    Array.isArray(value.sessions)
  );
}

function normalizeFilters(value: Partial<StoredFilters> | undefined): StoredFilters {
  const validStatuses = ["unseen", "correct", "incorrect", "flagged"] as const;
  const rawStatus: unknown = value?.status;
  const status = Array.isArray(rawStatus)
    ? rawStatus.filter((item): item is StoredFilters["status"][number] =>
        typeof item === "string" && validStatuses.includes(item as StoredFilters["status"][number]))
    : typeof rawStatus === "string" && validStatuses.includes(rawStatus as StoredFilters["status"][number])
      ? [rawStatus as StoredFilters["status"][number]]
      : [];
  return {
    query: typeof value?.query === "string" ? value.query : "",
    models: Array.isArray(value?.models) ? value.models.filter((item): item is SourceModel => ["A", "B", "C", "D"].includes(item)) : [],
    chapters: Array.isArray(value?.chapters) ? value.chapters.filter((item): item is string => typeof item === "string") : [],
    kLevels: Array.isArray(value?.kLevels) ? value.kLevels.filter((item): item is KLevel => ["K1", "K2", "K3"].includes(item)) : [],
    references: Array.isArray(value?.references) ? value.references.filter((item): item is string => typeof item === "string") : [],
    status: Array.from(new Set(status)),
  };
}

function normalizeActiveStudySession(value: Record<string, unknown>): PersistedStudySession {
  const session = value as unknown as PersistedStudySession;
  const answers = isObject(value.answers) ? value.answers as AnswerMap : {};
  const questionIds = Array.isArray(value.questionIds)
    ? value.questionIds.filter((id): id is string => typeof id === "string")
    : [];
  const currentQuestionId = questionIds[session.currentIndex];
  const hasOwnAnswer = (questionId: string) =>
    Array.isArray(answers[questionId]) && answers[questionId].length > 0;
  const checkedQuestionIds = Array.isArray(value.checkedQuestionIds)
    ? value.checkedQuestionIds.filter((id): id is string =>
        typeof id === "string" && hasOwnAnswer(id))
    : currentQuestionId && Boolean(value.revealed) && hasOwnAnswer(currentQuestionId)
      ? [currentQuestionId]
      : [];

  return {
    ...session,
    questionIds,
    answers,
    optionMode: "shuffled",
    optionSeed: typeof value.optionSeed === "string"
      ? value.optionSeed
      : String(value.seed ?? value.id ?? "adaptive-session"),
    checkedQuestionIds,
    revealed: Boolean(currentQuestionId && checkedQuestionIds.includes(currentQuestionId)),
    paused: Boolean(value.paused),
  };
}

const attemptContexts: AttemptContext[] = [
  "question-bank",
  "adaptive-study",
  "reinforcement-study",
  "official-exam",
  "random-exam",
];

function normalizeAttemptEvent(value: unknown): AttemptEvent | null {
  if (!isObject(value)) return null;
  if (
    typeof value.id !== "string"
    || typeof value.questionId !== "string"
    || typeof value.answeredAt !== "string"
    || typeof value.isCorrect !== "boolean"
    || !Array.isArray(value.selectedAnswers)
    || !attemptContexts.includes(value.context as AttemptContext)
  ) return null;
  const activeMs = typeof value.activeMs === "number" && Number.isFinite(value.activeMs)
    ? Math.max(0, Math.round(value.activeMs))
    : null;
  return {
    id: value.id,
    questionId: value.questionId,
    answeredAt: value.answeredAt,
    attemptNumber: typeof value.attemptNumber === "number" && Number.isFinite(value.attemptNumber)
      ? Math.max(1, Math.round(value.attemptNumber))
      : 1,
    selectedAnswers: value.selectedAnswers.filter((answer): answer is string => typeof answer === "string"),
    isCorrect: value.isCorrect,
    activeMs,
    context: value.context as AttemptContext,
    sessionId: typeof value.sessionId === "string" ? value.sessionId : null,
    bankVersion: typeof value.bankVersion === "string" ? value.bankVersion : "ctfl-v4",
  };
}

function normalizeProgress(value: ProgressState): ProgressState {
  const defaults = createEmptyProgress();
  const preferences = value.preferences ?? defaults.preferences;
  const study = value.study ?? defaults.study;
  const shouldBackfillTiming = value.timingBackfillCompleted !== true;
  return {
    version: 3,
    certification: "ctfl-v4",
    timingBackfillCompleted: true,
    trackingStartedAt: typeof value.trackingStartedAt === "string"
      ? value.trackingStartedAt
      : defaults.trackingStartedAt,
    attemptHistory: (Array.isArray(value.attemptHistory) ? value.attemptHistory : [])
      .map(normalizeAttemptEvent)
      .filter((event): event is AttemptEvent => event !== null)
      .slice(-MAX_ATTEMPT_HISTORY),
    questionProgress: Object.fromEntries(
      Object.entries(value.questionProgress ?? {}).map(([questionId, item]) => {
        const totalActiveMs = Number.isFinite(item.totalActiveMs) ? Math.max(0, item.totalActiveMs ?? 0) : 0;
        const lastActiveMs = Number.isFinite(item.lastActiveMs) ? Math.max(0, item.lastActiveMs ?? 0) : 0;
        const timedAttempts = Number.isFinite(item.timedAttempts) ? Math.max(0, item.timedAttempts ?? 0) : 0;
        const averageActiveMs = timedAttempts > 0 ? totalActiveMs / timedAttempts : 0;
        const needsUnknownTime = shouldBackfillTiming && item.attempts > 0 && averageActiveMs <= 1_000;
        return [questionId, {
          ...item,
          flaggedCorrectPrompted: Boolean(item.flaggedCorrectPrompted),
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
      lastRoute: ["/", "/metrics", "/practice", "/exam", "/review"].includes(preferences.lastRoute) ? preferences.lastRoute : "/",
      filtersPanelOpen: preferences.filtersPanelOpen !== false,
      progressPanelOpen: preferences.progressPanelOpen !== false,
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
          timerSessionId: typeof value.activeExam.timerSessionId === "string"
            ? value.activeExam.timerSessionId
            : `${String((value.activeExam as PersistedExam).blueprint?.id ?? "legacy-exam")}:${String(value.activeExam.endsAt ?? "untimed")}`,
          ...(isObject(value.activeExam.questionActiveMs)
            ? { questionActiveMs: Object.fromEntries(Object.entries(value.activeExam.questionActiveMs).filter((entry): entry is [string, number] => typeof entry[1] === "number" && Number.isFinite(entry[1]))) }
            : {}),
          ...(isObject(value.activeExam.questionAnsweredAt)
            ? { questionAnsweredAt: Object.fromEntries(Object.entries(value.activeExam.questionAnsweredAt).filter((entry): entry is [string, string] => typeof entry[1] === "string")) }
            : {}),
        }
      : null,
    activeStudySession: isObject(value.activeStudySession)
      ? normalizeActiveStudySession(value.activeStudySession)
      : null,
    review: {
      sessionId: typeof value.review?.sessionId === "string" ? value.review.sessionId : null,
    },
  };
}

function migratePreviousProgress(value: PreviousProgressState): ProgressState {
  const migrated = createEmptyProgress();
  return normalizeProgress({
    ...value,
    version: 3,
    trackingStartedAt: migrated.trackingStartedAt,
    attemptHistory: [],
  });
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
  if (isPreviousProgressState(parsed)) return migratePreviousProgress(parsed);
  if (isLegacyProgressState(parsed)) return migrateLegacyProgress(parsed);
  return null;
}

export function loadProgress(storage: StorageLike = window.localStorage): ProgressState {
  try {
    const currentRaw = storage.getItem(STORAGE_KEY);
    if (currentRaw) return parseProgress(currentRaw) ?? createEmptyProgress();

    const previousRaw = storage.getItem(PREVIOUS_STORAGE_KEY);
    if (previousRaw) {
      const migrated = parseProgress(previousRaw);
      if (!migrated) return createEmptyProgress();
      storage.setItem(STORAGE_KEY, JSON.stringify(migrated));
      return migrated;
    }

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
  storage.removeItem(PREVIOUS_STORAGE_KEY);
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
  metadata: AttemptMetadata = { context: "question-bank" },
): ProgressState {
  if (selectedAnswers.length === 0) return progress;
  const previous = progress.questionProgress[questionId];
  const measuredActiveMs = typeof activeMs === "number" && Number.isFinite(activeMs)
    ? Math.max(0, Math.round(activeMs))
    : null;
  const hasUnknownActiveTime = previous?.totalActiveMs === UNKNOWN_ACTIVE_TIME_MS
    && previous.lastActiveMs === UNKNOWN_ACTIVE_TIME_MS
    && previous.timedAttempts === 1;
  const replacesUnknownActiveTime = hasUnknownActiveTime && measuredActiveMs !== null;
  const attemptNumber = (previous?.attempts ?? 0) + 1;
  const attemptEvent: AttemptEvent = {
    id: `${now}:${questionId}:${attemptNumber}`,
    questionId,
    answeredAt: now,
    attemptNumber,
    selectedAnswers: Array.from(new Set(selectedAnswers)).sort(),
    isCorrect,
    activeMs: measuredActiveMs,
    context: metadata.context,
    sessionId: metadata.sessionId ?? null,
    bankVersion: metadata.bankVersion ?? "ctfl-v4",
  };
  return {
    ...progress,
    attemptHistory: [...progress.attemptHistory, attemptEvent].slice(-MAX_ATTEMPT_HISTORY),
    questionProgress: {
      ...progress.questionProgress,
      [questionId]: {
        attempts: attemptNumber,
        correct: (previous?.correct ?? 0) + (isCorrect ? 1 : 0),
        lastCorrect: isCorrect,
        flagged: previous?.flagged ?? false,
        flaggedCorrectPrompted: previous?.flaggedCorrectPrompted ?? false,
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
  const flagged = !(previous?.flagged ?? false);
  return {
    ...progress,
    questionProgress: {
      ...progress.questionProgress,
      [questionId]: {
        attempts: previous?.attempts ?? 0,
        correct: previous?.correct ?? 0,
        lastCorrect: previous?.lastCorrect ?? false,
        flagged,
        flaggedCorrectPrompted: false,
        lastAnswers: previous?.lastAnswers ?? [],
        updatedAt: now,
        totalActiveMs: previous?.totalActiveMs ?? 0,
        lastActiveMs: previous?.lastActiveMs ?? 0,
        timedAttempts: previous?.timedAttempts ?? 0,
      },
    },
  };
}

export function markFlaggedCorrectPrompted(progress: ProgressState, questionId: string): ProgressState {
  const previous = progress.questionProgress[questionId];
  if (!previous?.flagged || previous.flaggedCorrectPrompted) return progress;
  return {
    ...progress,
    questionProgress: {
      ...progress.questionProgress,
      [questionId]: {
        ...previous,
        flaggedCorrectPrompted: true,
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
