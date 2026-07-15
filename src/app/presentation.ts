import { chapters, examRules, questionBank, questions } from "../data/bank";
import type { Objective, Question } from "../data/types";
import { findQuestionsByIds } from "../domain/exams";
import type { QuestionFilters } from "../domain/filters";
import { scoreQuestions } from "../domain/scoring";
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
    options: translation?.options?.length ? translation.options : question.options,
    selector: translation?.selector ?? question.selector,
    explanation: translation?.explanation ?? question.explanation,
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

export function hashString(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function shuffledOptions(question: Question, language: Language) {
  const options = [...localizedQuestion(question, language).options];
  const originalOrder = options.map((option) => option.key).join("");
  let state = hashString(question.id);
  for (let index = options.length - 1; index > 0; index -= 1) {
    state = Math.imul(state ^ (state >>> 15), 2246822507) >>> 0;
    const swapIndex = state % (index + 1);
    [options[index], options[swapIndex]] = [options[swapIndex], options[index]];
  }
  if (options.length > 1 && options.map((option) => option.key).join("") === originalOrder) {
    options.push(options.shift()!);
  }
  return options;
}

const displayLetters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export function getDisplayOptions(question: Question, language: Language) {
  return shuffledOptions(question, language).map((option, index) => ({
    ...option,
    displayKey: displayLetters[index] ?? String(index + 1),
    text: cleanOptionText(option.text),
  }));
}

export function cleanOptionText(text: string) {
  return text.replace(/\s+Sample Exams set [A-D]\s*$/i, "").trim();
}

export function cleanExplanationText(text: string) {
  return text
    .replace(/^(?:is\s+)?not\s+correct\.?\s*/i, "")
    .replace(/^(?:is\s+)?correct\.?\s*/i, "")
    .trim();
}

export function displayAnswerLabels(question: Question, answerKeys: string[], language: Language) {
  const displayKeyByOriginalKey = new Map(getDisplayOptions(question, language).map((option) => [option.key, option.displayKey]));
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
    title: session.title,
    questions: sessionQuestions,
    answers: session.answers,
    score: scoreQuestions(sessionQuestions, session.answers, examRules),
  };
}


