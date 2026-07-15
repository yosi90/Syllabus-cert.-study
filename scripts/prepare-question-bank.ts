import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { QuestionBank, SourceModel } from "../src/data/types";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = resolve(projectRoot, "src/data/question-bank.json");
const outputDirectory = resolve(projectRoot, "src/data/generated");
const models: SourceModel[] = ["A", "B", "C", "D"];

const source = JSON.parse(await readFile(sourcePath, "utf8")) as QuestionBank;
const { questions, ...core } = source;

await mkdir(outputDirectory, { recursive: true });
await writeFile(resolve(outputDirectory, "core.json"), `${JSON.stringify(core, null, 2)}\n`);

for (const model of models) {
  const modelQuestions = questions.filter((question) => question.sourceModel === model);
  await writeFile(
    resolve(outputDirectory, `questions-${model.toLowerCase()}.json`),
    `${JSON.stringify(modelQuestions, null, 2)}\n`,
  );
}

const generatedCount = models.reduce(
  (total, model) => total + questions.filter((question) => question.sourceModel === model).length,
  0,
);

if (generatedCount !== questions.length) {
  throw new Error(`Only ${generatedCount} of ${questions.length} questions belong to models A-D.`);
}

console.log(`Prepared ${generatedCount} questions in ${models.length} model chunks.`);
