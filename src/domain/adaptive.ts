import type { AnswerMap } from "./scoring";
import { isCorrectAnswer } from "./scoring";
import type { Question } from "../data/types";
import type { ProgressState } from "../storage/progress";

export type AdaptiveCandidate = {
  question: Question;
  priority: number;
  tieBreaker: number;
};

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
  if (!item?.attempts) return 75;

  const accuracy = item.correct / item.attempts;
  const ageDays = Math.max(0, (now - new Date(item.updatedAt).getTime()) / 86_400_000);
  const recentError = item.lastCorrect ? 0 : 100 + Math.max(0, 30 - ageDays);
  const flagged = item.flagged ? 55 : 0;
  const lowAccuracy = (1 - accuracy) * 50;
  const age = Math.min(ageDays, 90) * 0.4;
  return recentError + flagged + lowAccuracy + age;
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
  const chapterLimit = Math.max(1, Math.floor(size * 0.4));
  const selected: AdaptiveCandidate[] = [];
  const selectedIds = new Set<string>();
  const chapterCounts = new Map<string, number>();

  for (const candidate of ranked) {
    if (selected.length >= target) break;
    const chapterCount = chapterCounts.get(candidate.question.chapter) ?? 0;
    if (chapterCount >= chapterLimit) continue;
    selected.push(candidate);
    selectedIds.add(candidate.question.id);
    chapterCounts.set(candidate.question.chapter, chapterCount + 1);
  }

  if (selected.length < target) {
    for (const candidate of ranked) {
      if (selected.length >= target) break;
      if (selectedIds.has(candidate.question.id)) continue;
      selected.push(candidate);
      selectedIds.add(candidate.question.id);
    }
  }

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
