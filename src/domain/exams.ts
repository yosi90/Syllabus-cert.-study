import type { Question, SourceModel } from "../data/types";

export type ExamBlueprint = {
  id: string;
  title: string;
  questionIds: string[];
};

export type ChapterDistribution = Record<string, number>;

function hashSeed(seed: string): number {
  let hash = 1779033703 ^ seed.length;
  for (let index = 0; index < seed.length; index += 1) {
    hash = Math.imul(hash ^ seed.charCodeAt(index), 3432918353);
    hash = (hash << 13) | (hash >>> 19);
  }
  return hash >>> 0;
}

function seededRandom(seed: string) {
  let state = hashSeed(seed);
  return () => {
    state += 0x6d2b79f5;
    let result = state;
    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffleQuestions(questions: Question[], seed: string): Question[] {
  const random = seededRandom(seed);
  const copy = [...questions];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

export function createModelExam(questions: Question[], model: SourceModel): ExamBlueprint {
  const selected = questions
    .filter((question) => question.sourceModel === model)
    .sort((left, right) => left.sourceNumber - right.sourceNumber);

  return {
    id: `model-${model}`,
    title: `Modelo ${model}`,
    questionIds: selected.map((question) => question.id),
  };
}

export function createRandomExam(
  questions: Question[],
  distribution: ChapterDistribution,
  seed = new Date().toISOString(),
): ExamBlueprint {
  const selected: Question[] = [];
  const used = new Set<string>();

  for (const [chapter, amount] of Object.entries(distribution)) {
    const candidates = shuffleQuestions(
      questions.filter((question) => question.chapter === chapter),
      `${seed}-${chapter}`,
    );
    for (const question of candidates.slice(0, amount)) {
      selected.push(question);
      used.add(question.id);
    }
  }

  if (selected.length < 40) {
    const remaining = shuffleQuestions(
      questions.filter((question) => !used.has(question.id)),
      `${seed}-fill`,
    );
    for (const question of remaining.slice(0, 40 - selected.length)) {
      selected.push(question);
    }
  }

  return {
    id: `random-${seed}`,
    title: "Simulacro aleatorio",
    questionIds: shuffleQuestions(selected, `${seed}-order`)
      .slice(0, 40)
      .map((question) => question.id),
  };
}

export function findQuestionsByIds(questions: Question[], questionIds: string[]): Question[] {
  const byId = new Map(questions.map((question) => [question.id, question]));
  return questionIds.flatMap((id) => {
    const question = byId.get(id);
    return question ? [question] : [];
  });
}
