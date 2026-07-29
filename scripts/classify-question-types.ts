import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { QuestionBank } from "../src/data/types";
import { inferQuestionTypes } from "../src/domain/questionTypes";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = resolve(projectRoot, "src/data/question-bank.json");
const source = JSON.parse(await readFile(sourcePath, "utf8")) as QuestionBank;

source.questions = source.questions.map((question) => ({
  ...question,
  questionTypes: inferQuestionTypes(question),
}));

await writeFile(sourcePath, `${JSON.stringify(source, null, 2)}\n`);

const counts = new Map<string, number>();
for (const question of source.questions) {
  for (const type of question.questionTypes) counts.set(type, (counts.get(type) ?? 0) + 1);
}
console.log(Object.fromEntries(counts));
