import type { Chapter, KLevel, Question, QuestionType } from "../data/types";
import {
  UNKNOWN_ACTIVE_TIME_MS,
  type AttemptContext,
  type AttemptEvent,
  type ProgressState,
  type QuestionProgress,
} from "../storage/progress";

export type MetricsOrigin = "all" | "study" | "exam";
export type MetricsDimension = "chapter" | "kLevel" | "questionType";

export type LearningSignal = {
  value: number | null;
  sample: number;
};

export type TrendSignal = LearningSignal & {
  previousValue: number | null;
  delta: number | null;
};

export type MetricBucket = {
  id: string;
  label: string;
  accuracy: number;
  medianActiveMs: number | null;
  attempts: number;
};

export type WeeklyActivity = {
  id: string;
  label: string;
  attempts: number;
  activeMinutes: number;
};

export type PerformanceBreakdown = {
  id: string;
  totalQuestions: number;
  attemptedQuestions: number;
  attempts: number;
  correctAttempts: number;
  accuracy: number | null;
  recentAccuracy: number | null;
  trendDelta: number | null;
  medianActiveMs: number | null;
  pendingErrors: number;
  flagged: number;
  availableQuestionIds: string[];
};

export type LearningMetrics = {
  origin: MetricsOrigin;
  trackedAttempts: number;
  recentAccuracy: LearningSignal;
  medianActiveMs: LearningSignal;
  activeMsLast30Days: number;
  activeDaysLast30Days: number;
  trend: TrendSignal;
  firstAttemptAccuracy: LearningSignal;
  recoveryAccuracy: LearningSignal;
  retentionAccuracy: LearningSignal;
  correctTiming: LearningSignal;
  incorrectTiming: LearningSignal;
  buckets: MetricBucket[];
  weeklyActivity: WeeklyActivity[];
  byChapter: PerformanceBreakdown[];
  byKLevel: PerformanceBreakdown[];
  byQuestionType: PerformanceBreakdown[];
  recommendations: {
    chapter: PerformanceBreakdown | null;
    kLevel: PerformanceBreakdown | null;
    questionType: PerformanceBreakdown | null;
  };
};

const questionTypes: QuestionType[] = [
  "simple",
  "visual",
  "list",
  "multiple-response",
  "matching",
  "scenario",
  "calculation",
];

const validTiming = (milliseconds: number | null | undefined): milliseconds is number =>
  typeof milliseconds === "number"
  && Number.isFinite(milliseconds)
  && milliseconds >= 1_000
  && milliseconds <= 15 * 60_000
  && milliseconds !== UNKNOWN_ACTIVE_TIME_MS;

function percent(numerator: number, denominator: number) {
  return denominator ? Math.round((numerator / denominator) * 100) : null;
}

function median(values: number[]) {
  if (!values.length) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : Math.round((sorted[middle - 1] + sorted[middle]) / 2);
}

function isStudyContext(context: AttemptContext) {
  return context === "question-bank" || context === "adaptive-study" || context === "reinforcement-study";
}

export function filterAttemptEvents(events: AttemptEvent[], origin: MetricsOrigin) {
  return events
    .filter((event) =>
      origin === "all"
      || (origin === "study" && isStudyContext(event.context))
      || (origin === "exam" && !isStudyContext(event.context)))
    .sort((left, right) =>
      new Date(left.answeredAt).getTime() - new Date(right.answeredAt).getTime()
      || left.id.localeCompare(right.id));
}

function accuracySignal(events: AttemptEvent[]): LearningSignal {
  return {
    value: percent(events.filter((event) => event.isCorrect).length, events.length),
    sample: events.length,
  };
}

function recentTrend(events: AttemptEvent[], windowSize = 20): TrendSignal {
  if (events.length < windowSize * 2) {
    return { value: null, previousValue: null, delta: null, sample: events.length };
  }
  const recent = events.slice(-windowSize);
  const previous = events.slice(-(windowSize * 2), -windowSize);
  const value = accuracySignal(recent).value;
  const previousValue = accuracySignal(previous).value;
  return {
    value,
    previousValue,
    delta: value !== null && previousValue !== null ? value - previousValue : null,
    sample: windowSize * 2,
  };
}

function firstAttemptSignal(events: AttemptEvent[]): LearningSignal {
  const firstAttempts = events.filter((event) => event.attemptNumber === 1);
  return firstAttempts.length >= 5
    ? accuracySignal(firstAttempts)
    : { value: null, sample: firstAttempts.length };
}

function sequenceSignal(
  events: AttemptEvent[],
  eligible: (previous: AttemptEvent, next: AttemptEvent) => boolean,
): LearningSignal {
  const byQuestion = new Map<string, AttemptEvent[]>();
  for (const event of events) {
    const items = byQuestion.get(event.questionId) ?? [];
    items.push(event);
    byQuestion.set(event.questionId, items);
  }
  const outcomes: boolean[] = [];
  for (const items of byQuestion.values()) {
    for (let index = 1; index < items.length; index += 1) {
      if (eligible(items[index - 1], items[index])) outcomes.push(items[index].isCorrect);
    }
  }
  return outcomes.length >= 5
    ? { value: percent(outcomes.filter(Boolean).length, outcomes.length), sample: outcomes.length }
    : { value: null, sample: outcomes.length };
}

function bucketEvents(events: AttemptEvent[]): MetricBucket[] {
  return events.slice(-100).reduce<MetricBucket[]>((buckets, _event, index, recent) => {
    if (index % 10 !== 0) return buckets;
    const items = recent.slice(index, index + 10);
    const end = index + items.length;
    buckets.push({
      id: `${index}-${end}`,
      label: `${index + 1}–${end}`,
      accuracy: accuracySignal(items).value ?? 0,
      medianActiveMs: median(items.map((item) => item.activeMs).filter(validTiming)),
      attempts: items.length,
    });
    return buckets;
  }, []);
}

function startOfWeek(timestamp: number) {
  const date = new Date(timestamp);
  const day = (date.getDay() + 6) % 7;
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - day);
  return date.getTime();
}

function weeklyActivity(events: AttemptEvent[], now: number, locale: "en" | "es"): WeeklyActivity[] {
  const currentWeek = startOfWeek(now);
  return Array.from({ length: 12 }, (_, index) => {
    const start = currentWeek - (11 - index) * 7 * 86_400_000;
    const end = start + 7 * 86_400_000;
    const items = events.filter((event) => {
      const timestamp = new Date(event.answeredAt).getTime();
      return timestamp >= start && timestamp < end;
    });
    return {
      id: new Date(start).toISOString(),
      label: new Intl.DateTimeFormat(locale, { day: "2-digit", month: "short" }).format(start),
      attempts: items.length,
      activeMinutes: Math.round(
        items.map((item) => item.activeMs).filter(validTiming).reduce((sum, value) => sum + value, 0) / 60_000,
      ),
    };
  });
}

function progressForQuestions(
  groupQuestions: Question[],
  progress: ProgressState,
): Pick<PerformanceBreakdown, "attemptedQuestions" | "attempts" | "correctAttempts" | "accuracy" | "medianActiveMs" | "pendingErrors" | "flagged"> {
  const items = groupQuestions
    .map((question) => progress.questionProgress[question.id])
    .filter((item): item is QuestionProgress => Boolean(item));
  const attempts = items.reduce((sum, item) => sum + item.attempts, 0);
  const correctAttempts = items.reduce((sum, item) => sum + item.correct, 0);
  const timedAverages = items
    .filter((item) =>
      typeof item.totalActiveMs === "number"
      && Number.isFinite(item.totalActiveMs)
      && item.totalActiveMs >= 0
      && (item.timedAttempts ?? 0) > 0)
    .flatMap((item) => Array.from(
      { length: item.timedAttempts ?? 0 },
      () => Math.round((item.totalActiveMs ?? 0) / (item.timedAttempts ?? 1)),
    ))
    .filter(validTiming);
  return {
    attemptedQuestions: items.filter((item) => item.attempts > 0).length,
    attempts,
    correctAttempts,
    accuracy: percent(correctAttempts, attempts),
    medianActiveMs: median(timedAverages),
    pendingErrors: items.filter((item) => item.attempts > 0 && !item.lastCorrect).length,
    flagged: items.filter((item) => item.flagged).length,
  };
}

function eventPerformance(events: AttemptEvent[], questionIds: Set<string>) {
  const items = events.filter((event) => questionIds.has(event.questionId));
  const distinctQuestions = new Set(items.map((item) => item.questionId));
  const recent = items.slice(-20);
  const trend = recentTrend(items, 10);
  return {
    attemptedQuestions: distinctQuestions.size,
    attempts: items.length,
    correctAttempts: items.filter((item) => item.isCorrect).length,
    accuracy: accuracySignal(items).value,
    recentAccuracy: recent.length ? accuracySignal(recent).value : null,
    trendDelta: trend.delta,
    medianActiveMs: median(items.map((item) => item.activeMs).filter(validTiming)),
  };
}

function breakdown(
  id: string,
  groupQuestions: Question[],
  events: AttemptEvent[],
  progress: ProgressState,
  useHistoricalProgress: boolean,
): PerformanceBreakdown {
  const questionIds = new Set(groupQuestions.map((question) => question.id));
  const eventValues = eventPerformance(events, questionIds);
  const historical = useHistoricalProgress ? progressForQuestions(groupQuestions, progress) : null;
  return {
    id,
    totalQuestions: groupQuestions.length,
    attemptedQuestions: historical?.attemptedQuestions ?? eventValues.attemptedQuestions,
    attempts: historical?.attempts ?? eventValues.attempts,
    correctAttempts: historical?.correctAttempts ?? eventValues.correctAttempts,
    accuracy: historical?.accuracy ?? eventValues.accuracy,
    recentAccuracy: eventValues.recentAccuracy,
    trendDelta: eventValues.trendDelta,
    medianActiveMs: eventValues.medianActiveMs ?? historical?.medianActiveMs ?? null,
    pendingErrors: historical?.pendingErrors ?? Array.from(questionIds)
      .filter((questionId) => {
        const latest = events.filter((event) => event.questionId === questionId).at(-1);
        return latest && !latest.isCorrect;
      }).length,
    flagged: historical?.flagged ?? groupQuestions
      .filter((question) => progress.questionProgress[question.id]?.flagged).length,
    availableQuestionIds: groupQuestions.map((question) => question.id),
  };
}

export function compareReviewPriority(left: PerformanceBreakdown, right: PerformanceBreakdown) {
  const leftErrorRate = left.attemptedQuestions ? left.pendingErrors / left.attemptedQuestions : 0;
  const rightErrorRate = right.attemptedQuestions ? right.pendingErrors / right.attemptedQuestions : 0;
  return rightErrorRate - leftErrorRate
    || (left.recentAccuracy ?? left.accuracy ?? 100) - (right.recentAccuracy ?? right.accuracy ?? 100)
    || (right.medianActiveMs ?? 0) - (left.medianActiveMs ?? 0)
    || right.flagged - left.flagged
    || left.id.localeCompare(right.id);
}

function recommendation(items: PerformanceBreakdown[]) {
  return [...items]
    .filter((item) => item.attemptedQuestions >= 3 && item.attempts >= 5)
    .sort(compareReviewPriority)[0] ?? null;
}

export function summarizeLearningMetrics(
  questions: Question[],
  chapters: Chapter[],
  progress: ProgressState,
  origin: MetricsOrigin = "all",
  now = Date.now(),
  locale: "en" | "es" = "en",
): LearningMetrics {
  const events = filterAttemptEvents(progress.attemptHistory, origin);
  const recentEvents = events.slice(-20);
  const validTimes = events.map((event) => event.activeMs).filter(validTiming);
  const thirtyDaysAgo = now - 30 * 86_400_000;
  const last30Days = events.filter((event) => new Date(event.answeredAt).getTime() >= thirtyDaysAgo);
  const useHistoricalProgress = origin === "all";
  const byChapter = chapters.map((chapter) =>
    breakdown(chapter.id, questions.filter((question) => question.chapter === chapter.id), events, progress, useHistoricalProgress));
  const byKLevel = (["K1", "K2", "K3"] as KLevel[]).map((level) =>
    breakdown(level, questions.filter((question) => question.kLevel === level), events, progress, useHistoricalProgress));
  const byQuestionType = questionTypes.map((type) =>
    breakdown(type, questions.filter((question) => question.questionTypes.includes(type)), events, progress, useHistoricalProgress));

  return {
    origin,
    trackedAttempts: events.length,
    recentAccuracy: accuracySignal(recentEvents),
    medianActiveMs: { value: median(validTimes), sample: validTimes.length },
    activeMsLast30Days: last30Days
      .map((event) => event.activeMs)
      .filter(validTiming)
      .reduce((sum, value) => sum + value, 0),
    activeDaysLast30Days: new Set(last30Days.map((event) => event.answeredAt.slice(0, 10))).size,
    trend: recentTrend(events),
    firstAttemptAccuracy: firstAttemptSignal(events),
    recoveryAccuracy: sequenceSignal(events, (previous) => !previous.isCorrect),
    retentionAccuracy: sequenceSignal(events, (previous, next) =>
      previous.isCorrect
      && new Date(next.answeredAt).getTime() - new Date(previous.answeredAt).getTime() >= 7 * 86_400_000),
    correctTiming: {
      value: median(events.filter((event) => event.isCorrect).map((event) => event.activeMs).filter(validTiming)),
      sample: events.filter((event) => event.isCorrect && validTiming(event.activeMs)).length,
    },
    incorrectTiming: {
      value: median(events.filter((event) => !event.isCorrect).map((event) => event.activeMs).filter(validTiming)),
      sample: events.filter((event) => !event.isCorrect && validTiming(event.activeMs)).length,
    },
    buckets: bucketEvents(events),
    weeklyActivity: weeklyActivity(events, now, locale),
    byChapter,
    byKLevel,
    byQuestionType,
    recommendations: {
      chapter: recommendation(byChapter),
      kLevel: recommendation(byKLevel),
      questionType: recommendation(byQuestionType),
    },
  };
}
