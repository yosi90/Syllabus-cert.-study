import core from "./generated/core.json";
import modelAQuestions from "./generated/questions-a.json";
import modelBQuestions from "./generated/questions-b.json";
import modelCQuestions from "./generated/questions-c.json";
import modelDQuestions from "./generated/questions-d.json";
import type { QuestionBank } from "./types";

export const questionBank = {
  ...core,
  questions: [
    ...modelAQuestions,
    ...modelBQuestions,
    ...modelCQuestions,
    ...modelDQuestions,
  ],
} as QuestionBank;
export const questions = questionBank.questions;
export const chapters = questionBank.chapters;
export const objectives = questionBank.objectives;
export const examRules = questionBank.metadata.examRules;
