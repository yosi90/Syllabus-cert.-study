import { describe, expect, it } from "vitest";
import { examRules, questions } from "../data/bank";
import { createModelExam, createRandomExam, findQuestionsByIds } from "./exams";

describe("exam generation", () => {
  it("creates exact model exams in source order", () => {
    const exam = createModelExam(questions, "B");
    expect(exam.questionIds).toHaveLength(40);
    expect(exam.questionIds[0]).toBe("B-01");
    expect(exam.questionIds[39]).toBe("B-40");
  });

  it("creates random exams with the official chapter and K-Level matrix and no duplicates", () => {
    const chapterDistribution = {
      "FL-1": 8,
      "FL-2": 6,
      "FL-3": 4,
      "FL-4": 11,
      "FL-5": 9,
      "FL-6": 2,
    };

    for (let seed = 0; seed < 100; seed += 1) {
      const exam = createRandomExam(questions, chapterDistribution, `test-seed-${seed}`);
      const selected = findQuestionsByIds(questions, exam.questionIds);
      const unique = new Set(exam.questionIds);
      expect(exam.questionIds).toHaveLength(examRules.questionsPerExam);
      expect(unique.size).toBe(examRules.questionsPerExam);
      for (const [chapter, amount] of Object.entries(chapterDistribution)) {
        expect(selected.filter((question) => question.chapter === chapter)).toHaveLength(amount);
      }
      expect(selected.filter((question) => question.kLevel === "K1")).toHaveLength(8);
      expect(selected.filter((question) => question.kLevel === "K2")).toHaveLength(24);
      expect(selected.filter((question) => question.kLevel === "K3")).toHaveLength(8);
    }
  });

  it("creates exact model D exam in source order", () => {
    const exam = createModelExam(questions, "D");
    expect(exam.questionIds).toHaveLength(40);
    expect(exam.questionIds[0]).toBe("D-01");
    expect(exam.questionIds[39]).toBe("D-40");
  });
});
