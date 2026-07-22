import type { AnswerMap } from "./scoring";
import { isCorrectAnswer } from "./scoring";
import type { Question } from "../data/types";
import type { ProgressState } from "../storage/progress";
import { officialChapterKDistribution } from "./exams";

export type AdaptiveCandidate = {
  question: Question;
  priority: number;
  tieBreaker: number;
};

const kLevels = ["K1", "K2", "K3"] as const;

function apportion(weights: Record<string, number>, target: number) {
  const totalWeight = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
  const entries = Object.entries(weights).map(([id, weight], index) => {
    const exact = totalWeight ? (weight / totalWeight) * target : 0;
    return { id, index, exact, amount: Math.floor(exact) };
  });
  let remaining = target - entries.reduce((sum, entry) => sum + entry.amount, 0);
  entries
    .sort((left, right) => (right.exact % 1) - (left.exact % 1) || left.amount - right.amount || left.index - right.index)
    .forEach((entry) => {
      if (remaining <= 0) return;
      entry.amount += 1;
      remaining -= 1;
    });
  return Object.fromEntries(entries.sort((left, right) => left.index - right.index).map(({ id, amount }) => [id, amount]));
}

export function studyDistributionTargets(size: number) {
  const chapterWeights = Object.fromEntries(
    Object.entries(officialChapterKDistribution).map(([chapter, distribution]) => [
      chapter,
      Object.values(distribution).reduce((sum, amount) => sum + (amount ?? 0), 0),
    ]),
  );
  const kWeights = Object.fromEntries(kLevels.map((level) => [
    level,
    Object.values(officialChapterKDistribution).reduce((sum, distribution) => sum + (distribution[level] ?? 0), 0),
  ]));
  return {
    chapters: apportion(chapterWeights, size),
    kLevels: apportion(kWeights, size),
  };
}

function selectWithStudyDistribution(ranked: AdaptiveCandidate[], target: number): AdaptiveCandidate[] | null {
  const distribution = studyDistributionTargets(target);
  const chapters = Object.entries(distribution.chapters).filter(([, amount]) => amount > 0);
  const rankedIndex = new Map(ranked.map((candidate, index) => [candidate.question.id, index]));
  const buckets = new Map<string, AdaptiveCandidate[]>();
  for (const candidate of ranked) {
    const key = `${candidate.question.chapter}:${candidate.question.kLevel}`;
    const bucket = buckets.get(key) ?? [];
    bucket.push(candidate);
    buckets.set(key, bucket);
  }

  type AllocationState = { score: number; allocations: Record<string, Record<string, number>> };
  let states = new Map<string, AllocationState>([["0,0,0", { score: 0, allocations: {} }]]);

  for (const [chapter, chapterTarget] of chapters) {
    const options: Array<{ counts: number[]; score: number }> = [];
    for (let k1 = 0; k1 <= chapterTarget; k1 += 1) {
      for (let k2 = 0; k2 <= chapterTarget - k1; k2 += 1) {
        const counts = [k1, k2, chapterTarget - k1 - k2];
        if (counts.some((count, index) => count > (buckets.get(`${chapter}:${kLevels[index]}`)?.length ?? 0))) continue;
        const score = counts.reduce((sum, count, index) => sum
          + (buckets.get(`${chapter}:${kLevels[index]}`) ?? []).slice(0, count).reduce((bucketSum, candidate) => bucketSum + candidate.priority, 0), 0);
        options.push({ counts, score });
      }
    }

    const nextStates = new Map<string, AllocationState>();
    for (const [key, state] of states) {
      const used = key.split(",").map(Number);
      for (const option of options) {
        const nextUsed = used.map((count, index) => count + option.counts[index]);
        if (nextUsed.some((count, index) => count > distribution.kLevels[kLevels[index]])) continue;
        const nextKey = nextUsed.join(",");
        const nextScore = state.score + option.score;
        const previous = nextStates.get(nextKey);
        if (previous && previous.score >= nextScore) continue;
        nextStates.set(nextKey, {
          score: nextScore,
          allocations: {
            ...state.allocations,
            [chapter]: Object.fromEntries(kLevels.map((level, index) => [level, option.counts[index]])),
          },
        });
      }
    }
    states = nextStates;
  }

  const finalKey = kLevels.map((level) => distribution.kLevels[level]).join(",");
  const finalState = states.get(finalKey);
  if (!finalState) return null;

  return Object.entries(finalState.allocations)
    .flatMap(([chapter, allocation]) => kLevels.flatMap((level) =>
      (buckets.get(`${chapter}:${level}`) ?? []).slice(0, allocation[level] ?? 0)))
    .sort((left, right) => (rankedIndex.get(left.question.id) ?? 0) - (rankedIndex.get(right.question.id) ?? 0));
}

function selectWithChapterFallback(ranked: AdaptiveCandidate[], target: number, chapterFraction: number) {
  const chapterLimit = Math.max(1, Math.floor(target * chapterFraction));
  const selected: AdaptiveCandidate[] = [];
  const selectedIds = new Set<string>();
  const chapterCounts = new Map<string, number>();

  for (const enforceChapterLimit of [true, false]) {
    for (const candidate of ranked) {
      if (selected.length >= target) break;
      if (selectedIds.has(candidate.question.id)) continue;
      const chapterCount = chapterCounts.get(candidate.question.chapter) ?? 0;
      if (enforceChapterLimit && chapterCount >= chapterLimit) continue;
      selected.push(candidate);
      selectedIds.add(candidate.question.id);
      chapterCounts.set(candidate.question.chapter, chapterCount + 1);
    }
  }
  return selected;
}

function selectAdaptiveFallback(ranked: AdaptiveCandidate[], progress: ProgressState, target: number) {
  const chapterLimit = Math.max(1, Math.floor(target * 0.4));
  const selected: AdaptiveCandidate[] = [];
  const selectedIds = new Set<string>();
  const chapterCounts = new Map<string, number>();

  function append(candidates: AdaptiveCandidate[], enforceChapterLimit: boolean) {
    for (const candidate of candidates) {
      if (selected.length >= target) break;
      if (selectedIds.has(candidate.question.id)) continue;
      const chapterCount = chapterCounts.get(candidate.question.chapter) ?? 0;
      if (enforceChapterLimit && chapterCount >= chapterLimit) continue;
      selected.push(candidate);
      selectedIds.add(candidate.question.id);
      chapterCounts.set(candidate.question.chapter, chapterCount + 1);
    }
  }

  const unseen = ranked.filter((candidate) => !progress.questionProgress[candidate.question.id]?.attempts);
  const seen = ranked.filter((candidate) => Boolean(progress.questionProgress[candidate.question.id]?.attempts));
  append(unseen, true);
  append(unseen, false);
  append(seen, true);
  append(seen, false);
  return selected;
}

function hashSeed(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function adaptivePriority(
  question: Question,
  progress: ProgressState,
  now = Date.now(),
) {
  const item = progress.questionProgress[question.id];
  if (!item?.attempts) return 1_000;

  const accuracy = item.correct / item.attempts;
  const ageDays = Math.max(0, (now - new Date(item.updatedAt).getTime()) / 86_400_000);
  const recentError = item.lastCorrect ? 0 : 100 + Math.max(0, 30 - ageDays);
  const flagged = item.flagged ? 55 : 0;
  const lowAccuracy = (1 - accuracy) * 50;
  const age = Math.min(ageDays, 90) * 0.4;
  const averageSeconds = item.timedAttempts
    ? (item.totalActiveMs ?? 0) / item.timedAttempts / 1_000
    : 0;
  const slowAnswer = Math.min(averageSeconds, 180) * 0.08;
  return recentError + flagged + lowAccuracy + age + slowAnswer;
}

export function reinforcementPriority(
  question: Question,
  progress: ProgressState,
  now = Date.now(),
) {
  const item = progress.questionProgress[question.id];
  if (!item?.attempts) return 0;

  const accuracy = item.correct / item.attempts;
  const ageDays = Math.max(0, (now - new Date(item.updatedAt).getTime()) / 86_400_000);
  const averageSeconds = item.timedAttempts
    ? (item.totalActiveMs ?? 0) / item.timedAttempts / 1_000
    : 0;

  return (item.correct === 0 ? 1_000 : 0)
    + (item.lastCorrect ? 0 : 400)
    + (item.flagged ? 200 : 0)
    + (1 - accuracy) * 150
    + Math.min(averageSeconds, 300)
    + Math.min(ageDays, 90) * 0.4;
}

export function rankAdaptiveQuestions(
  questions: Question[],
  progress: ProgressState,
  seed: string,
  now = Date.now(),
): AdaptiveCandidate[] {
  return questions
    .map((question) => ({
      question,
      priority: adaptivePriority(question, progress, now),
      tieBreaker: hashSeed(`${seed}:${question.id}`),
    }))
    .sort((left, right) => right.priority - left.priority || left.tieBreaker - right.tieBreaker);
}

export function createAdaptiveQuestionIds(
  questions: Question[],
  progress: ProgressState,
  size: 10 | 20,
  seed: string,
  now = Date.now(),
) {
  const ranked = rankAdaptiveQuestions(questions, progress, seed, now);
  const target = Math.min(size, ranked.length);
  const selected = selectWithStudyDistribution(ranked, target) ?? selectAdaptiveFallback(ranked, progress, target);
  return selected.map((candidate) => candidate.question.id);
}

export function createReinforcementQuestionIds(
  questions: Question[],
  progress: ProgressState,
  size: 10 | 20,
  seed: string,
  now = Date.now(),
) {
  const ranked = questions
    .map((question) => ({
      question,
      priority: reinforcementPriority(question, progress, now),
      tieBreaker: hashSeed(`${seed}:${question.id}`),
    }))
    .sort((left, right) => right.priority - left.priority || left.tieBreaker - right.tieBreaker);
  const target = Math.min(size, ranked.length);
  const selected = selectWithStudyDistribution(ranked, target) ?? selectWithChapterFallback(ranked, target, 0.5);
  return selected.map((candidate) => candidate.question.id);
}

export function recommendAdaptiveChapter(questions: Question[], answers: AnswerMap) {
  const misses = new Map<string, number>();
  for (const question of questions) {
    if (!isCorrectAnswer(question, answers[question.id])) {
      misses.set(question.chapter, (misses.get(question.chapter) ?? 0) + 1);
    }
  }
  return Array.from(misses.entries()).sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))[0]?.[0] ?? null;
}
