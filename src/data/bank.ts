import rawBank from "./question-bank.json";
import type { QuestionBank } from "./types";

export const questionBank = rawBank as QuestionBank;
export const questions = questionBank.questions;
export const chapters = questionBank.chapters;
export const objectives = questionBank.objectives;
export const examRules = questionBank.metadata.examRules;
