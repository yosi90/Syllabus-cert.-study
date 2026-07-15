import type { Chapter, KLevel, Question } from "../data/types";
import type { ProgressState } from "../storage/progress";

export type ProgressBreakdown = {
  id: string;
  total: number;
  attempted: number;
  coverage: number;
  attempts: number;
  correctAttempts: number;
  accuracy: number | null;
};

export type StudyDashboard = {
  total: number;
  attempted: number;
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
  const attempts = items.reduce((sum, item) => sum + (item?.attempts ?? 0), 0);
  const correctAttempts = items.reduce((sum, item) => sum + (item?.correct ?? 0), 0);
  return {
    id,
    total: groupQuestions.length,
    attempted,
    coverage: percent(attempted, groupQuestions.length),
    attempts,
    correctAttempts,
    accuracy: attempts ? percent(correctAttempts, attempts) : null,
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
  };
}
