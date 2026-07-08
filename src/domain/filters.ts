import type { Question, SourceModel, KLevel } from "../data/types";
import type { ProgressState } from "../storage/progress";

export type QuestionStatus = "all" | "unseen" | "correct" | "incorrect" | "flagged";

export type QuestionFilters = {
  query: string;
  models: SourceModel[];
  chapters: string[];
  kLevels: KLevel[];
  references: string[];
  status: QuestionStatus;
};

export const emptyFilters: QuestionFilters = {
  query: "",
  models: [],
  chapters: [],
  kLevels: [],
  references: [],
  status: "all",
};

export function filterQuestions(
  questions: Question[],
  filters: QuestionFilters,
  progress: ProgressState,
): Question[] {
  const query = filters.query.trim().toLowerCase();

  return questions.filter((question) => {
    const questionProgress = progress.questionProgress[question.id];
    if (filters.models.length > 0 && !filters.models.includes(question.sourceModel)) return false;
    if (filters.chapters.length > 0 && !filters.chapters.includes(question.chapter)) return false;
    if (filters.kLevels.length > 0 && !filters.kLevels.includes(question.kLevel)) return false;
    if (filters.references.length > 0 && !filters.references.includes(question.reference)) return false;

    if (filters.status === "unseen" && questionProgress?.attempts) return false;
    if (filters.status === "correct" && !questionProgress?.lastCorrect) return false;
    if (filters.status === "incorrect" && (!questionProgress?.attempts || questionProgress.lastCorrect)) return false;
    if (filters.status === "flagged" && !questionProgress?.flagged) return false;

    if (!query) return true;
    const searchable = [
      question.id,
      question.prompt,
      question.reference,
      question.kLevel,
      question.chapter,
      ...question.options.map((option) => option.text),
    ]
      .join(" ")
      .toLowerCase();
    return searchable.includes(query);
  });
}

export function summarizeProgress(questions: Question[], progress: ProgressState) {
  const attempted = questions.filter((question) => progress.questionProgress[question.id]?.attempts).length;
  const correct = questions.filter((question) => progress.questionProgress[question.id]?.lastCorrect).length;
  const flagged = questions.filter((question) => progress.questionProgress[question.id]?.flagged).length;
  const incorrect = questions.filter((question) => {
    const questionProgress = progress.questionProgress[question.id];
    return questionProgress?.attempts && !questionProgress.lastCorrect;
  }).length;

  return {
    total: questions.length,
    attempted,
    correct,
    incorrect,
    flagged,
    unseen: questions.length - attempted,
  };
}
