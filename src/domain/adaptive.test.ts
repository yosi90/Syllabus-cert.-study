import { describe, expect, it } from "vitest";
import type { Question } from "../data/types";
import { createEmptyProgress } from "../storage/progress";
import { adaptivePriority, createAdaptiveQuestionIds, createReinforcementQuestionIds, recommendAdaptiveChapter, reinforcementPriority } from "./adaptive";

function question(id: string, chapter = "FL-1"): Question {
  return {
    id,
    sourceModel: "A",
    sourceNumber: Number(id.replace(/\D/g, "")) || 1,
    chapter,
    reference: `${chapter}.1.1`,
    kLevel: "K1",
    rawKLevel: "K1",
    prompt: id,
    options: [{ key: "a", text: "A" }, { key: "b", text: "B" }],
    correctAnswers: ["a"],
    selectionMode: "single",
    selector: "one",
    explanation: "",
    notes: [],
    points: 1,
  };
}

describe("adaptive queue", () => {
  it("prioritizes recent errors, flags, low accuracy, age and unseen questions", () => {
    const progress = createEmptyProgress();
    const now = Date.parse("2026-07-15T00:00:00.000Z");
    progress.questionProgress = {
      error: { attempts: 2, correct: 0, lastCorrect: false, flagged: false, lastAnswers: ["b"], updatedAt: "2026-07-14T00:00:00.000Z" },
      flagged: { attempts: 2, correct: 2, lastCorrect: true, flagged: true, lastAnswers: ["a"], updatedAt: "2026-07-15T00:00:00.000Z" },
      low: { attempts: 4, correct: 1, lastCorrect: true, flagged: false, lastAnswers: ["a"], updatedAt: "2026-07-15T00:00:00.000Z" },
      old: { attempts: 2, correct: 2, lastCorrect: true, flagged: false, lastAnswers: ["a"], updatedAt: "2026-04-01T00:00:00.000Z" },
      accurate: { attempts: 4, correct: 4, lastCorrect: true, flagged: false, lastAnswers: ["a"], updatedAt: "2026-07-15T00:00:00.000Z" },
    };

    expect(adaptivePriority(question("unseen"), progress, now)).toBeGreaterThan(adaptivePriority(question("error"), progress, now));
    expect(adaptivePriority(question("error"), progress, now)).toBeGreaterThan(adaptivePriority(question("flagged"), progress, now));
    expect(adaptivePriority(question("flagged"), progress, now)).toBeGreaterThan(adaptivePriority(question("low"), progress, now));
    expect(adaptivePriority(question("low"), progress, now)).toBeGreaterThan(adaptivePriority(question("old"), progress, now));
    expect(adaptivePriority(question("old"), progress, now)).toBeGreaterThan(adaptivePriority(question("accurate"), progress, now));
  });

  it("exhausts unseen questions before reusing previous errors", () => {
    const unseen = Array.from({ length: 12 }, (_, index) => question(`unseen${index}`, "FL-1"));
    const errors = Array.from({ length: 12 }, (_, index) => question(`error${index}`, index % 2 ? "FL-2" : "FL-3"));
    const progress = createEmptyProgress();
    progress.questionProgress = Object.fromEntries(errors.map((item) => [item.id, {
      attempts: 1,
      correct: 0,
      lastCorrect: false,
      flagged: false,
      lastAnswers: ["b"],
      updatedAt: "2026-07-15T00:00:00.000Z",
    }]));

    const ids = createAdaptiveQuestionIds([...unseen, ...errors], progress, 10, "unseen-first", Date.parse("2026-07-15T00:00:00.000Z"));
    expect(ids).toHaveLength(10);
    expect(ids.every((id) => id.startsWith("unseen"))).toBe(true);
  });

  it("is reproducible, unique and limits a chapter to forty percent when possible", () => {
    const questions = [
      ...Array.from({ length: 8 }, (_, index) => question(`a${index}`, "FL-1")),
      ...Array.from({ length: 6 }, (_, index) => question(`b${index}`, "FL-2")),
      ...Array.from({ length: 6 }, (_, index) => question(`c${index}`, "FL-3")),
    ];
    const progress = createEmptyProgress();
    const first = createAdaptiveQuestionIds(questions, progress, 10, "same-seed", 0);
    const second = createAdaptiveQuestionIds(questions, progress, 10, "same-seed", 0);

    expect(first).toEqual(second);
    expect(new Set(first).size).toBe(10);
    const selected = questions.filter((item) => first.includes(item.id));
    expect(Math.max(...["FL-1", "FL-2", "FL-3"].map((chapter) => selected.filter((item) => item.chapter === chapter).length))).toBeLessThanOrEqual(4);
  });

  it("fills the requested size when chapter diversity or candidates are scarce", () => {
    const questions = Array.from({ length: 7 }, (_, index) => question(`only${index}`, "FL-1"));
    const ids = createAdaptiveQuestionIds(questions, createEmptyProgress(), 10, "few", 0);
    expect(ids).toHaveLength(7);
    expect(new Set(ids).size).toBe(7);
  });

  it("reinforcement prioritizes misses over unseen questions and uses time after mastery", () => {
    const progress = createEmptyProgress();
    progress.questionProgress = {
      missed: { attempts: 2, correct: 0, lastCorrect: false, flagged: false, lastAnswers: ["b"], updatedAt: "2026-07-15", totalActiveMs: 20_000, lastActiveMs: 10_000, timedAttempts: 2 },
      slow: { attempts: 1, correct: 1, lastCorrect: true, flagged: false, lastAnswers: ["a"], updatedAt: "2026-07-15", totalActiveMs: 120_000, lastActiveMs: 120_000, timedAttempts: 1 },
      fast: { attempts: 1, correct: 1, lastCorrect: true, flagged: false, lastAnswers: ["a"], updatedAt: "2026-07-15", totalActiveMs: 8_000, lastActiveMs: 8_000, timedAttempts: 1 },
    };
    const now = Date.parse("2026-07-15T12:00:00.000Z");

    expect(reinforcementPriority(question("missed"), progress, now)).toBeGreaterThan(reinforcementPriority(question("unseen"), progress, now));
    expect(reinforcementPriority(question("slow"), progress, now)).toBeGreaterThan(reinforcementPriority(question("fast"), progress, now));

    const ids = createReinforcementQuestionIds(
      [question("unseen"), question("fast"), question("slow"), question("missed")],
      progress,
      10,
      "reinforcement",
      now,
    );
    expect(ids.slice(0, 3)).toEqual(["missed", "slow", "fast"]);
  });

  it("recommends the chapter with the most missed answers", () => {
    const questions = [question("one", "FL-1"), question("two", "FL-1"), question("three", "FL-2")];
    expect(recommendAdaptiveChapter(questions, { three: ["a"] })).toBe("FL-1");
  });
});
