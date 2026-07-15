import fs from "node:fs";
import path from "node:path";
import katex from "katex";

type Option = {
  key: string;
  text: string;
};

type Question = {
  id: string;
  sourceModel: "A" | "B" | "C" | "D";
  sourceNumber: number;
  chapter: string;
  reference: string;
  kLevel: string;
  rawKLevel: string;
  prompt: string;
  promptParts?: Record<"en" | "es", Array<
    { type: "text"; text: string } | { type: "math"; latex: string; spoken: string }
  >>;
  options: Option[];
  correctAnswers: string[];
  selectionMode: "single" | "multiple";
  explanation: string;
  notes: string[];
  points: number;
  visual?: {
    src: string;
    alt: { en: string; es: string };
  };
  translations?: {
    es?: {
      prompt?: string;
      options?: Option[];
      selector?: string;
      explanation?: string;
    };
  };
};

type QuestionBank = {
  metadata: {
    examRules?: Record<string, unknown>;
    chapterDistribution?: Record<string, number>;
    extractionIssues?: string[];
  };
  questions: Question[];
};

const root = process.cwd();
const bankPath = path.join(root, "src", "data", "question-bank.json");
const bank = JSON.parse(fs.readFileSync(bankPath, "utf8")) as QuestionBank;
const failures: string[] = [];

const models = ["A", "B", "C", "D"] as const;
const chapterDistribution = {
  "FL-1": 8,
  "FL-2": 6,
  "FL-3": 4,
  "FL-4": 11,
  "FL-5": 9,
  "FL-6": 2,
};
const kDistribution = {
  K1: 8,
  K2: 24,
  K3: 8,
};
const multiAnswerIds = ["A-06", "A-31", "B-26", "C-04", "D-20", "D-30", "D-35"];
const knownBrokenSourceWords = [
  "syst em", "quali ty", "qual ity", "w rite", "t esters", "bet ween", "execu ting", "stakeholde rs",
  "testin g", "typica lly", "autom ated", "numbe r", "con firmation", "desc ribes", "passw ords",
  "automati cally", "responsibilit y", "earl ier", "wou ld", "rele ase", "whi te", "altho ugh",
  "pe rformed", "ascen ding", "correctl y", "testi ng", "Defec ts", "m easured", "requir ements",
  "ant icipating", "de fects", "implemen t", "resu lts", "r esults", "tha t", "t he", "an d",
];
const pdfArtifactPattern = /(?:Question \(#\)|Explanation \/ Rationale|Learning Objective \(LO\)|Sample Exams? set [A-D]|Version \d+(?:\.\d+)? Page \d+ of \d+)/i;
const spanishArtifactPattern = /(?:Pregunta \((?:#|n\.º)\)|Explicación\s*\/\s*(?:Justificación|Fundamento|Fundamentación)|Objetivo de aprendizaje \(LO\).*Nivel K|cobertura de sucursales|cobertura del estado de cuenta|decisiónes|condiciónes|particiónes|transiciónes|verificaciónes)/i;

function assert(condition: unknown, message: string) {
  if (!condition) failures.push(message);
}

function countBy<T>(values: T[], readKey: (value: T) => string) {
  return values.reduce<Record<string, number>>((result, value) => {
    const key = readKey(value);
    result[key] = (result[key] ?? 0) + 1;
    return result;
  }, {});
}

assert(bank.questions.length === 160, `Expected 160 questions, found ${bank.questions.length}`);

const byModel = countBy(bank.questions, (question) => question.sourceModel);
for (const model of models) {
  assert(byModel[model] === 40, `Expected 40 questions for model ${model}, found ${byModel[model] ?? 0}`);
}

const seenIds = new Set<string>();
let visualCount = 0;
for (const question of bank.questions) {
  assert(!seenIds.has(question.id), `Duplicate id ${question.id}`);
  seenIds.add(question.id);

  assert(/^([ABCD])-\d{2}$/.test(question.id), `${question.id}: invalid id format`);
  assert(question.sourceNumber >= 1 && question.sourceNumber <= 40, `${question.id}: invalid sourceNumber`);
  assert(question.prompt.trim().length > 0, `${question.id}: empty prompt`);
  assert(question.explanation.trim().length > 0, `${question.id}: empty explanation`);
  assert(["K1", "K2", "K3"].includes(question.kLevel), `${question.id}: invalid kLevel ${question.kLevel}`);
  assert(/^K\d+$/.test(question.rawKLevel), `${question.id}: invalid rawKLevel ${question.rawKLevel}`);
  assert(/^FL-\d\.\d\.\d$/.test(question.reference), `${question.id}: invalid reference ${question.reference}`);
  assert(/^FL-[1-6]$/.test(question.chapter), `${question.id}: invalid chapter ${question.chapter}`);
  assert([4, 5].includes(question.options.length), `${question.id}: expected 4 or 5 options`);
  assert(question.points === 1, `${question.id}: expected 1 point, found ${question.points}`);

  if (question.promptParts) {
    for (const language of ["en", "es"] as const) {
      assert(question.promptParts[language]?.length > 0, `${question.id}: missing ${language} prompt parts`);
      for (const part of question.promptParts[language] ?? []) {
        if (part.type === "text") {
          assert(Boolean(part.text.trim()), `${question.id}: empty ${language} prompt text part`);
        } else {
          assert(Boolean(part.latex.trim()), `${question.id}: empty ${language} formula`);
          assert(Boolean(part.spoken.trim()), `${question.id}: missing ${language} spoken formula`);
          try {
            katex.renderToString(part.latex, { throwOnError: true });
          } catch {
            assert(false, `${question.id}: invalid ${language} formula`);
          }
        }
      }
    }
  }

  if (question.visual) {
    visualCount += 1;
    assert(/^\/question-assets\/[a-d]-\d{2}\.png$/.test(question.visual.src), `${question.id}: invalid visual path`);
    assert(Boolean(question.visual.alt.en.trim()), `${question.id}: missing English visual description`);
    assert(Boolean(question.visual.alt.es.trim()), `${question.id}: missing Spanish visual description`);
    assert(
      fs.existsSync(path.join(root, "public", question.visual.src.replace(/^\//, ""))),
      `${question.id}: visual asset does not exist`,
    );
  }

  const optionKeys = new Set(question.options.map((option) => option.key));
  const spanish = question.translations?.es;
  assert(spanish !== undefined, `${question.id}: missing Spanish translation`);
  assert(Boolean(spanish?.prompt?.trim()), `${question.id}: missing Spanish prompt`);
  assert(Boolean(spanish?.selector?.trim()), `${question.id}: missing Spanish selector`);
  assert(Boolean(spanish?.explanation?.trim()), `${question.id}: missing Spanish explanation`);
  assert(spanish?.options?.length === question.options.length, `${question.id}: Spanish option count does not match source`);

  const sourceTexts = [question.prompt, question.explanation, ...question.options.map((option) => option.text)];
  const spanishTexts = [spanish?.prompt ?? "", spanish?.explanation ?? "", ...(spanish?.options ?? []).map((option) => option.text)];
  assert(!spanishTexts.some((text) => /\b(?:prob|prov)ad(?:or|ora|ores|oras)\b/i.test(text)), `${question.id}: Spanish text translates tester instead of preserving the anglicism`);
  assert(!sourceTexts.some((text) => pdfArtifactPattern.test(text)), `${question.id}: source text contains a PDF header or footer`);
  assert(!spanishTexts.some((text) => spanishArtifactPattern.test(text)), `${question.id}: Spanish text contains an extraction or translation artifact`);
  for (const brokenWord of knownBrokenSourceWords) {
    const brokenWordPattern = new RegExp(`\\b${brokenWord.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
    assert(!sourceTexts.some((text) => brokenWordPattern.test(text)), `${question.id}: source text contains broken word "${brokenWord}"`);
  }
  const sourceRomanMarkers = sourceTexts.join(" ").match(/\b(?:i|ii|iii|iv|v)\.\s+/g)?.length ?? 0;
  const spanishRomanMarkers = spanishTexts.join(" ").match(/\b(?:i|ii|iii|iv|v)\.\s+/g)?.length ?? 0;
  assert(spanishRomanMarkers >= sourceRomanMarkers, `${question.id}: Spanish text lost one or more Roman-numeral list markers`);
  for (const option of spanish?.options ?? []) {
    assert(optionKeys.has(option.key), `${question.id}: Spanish option ${option.key} is not a source option`);
    assert(Boolean(option.text?.trim()), `${question.id}: Spanish option ${option.key} is empty`);
    assert(
      !/(?:sample exams?|exámenes? de muestra|pruebas? de muestra)\s*(?:set|conjunto)?\s*[A-D]?$/i.test(option.text),
      `${question.id}: Spanish option ${option.key} contains a PDF footer`,
    );
  }

  for (const option of question.options) {
    assert(/^[a-e]$/.test(option.key), `${question.id}: invalid option key ${option.key}`);
    assert(option.text.trim().length > 0, `${question.id}: empty option ${option.key}`);
  }

  for (const answer of question.correctAnswers) {
    assert(optionKeys.has(answer), `${question.id}: correct answer ${answer} is not an option`);
  }

  assert(question.correctAnswers.length >= 1, `${question.id}: no correct answers`);
  if (question.correctAnswers.length > 1) {
    assert(question.selectionMode === "multiple", `${question.id}: multiple answers need multiple mode`);
  } else {
    assert(question.selectionMode === "single", `${question.id}: single answer needs single mode`);
  }
}

assert(visualCount === 23, `Expected 23 questions with visual assets, found ${visualCount}`);

for (const model of models) {
  const questions = bank.questions.filter((question) => question.sourceModel === model);
  const chapters = countBy(questions, (question) => question.chapter);
  const kLevels = countBy(questions, (question) => question.kLevel);
  for (const [chapter, expected] of Object.entries(chapterDistribution)) {
    assert(chapters[chapter] === expected, `${model}: expected ${expected} questions in ${chapter}, found ${chapters[chapter] ?? 0}`);
  }
  for (const [kLevel, expected] of Object.entries(kDistribution)) {
    assert(kLevels[kLevel] === expected, `${model}: expected ${expected} ${kLevel} questions, found ${kLevels[kLevel] ?? 0}`);
  }
}

const actualMultiIds = bank.questions
  .filter((question) => question.selectionMode === "multiple")
  .map((question) => question.id)
  .sort();
assert(
  JSON.stringify(actualMultiIds) === JSON.stringify([...multiAnswerIds].sort()),
  `Unexpected multiple-answer questions: ${actualMultiIds.join(", ")}`,
);

const examRules = bank.metadata.examRules ?? {};
assert(examRules.questionsPerExam === 40, "Expected 40 questions per exam");
assert(examRules.passingScore === 26, "Expected passing score 26");
assert(examRules.passingPercent === 65, "Expected passing percent 65");
assert(examRules.pointsPerCorrectAnswer === 1, "Expected 1 point per correct answer");
assert(examRules.penalty === 0, "Expected no penalty");
assert(examRules.durationMinutes === 60, "Expected standard duration 60 minutes");
assert(examRules.extendedDurationMinutes === 75, "Expected extended duration 75 minutes");
assert((bank.metadata.extractionIssues ?? []).length === 0, "Expected no extraction issues");
assert(!/\b(?:prob|prov)ad(?:or|ora|ores|oras)\b/i.test(JSON.stringify(bank)), "Spanish bank content translates tester instead of preserving the anglicism");

const c31 = bank.questions.find((question) => question.id === "C-31");
assert(c31?.promptParts?.en.some((part) => part.type === "math" && part.latex.includes("\\frac") && part.latex.endsWith("{4}")), "C-31: missing fraction with denominator 4");

if (failures.length) {
  console.error(`Data validation failed with ${failures.length} issue(s):`);
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Data validation passed");
console.log(`Questions: ${bank.questions.length}`);
console.log(`By model: ${JSON.stringify(byModel)}`);
console.log(`By chapter: ${JSON.stringify(countBy(bank.questions, (question) => question.chapter))}`);
console.log(`By K level: ${JSON.stringify(countBy(bank.questions, (question) => question.kLevel))}`);
