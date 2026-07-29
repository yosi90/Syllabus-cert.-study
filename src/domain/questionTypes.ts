import type { Question, QuestionType } from "../data/types";

const listPattern = /(?:^|\s)(?:•|1[.)]|i[.)])[\s\S]*(?:•|2[.)]|ii[.)])/i;
const matchingPattern =
  /\b(?:match|matching|fit which|correspond(?:s|ing)? to|map(?:ping)?|pairs? of)\b|(?:following .{0,80}:\s*1[.)][\s\S]{20,}(?:following|and the) .{0,80}:\s*A[.)])/i;
const scenarioPattern =
  /\b(?:you are|you have been|your (?:team|organization|company|project)|a (?:tester|team|company|project|product owner)|consider the following|given the following (?:scenario|situation|user story)|suppose that)\b/i;
const calculationPattern =
  /\b(?:calculate|calculation|how many|minimum number|final grade|three-point estimation|test effort|boundary values?|equivalence partitions?|decision table|statement coverage|branch coverage)\b/i;

export function inferQuestionTypes(
  question: Pick<Question, "prompt" | "visual" | "selectionMode" | "kLevel">,
): QuestionType[] {
  const types: QuestionType[] = [];
  if (question.visual) types.push("visual");
  if (listPattern.test(question.prompt)) types.push("list");
  if (question.selectionMode === "multiple") types.push("multiple-response");
  if (matchingPattern.test(question.prompt)) types.push("matching");
  if (scenarioPattern.test(question.prompt)) types.push("scenario");
  if (question.kLevel === "K3" && calculationPattern.test(question.prompt)) types.push("calculation");
  return types.length ? types : ["simple"];
}

export function hasValidQuestionTypes(types: QuestionType[]) {
  return types.length > 0
    && new Set(types).size === types.length
    && (types.includes("simple") ? types.length === 1 : true);
}
