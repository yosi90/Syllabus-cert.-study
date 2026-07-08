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

  it("creates random exams with official distribution and no duplicates", () => {
    const exam = createRandomExam(questions, {
      "FL-1": 8,
      "FL-2": 6,
      "FL-3": 4,
      "FL-4": 11,
      "FL-5": 9,
      "FL-6": 2,
    }, "test-seed");
    const selected = findQuestionsByIds(questions, exam.questionIds);
    const unique = new Set(exam.questionIds);
    expect(exam.questionIds).toHaveLength(examRules.questionsPerExam);
    expect(unique.size).toBe(examRules.questionsPerExam);
    expect(selected.filter((question) => question.chapter === "FL-4")).toHaveLength(11);
  });

  it("creates exact model D exam in source order", () => {
    const exam = createModelExam(questions, "D");
    expect(exam.questionIds).toHaveLength(40);
    expect(exam.questionIds[0]).toBe("D-01");
    expect(exam.questionIds[39]).toBe("D-40");
  });
});
