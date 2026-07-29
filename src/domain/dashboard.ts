import type { Chapter, KLevel, Question } from "../data/types";
import { UNKNOWN_ACTIVE_TIME_MS, type ProgressState, type QuestionProgress } from "../storage/progress";

export type ProgressBreakdown = {
  id: string;
  total: number;
  attempted: number;
  correctAnswered: number;
  incorrectAnswered: number;
  coverage: number;
  attempts: number;
  correctAttempts: number;
  accuracy: number | null;
};

export type TimingBreakdown = {
  id: string;
  timedAttempts: number;
  totalActiveMs: number;
  averageActiveMs: number | null;
};

export type TimingSummary = {
  timedAttempts: number;
  totalActiveMs: number;
  averageActiveMs: number | null;
  byChapter: TimingBreakdown[];
  byKLevel: TimingBreakdown[];
  latestByOutcome: {
    correct: TimingBreakdown;
    incorrect: TimingBreakdown;
  };
};

export type StudyDashboard = {
  total: number;
  attempted: number;
  correctAnswered: number;
  incorrectAnswered: number;
  coverage: number;
  attempts: number;
  correctAttempts: number;
  accuracy: number | null;
  pendingErrors: number;
  flagged: number;
  unseen: number;
  byChapter: ProgressBreakdown[];
  byKLevel: ProgressBreakdown[];
  weakChapterIds: string[];
  timing: TimingSummary;
};

function percent(numerator: number, denominator: number) {
  return denominator === 0 ? 0 : Math.round((numerator / denominator) * 100);
}

function breakdown(
  id: string,
  groupQuestions: Question[],
  progress: ProgressState,
): ProgressBreakdown {
  const items = groupQuestions.map((question) => progress.questionProgress[question.id]);
  const attempted = items.filter((item) => Boolean(item?.attempts)).length;
  const correctAnswered = items.filter((item) => Boolean(item?.attempts) && item?.lastCorrect).length;
  const attempts = items.reduce((sum, item) => sum + (item?.attempts ?? 0), 0);
  const correctAttempts = items.reduce((sum, item) => sum + (item?.correct ?? 0), 0);
  return {
    id,
    total: groupQuestions.length,
    attempted,
    correctAnswered,
    incorrectAnswered: attempted - correctAnswered,
    coverage: percent(attempted, groupQuestions.length),
    attempts,
    correctAttempts,
    accuracy: attempts ? percent(correctAttempts, attempts) : null,
  };
}

function hasMeasuredTiming(item: QuestionProgress | undefined): item is QuestionProgress {
  return Boolean(
    item
    && (item.timedAttempts ?? 0) > 0
    && item.totalActiveMs !== UNKNOWN_ACTIVE_TIME_MS
    && Number.isFinite(item.totalActiveMs),
  );
}

function timingBreakdown(
  id: string,
  groupQuestions: Question[],
  progress: ProgressState,
): TimingBreakdown {
  const items = groupQuestions
    .map((question) => progress.questionProgress[question.id])
    .filter(hasMeasuredTiming);
  const timedAttempts = items.reduce((sum, item) => sum + (item.timedAttempts ?? 0), 0);
  const totalActiveMs = items.reduce((sum, item) => sum + (item.totalActiveMs ?? 0), 0);
  return {
    id,
    timedAttempts,
    totalActiveMs,
    averageActiveMs: timedAttempts ? Math.round(totalActiveMs / timedAttempts) : null,
  };
}

function latestOutcomeTiming(
  id: "correct" | "incorrect",
  questions: Question[],
  progress: ProgressState,
): TimingBreakdown {
  const items = questions
    .map((question) => progress.questionProgress[question.id])
    .filter((item): item is QuestionProgress =>
      Boolean(
        hasMeasuredTiming(item)
        && item.lastCorrect === (id === "correct")
        && item.lastActiveMs !== UNKNOWN_ACTIVE_TIME_MS
        && Number.isFinite(item.lastActiveMs),
      ));
  const totalActiveMs = items.reduce((sum, item) => sum + (item.lastActiveMs ?? 0), 0);
  return {
    id,
    timedAttempts: items.length,
    totalActiveMs,
    averageActiveMs: items.length ? Math.round(totalActiveMs / items.length) : null,
  };
}

export function summarizeStudyDashboard(
  questions: Question[],
  chapters: Chapter[],
  progress: ProgressState,
): StudyDashboard {
  const all = breakdown("all", questions, progress);
  const byChapter = chapters.map((chapter) =>
    breakdown(chapter.id, questions.filter((question) => question.chapter === chapter.id), progress),
  );
  const byKLevel = (["K1", "K2", "K3"] as KLevel[]).map((level) =>
    breakdown(level, questions.filter((question) => question.kLevel === level), progress),
  );
  const pendingErrors = questions.filter((question) => {
    const item = progress.questionProgress[question.id];
    return Boolean(item?.attempts) && !item?.lastCorrect;
  }).length;
  const flagged = questions.filter((question) => progress.questionProgress[question.id]?.flagged).length;
  const timing = timingBreakdown("all", questions, progress);

  const weakChapterIds = byChapter
    .filter((item) => item.attempts > 0)
    .sort((left, right) =>
      (left.accuracy ?? 0) - (right.accuracy ?? 0) ||
      left.coverage - right.coverage ||
      left.id.localeCompare(right.id),
    )
    .slice(0, 2)
    .map((item) => item.id);

  return {
    total: all.total,
    attempted: all.attempted,
    correctAnswered: all.correctAnswered,
    incorrectAnswered: all.incorrectAnswered,
    coverage: all.coverage,
    attempts: all.attempts,
    correctAttempts: all.correctAttempts,
    accuracy: all.accuracy,
    pendingErrors,
    flagged,
    unseen: all.total - all.attempted,
    byChapter,
    byKLevel,
    weakChapterIds,
    timing: {
      ...timing,
      byChapter: chapters.map((chapter) =>
        timingBreakdown(chapter.id, questions.filter((question) => question.chapter === chapter.id), progress)),
      byKLevel: (["K1", "K2", "K3"] as KLevel[]).map((level) =>
        timingBreakdown(level, questions.filter((question) => question.kLevel === level), progress)),
      latestByOutcome: {
        correct: latestOutcomeTiming("correct", questions, progress),
        incorrect: latestOutcomeTiming("incorrect", questions, progress),
      },
    },
  };
}
