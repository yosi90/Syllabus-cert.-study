import { describe, expect, it } from "vitest";
import type { Chapter, Question } from "../data/types";
import { createEmptyProgress, UNKNOWN_ACTIVE_TIME_MS } from "../storage/progress";
import { summarizeStudyDashboard } from "./dashboard";

const chapters: Chapter[] = [
  { id: "FL-1", name: "One", minutes: 1, keywords: [] },
  { id: "FL-2", name: "Two", minutes: 1, keywords: [] },
];

function question(id: string, chapter: string, kLevel: Question["kLevel"]): Question {
  return {
    id,
    sourceModel: "A",
    sourceNumber: Number(id.slice(-1)),
    chapter,
    reference: `${chapter}.1.1`,
    kLevel,
    rawKLevel: kLevel,
    prompt: id,
    options: [{ key: "a", text: "A" }],
    correctAnswers: ["a"],
    selectionMode: "single",
    questionTypes: ["simple"],
    selector: "one",
    explanation: "",
    notes: [],
    points: 1,
  };
}

const questions = [question("Q-1", "FL-1", "K1"), question("Q-2", "FL-1", "K2"), question("Q-3", "FL-2", "K2")];

describe("study dashboard", () => {
  it("returns neutral metrics when no progress exists", () => {
    const summary = summarizeStudyDashboard(questions, chapters, createEmptyProgress());
    expect(summary).toMatchObject({ attempted: 0, correctAnswered: 0, incorrectAnswered: 0, coverage: 0, accuracy: null, unseen: 3, pendingErrors: 0 });
    expect(summary.timing).toMatchObject({ timedAttempts: 0, totalActiveMs: 0, averageActiveMs: null });
    expect(summary.weakChapterIds).toEqual([]);
  });

  it("calculates coverage and accuracy from all attempts", () => {
    const progress = createEmptyProgress();
    progress.questionProgress = {
      "Q-1": { attempts: 2, correct: 1, lastCorrect: false, flagged: true, lastAnswers: ["b"], updatedAt: "2026-07-15" },
      "Q-3": { attempts: 1, correct: 1, lastCorrect: true, flagged: false, lastAnswers: ["a"], updatedAt: "2026-07-15" },
    };
    const summary = summarizeStudyDashboard(questions, chapters, progress);

    expect(summary).toMatchObject({ attempted: 2, correctAnswered: 1, incorrectAnswered: 1, coverage: 67, attempts: 3, correctAttempts: 2, accuracy: 67, unseen: 1, pendingErrors: 1, flagged: 1 });
    expect(summary.byChapter.find((item) => item.id === "FL-1")).toMatchObject({ correctAnswered: 0, incorrectAnswered: 1, coverage: 50, accuracy: 50 });
    expect(summary.weakChapterIds[0]).toBe("FL-1");
  });

  it("summarizes measured response times and excludes legacy unknown timing", () => {
    const progress = createEmptyProgress();
    progress.questionProgress = {
      "Q-1": {
        attempts: 2,
        correct: 1,
        lastCorrect: false,
        flagged: false,
        lastAnswers: ["b"],
        updatedAt: "2026-07-15",
        totalActiveMs: 30_000,
        lastActiveMs: 20_000,
        timedAttempts: 2,
      },
      "Q-2": {
        attempts: 1,
        correct: 1,
        lastCorrect: true,
        flagged: false,
        lastAnswers: ["a"],
        updatedAt: "2026-07-15",
        totalActiveMs: 12_000,
        lastActiveMs: 12_000,
        timedAttempts: 1,
      },
      "Q-3": {
        attempts: 1,
        correct: 0,
        lastCorrect: false,
        flagged: false,
        lastAnswers: ["b"],
        updatedAt: "2026-07-15",
        totalActiveMs: UNKNOWN_ACTIVE_TIME_MS,
        lastActiveMs: UNKNOWN_ACTIVE_TIME_MS,
        timedAttempts: 1,
      },
    };

    const summary = summarizeStudyDashboard(questions, chapters, progress);

    expect(summary.timing).toMatchObject({
      timedAttempts: 3,
      totalActiveMs: 42_000,
      averageActiveMs: 14_000,
    });
    expect(summary.timing.byKLevel.find((item) => item.id === "K1")).toMatchObject({
      timedAttempts: 2,
      averageActiveMs: 15_000,
    });
    expect(summary.timing.latestByOutcome.correct).toMatchObject({
      timedAttempts: 1,
      averageActiveMs: 12_000,
    });
    expect(summary.timing.latestByOutcome.incorrect).toMatchObject({
      timedAttempts: 1,
      averageActiveMs: 20_000,
    });
  });
});
