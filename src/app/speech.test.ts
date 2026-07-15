import { describe, expect, it } from "vitest";
import { uiCopy } from "./content";
import { questions } from "../data/bank";
import { buildExplanationSpeech, buildQuestionSpeech } from "./speech";

describe("speech scripts", () => {
  const single = questions.find((question) => question.id === "A-01")!;

  it("reads the question and every option in display order", () => {
    const script = buildQuestionSpeech(single, "en", uiCopy.en, "original");
    expect(script).toContain(single.prompt);
    for (const [index, option] of single.options.entries()) {
      expect(script).toContain(`${String.fromCharCode(65 + index)}. ${option.text}`);
    }
  });

  it("reads a wrong selection before the correct answer", () => {
    const wrong = single.options.find((option) => !single.correctAnswers.includes(option.key))!;
    const script = buildExplanationSpeech(single, [wrong.key], "en", uiCopy.en, "original");
    expect(script.indexOf(uiCopy.en.yourAnswer)).toBeLessThan(script.indexOf(uiCopy.en.correctAnswer));
    expect(script).toContain(wrong.text);
    expect(script).toContain(single.options.find((option) => single.correctAnswers.includes(option.key))!.text);
  });

  it("announces blank answers and reads the solution", () => {
    const script = buildExplanationSpeech(single, [], "es", uiCopy.es, "original");
    expect(script).toMatch(/^Sin responder\. Correcta\./);
  });

  it("reads all selected and correct options for an incorrect multiple answer", () => {
    const multiple = questions.find((question) => question.selectionMode === "multiple")!;
    const script = buildExplanationSpeech(multiple, [multiple.correctAnswers[0]], "en", uiCopy.en, "original");
    expect(script).toContain(uiCopy.en.incorrectAnswer);
    expect(script).toContain(uiCopy.en.yourAnswer);
    for (const correct of multiple.correctAnswers) {
      expect(script).toContain(multiple.options.find((option) => option.key === correct)!.text);
    }
  });
});
