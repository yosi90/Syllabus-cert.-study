import { describe, expect, it } from "vitest";
import { questions } from "../data/bank";
import { cleanExplanationText, displayAnswerLabels, getDisplayOptions, questionSpeechText } from "./presentation";

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

describe("localized explanation and formula presentation", () => {
  it.each([
    ["Is correct. Because it matches.", "Because it matches."],
    ["Is not correct. Because it differs.", "Because it differs."],
    ["Es correcta. Porque coincide.", "Porque coincide."],
    ["No es correcto. Porque difiere.", "Porque difiere."],
    ["No es correctas: Porque difieren.", "Porque difieren."],
  ])("removes the status prefix from %s", (source, expected) => {
    expect(cleanExplanationText(source)).toBe(expected);
  });

  it("uses the accessible localized wording for the C-31 fraction", () => {
    const question = questions.find((item) => item.id === "C-31")!;
    expect(questionSpeechText(question, "en")).toContain("all divided by four");
    expect(questionSpeechText(question, "es")).toContain("todo dividido entre cuatro");
  });
});
