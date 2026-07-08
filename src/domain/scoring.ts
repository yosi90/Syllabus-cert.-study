import type { ExamRules, Question } from "../data/types";

export type AnswerMap = Record<string, string[]>;

export type QuestionResult = {
  questionId: string;
  selectedAnswers: string[];
  correctAnswers: string[];
  isBlank: boolean;
  isCorrect: boolean;
};

export type SessionScore = {
  total: number;
  answered: number;
  blank: number;
  correct: number;
  incorrect: number;
  score: number;
  percent: number;
  passed: boolean;
  passingScore: number;
  results: QuestionResult[];
};

export function normalizeAnswers(answers: string[] | undefined): string[] {
  return Array.from(new Set(answers ?? [])).sort();
}

export function isCorrectAnswer(question: Question, selectedAnswers: string[] | undefined): boolean {
  const selected = normalizeAnswers(selectedAnswers);
  const correct = normalizeAnswers(question.correctAnswers);
  return selected.length === correct.length && selected.every((answer, index) => answer === correct[index]);
}

export function scoreQuestions(questions: Question[], answers: AnswerMap, rules: ExamRules): SessionScore {
  const results = questions.map<QuestionResult>((question) => {
    const selectedAnswers = normalizeAnswers(answers[question.id]);
    return {
      questionId: question.id,
      selectedAnswers,
      correctAnswers: normalizeAnswers(question.correctAnswers),
      isBlank: selectedAnswers.length === 0,
      isCorrect: selectedAnswers.length > 0 && isCorrectAnswer(question, selectedAnswers),
    };
  });

  const correct = results.filter((result) => result.isCorrect).length;
  const blank = results.filter((result) => result.isBlank).length;
  const answered = results.length - blank;
  const incorrect = results.length - blank - correct;
  const score = correct * rules.pointsPerCorrectAnswer;
  const percent = results.length === 0 ? 0 : Math.round((correct / results.length) * 100);

  return {
    total: results.length,
    answered,
    blank,
    correct,
    incorrect,
    score,
    percent,
    passed: score >= rules.passingScore,
    passingScore: rules.passingScore,
    results,
  };
}

export function toggleAnswer(question: Question, current: string[] | undefined, optionKey: string): string[] {
  if (question.selectionMode === "single") {
    return current?.[0] === optionKey ? [] : [optionKey];
  }

  const selected = new Set(current ?? []);
  if (selected.has(optionKey)) {
    selected.delete(optionKey);
  } else {
    selected.add(optionKey);
  }
  return Array.from(selected).sort();
}
