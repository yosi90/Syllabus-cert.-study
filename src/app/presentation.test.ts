import { describe, expect, it } from "vitest";
import { questions } from "../data/bank";
import { displayAnswerLabels, getDisplayOptions } from "./presentation";

describe("option presentation fidelity", () => {
  it("keeps original letters for official single-answer questions from every model", () => {
    for (const model of ["A", "B", "C", "D"]) {
      const question = questions.find((item) => item.sourceModel === model && item.sourceNumber === 1)!;
      const displayed = getDisplayOptions(question, "en", "original", `model-${model}`);

      expect(displayed.map((option) => option.key)).toEqual(question.options.map((option) => option.key));
      expect(displayed.map((option) => option.displayKey)).toEqual(question.options.map((option) => option.key.toUpperCase()));
    }
  });

  it("uses the same stable mapping for a multiple-answer question and its correction", () => {
    const question = questions.find((item) => item.selectionMode === "multiple")!;
    const first = getDisplayOptions(question, "es", "shuffled", "adaptive-seed");
    const second = getDisplayOptions(question, "es", "shuffled", "adaptive-seed");
    const displayKeyByAnswer = new Map(first.map((option) => [option.key, option.displayKey]));

    expect(first).toEqual(second);
    expect(displayAnswerLabels(question, question.correctAnswers, "es", "shuffled", "adaptive-seed"))
      .toBe(question.correctAnswers.map((key) => displayKeyByAnswer.get(key)).join(", "));
  });
});
