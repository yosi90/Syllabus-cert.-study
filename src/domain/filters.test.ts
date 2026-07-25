import { describe, expect, it } from "vitest";
import type { Question } from "../data/types";
import { createEmptyProgress } from "../storage/progress";
import { emptyFilters, filterQuestions } from "./filters";

function question(id: string): Question {
  return {
    id,
    sourceModel: "A",
    sourceNumber: 1,
    chapter: "FL-1",
    reference: "FL-1.1.1",
    kLevel: "K1",
    rawKLevel: "K1",
    prompt: id,
    options: [{ key: "a", text: "A" }],
    correctAnswers: ["a"],
    selectionMode: "single",
    selector: "Select ONE option.",
    explanation: "",
    notes: [],
    points: 1,
  };
}

describe("question status filters", () => {
  it("combines checked statuses with OR semantics", () => {
    const questions = [question("unseen"), question("correct"), question("flagged-incorrect"), question("incorrect")];
    const progress = createEmptyProgress();
    progress.questionProgress = {
      correct: { attempts: 1, correct: 1, lastCorrect: true, flagged: false, lastAnswers: ["a"], updatedAt: "2026-07-25" },
      "flagged-incorrect": { attempts: 1, correct: 0, lastCorrect: false, flagged: true, lastAnswers: ["b"], updatedAt: "2026-07-25" },
      incorrect: { attempts: 1, correct: 0, lastCorrect: false, flagged: false, lastAnswers: ["b"], updatedAt: "2026-07-25" },
    };

    const filtered = filterQuestions(questions, { ...emptyFilters, status: ["correct", "flagged"] }, progress);
    expect(filtered.map((item) => item.id)).toEqual(["correct", "flagged-incorrect"]);
  });

  it("treats no checked status as all statuses", () => {
    const questions = [question("unseen"), question("answered")];
    expect(filterQuestions(questions, emptyFilters, createEmptyProgress())).toEqual(questions);
  });
});
