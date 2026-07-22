import type { Copy, Language } from "./content";
import type { Question } from "../data/types";
import type { OptionMode } from "../domain/options";
import { isCorrectAnswer } from "../domain/scoring";
import {
  cleanExplanationText,
  getDisplayOptions,
  localizedQuestion,
  parseExplanation,
  questionSpeechText,
} from "./presentation";

function optionSpeech(
  question: Question,
  keys: string[],
  language: Language,
  optionMode: OptionMode,
  optionSeed?: string,
) {
  const explanations = new Map(
    parseExplanation(localizedQuestion(question, language).explanation, question.options.map((option) => option.key)).options
      .map((item) => [item.key, cleanExplanationText(item.text)]),
  );

  return getDisplayOptions(question, language, optionMode, optionSeed)
    .filter((option) => keys.includes(option.key))
    .map((option) => {
      const explanation = explanations.get(option.key);
      return `${option.displayKey}. ${option.text}.${explanation ? ` ${explanation}` : ""}`;
    })
    .join(" ");
}

export function buildQuestionSpeech(
  question: Question,
  language: Language,
  copy: Copy,
  optionMode: OptionMode,
  optionSeed?: string,
) {
  const options = getDisplayOptions(question, language, optionMode, optionSeed)
    .map((option) => `${option.displayKey}. ${option.text}.`)
    .join(" ");
  return `${copy.question}. ${questionSpeechText(question, language)} ${options}`.trim();
}

export function buildExplanationSpeech(
  question: Question,
  selected: string[],
  language: Language,
  copy: Copy,
  optionMode: OptionMode,
  optionSeed?: string,
) {
  const correctSpeech = optionSpeech(question, question.correctAnswers, language, optionMode, optionSeed);
  if (!selected.length) return `${copy.unanswered}. ${copy.correctAnswer}. ${correctSpeech}`;
  if (isCorrectAnswer(question, selected)) return `${copy.correctAnswer}. ${correctSpeech}`;

  const selectedSpeech = optionSpeech(question, selected, language, optionMode, optionSeed);
  return `${copy.incorrectAnswer}. ${copy.yourAnswer}. ${selectedSpeech} ${copy.correctAnswer}. ${correctSpeech}`;
}
