import { chapters, examRules, questionBank, questions } from "../data/bank";
import type { Objective, Question } from "../data/types";
import { findQuestionsByIds } from "../domain/exams";
import type { QuestionFilters } from "../domain/filters";
import { scoreQuestions } from "../domain/scoring";
import { orderOptions, type OptionMode } from "../domain/options";
import type { ProgressState, StoredSession } from "../storage/progress";
import type { Copy, Language, ReviewState } from "./content";

export function classNames(...values: Array<string | false | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function questionLabel(question: Question) {
  return `${question.sourceModel}-${String(question.sourceNumber).padStart(2, "0")}`;
}

export function progressLabel(progress: ProgressState, question: Question, copy: Copy) {
  const item = progress.questionProgress[question.id];
  if (!item?.attempts) return copy.unseen;
  return item.lastCorrect ? copy.lastCorrect : copy.lastIncorrect;
}

export function parseExplanation(explanation: string) {
  const matches = Array.from(explanation.matchAll(/(?:^|\s)([a-e])\)\s+/g));
  if (!matches.length) {
    return {
      intro: explanation.trim(),
      options: [] as Array<{ key: string; text: string }>,
    };
  }

  const first = matches[0];
  const intro = explanation.slice(0, first.index).trim();
  const options = matches.map((match, index) => {
    const start = (match.index ?? 0) + match[0].length;
    const end = index + 1 < matches.length ? matches[index + 1].index ?? explanation.length : explanation.length;
    return {
      key: match[1],
      text: explanation.slice(start, end).trim(),
    };
  });

  return { intro, options };
}

export function getObjective(reference: string): Objective | undefined {
  return questionBank.objectives.find((objective) => objective.code === reference);
}

export function localizedChapterName(chapterId: string, language: Language) {
  const chapter = chapters.find((item) => item.id === chapterId);
  if (!chapter) return chapterId;
  return language === "es" ? chapter.translations?.es?.name ?? chapter.name : chapter.name;
}

export function localizedObjective(objective: Objective, language: Language) {
  const translation = language === "es" ? objective.translations?.es : undefined;
  return {
    text: translation?.text ?? objective.text,
    sectionTitle: translation?.sectionTitle ?? objective.sectionTitle,
    syllabusPage: translation?.syllabusPage ?? objective.syllabusPage,
  };
}

export function localizedQuestion(question: Question, language: Language) {
  const translation = language === "es" ? question.translations?.es : undefined;
  return {
    prompt: translation?.prompt ?? question.prompt,
    promptParts: question.promptParts?.[language],
    options: translation?.options?.length ? translation.options : question.options,
    selector: translation?.selector ?? question.selector,
    explanation: translation?.explanation ?? question.explanation,
  };
}

export function formatPromptText(prompt: string) {
  let formatted = prompt.replace(/\s+•\s+/g, "\n• ");

  const listMarkerSets = [
    ["1", "2"],
    ["i", "ii"],
    ["A", "B"],
  ];

  for (const [first, second] of listMarkerSets) {
    const firstPattern = new RegExp(`(?:^|\\s)${first}\\.\\s`);
    const secondPattern = new RegExp(`(?:^|\\s)${second}\\.\\s`);
    if (firstPattern.test(formatted) && secondPattern.test(formatted)) {
      const markerPattern = first === "1"
        ? /\s+(?=[1-9]\.\s)/g
        : first === "i"
          ? /\s+(?=(?:i|ii|iii|iv|v)\.\s)/g
          : /\s+(?=[A-Z]\.\s)/g;
      formatted = first === "A"
        ? formatted.split("\n").map((line) => line.startsWith("• ") ? line : line.replace(markerPattern, "\n")).join("\n")
        : formatted.replace(markerPattern, "\n");
    }
  }

  return formatted
    .replace(/\s+(?=And the following\b|Y las siguientes\b)/g, "\n\n")
    .replace(/\s+(?=Variable:)/g, "\n\n")
    .replace(/\s+(?=(?:Which|What|How|Tools from|Given that|Based on|In all test cases)(?:\s|$))/g, "\n\n")
    .replace(/\s+(?=(?:¿Cuál|¿Cuáles|¿Qué|¿Cómo|¿De|¿Herramientas de|Dado que|Basándose en|Basándote|En todos los casos)(?:\s|$))/g, "\n\n")
    .replace(/\.\s+(?=(?:Your|You|Each|The decision table)\b)/g, ".\n\n")
    .replace(/\.\s+(?=(?:Su|Usted|Cada|La tabla de decisiones?)\b)/g, ".\n\n");
}

export type PromptBlock =
  | { type: "text"; text: string }
  | { type: "list"; items: Array<{ marker: string; text: string }> };

function listMarkerFamily(marker: string) {
  if (marker === "•") return "bullet";
  if (/^[1-9]\.$/.test(marker)) return "number";
  if (/^[A-Z]\.$/.test(marker)) return "letter";
  return "roman";
}

export function promptBlocks(prompt: string): PromptBlock[] {
  const lines = formatPromptText(prompt).split(/\n+/).map((line) => line.trim()).filter(Boolean);
  const blocks: PromptBlock[] = [];
  const listItemPattern = /^(•|[1-9]\.|[A-Z]\.|(?:i|ii|iii|iv|v)\.)\s+(.+)$/;

  for (const line of lines) {
    const match = line.match(listItemPattern);
    if (!match) {
      blocks.push({ type: "text", text: line });
      continue;
    }

    const previous = blocks.at(-1);
    const item = { marker: match[1], text: match[2] };
    const previousMarker = previous?.type === "list" ? previous.items.at(-1)?.marker : undefined;
    if (previous?.type === "list" && previousMarker && listMarkerFamily(previousMarker) === listMarkerFamily(item.marker)) previous.items.push(item);
    else blocks.push({ type: "list", items: [item] });
  }

  return blocks;
}

export function parallelPromptListLayout(blocks: PromptBlock[]) {
  const listIndices = blocks.flatMap((block, index) => block.type === "list" ? [index] : []);
  if (listIndices.length !== 2) return null;

  const [firstListIndex, secondListIndex] = listIndices;
  const beforeFirstList = blocks.slice(0, firstListIndex);
  let prefix = beforeFirstList.slice(0, -1);
  let firstHeading = beforeFirstList.slice(-1);

  if (beforeFirstList.length === 1 && beforeFirstList[0].type === "text") {
    const text = beforeFirstList[0].text;
    const finalSentenceStart = text.lastIndexOf(". ");
    if (finalSentenceStart > 0 && text.endsWith(":")) {
      prefix = [{ type: "text", text: text.slice(0, finalSentenceStart + 1) }];
      firstHeading = [{ type: "text", text: text.slice(finalSentenceStart + 2) }];
    }
  }

  return {
    prefix,
    firstColumn: [...firstHeading, blocks[firstListIndex]],
    secondColumn: blocks.slice(firstListIndex + 1, secondListIndex + 1),
    suffix: blocks.slice(secondListIndex + 1),
  };
}

export function hasActiveFilters(filters: QuestionFilters) {
  return (
    filters.query.trim().length > 0 ||
    filters.models.length > 0 ||
    filters.chapters.length > 0 ||
    filters.kLevels.length > 0 ||
    filters.references.length > 0 ||
    filters.status !== "all"
  );
}

const displayLetters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export function getDisplayOptions(
  question: Question,
  language: Language,
  optionMode: OptionMode = "shuffled",
  optionSeed?: string,
) {
  const stableSeed = optionSeed ? `${optionSeed}:${question.id}` : question.id;
  return orderOptions(localizedQuestion(question, language).options, optionMode, stableSeed).map((option, index) => ({
    ...option,
    displayKey: optionMode === "original" ? option.key.toUpperCase() : displayLetters[index] ?? String(index + 1),
    text: cleanOptionText(option.text),
  }));
}

export function cleanOptionText(text: string) {
  return text.replace(/\s+Sample Exams set [A-D]\s*$/i, "").trim();
}

export function cleanExplanationText(text: string) {
  return text
    .replace(/^(?:is\s+)?not\s+correct[.:;,-]?\s*/i, "")
    .replace(/^(?:is\s+)?correct[.:;,-]?\s*/i, "")
    .replace(/^no\s+(?:es|son)\s+correct[oa]s?[.:;,-]?\s*/i, "")
    .replace(/^(?:es|son)\s+correct[oa]s?[.:;,-]?\s*/i, "")
    .trim();
}

export function questionSpeechText(question: Question, language: Language) {
  const localized = localizedQuestion(question, language);
  if (!localized.promptParts?.length) return localized.prompt;
  return localized.promptParts
    .map((part) => part.type === "math" ? part.spoken : part.text)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

export function displayAnswerLabels(
  question: Question,
  answerKeys: string[],
  language: Language,
  optionMode: OptionMode,
  optionSeed?: string,
) {
  const displayKeyByOriginalKey = new Map(getDisplayOptions(question, language, optionMode, optionSeed).map((option) => [option.key, option.displayKey]));
  return answerKeys.map((key) => displayKeyByOriginalKey.get(key) ?? key.toUpperCase()).join(", ");
}

export function selectorLabel(question: Question, copy: Copy) {
  if (question.selectionMode === "multiple") return copy.selectTwo;
  return copy.selectOne;
}

export function formatRemainingTime(milliseconds: number) {
  const totalSeconds = Math.ceil(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function getSessionType(session: StoredSession): "official" | "random" | "adaptive" {
  if (session.sessionType) return session.sessionType;
  if (session.id.startsWith("model-") || /^Modelo [A-D]$/.test(session.title)) return "official";
  if (session.mode === "study") return "adaptive";
  return "random";
}

export function restoreReview(session: StoredSession | undefined): ReviewState | null {
  if (!session) return null;
  const sessionQuestions = findQuestionsByIds(questions, session.questionIds);
  if (sessionQuestions.length !== session.questionIds.length) return null;
  return {
    sessionId: session.id,
    sessionType: getSessionType(session),
    optionMode: session.optionMode ?? (getSessionType(session) === "adaptive" ? "shuffled" : "original"),
    optionSeed: session.optionSeed ?? session.id,
    title: session.title,
    questions: sessionQuestions,
    answers: session.answers,
    score: scoreQuestions(sessionQuestions, session.answers, examRules),
  };
}
