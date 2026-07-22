import type { KLevel, Question, SourceModel } from "../data/types";

export type ExamBlueprint = {
  id: string;
  title: string;
  questionIds: string[];
};

export type ChapterDistribution = Record<string, number>;

export const officialChapterKDistribution: Record<string, Partial<Record<KLevel, number>>> = {
  "FL-1": { K1: 2, K2: 6 },
  "FL-2": { K1: 2, K2: 4 },
  "FL-3": { K1: 2, K2: 2 },
  "FL-4": { K2: 6, K3: 5 },
  "FL-5": { K1: 1, K2: 5, K3: 3 },
  "FL-6": { K1: 1, K2: 1 },
};

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
    const levelDistribution = officialChapterKDistribution[chapter];
    let selectedInChapter = 0;

    if (levelDistribution) {
      for (const [kLevel, levelAmount] of Object.entries(levelDistribution) as [KLevel, number][]) {
        const candidates = shuffleQuestions(
          questions.filter((question) => question.chapter === chapter && question.kLevel === kLevel),
          `${seed}-${chapter}-${kLevel}`,
        );
        for (const question of candidates.slice(0, levelAmount)) {
          selected.push(question);
          used.add(question.id);
          selectedInChapter += 1;
        }
      }
    }

    if (selectedInChapter < amount) {
      const remainingInChapter = shuffleQuestions(
        questions.filter((question) => question.chapter === chapter && !used.has(question.id)),
        `${seed}-${chapter}-fill`,
      );
      for (const question of remainingInChapter.slice(0, amount - selectedInChapter)) {
        selected.push(question);
        used.add(question.id);
      }
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
