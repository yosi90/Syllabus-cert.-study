import { describe, expect, it } from "vitest";
import { questions } from "../data/bank";
import {
  cleanExplanationText,
  displayAnswerLabels,
  getDisplayOptions,
  localizedQuestion,
  parseExplanation,
  questionSpeechText,
} from "./presentation";

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
    ["No son correcto. Porque difieren.", "Porque difieren."],
    ["Son correcta. Porque coincide.", "Porque coincide."],
  ])("removes the status prefix from %s", (source, expected) => {
    expect(cleanExplanationText(source)).toBe(expected);
  });

  it("removes every answer-status prefix used by the question bank", () => {
    for (const question of questions) {
      for (const language of ["en", "es"] as const) {
        const parsed = parseExplanation(localizedQuestion(question, language).explanation);
        for (const option of parsed.options) {
          expect(cleanExplanationText(option.text), `${question.id} (${language}) option ${option.key}`)
            .not.toMatch(/^(?:is\s+)?(?:not\s+)?correct|^(?:no\s+)?(?:es|son)\s+correct/i);
        }
      }
    }
  });

  it("uses the accessible localized wording for the C-31 fraction", () => {
    const question = questions.find((item) => item.id === "C-31")!;
    expect(questionSpeechText(question, "en")).toContain("all divided by four");
    expect(questionSpeechText(question, "es")).toContain("todo dividido entre cuatro");
  });
});

describe("visual question presentation", () => {
  it("does not repeat flattened table cells inside table-based prompts", () => {
    const tableQuestionIds = ["A-14", "A-21", "A-22", "A-33", "B-22", "B-31", "B-32", "C-22", "D-22", "D-23", "D-32"];
    const flattenedTablePattern = /Rule 1 Rule 2|Regla 1 Regla 2|R1 R2 R3|Req1 Req2|TC1 91|TC 001 Select|TC 001 Seleccionar|Project Development effort|Esfuerzo de desarrollo del proyecto/;

    for (const id of tableQuestionIds) {
      const question = questions.find((item) => item.id === id)!;
      expect(question.visual, id).toBeDefined();
      expect(question.prompt, `${id} (en)`).not.toMatch(flattenedTablePattern);
      expect(question.translations?.es?.prompt, `${id} (es)`).not.toMatch(flattenedTablePattern);
    }
  });
});
