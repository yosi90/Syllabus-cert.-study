import { describe, expect, it } from "vitest";
import type { Question } from "../data/types";
import { isCorrectAnswer, scoreQuestions, toggleAnswer } from "./scoring";

const baseQuestion: Question = {
  id: "A-01",
  sourceModel: "A",
  sourceNumber: 1,
  chapter: "FL-1",
  reference: "FL-1.1.1",
  kLevel: "K1",
  rawKLevel: "K1",
  prompt: "Pregunta",
  options: [
    { key: "a", text: "A" },
    { key: "b", text: "B" },
    { key: "c", text: "C" },
    { key: "d", text: "D" },
  ],
  correctAnswers: ["b"],
  selectionMode: "single",
  selector: "Seleccionar UNA opcion.",
  explanation: "Explicacion",
  notes: [],
  points: 1,
};

const rules = {
  questionsPerExam: 40,
  passingScore: 26,
  passingPercent: 65,
  pointsPerCorrectAnswer: 1,
  penalty: 0,
  durationMinutes: 60,
  extendedDurationMinutes: 75,
};

describe("scoring", () => {
  it("scores single-answer questions", () => {
    expect(isCorrectAnswer(baseQuestion, ["b"])).toBe(true);
    expect(isCorrectAnswer(baseQuestion, ["a"])).toBe(false);
  });

  it("scores multiple-answer questions by exact set", () => {
    const multi = { ...baseQuestion, id: "A-17", correctAnswers: ["a", "c"], selectionMode: "multiple" as const };
    expect(isCorrectAnswer(multi, ["c", "a"])).toBe(true);
    expect(isCorrectAnswer(multi, ["a"])).toBe(false);
    expect(isCorrectAnswer(multi, ["a", "b", "c"])).toBe(false);
  });

  it("calculates pass and blank counts", () => {
    const questions = Array.from({ length: 40 }, (_, index) => ({ ...baseQuestion, id: `Q-${index}` }));
    const answers = Object.fromEntries(questions.slice(0, 26).map((question) => [question.id, ["b"]]));
    const score = scoreQuestions(questions, answers, rules);
    expect(score.correct).toBe(26);
    expect(score.blank).toBe(14);
    expect(score.passed).toBe(true);
  });

  it("toggles single and multiple selections", () => {
    expect(toggleAnswer(baseQuestion, [], "a")).toEqual(["a"]);
    expect(toggleAnswer(baseQuestion, ["a"], "a")).toEqual([]);
    const multi = { ...baseQuestion, selectionMode: "multiple" as const };
    expect(toggleAnswer(multi, ["c"], "a")).toEqual(["a", "c"]);
  });
});
