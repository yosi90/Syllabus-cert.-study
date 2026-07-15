import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, ReactNode } from "react";
import {
  BookOpen,
  Bookmark,
  BookmarkCheck,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Download,
  FileUp,
  Filter,
  Menu,
  Moon,
  Play,
  RotateCcw,
  Search,
  Shuffle,
  Timer,
  Trash2,
  X,
  XCircle,
} from "lucide-react";
import { HashRouter, NavLink, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { chapters, examRules, questionBank, questions } from "./data/bank";
import type { KLevel, Objective, Question, SourceModel } from "./data/types";
import { createModelExam, createRandomExam, findQuestionsByIds, type ExamBlueprint } from "./domain/exams";
import { emptyFilters, filterQuestions, summarizeProgress, type QuestionFilters } from "./domain/filters";
import { isCorrectAnswer, scoreQuestions, toggleAnswer, type AnswerMap, type SessionScore } from "./domain/scoring";
import {
  addSession,
  clearProgress,
  exportProgress,
  importProgress,
  loadProgress,
  recordQuestionAttempt,
  saveProgress,
  setTutorialCompleted,
  toggleFlag,
  type ProgressState,
  type StoredSession,
} from "./storage/progress";

type ExamState = {
  blueprint: ExamBlueprint;
  currentIndex: number;
  answers: AnswerMap;
  timerMode: TimerMode;
  endsAt: number | null;
};

type TimerMode = "off" | "standard" | "extended";
type Language = "en" | "es";
type Theme = "light" | "dark";
const SPANISH_TRANSLATION_NOTICE_KEY = "istqb-ctfl-v4-spanish-translation-notice-seen";
const THEME_STORAGE_KEY = "istqb-ctfl-v4-theme";

type ReviewState = {
  title: string;
  questions: Question[];
  answers: AnswerMap;
  score: SessionScore;
};

const models: SourceModel[] = ["A", "B", "C", "D"];
const kLevels: KLevel[] = ["K1", "K2", "K3"];
const uiCopy = {
  en: {
    trainer: "Trainer",
    modesLabel: "Modes",
    openMenu: "Open menu",
    closeMenu: "Close menu",
    darkMode: "Dark mode",
    practice: "Practice",
    exam: "Exam",
    review: "Review",
    localProgress: "Local progress",
    viewed: "Viewed",
    correct: "Correct",
    wrong: "Wrong",
    flagged: "Flagged",
    filters: "Filters",
    searchPlaceholder: "Search text, LO or topic",
    clearFilters: "Clear filters",
    model: "Model",
    chapter: "Chapter",
    reference: "Reference",
    all: "All",
    status: "Status",
    unseen: "Unseen",
    lastCorrect: "Last correct",
    lastIncorrect: "Last incorrect",
    export: "Export",
    import: "Import",
    tutorial: "Tutorial",
    delete: "Delete",
    noQuestions: "No questions match these filters",
    changeFilters: "Change the filters to restore the bank.",
    practiceTitle: "Single questions",
    filtered: "Filtered",
    current: "Current",
    questionList: "Question list",
    previous: "Previous",
    check: "Check",
    random: "Random",
    next: "Next",
    multiple: "Multiple selection",
    single: "Single selection",
    selectOne: "Select ONE option.",
    selectTwo: "Select TWO options.",
    removeFlag: "Remove from flagged",
    addFlag: "Flag for review",
    removeFlagAria: "Remove question from flagged",
    addFlagAria: "Flag question for review",
    expandImage: "Expand image",
    closeImage: "Close image",
    theory: "View theory",
    objective: "Objective",
    section: "Section",
    pdfPage: "PDF page",
    unavailable: "Unavailable",
    syllabusNote:
      "Open that page in the matching syllabus PDF. The official rationale may also rely on concepts from other syllabus sections.",
    examTitle: "40-question exam",
    passedMetric: "Pass",
    time: "Time",
    noLimit: "No limit",
    timer: "Timer",
    noTime: "No time",
    modelTitle: "Model",
    modelSubtitle: "40 official questions in their original order.",
    randomSubtitle: "40 unique questions using the CTFL chapter distribution.",
    activeExam: "Active exam",
    answered: "Answered",
    question: "Question",
    timeUp: "Time is up.",
    timeUpText: "You can finish the exam to grade it or cancel without saving.",
    noCorrection: "No correction until finished",
    finish: "Finish",
    cancel: "Cancel",
    recentHistory: "Recent history",
    noSessions: "No finished exams yet",
    completeExam: "Complete an exam to see its review here.",
    points: "Points",
    result: "Result",
    percent: "Percent",
    passed: "Passed",
    failed: "Failed",
    notPassed: "Not passed",
    blank: "Blank",
    yourAnswer: "Your answer",
    correctAnswer: "Correct",
    unanswered: "Unanswered",
    translationNoticeTitle: "Spanish translation notice",
    translationNoticeText:
      "This site was originally built in English. The Spanish translation may contain inconsistencies or errors, so use the official English wording when precision matters.",
    translationNoticeAction: "I understand",
  },
  es: {
    trainer: "Entrenador",
    modesLabel: "Modos",
    openMenu: "Abrir menú",
    closeMenu: "Cerrar menú",
    darkMode: "Modo oscuro",
    practice: "Práctica",
    exam: "Simulacro",
    review: "Revisión",
    localProgress: "Progreso local",
    viewed: "Vistas",
    correct: "Correctas",
    wrong: "Falladas",
    flagged: "Marcadas",
    filters: "Filtros",
    searchPlaceholder: "Buscar texto, LO o tema",
    clearFilters: "Limpiar filtros",
    model: "Modelo",
    chapter: "Capítulo",
    reference: "Referencia",
    all: "Todas",
    status: "Estado",
    unseen: "Sin responder",
    lastCorrect: "Última correcta",
    lastIncorrect: "Última incorrecta",
    export: "Exportar",
    import: "Importar",
    tutorial: "Tutorial",
    delete: "Borrar",
    noQuestions: "No hay preguntas con esos filtros",
    changeFilters: "Cambia los filtros para recuperar el banco.",
    practiceTitle: "Preguntas sueltas",
    filtered: "Filtradas",
    current: "Actual",
    questionList: "Listado de preguntas",
    previous: "Anterior",
    check: "Comprobar",
    random: "Aleatoria",
    next: "Siguiente",
    multiple: "Selección múltiple",
    single: "Selección única",
    selectOne: "Selecciona UNA opción.",
    selectTwo: "Selecciona DOS opciones.",
    removeFlag: "Quitar de marcadas",
    addFlag: "Marcar para repasar",
    removeFlagAria: "Quitar pregunta de marcadas",
    addFlagAria: "Marcar pregunta para repasar",
    expandImage: "Ampliar imagen",
    closeImage: "Cerrar imagen",
    theory: "Ver teoría",
    objective: "Objetivo",
    section: "Sección",
    pdfPage: "Página del PDF",
    unavailable: "No disponible",
    syllabusNote:
      "Consulta esa página en el PDF del syllabus correspondiente. El rationale oficial puede apoyarse también en conceptos de otras secciones del syllabus.",
    examTitle: "Examen de 40 preguntas",
    passedMetric: "Aprobado",
    time: "Tiempo",
    noLimit: "Sin límite",
    timer: "Temporizador",
    noTime: "Sin tiempo",
    modelTitle: "Modelo",
    modelSubtitle: "40 preguntas oficiales en orden original.",
    randomSubtitle: "40 preguntas sin duplicados con distribución por capítulo.",
    activeExam: "Simulacro activo",
    answered: "Respondidas",
    question: "Pregunta",
    timeUp: "Tiempo agotado.",
    timeUpText: "Puedes finalizar el simulacro para corregirlo o cancelarlo sin guardar.",
    noCorrection: "Sin corrección hasta finalizar",
    finish: "Finalizar",
    cancel: "Cancelar",
    recentHistory: "Historial reciente",
    noSessions: "Aún no hay simulacros terminados",
    completeExam: "Completa un simulacro para ver la revisión aquí.",
    points: "Puntos",
    result: "Resultado",
    percent: "Porcentaje",
    passed: "Aprobado",
    failed: "No apto",
    notPassed: "No aprobado",
    blank: "Blanco",
    yourAnswer: "Tu respuesta",
    correctAnswer: "Correcta",
    unanswered: "Sin responder",
    translationNoticeTitle: "Aviso sobre la traducción",
    translationNoticeText:
      "Esta web se construyó originalmente en inglés. La traducción al español puede contener inconsistencias o errores, así que consulta el texto oficial en inglés cuando necesites máxima precisión.",
    translationNoticeAction: "Entendido",
  },
} as const;

type Copy = (typeof uiCopy)[Language];
const tutorialSteps = [
  {
    title: "Bienvenida",
    target: "layout",
    placement: "center",
    body: "Esta web está pensada para estudiar ISTQB CTFL v4.0 con preguntas oficiales, práctica por filtros y simulacros de 40 preguntas.",
    points: [
      "El lateral contiene filtros, progreso y acciones.",
      "La zona central cambia entre Práctica, Simulacro y Revisión.",
      "El progreso se guarda solo en este navegador.",
    ],
  },
  {
    title: "Práctica",
    target: "practice",
    placement: "bottom",
    body: "Práctica sirve para trabajar pregunta a pregunta con corrección inmediata.",
    points: [
      "Elige una opción y pulsa Comprobar.",
      "Verás si acertaste y la explicación oficial.",
      "Puedes marcar preguntas para repasarlas después.",
    ],
  },
  {
    title: "Simulacros y modelos",
    target: "modes",
    placement: "right",
    body: "Los modelos A, B, C y D son cuatro exámenes oficiales de ejemplo, cada uno con 40 preguntas.",
    points: [
      "Elegir un modelo en Simulacro reproduce ese examen concreto.",
      "Filtrar por modelo en Práctica muestra solo preguntas de ese documento.",
      "El modo Aleatorio mezcla preguntas del banco respetando la distribución CTFL v4.0 por capítulos.",
    ],
  },
  {
    title: "Capítulos",
    target: "chapters",
    placement: "right",
    body: "Los capítulos FL-1 a FL-6 son las áreas del syllabus CTFL v4.0.",
    points: [
      "FL-1 cubre fundamentos de prueba.",
      "FL-4 concentra análisis y diseño de pruebas y tiene bastante peso.",
      "Filtra por capítulo cuando quieras estudiar un bloque completo.",
    ],
  },
  {
    title: "Nivel K",
    target: "k-level",
    placement: "right",
    body: "El nivel K indica el tipo de esfuerzo cognitivo que pide la pregunta.",
    points: [
      "K1 es recordar definiciones o términos.",
      "K2 es comprender, comparar o distinguir conceptos.",
      "K3 es aplicar técnicas en casos prácticos.",
    ],
  },
  {
    title: "Referencia y estado",
    target: "reference-status",
    placement: "right",
    body: "La referencia apunta al objetivo concreto del syllabus y el estado usa tu progreso local.",
    points: [
      "Usa Referencia para estudiar un objetivo como FL-4.2.2.",
      "Usa Estado para ver sin responder, últimas incorrectas o marcadas.",
      "Combina ambos filtros para repasar con precisión.",
    ],
  },
  {
    title: "Revisión y progreso",
    target: "progress-actions",
    placement: "right",
    body: "Al finalizar un simulacro verás puntuación, aprobado/no aprobado y explicaciones.",
    points: [
      "Aprobado significa al menos 26 de 40.",
      "La duración oficial es 60 minutos, o 75 minutos con extensión del 25%.",
      "Exportar guarda una copia JSON de tu progreso.",
      "Importar restaura ese progreso en otro navegador o sesión.",
    ],
  },
];

function classNames(...values: Array<string | false | undefined>) {
  return values.filter(Boolean).join(" ");
}

function questionLabel(question: Question) {
  return `${question.sourceModel}-${String(question.sourceNumber).padStart(2, "0")}`;
}

function progressLabel(progress: ProgressState, question: Question, copy: Copy) {
  const item = progress.questionProgress[question.id];
  if (!item?.attempts) return copy.unseen;
  return item.lastCorrect ? copy.lastCorrect : copy.lastIncorrect;
}

function parseExplanation(explanation: string) {
  const matches = Array.from(explanation.matchAll(/(?:^|\s)([a-e])\)\s+/g));
  if (!matches.length) {
    return {
      intro: explanation.trim(),
      options: [] as Array<{ key: string; text: string }>,
    };
  }

  const first = matches[0];
  const intro = explanation.slice(0, first.index).trim();
  const options = matches.map((match, index) => {
    const start = (match.index ?? 0) + match[0].length;
    const end = index + 1 < matches.length ? matches[index + 1].index ?? explanation.length : explanation.length;
    return {
      key: match[1],
      text: explanation.slice(start, end).trim(),
    };
  });

  return { intro, options };
}

function getObjective(reference: string): Objective | undefined {
  return questionBank.objectives.find((objective) => objective.code === reference);
}

function localizedChapterName(chapterId: string, language: Language) {
  const chapter = chapters.find((item) => item.id === chapterId);
  if (!chapter) return chapterId;
  return language === "es" ? chapter.translations?.es?.name ?? chapter.name : chapter.name;
}

function localizedObjective(objective: Objective, language: Language) {
  const translation = language === "es" ? objective.translations?.es : undefined;
  return {
    text: translation?.text ?? objective.text,
    sectionTitle: translation?.sectionTitle ?? objective.sectionTitle,
    syllabusPage: translation?.syllabusPage ?? objective.syllabusPage,
  };
}

function localizedQuestion(question: Question, language: Language) {
  const translation = language === "es" ? question.translations?.es : undefined;
  return {
    prompt: translation?.prompt ?? question.prompt,
    options: translation?.options?.length ? translation.options : question.options,
    selector: translation?.selector ?? question.selector,
    explanation: translation?.explanation ?? question.explanation,
  };
}

function hasActiveFilters(filters: QuestionFilters) {
  return (
    filters.query.trim().length > 0 ||
    filters.models.length > 0 ||
    filters.chapters.length > 0 ||
    filters.kLevels.length > 0 ||
    filters.references.length > 0 ||
    filters.status !== "all"
  );
}

function hashString(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function shuffledOptions(question: Question, language: Language) {
  const options = [...localizedQuestion(question, language).options];
  const originalOrder = options.map((option) => option.key).join("");
  let state = hashString(question.id);
  for (let index = options.length - 1; index > 0; index -= 1) {
    state = Math.imul(state ^ (state >>> 15), 2246822507) >>> 0;
    const swapIndex = state % (index + 1);
    [options[index], options[swapIndex]] = [options[swapIndex], options[index]];
  }
  if (options.length > 1 && options.map((option) => option.key).join("") === originalOrder) {
    options.push(options.shift()!);
  }
  return options;
}

const displayLetters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

function getDisplayOptions(question: Question, language: Language) {
  return shuffledOptions(question, language).map((option, index) => ({
    ...option,
    displayKey: displayLetters[index] ?? String(index + 1),
    text: cleanOptionText(option.text),
  }));
}

function cleanOptionText(text: string) {
  return text.replace(/\s+Sample Exams set [A-D]\s*$/i, "").trim();
}

function cleanExplanationText(text: string) {
  return text
    .replace(/^(?:is\s+)?not\s+correct\.?\s*/i, "")
    .replace(/^(?:is\s+)?correct\.?\s*/i, "")
    .trim();
}

function displayAnswerLabels(question: Question, answerKeys: string[], language: Language) {
  const displayKeyByOriginalKey = new Map(getDisplayOptions(question, language).map((option) => [option.key, option.displayKey]));
  return answerKeys.map((key) => displayKeyByOriginalKey.get(key) ?? key.toUpperCase()).join(", ");
}

function selectorLabel(question: Question, copy: Copy) {
  if (question.selectionMode === "multiple") return copy.selectTwo;
  return copy.selectOne;
}

function formatRemainingTime(milliseconds: number) {
  const totalSeconds = Math.ceil(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function AppShell() {
  const navigate = useNavigate();
  const [language, setLanguage] = useState<Language>("en");
  const [theme, setTheme] = useState<Theme>(() => {
    const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (savedTheme === "light" || savedTheme === "dark") return savedTheme;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showSpanishNotice, setShowSpanishNotice] = useState(false);
  const copy = uiCopy[language];
  const [progress, setProgress] = useState<ProgressState>(() => loadProgress());
  const [filters, setFilters] = useState<QuestionFilters>(emptyFilters);
  const [studyIndex, setStudyIndex] = useState(0);
  const [studyAnswers, setStudyAnswers] = useState<AnswerMap>({});
  const [studyRevealed, setStudyRevealed] = useState(false);
  const [activeExam, setActiveExam] = useState<ExamState | null>(null);
  const [examTimerMode, setExamTimerMode] = useState<TimerMode>("standard");
  const [now, setNow] = useState(() => Date.now());
  const [review, setReview] = useState<ReviewState | null>(null);
  const [tutorialStep, setTutorialStep] = useState(0);

  useEffect(() => {
    saveProgress(progress);
  }, [progress]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  useEffect(() => {
    if (!activeExam?.endsAt) return undefined;
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [activeExam?.endsAt]);

  useEffect(() => {
    if (!isMenuOpen) return undefined;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsMenuOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isMenuOpen]);

  useEffect(() => {
    if (!isMenuOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isMenuOpen]);

  const filteredQuestions = useMemo(() => filterQuestions(questions, filters, progress, language), [filters, progress, language]);
  const progressSummary = useMemo(() => summarizeProgress(questions, progress), [progress]);
  const references = useMemo(() => Array.from(new Set(questions.map((question) => question.reference))).sort(), []);
  const tutorialTarget = progress.preferences.tutorialCompleted ? undefined : tutorialSteps[tutorialStep].target;

  useEffect(() => {
    setStudyIndex(0);
    setStudyRevealed(false);
  }, [filters]);

  const currentStudyQuestion = filteredQuestions[Math.min(studyIndex, Math.max(filteredQuestions.length - 1, 0))];

  function updateProgress(next: ProgressState) {
    setProgress(next);
  }

  function handleStudyToggle(question: Question, optionKey: string) {
    if (studyRevealed) return;
    setStudyAnswers((current) => ({
      ...current,
      [question.id]: toggleAnswer(question, current[question.id], optionKey),
    }));
  }

  function handleStudyCheck(question: Question) {
    const selected = studyAnswers[question.id] ?? [];
    const correct = isCorrectAnswer(question, selected);
    updateProgress(recordQuestionAttempt(progress, question.id, selected, correct));
    setStudyRevealed(true);
  }

  function handleStudyNext(direction: 1 | -1) {
    setStudyIndex((current) => {
      const next = Math.min(Math.max(current + direction, 0), Math.max(filteredQuestions.length - 1, 0));
      return next;
    });
    setStudyRevealed(false);
  }

  function handleStudyRandom() {
    setStudyIndex((current) => {
      if (filteredQuestions.length <= 1) return current;
      let next = current;
      while (next === current) {
        next = Math.floor(Math.random() * filteredQuestions.length);
      }
      return next;
    });
    setStudyRevealed(false);
  }

  function handleFlag(questionId: string) {
    updateProgress(toggleFlag(progress, questionId));
  }

  function startExam(blueprint: ExamBlueprint) {
    const duration =
      examTimerMode === "standard"
        ? examRules.durationMinutes
        : examTimerMode === "extended"
          ? examRules.extendedDurationMinutes
          : null;
    setNow(Date.now());
    setActiveExam({
      blueprint,
      currentIndex: 0,
      answers: {},
      timerMode: examTimerMode,
      endsAt: duration ? Date.now() + duration * 60 * 1000 : null,
    });
    setReview(null);
    navigate("/exam");
  }

  function cancelExam() {
    if (confirm(language === "es" ? "¿Cancelar este simulacro? Las respuestas actuales no se guardarán." : "Cancel this exam? Current answers will not be saved.")) {
      setActiveExam(null);
      navigate("/exam");
    }
  }

  function updateExamAnswer(question: Question, optionKey: string) {
    setActiveExam((current) => {
      if (!current) return current;
      return {
        ...current,
        answers: {
          ...current.answers,
          [question.id]: toggleAnswer(question, current.answers[question.id], optionKey),
        },
      };
    });
  }

  function moveExam(direction: 1 | -1) {
    setActiveExam((current) => {
      if (!current) return current;
      return {
        ...current,
        currentIndex: Math.min(Math.max(current.currentIndex + direction, 0), current.blueprint.questionIds.length - 1),
      };
    });
  }

  function finishExam() {
    if (!activeExam) return;
    const examQuestions = findQuestionsByIds(questions, activeExam.blueprint.questionIds);
    const score = scoreQuestions(examQuestions, activeExam.answers, examRules);
    let nextProgress = progress;

    for (const result of score.results) {
      nextProgress = recordQuestionAttempt(nextProgress, result.questionId, result.selectedAnswers, result.isCorrect);
    }

    const { results: _results, ...scoreSummary } = score;
    const session: StoredSession = {
      id: `${activeExam.blueprint.id}-${Date.now()}`,
      title: activeExam.blueprint.title,
      mode: "exam",
      questionIds: activeExam.blueprint.questionIds,
      answers: activeExam.answers,
      score: scoreSummary,
      completedAt: new Date().toISOString(),
    };

    updateProgress(addSession(nextProgress, session));
    setReview({
      title: activeExam.blueprint.title,
      questions: examQuestions,
      answers: activeExam.answers,
      score,
    });
    setActiveExam(null);
    navigate("/review");
  }

  function handleImport(raw: string) {
    try {
      const imported = importProgress(raw);
      updateProgress(imported);
    } catch (error) {
      alert(error instanceof Error ? error.message : language === "es" ? "No se pudo importar el progreso." : "Progress could not be imported.");
    }
  }

  function handleExport() {
    const blob = new Blob([exportProgress(progress)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = language === "es" ? "istqb-ctfl-v4-progreso.json" : "istqb-ctfl-v4-progress.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  function handleReset() {
    if (confirm(language === "es" ? "Esto borrará todo el progreso local de esta web." : "This will delete all local progress for this site.")) {
      updateProgress(clearProgress());
      setTutorialStep(0);
      setStudyAnswers({});
      setStudyRevealed(false);
      setReview(null);
      setActiveExam(null);
      navigate("/");
    }
  }

  function handleTutorialReset() {
    setTutorialStep(0);
    updateProgress(setTutorialCompleted(progress, false));
  }

  function handleTutorialComplete() {
    updateProgress(setTutorialCompleted(progress, true));
    setTutorialStep(0);
  }

  function handleLanguageChange(nextLanguage: Language) {
    setLanguage(nextLanguage);
    if (nextLanguage === "es" && window.localStorage.getItem(SPANISH_TRANSLATION_NOTICE_KEY) !== "true") {
      setShowSpanishNotice(true);
    }
  }

  function closeSpanishNotice() {
    window.localStorage.setItem(SPANISH_TRANSLATION_NOTICE_KEY, "true");
    setShowSpanishNotice(false);
  }

  return (
    <div className="app" data-theme={theme}>
      <button
        className="mobile-menu-toggle"
        type="button"
        aria-label={isMenuOpen ? copy.closeMenu : copy.openMenu}
        aria-expanded={isMenuOpen}
        aria-controls="main-menu"
        onClick={() => setIsMenuOpen((current) => !current)}
      >
        {isMenuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
      </button>

      {isMenuOpen && <button className="menu-backdrop" type="button" aria-label={copy.closeMenu} onClick={() => setIsMenuOpen(false)} />}

      <aside
        className={classNames("sidebar", isMenuOpen && "is-open", tutorialTarget === "layout" && "tutorial-highlight")}
        id="main-menu"
      >
        <div className="brand">
          <div className="brand-copy">
            <span className="eyebrow">ISTQB CTFL v4.0</span>
            <h1>{copy.trainer}</h1>
          </div>
          <div className="brand-language">
            <FlagLanguageToggle language={language} onChange={handleLanguageChange} />
          </div>
        </div>

        <nav className={classNames("mode-tabs", tutorialTarget === "modes" && "tutorial-highlight")} aria-label={copy.modesLabel}>
          <NavLink to="/" end onClick={() => setIsMenuOpen(false)}>
            {copy.practice}
          </NavLink>
          <NavLink to="/exam" onClick={() => setIsMenuOpen(false)}>{copy.exam}</NavLink>
          <NavLink to="/review" onClick={() => setIsMenuOpen(false)}>{copy.review}</NavLink>
        </nav>

        <button
          className="theme-toggle"
          type="button"
          role="switch"
          aria-checked={theme === "dark"}
          onClick={() => setTheme((current) => current === "light" ? "dark" : "light")}
        >
          <span className="theme-toggle-label">
            <Moon aria-hidden="true" />
            {copy.darkMode}
          </span>
          <span className="theme-switch" aria-hidden="true"><span /></span>
        </button>

        <FiltersPanel
          filters={filters}
          setFilters={setFilters}
          references={references}
          tutorialTarget={tutorialTarget}
          onExport={handleExport}
          onImport={handleImport}
          onReset={handleReset}
          onTutorialReset={handleTutorialReset}
          language={language}
          copy={copy}
        />
        <StatsPanel progressSummary={progressSummary} highlighted={tutorialTarget === "progress-actions"} copy={copy} />
      </aside>

      <Routes>
        <Route
          path="/"
          element={
            <StudyView
              filteredQuestions={filteredQuestions}
              currentQuestion={currentStudyQuestion}
              currentIndex={studyIndex}
              selected={currentStudyQuestion ? studyAnswers[currentStudyQuestion.id] ?? [] : []}
              revealed={studyRevealed}
              progress={progress}
              onToggle={handleStudyToggle}
              onCheck={handleStudyCheck}
              onMove={handleStudyNext}
              onRandom={handleStudyRandom}
              onSelectIndex={(index) => {
                setStudyIndex(index);
                setStudyRevealed(false);
              }}
              onFlag={handleFlag}
              highlighted={tutorialTarget === "practice"}
              language={language}
              onLanguageChange={handleLanguageChange}
              copy={copy}
            />
          }
        />
        <Route
          path="/exam"
          element={
            <ExamView
              activeExam={activeExam}
              timerMode={examTimerMode}
              onTimerModeChange={setExamTimerMode}
              now={now}
              onStartModel={(model) => startExam(createModelExam(questions, model))}
              onStartRandom={() =>
                startExam(createRandomExam(questions, questionBank.metadata.chapterDistribution, String(Date.now())))
              }
              onToggle={updateExamAnswer}
              onMove={moveExam}
              onJump={(index) =>
                setActiveExam((current) => (current ? { ...current, currentIndex: index } : current))
              }
              onCancel={cancelExam}
              onFinish={finishExam}
              language={language}
              copy={copy}
            />
          }
        />
        <Route path="/review" element={<ReviewView review={review} sessions={progress.sessions} language={language} copy={copy} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {!progress.preferences.tutorialCompleted && (
        <OnboardingTutorial
          currentStep={tutorialStep}
          totalSteps={tutorialSteps.length}
          onBack={() => setTutorialStep((current) => Math.max(current - 1, 0))}
          onNext={() =>
            setTutorialStep((current) => Math.min(current + 1, tutorialSteps.length - 1))
          }
          onComplete={handleTutorialComplete}
        />
      )}
      {showSpanishNotice && <TranslationNotice copy={copy} onClose={closeSpanishNotice} />}
    </div>
  );
}

function TranslationNotice({ copy, onClose }: { copy: Copy; onClose: () => void }) {
  return (
    <div className="notice-backdrop" role="presentation" onClick={onClose}>
      <section
        className="notice-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="translation-notice-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="translation-notice-title">{copy.translationNoticeTitle}</h2>
        <p>{copy.translationNoticeText}</p>
        <button className="primary" type="button" onClick={onClose}>
          <CheckCircle2 aria-hidden="true" />
          {copy.translationNoticeAction}
        </button>
      </section>
    </div>
  );
}

function StatsPanel({
  progressSummary,
  highlighted,
  copy,
}: {
  progressSummary: ReturnType<typeof summarizeProgress>;
  highlighted: boolean;
  copy: Copy;
}) {
  return (
    <section className={classNames("panel compact progress-panel", highlighted && "tutorial-highlight")}>
      <h2>{copy.localProgress}</h2>
      <div className="stat-grid">
        <Metric label={copy.viewed} value={progressSummary.attempted} />
        <Metric label={copy.correct} value={progressSummary.correct} />
        <Metric label={copy.wrong} value={progressSummary.incorrect} />
        <Metric label={copy.flagged} value={progressSummary.flagged} />
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="metric">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function FiltersPanel({
  filters,
  setFilters,
  references,
  tutorialTarget,
  onExport,
  onImport,
  onReset,
  onTutorialReset,
  language,
  copy,
}: {
  filters: QuestionFilters;
  setFilters: (filters: QuestionFilters) => void;
  references: string[];
  tutorialTarget: string | undefined;
  onExport: () => void;
  onImport: (raw: string) => void;
  onReset: () => void;
  onTutorialReset: () => void;
  language: Language;
  copy: Copy;
}) {
  const fileInput = useRef<HTMLInputElement | null>(null);

  function toggleValue<T extends string>(values: T[], value: T) {
    return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
  }

  function readImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    file.text().then(onImport);
    event.target.value = "";
  }

  const filtersActive = hasActiveFilters(filters);

  return (
    <section className={classNames("panel filters", tutorialTarget === "layout" && "tutorial-highlight")}>
      <h2>
        <Filter aria-hidden="true" />
        {copy.filters}
      </h2>

      <div className="search-row">
        <label className="search-box">
          <Search aria-hidden="true" />
          <input
            value={filters.query}
            onChange={(event) => setFilters({ ...filters, query: event.target.value })}
            placeholder={copy.searchPlaceholder}
          />
        </label>
        {filtersActive && (
          <button
            className="icon-button compact"
            type="button"
            onClick={() => setFilters(emptyFilters)}
            title={copy.clearFilters}
            aria-label={copy.clearFilters}
            data-tooltip={copy.clearFilters}
          >
            <RotateCcw aria-hidden="true" />
          </button>
        )}
      </div>

      <FilterGroup title={copy.model} highlighted={tutorialTarget === "modes"}>
        {models.map((model) => (
          <label className="check-pill" key={model}>
            <input
              type="checkbox"
              checked={filters.models.includes(model)}
              onChange={() => setFilters({ ...filters, models: toggleValue(filters.models, model) })}
            />
            {model}
          </label>
        ))}
      </FilterGroup>

      <FilterGroup title={copy.chapter} highlighted={tutorialTarget === "chapters"}>
        {chapters.map((chapter) => (
          <label className="check-pill wide" key={chapter.id} title={localizedChapterName(chapter.id, language)}>
            <input
              type="checkbox"
              checked={filters.chapters.includes(chapter.id)}
              onChange={() => setFilters({ ...filters, chapters: toggleValue(filters.chapters, chapter.id) })}
            />
            {chapter.id}
          </label>
        ))}
      </FilterGroup>

      <FilterGroup title="K-Level" highlighted={tutorialTarget === "k-level"}>
        {kLevels.map((level) => (
          <label className="check-pill" key={level}>
            <input
              type="checkbox"
              checked={filters.kLevels.includes(level)}
              onChange={() => setFilters({ ...filters, kLevels: toggleValue(filters.kLevels, level) })}
            />
            {level}
          </label>
        ))}
      </FilterGroup>

      <label className={classNames("field-label", tutorialTarget === "reference-status" && "tutorial-highlight")}>
        {copy.reference}
        <select
          value={filters.references[0] ?? ""}
          onChange={(event) =>
            setFilters({ ...filters, references: event.target.value ? [event.target.value] : [] })
          }
        >
          <option value="">{copy.all}</option>
          {references.map((reference) => (
            <option value={reference} key={reference}>
              {reference}
            </option>
          ))}
        </select>
      </label>

      <label className={classNames("field-label", tutorialTarget === "reference-status" && "tutorial-highlight")}>
        {copy.status}
        <select
          value={filters.status}
          onChange={(event) => setFilters({ ...filters, status: event.target.value as QuestionFilters["status"] })}
        >
          <option value="all">{copy.all}</option>
          <option value="unseen">{copy.unseen}</option>
          <option value="correct">{copy.lastCorrect}</option>
          <option value="incorrect">{copy.lastIncorrect}</option>
          <option value="flagged">{copy.flagged}</option>
        </select>
      </label>

      <div className={classNames("filter-actions", tutorialTarget === "progress-actions" && "tutorial-highlight")}>
        <button className="secondary" type="button" onClick={onExport}>
          <Download aria-hidden="true" />
          {copy.export}
        </button>
        <button className="secondary" type="button" onClick={() => fileInput.current?.click()}>
          <FileUp aria-hidden="true" />
          {copy.import}
        </button>
        <button className="secondary" type="button" onClick={onTutorialReset}>
          <CircleHelp aria-hidden="true" />
          {copy.tutorial}
        </button>
        <button className="danger" type="button" onClick={onReset}>
          <Trash2 aria-hidden="true" />
          {copy.delete}
        </button>
      </div>
      <input ref={fileInput} className="visually-hidden" type="file" accept="application/json" onChange={readImport} />
    </section>
  );
}

function FilterGroup({
  title,
  children,
  highlighted = false,
}: {
  title: string;
  children: ReactNode;
  highlighted?: boolean;
}) {
  return (
    <fieldset className={classNames("filter-group", highlighted && "tutorial-highlight")}>
      <legend>{title}</legend>
      <div className="pill-row">{children}</div>
    </fieldset>
  );
}

function StudyView({
  filteredQuestions,
  currentQuestion,
  currentIndex,
  selected,
  revealed,
  progress,
  onToggle,
  onCheck,
  onMove,
  onRandom,
  onSelectIndex,
  onFlag,
  highlighted,
  language,
  onLanguageChange,
  copy,
}: {
  filteredQuestions: Question[];
  currentQuestion: Question | undefined;
  currentIndex: number;
  selected: string[];
  revealed: boolean;
  progress: ProgressState;
  onToggle: (question: Question, optionKey: string) => void;
  onCheck: (question: Question) => void;
  onMove: (direction: 1 | -1) => void;
  onRandom: () => void;
  onSelectIndex: (index: number) => void;
  onFlag: (questionId: string) => void;
  highlighted: boolean;
  language: Language;
  onLanguageChange: (language: Language) => void;
  copy: Copy;
}) {
  if (!currentQuestion) {
    return (
      <main className="workspace">
        <EmptyState title={copy.noQuestions} text={copy.changeFilters} />
      </main>
    );
  }

  const isCorrect = revealed && isCorrectAnswer(currentQuestion, selected);

  return (
    <main className={classNames("workspace", highlighted && "tutorial-highlight")}>
      <header className="workspace-header">
        <div>
          <span className="eyebrow">{copy.practice}</span>
          <h2>{copy.practiceTitle}</h2>
        </div>
        <div className="header-metrics">
          <Metric label={copy.filtered} value={filteredQuestions.length} />
          <Metric label={copy.current} value={`${currentIndex + 1}/${filteredQuestions.length}`} />
          <FlagLanguageToggle language={language} onChange={onLanguageChange} />
        </div>
      </header>

      <QuestionCard
        question={currentQuestion}
        selected={selected}
        revealed={revealed}
        progressText={progressLabel(progress, currentQuestion, copy)}
        flagged={progress.questionProgress[currentQuestion.id]?.flagged ?? false}
        locked={revealed}
        onToggle={(optionKey) => onToggle(currentQuestion, optionKey)}
        onFlag={() => onFlag(currentQuestion.id)}
        language={language}
        copy={copy}
      />

      {revealed && (
        <section className={classNames("feedback", isCorrect ? "correct" : "incorrect")}>
          <div className="feedback-title">
            {isCorrect ? <CheckCircle2 aria-hidden="true" /> : <XCircle aria-hidden="true" />}
            <strong>{isCorrect ? copy.correctAnswer : language === "es" ? "Incorrecta" : "Incorrect"}</strong>
          </div>
          <ExplanationPanel question={currentQuestion} selected={selected} language={language} copy={copy} />
        </section>
      )}

      <div className="action-bar study-actions">
        <button className="secondary" type="button" onClick={() => onMove(-1)} disabled={currentIndex === 0}>
          <ChevronLeft aria-hidden="true" />
          {copy.previous}
        </button>
        <button
          className="primary"
          type="button"
          onClick={() => onCheck(currentQuestion)}
          disabled={selected.length === 0 || revealed}
        >
          <CheckCircle2 aria-hidden="true" />
          {copy.check}
        </button>
        <button className="secondary" type="button" onClick={onRandom} disabled={filteredQuestions.length <= 1}>
          <Shuffle aria-hidden="true" />
          {copy.random}
        </button>
        <button
          className="secondary"
          type="button"
          onClick={() => onMove(1)}
          disabled={currentIndex >= filteredQuestions.length - 1}
        >
          {copy.next}
          <ChevronRight aria-hidden="true" />
        </button>
      </div>

      <QuestionRail questions={filteredQuestions} currentIndex={currentIndex} progress={progress} onSelect={onSelectIndex} copy={copy} />
    </main>
  );
}

function FlagLanguageToggle({ language, onChange }: { language: Language; onChange: (language: Language) => void }) {
  return (
    <div className="flag-language-toggle" aria-label="Language">
      <button
        className={language === "en" ? "active" : undefined}
        type="button"
        onClick={() => onChange("en")}
        aria-label="English"
        title="English"
      >
        <span className="flag-icon uk" aria-hidden="true" />
      </button>
      <button
        className={language === "es" ? "active" : undefined}
        type="button"
        onClick={() => onChange("es")}
        aria-label="Español"
        title="Español"
      >
        <span className="flag-icon spain" aria-hidden="true" />
      </button>
    </div>
  );
}

function ExamView({
  activeExam,
  timerMode,
  onTimerModeChange,
  now,
  onStartModel,
  onStartRandom,
  onToggle,
  onMove,
  onJump,
  onCancel,
  onFinish,
  language,
  copy,
}: {
  activeExam: ExamState | null;
  timerMode: TimerMode;
  onTimerModeChange: (mode: TimerMode) => void;
  now: number;
  onStartModel: (model: SourceModel) => void;
  onStartRandom: () => void;
  onToggle: (question: Question, optionKey: string) => void;
  onMove: (direction: 1 | -1) => void;
  onJump: (index: number) => void;
  onCancel: () => void;
  onFinish: () => void;
  language: Language;
  copy: Copy;
}) {
  if (!activeExam) {
    return (
      <main className="workspace">
        <header className="workspace-header">
          <div>
            <span className="eyebrow">{copy.exam}</span>
            <h2>{copy.examTitle}</h2>
          </div>
          <div className="header-metrics">
            <Metric label={copy.passedMetric} value="26/40" />
            <Metric label={copy.time} value={timerMode === "off" ? copy.noLimit : timerMode === "standard" ? "60 min" : "75 min"} />
          </div>
        </header>

        <section className="timer-panel" aria-label={copy.timer}>
          <div>
            <Timer aria-hidden="true" />
            <strong>{copy.timer}</strong>
          </div>
          <div className="timer-options">
            <label className="check-pill">
              <input
                type="radio"
                name="timer-mode"
                checked={timerMode === "standard"}
                onChange={() => onTimerModeChange("standard")}
              />
              60 min
            </label>
            <label className="check-pill">
              <input
                type="radio"
                name="timer-mode"
                checked={timerMode === "extended"}
                onChange={() => onTimerModeChange("extended")}
              />
              75 min
            </label>
            <label className="check-pill">
              <input
                type="radio"
                name="timer-mode"
                checked={timerMode === "off"}
                onChange={() => onTimerModeChange("off")}
              />
              {copy.noTime}
            </label>
          </div>
        </section>

        <section className="exam-start-grid">
          {models.map((model) => (
            <button className="start-card" type="button" onClick={() => onStartModel(model)} key={model}>
              <Play aria-hidden="true" />
              <strong>{copy.modelTitle} {model}</strong>
              <span>{copy.modelSubtitle}</span>
            </button>
          ))}
          <button className="start-card accent" type="button" onClick={onStartRandom}>
            <Shuffle aria-hidden="true" />
            <strong>{copy.random}</strong>
            <span>{copy.randomSubtitle}</span>
          </button>
        </section>
      </main>
    );
  }

  const examQuestions = findQuestionsByIds(questions, activeExam.blueprint.questionIds);
  const currentQuestion = examQuestions[activeExam.currentIndex];
  const answered = examQuestions.filter((question) => activeExam.answers[question.id]?.length).length;
  const remainingMs = activeExam.endsAt ? activeExam.endsAt - now : null;
  const timeIsUp = remainingMs !== null && remainingMs <= 0;
  const timeLabel = remainingMs === null ? copy.noLimit : formatRemainingTime(Math.max(remainingMs, 0));

  return (
    <main className="workspace">
      <header className="workspace-header">
        <div>
          <span className="eyebrow">{copy.activeExam}</span>
          <h2>{activeExam.blueprint.title}</h2>
        </div>
        <div className="header-metrics">
          <Metric label={copy.answered} value={`${answered}/40`} />
          <Metric label={copy.question} value={`${activeExam.currentIndex + 1}/40`} />
          <Metric label={copy.time} value={timeIsUp ? copy.timeUp.replace(".", "") : timeLabel} />
        </div>
      </header>

      {timeIsUp && (
        <section className="time-warning">
          <strong>{copy.timeUp}</strong>
          <span>{copy.timeUpText}</span>
        </section>
      )}

      <QuestionCard
        question={currentQuestion}
        selected={activeExam.answers[currentQuestion.id] ?? []}
        revealed={false}
        progressText={copy.noCorrection}
        flagged={false}
        locked={false}
        onToggle={(optionKey) => onToggle(currentQuestion, optionKey)}
        language={language}
        copy={copy}
      />

      <div className="action-bar">
        <button className="secondary" type="button" onClick={() => onMove(-1)} disabled={activeExam.currentIndex === 0}>
          <ChevronLeft aria-hidden="true" />
          {copy.previous}
        </button>
        <button className="primary" type="button" onClick={onFinish}>
          <CheckCircle2 aria-hidden="true" />
          {copy.finish}
        </button>
        <button className="danger" type="button" onClick={onCancel}>
          <X aria-hidden="true" />
          {copy.cancel}
        </button>
        <button
          className="secondary"
          type="button"
          onClick={() => onMove(1)}
          disabled={activeExam.currentIndex >= activeExam.blueprint.questionIds.length - 1}
        >
          {copy.next}
          <ChevronRight aria-hidden="true" />
        </button>
      </div>

      <ExamRail questions={examQuestions} activeExam={activeExam} onSelect={onJump} copy={copy} />
    </main>
  );
}

function QuestionCard({
  question,
  selected,
  revealed,
  progressText,
  flagged,
  locked,
  onToggle,
  onFlag,
  language,
  copy,
}: {
  question: Question;
  selected: string[];
  revealed: boolean;
  progressText: string;
  flagged: boolean;
  locked: boolean;
  onToggle: (optionKey: string) => void;
  onFlag?: () => void;
  language: Language;
  copy: Copy;
}) {
  const localized = localizedQuestion(question, language);
  const displayOptions = useMemo(() => getDisplayOptions(question, language), [question, language]);

  return (
    <section className="question-card">
      <div className="question-meta">
        <span>{questionLabel(question)}</span>
        <span>{question.chapter}</span>
        <span>{question.reference}</span>
        <span>{question.kLevel}</span>
        <span>{question.selectionMode === "multiple" ? copy.multiple : copy.single}</span>
      </div>
      <div className="question-title-row">
        <p className="prompt">{localized.prompt}</p>
        {onFlag && (
          <button
            className="icon-button"
            type="button"
            onClick={onFlag}
            title={flagged ? copy.removeFlag : copy.addFlag}
            aria-label={flagged ? copy.removeFlagAria : copy.addFlagAria}
            data-tooltip={flagged ? copy.removeFlag : copy.addFlag}
          >
            {flagged ? <BookmarkCheck aria-hidden="true" /> : <Bookmark aria-hidden="true" />}
          </button>
        )}
      </div>

      <QuestionVisual question={question} language={language} copy={copy} />

      <div className="options-list">
        {displayOptions.map((option) => {
          const isSelected = selected.includes(option.key);
          const isCorrect = question.correctAnswers.includes(option.key);
          const stateClass = revealed
            ? isCorrect
              ? "is-correct"
              : isSelected
                ? "is-wrong"
                : undefined
            : undefined;

          return (
            <label className={classNames("option-row", isSelected && "is-selected", stateClass)} key={option.key}>
              <input
                type={question.selectionMode === "multiple" ? "checkbox" : "radio"}
                name={question.id}
                checked={isSelected}
                disabled={locked}
                onChange={() => onToggle(option.key)}
              />
              <span className="option-key">{option.displayKey}</span>
              <span>{option.text}</span>
            </label>
          );
        })}
      </div>

      <div className="question-foot">
        <span>{progressText}</span>
        <span>{selectorLabel(question, copy)}</span>
      </div>
    </section>
  );
}

function QuestionVisual({ question, language, copy }: { question: Question; language: Language; copy: Copy }) {
  const [isOpen, setIsOpen] = useState(false);
  const visual = question.visual;

  useEffect(() => {
    if (!isOpen) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [isOpen]);

  if (!visual) return null;

  const alt = visual.alt[language];
  return (
    <>
      <figure className="question-visual">
        <button
          className="question-visual-trigger"
          type="button"
          onClick={() => setIsOpen(true)}
          aria-label={`${copy.expandImage}: ${alt}`}
        >
          <img src={visual.src} alt={alt} loading="lazy" />
          <span>{copy.expandImage}</span>
        </button>
      </figure>
      {isOpen && (
        <div className="image-backdrop" role="presentation" onClick={() => setIsOpen(false)}>
          <section
            className="image-modal"
            role="dialog"
            aria-modal="true"
            aria-label={alt}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="icon-button image-close"
              type="button"
              onClick={() => setIsOpen(false)}
              title={copy.closeImage}
              aria-label={copy.closeImage}
            >
              <X aria-hidden="true" />
            </button>
            <img src={visual.src} alt={alt} />
          </section>
        </div>
      )}
    </>
  );
}

function ExplanationPanel({
  question,
  selected,
  language,
  copy,
}: {
  question: Question;
  selected: string[];
  language: Language;
  copy: Copy;
}) {
  const localized = localizedQuestion(question, language);
  const parsed = parseExplanation(localized.explanation);
  const displayOptions = useMemo(() => getDisplayOptions(question, language), [question, language]);
  const displayKeyByOriginalKey = new Map(displayOptions.map((option) => [option.key, option.displayKey]));
  const displayOrderByOriginalKey = new Map(displayOptions.map((option, index) => [option.key, index]));
  const [isTheoryOpen, setIsTheoryOpen] = useState(false);
  const objective = getObjective(question.reference);

  if (!parsed.options.length) {
    return (
      <div className="explanation-panel">
        <TheoryButton objective={objective} onOpen={() => setIsTheoryOpen(true)} language={language} copy={copy} />
        <p className="explanation-text">{localized.explanation}</p>
        {isTheoryOpen && objective && <TheoryModal objective={objective} onClose={() => setIsTheoryOpen(false)} language={language} copy={copy} />}
      </div>
    );
  }

  return (
    <div className="explanation-panel">
      <TheoryButton objective={objective} onOpen={() => setIsTheoryOpen(true)} language={language} copy={copy} />
      {parsed.intro && <p className="explanation-intro">{parsed.intro}</p>}
      <div className="explanation-options">
        {[...parsed.options].sort((left, right) => {
          return (displayOrderByOriginalKey.get(left.key) ?? 0) - (displayOrderByOriginalKey.get(right.key) ?? 0);
        }).map((item) => {
          const isCorrect = question.correctAnswers.includes(item.key);
          const isSelected = selected.includes(item.key);
          return (
            <div
              className={classNames(
                "explanation-option",
                isCorrect && "correct",
                isSelected && !isCorrect && "selected-wrong",
                isSelected && "selected",
              )}
              key={item.key}
            >
              <div className="explanation-option-head">
                <span className="option-key">{displayKeyByOriginalKey.get(item.key) ?? item.key.toUpperCase()}</span>
                {isCorrect && <span className="reason-pill correct">{copy.correctAnswer}</span>}
                {isSelected && <span className="reason-pill selected">{copy.yourAnswer}</span>}
              </div>
              <p>{cleanExplanationText(item.text)}</p>
            </div>
          );
        })}
      </div>
      {isTheoryOpen && objective && <TheoryModal objective={objective} onClose={() => setIsTheoryOpen(false)} language={language} copy={copy} />}
    </div>
  );
}

function TheoryButton({
  objective,
  onOpen,
  language,
  copy,
}: {
  objective: Objective | undefined;
  onOpen: () => void;
  language: Language;
  copy: Copy;
}) {
  if (!objective) return null;
  const localized = localizedObjective(objective, language);

  return (
    <button className="theory-button" type="button" onClick={onOpen}>
      <BookOpen aria-hidden="true" />
      {copy.theory}
      {localized.syllabusPage ? <span>p. {localized.syllabusPage}</span> : null}
    </button>
  );
}

function TheoryModal({
  objective,
  onClose,
  language,
  copy,
}: {
  objective: Objective;
  onClose: () => void;
  language: Language;
  copy: Copy;
}) {
  const localized = localizedObjective(objective, language);
  return (
    <div className="theory-backdrop" role="presentation" onClick={onClose}>
      <section
        className="theory-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="theory-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button className="icon-button theory-close" type="button" onClick={onClose} title={language === "es" ? "Cerrar" : "Close"}>
          <X aria-hidden="true" />
        </button>
        <span className="eyebrow">{language === "es" ? "Syllabus CTFL v4.0" : "CTFL v4.0.1 Syllabus"}</span>
        <h2 id="theory-title">{objective.code}</h2>
        <dl className="theory-details">
          <div>
            <dt>{copy.objective}</dt>
            <dd>{localized.text}</dd>
          </div>
          <div>
            <dt>{copy.section}</dt>
            <dd>
              {objective.section}
              {localized.sectionTitle ? ` - ${localized.sectionTitle}` : ""}
            </dd>
          </div>
          <div>
            <dt>{copy.pdfPage}</dt>
            <dd>{localized.syllabusPage ? localized.syllabusPage : copy.unavailable}</dd>
          </div>
        </dl>
        <p className="theory-note">
          {copy.syllabusNote}
        </p>
      </section>
    </div>
  );
}

function QuestionRail({
  questions,
  currentIndex,
  progress,
  onSelect,
  copy,
}: {
  questions: Question[];
  currentIndex: number;
  progress: ProgressState;
  onSelect: (index: number) => void;
  copy: Copy;
}) {
  return (
    <details className="question-list">
      <summary>{copy.questionList} ({questions.length})</summary>
      <section className="question-rail">
        {questions.map((question, index) => {
          const questionProgress = progress.questionProgress[question.id];
          return (
            <button
              className={classNames(
                "rail-button",
                index === currentIndex && "active",
                questionProgress?.lastCorrect && "correct",
                Boolean(questionProgress?.attempts) && !questionProgress?.lastCorrect && "incorrect",
                questionProgress?.flagged && "flagged",
              )}
              type="button"
              onClick={() => onSelect(index)}
              key={question.id}
              title={`${questionLabel(question)} - ${progressLabel(progress, question, copy)}`}
            >
              {questionLabel(question)}
            </button>
          );
        })}
      </section>
    </details>
  );
}

function ExamRail({
  questions,
  activeExam,
  onSelect,
  copy,
}: {
  questions: Question[];
  activeExam: ExamState;
  onSelect: (index: number) => void;
  copy: Copy;
}) {
  return (
    <details className="question-list">
      <summary>{copy.questionList} ({questions.length})</summary>
      <section className="question-rail">
        {questions.map((question, index) => (
          <button
            className={classNames(
              "rail-button",
              index === activeExam.currentIndex && "active",
              Boolean(activeExam.answers[question.id]?.length) && "answered",
            )}
            type="button"
            onClick={() => onSelect(index)}
            key={question.id}
          >
            {index + 1}
          </button>
        ))}
      </section>
    </details>
  );
}

function ReviewView({
  review,
  sessions,
  language,
  copy,
}: {
  review: ReviewState | null;
  sessions: StoredSession[];
  language: Language;
  copy: Copy;
}) {
  if (!review) {
    return (
      <main className="workspace">
        <header className="workspace-header">
          <div>
            <span className="eyebrow">{copy.review}</span>
            <h2>{copy.recentHistory}</h2>
          </div>
        </header>
        {sessions.length === 0 ? (
          <EmptyState title={copy.noSessions} text={copy.completeExam} />
        ) : (
          <section className="session-list">
            {sessions.map((session) => (
              <article className="session-row" key={session.id}>
                <div>
                  <strong>{session.title}</strong>
                  <span>{new Date(session.completedAt).toLocaleString()}</span>
                </div>
                <div className={classNames("score-pill", session.score.passed ? "passed" : "failed")}>
                  {session.score.score}/40
                </div>
              </article>
            ))}
          </section>
        )}
      </main>
    );
  }

  return (
    <main className="workspace">
      <header className="workspace-header">
        <div>
          <span className="eyebrow">{copy.review}</span>
          <h2>{review.title}</h2>
        </div>
        <div className="header-metrics">
          <Metric label={copy.points} value={`${review.score.score}/40`} />
          <Metric label={copy.result} value={review.score.passed ? copy.passed : copy.failed} />
          <Metric label={copy.percent} value={`${review.score.percent}%`} />
        </div>
      </header>

      <section className={classNames("result-banner", review.score.passed ? "passed" : "failed")}>
        <strong>{review.score.passed ? copy.passed : copy.notPassed}</strong>
        <span>
          {language === "es"
            ? `${review.score.correct} correctas, ${review.score.incorrect} incorrectas y ${review.score.blank} en blanco.`
            : `${review.score.correct} correct, ${review.score.incorrect} incorrect and ${review.score.blank} blank.`}
        </span>
      </section>

      <section className="review-list">
        {review.questions.map((question) => {
          const selected = review.answers[question.id] ?? [];
          const correct = isCorrectAnswer(question, selected);
          const localized = localizedQuestion(question, language);
          return (
            <article className="review-item" key={question.id}>
              <div className="review-head">
                <strong>{questionLabel(question)}</strong>
                <span className={classNames("score-pill", correct ? "passed" : "failed")}>
                  {correct ? copy.correctAnswer : selected.length ? (language === "es" ? "Incorrecta" : "Incorrect") : copy.blank}
                </span>
              </div>
              <p>{localized.prompt}</p>
              <QuestionVisual question={question} language={language} copy={copy} />
              <div className="answer-lines">
                <span>{copy.yourAnswer}: {selected.length ? displayAnswerLabels(question, selected, language) : copy.unanswered}</span>
                <span>{copy.correctAnswer}: {displayAnswerLabels(question, question.correctAnswers, language)}</span>
              </div>
              <ExplanationPanel question={question} selected={selected} language={language} copy={copy} />
            </article>
          );
        })}
      </section>
    </main>
  );
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <section className="empty-state">
      <strong>{title}</strong>
      <span>{text}</span>
    </section>
  );
}

function OnboardingTutorial({
  currentStep,
  totalSteps,
  onBack,
  onNext,
  onComplete,
}: {
  currentStep: number;
  totalSteps: number;
  onBack: () => void;
  onNext: () => void;
  onComplete: () => void;
}) {
  const step = tutorialSteps[currentStep];
  const isLastStep = currentStep === totalSteps - 1;

  return (
    <>
      <div className="tutorial-backdrop" role="presentation" />
      <section
        className={classNames("tutorial-modal", `placement-${step.placement}`)}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tutorial-title"
      >
        <div className="tutorial-header">
          <span className="eyebrow">Tutorial obligatorio</span>
          <h2 id="tutorial-title">{step.title}</h2>
        </div>
        <p>{step.body}</p>
        <ul>
          {step.points.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>
        <div className="tutorial-progress" aria-label={`Paso ${currentStep + 1} de ${totalSteps}`}>
          {tutorialSteps.map((item, index) => (
            <span
              className={classNames("tutorial-dot", index === currentStep && "active")}
              key={item.title}
            />
          ))}
        </div>
        <div className="tutorial-actions">
          <button className="secondary" type="button" onClick={onBack} disabled={currentStep === 0}>
            <ChevronLeft aria-hidden="true" />
            Anterior
          </button>
          {isLastStep ? (
            <button className="primary" type="button" onClick={onComplete}>
              <CheckCircle2 aria-hidden="true" />
              Completar tutorial
            </button>
          ) : (
            <button className="primary" type="button" onClick={onNext}>
              Siguiente
              <ChevronRight aria-hidden="true" />
            </button>
          )}
        </div>
      </section>
    </>
  );
}

export function App() {
  return (
    <HashRouter>
      <AppShell />
    </HashRouter>
  );
}
