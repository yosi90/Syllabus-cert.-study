export type SourceModel = "A" | "B" | "C" | "D";
export type KLevel = "K1" | "K2" | "K3";
export type SelectionMode = "single" | "multiple";

export type QuestionOption = {
  key: string;
  text: string;
};

export type QuestionTranslation = {
  prompt?: string;
  options?: QuestionOption[];
  selector?: string;
  explanation?: string;
};

export type LocalizedText = {
  es?: {
    name?: string;
    text?: string;
    sectionTitle?: string;
    syllabusPage?: number;
    minutes?: number;
  };
};

export type Question = {
  id: string;
  sourceModel: SourceModel;
  sourceNumber: number;
  chapter: string;
  reference: string;
  kLevel: KLevel;
  rawKLevel: string;
  prompt: string;
  options: QuestionOption[];
  correctAnswers: string[];
  selectionMode: SelectionMode;
  selector: string;
  explanation: string;
  notes: string[];
  points: number;
  translations?: {
    es?: QuestionTranslation;
  };
};

export type Chapter = {
  id: string;
  name: string;
  minutes: number;
  keywords: string[];
  translations?: LocalizedText;
};

export type Objective = {
  code: string;
  kLevel: KLevel;
  text: string;
  chapter: string;
  section: string;
  sectionTitle: string;
  syllabusPage?: number;
  translations?: LocalizedText;
};

export type ExamRules = {
  questionsPerExam: number;
  passingScore: number;
  passingPercent: number;
  pointsPerCorrectAnswer: number;
  penalty: number;
  durationMinutes: number;
  extendedDurationMinutes: number;
};

export type QuestionBank = {
  metadata: {
    version: string;
    generatedFrom: string[];
    examRules: ExamRules;
    chapterDistribution: Record<string, number>;
    knownIssues: string[];
    countsByModel: Record<string, number>;
    countsByChapter: Record<string, number>;
    countsByKLevel: Record<string, number>;
    extractionIssues: string[];
  };
  chapters: Chapter[];
  objectives: Objective[];
  questions: Question[];
};
