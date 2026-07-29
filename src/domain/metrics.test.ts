import { describe, expect, it } from "vitest";
import type { Chapter, Question } from "../data/types";
import { createEmptyProgress, recordQuestionAttempt, type AttemptEvent } from "../storage/progress";
import { summarizeLearningMetrics } from "./metrics";

const chapters: Chapter[] = [
  { id: "FL-1", name: "One", minutes: 1, keywords: [] },
  { id: "FL-2", name: "Two", minutes: 1, keywords: [] },
];

function question(id: string, chapter: string, types: Question["questionTypes"]): Question {
  return {
    id,
    sourceModel: "A",
    sourceNumber: Number(id.slice(-1)),
    chapter,
    reference: `${chapter}.1.1`,
    kLevel: id === "Q-1" ? "K1" : "K2",
    rawKLevel: id === "Q-1" ? "K1" : "K2",
    prompt: id,
    options: [{ key: "a", text: "A" }, { key: "b", text: "B" }],
    correctAnswers: ["a"],
    selectionMode: "single",
    questionTypes: types,
    selector: "one",
    explanation: "",
    notes: [],
    points: 1,
  };
}

const questions = [
  question("Q-1", "FL-1", ["simple"]),
  question("Q-2", "FL-1", ["visual", "scenario"]),
  question("Q-3", "FL-2", ["list", "matching"]),
];

function event(
  index: number,
  questionId: string,
  isCorrect: boolean,
  answeredAt: string,
  attemptNumber: number,
  activeMs = 10_000,
): AttemptEvent {
  return {
    id: String(index),
    questionId,
    answeredAt,
    attemptNumber,
    selectedAnswers: [isCorrect ? "a" : "b"],
    isCorrect,
    activeMs,
    context: "adaptive-study",
    sessionId: "study",
    bankVersion: "test",
  };
}

describe("learning metrics", () => {
  it("keeps transparent signals hidden until their sample threshold is met", () => {
    const progress = createEmptyProgress("2026-01-01T00:00:00.000Z");
    progress.attemptHistory = Array.from({ length: 39 }, (_, index) =>
      event(index, questions[index % questions.length].id, index % 2 === 0, `2026-01-${String(index + 1).padStart(2, "0")}T00:00:00.000Z`, index + 1));

    const summary = summarizeLearningMetrics(questions, chapters, progress, "all", Date.parse("2026-02-15"));

    expect(summary.trend).toMatchObject({ value: null, delta: null, sample: 39 });
  });

  it("calculates recent evolution, recovery and seven-day retention from individual events", () => {
    const progress = createEmptyProgress("2026-01-01T00:00:00.000Z");
    progress.attemptHistory = Array.from({ length: 40 }, (_, index) =>
      event(index, `Q-${(index % 3) + 1}`, index >= 20 || index % 2 === 0, `2026-01-${String((index % 20) + 1).padStart(2, "0")}T00:00:00.000Z`, index + 1));
    progress.attemptHistory.push(
      ...Array.from({ length: 5 }, (_, index) => event(100 + index * 2, "Q-1", false, `2026-03-${String(index + 1).padStart(2, "0")}T00:00:00.000Z`, 50 + index * 2)),
      ...Array.from({ length: 5 }, (_, index) => event(101 + index * 2, "Q-1", true, `2026-03-${String(index + 2).padStart(2, "0")}T00:00:00.000Z`, 51 + index * 2)),
      ...Array.from({ length: 6 }, (_, index) => event(
        200 + index,
        "Q-2",
        true,
        new Date(Date.UTC(2026, 3, 1 + index * 8)).toISOString(),
        70 + index,
      )),
    );

    const summary = summarizeLearningMetrics(questions, chapters, progress, "all", Date.parse("2026-06-01"));

    expect(summary.trend.value).not.toBeNull();
    expect(summary.recoveryAccuracy.value).not.toBeNull();
    expect(summary.recoveryAccuracy.sample).toBeGreaterThanOrEqual(5);
    expect(summary.retentionAccuracy.value).not.toBeNull();
    expect(summary.retentionAccuracy.sample).toBeGreaterThanOrEqual(5);
  });

  it("groups overlapping question types and excludes timing outliers", () => {
    let progress = createEmptyProgress("2026-01-01T00:00:00.000Z");
    progress = recordQuestionAttempt(progress, "Q-2", ["a"], true, "2026-07-01T00:00:00.000Z", 12_000);
    progress = recordQuestionAttempt(progress, "Q-3", ["b"], false, "2026-07-02T00:00:00.000Z", 20 * 60_000);

    const summary = summarizeLearningMetrics(questions, chapters, progress, "all", Date.parse("2026-07-03"));

    expect(summary.byQuestionType.find((item) => item.id === "visual")).toMatchObject({ attempts: 1, accuracy: 100 });
    expect(summary.byQuestionType.find((item) => item.id === "scenario")).toMatchObject({ attempts: 1, accuracy: 100 });
    expect(summary.byQuestionType.find((item) => item.id === "matching")).toMatchObject({ attempts: 1, accuracy: 0 });
    expect(summary.medianActiveMs).toMatchObject({ value: 12_000, sample: 1 });
  });
});
