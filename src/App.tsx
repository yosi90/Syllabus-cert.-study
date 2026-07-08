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
  ListChecks,
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

type ReviewState = {
  title: string;
  questions: Question[];
  answers: AnswerMap;
  score: SessionScore;
};

const models: SourceModel[] = ["A", "B", "C", "D"];
const kLevels: KLevel[] = ["K1", "K2", "K3"];
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

function progressLabel(progress: ProgressState, question: Question) {
  const item = progress.questionProgress[question.id];
  if (!item?.attempts) return "Sin responder";
  return item.lastCorrect ? "Última correcta" : "Última incorrecta";
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

function shuffledOptions(question: Question) {
  const options = [...question.options];
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

function getDisplayOptions(question: Question) {
  return shuffledOptions(question).map((option, index) => ({
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

function displayAnswerLabels(question: Question, answerKeys: string[]) {
  const displayKeyByOriginalKey = new Map(getDisplayOptions(question).map((option) => [option.key, option.displayKey]));
  return answerKeys.map((key) => displayKeyByOriginalKey.get(key) ?? key.toUpperCase()).join(", ");
}

function formatRemainingTime(milliseconds: number) {
  const totalSeconds = Math.ceil(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function AppShell() {
  const navigate = useNavigate();
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
    if (!activeExam?.endsAt) return undefined;
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [activeExam?.endsAt]);

  const filteredQuestions = useMemo(() => filterQuestions(questions, filters, progress), [filters, progress]);
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
    if (confirm("¿Cancelar este simulacro? Las respuestas actuales no se guardarán.")) {
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
      alert(error instanceof Error ? error.message : "No se pudo importar el progreso.");
    }
  }

  function handleExport() {
    const blob = new Blob([exportProgress(progress)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "istqb-ctfl-v4-progreso.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  function handleReset() {
    if (confirm("Esto borrará todo el progreso local de esta web.")) {
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

  return (
    <div className="app">
      <aside className={classNames("sidebar", tutorialTarget === "layout" && "tutorial-highlight")}>
        <div className="brand">
          <div>
            <span className="eyebrow">ISTQB CTFL v4.0</span>
            <h1>Entrenador</h1>
          </div>
          <ListChecks aria-hidden="true" />
        </div>

        <nav className={classNames("mode-tabs", tutorialTarget === "modes" && "tutorial-highlight")} aria-label="Modos">
          <NavLink to="/" end>
            Práctica
          </NavLink>
          <NavLink to="/exam">Simulacro</NavLink>
          <NavLink to="/review">Revisión</NavLink>
        </nav>

        <StatsPanel progressSummary={progressSummary} highlighted={tutorialTarget === "progress-actions"} />
        <FiltersPanel
          filters={filters}
          setFilters={setFilters}
          references={references}
          tutorialTarget={tutorialTarget}
          onExport={handleExport}
          onImport={handleImport}
          onReset={handleReset}
          onTutorialReset={handleTutorialReset}
        />
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
            />
          }
        />
        <Route path="/review" element={<ReviewView review={review} sessions={progress.sessions} />} />
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
    </div>
  );
}

function StatsPanel({
  progressSummary,
  highlighted,
}: {
  progressSummary: ReturnType<typeof summarizeProgress>;
  highlighted: boolean;
}) {
  return (
    <section className={classNames("panel compact", highlighted && "tutorial-highlight")}>
      <h2>Progreso local</h2>
      <div className="stat-grid">
        <Metric label="Vistas" value={progressSummary.attempted} />
        <Metric label="Correctas" value={progressSummary.correct} />
        <Metric label="Falladas" value={progressSummary.incorrect} />
        <Metric label="Marcadas" value={progressSummary.flagged} />
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
}: {
  filters: QuestionFilters;
  setFilters: (filters: QuestionFilters) => void;
  references: string[];
  tutorialTarget: string | undefined;
  onExport: () => void;
  onImport: (raw: string) => void;
  onReset: () => void;
  onTutorialReset: () => void;
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
        Filtros
      </h2>

      <div className="search-row">
        <label className="search-box">
          <Search aria-hidden="true" />
          <input
            value={filters.query}
            onChange={(event) => setFilters({ ...filters, query: event.target.value })}
            placeholder="Buscar texto, LO o tema"
          />
        </label>
        {filtersActive && (
          <button
            className="icon-button compact"
            type="button"
            onClick={() => setFilters(emptyFilters)}
            title="Limpiar filtros"
            aria-label="Limpiar filtros"
            data-tooltip="Limpiar filtros"
          >
            <RotateCcw aria-hidden="true" />
          </button>
        )}
      </div>

      <FilterGroup title="Modelo" highlighted={tutorialTarget === "modes"}>
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

      <FilterGroup title="Capítulo" highlighted={tutorialTarget === "chapters"}>
        {chapters.map((chapter) => (
          <label className="check-pill wide" key={chapter.id}>
            <input
              type="checkbox"
              checked={filters.chapters.includes(chapter.id)}
              onChange={() => setFilters({ ...filters, chapters: toggleValue(filters.chapters, chapter.id) })}
            />
            {chapter.id}
          </label>
        ))}
      </FilterGroup>

      <FilterGroup title="Nivel K" highlighted={tutorialTarget === "k-level"}>
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
        Referencia
        <select
          value={filters.references[0] ?? ""}
          onChange={(event) =>
            setFilters({ ...filters, references: event.target.value ? [event.target.value] : [] })
          }
        >
          <option value="">Todas</option>
          {references.map((reference) => (
            <option value={reference} key={reference}>
              {reference}
            </option>
          ))}
        </select>
      </label>

      <label className={classNames("field-label", tutorialTarget === "reference-status" && "tutorial-highlight")}>
        Estado
        <select
          value={filters.status}
          onChange={(event) => setFilters({ ...filters, status: event.target.value as QuestionFilters["status"] })}
        >
          <option value="all">Todas</option>
          <option value="unseen">Sin responder</option>
          <option value="correct">Última correcta</option>
          <option value="incorrect">Última incorrecta</option>
          <option value="flagged">Marcadas</option>
        </select>
      </label>

      <div className={classNames("filter-actions", tutorialTarget === "progress-actions" && "tutorial-highlight")}>
        <button className="secondary" type="button" onClick={onExport}>
          <Download aria-hidden="true" />
          Exportar
        </button>
        <button className="secondary" type="button" onClick={() => fileInput.current?.click()}>
          <FileUp aria-hidden="true" />
          Importar
        </button>
        <button className="secondary" type="button" onClick={onTutorialReset}>
          <CircleHelp aria-hidden="true" />
          Tutorial
        </button>
        <button className="danger" type="button" onClick={onReset}>
          <Trash2 aria-hidden="true" />
          Borrar
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
}) {
  if (!currentQuestion) {
    return (
      <main className="workspace">
        <EmptyState title="No hay preguntas con esos filtros" text="Cambia los filtros para recuperar el banco." />
      </main>
    );
  }

  const isCorrect = revealed && isCorrectAnswer(currentQuestion, selected);

  return (
    <main className={classNames("workspace", highlighted && "tutorial-highlight")}>
      <header className="workspace-header">
        <div>
          <span className="eyebrow">Práctica</span>
          <h2>Preguntas sueltas</h2>
        </div>
        <div className="header-metrics">
          <Metric label="Filtradas" value={filteredQuestions.length} />
          <Metric label="Actual" value={`${currentIndex + 1}/${filteredQuestions.length}`} />
        </div>
      </header>

      <QuestionCard
        question={currentQuestion}
        selected={selected}
        revealed={revealed}
        progressText={progressLabel(progress, currentQuestion)}
        flagged={progress.questionProgress[currentQuestion.id]?.flagged ?? false}
        locked={revealed}
        onToggle={(optionKey) => onToggle(currentQuestion, optionKey)}
        onFlag={() => onFlag(currentQuestion.id)}
      />

      {revealed && (
        <section className={classNames("feedback", isCorrect ? "correct" : "incorrect")}>
          <div className="feedback-title">
            {isCorrect ? <CheckCircle2 aria-hidden="true" /> : <XCircle aria-hidden="true" />}
            <strong>{isCorrect ? "Correcta" : "Incorrecta"}</strong>
          </div>
          <ExplanationPanel question={currentQuestion} selected={selected} />
        </section>
      )}

      <div className="action-bar">
        <button className="secondary" type="button" onClick={() => onMove(-1)} disabled={currentIndex === 0}>
          <ChevronLeft aria-hidden="true" />
          Anterior
        </button>
        <button
          className="primary"
          type="button"
          onClick={() => onCheck(currentQuestion)}
          disabled={selected.length === 0 || revealed}
        >
          <CheckCircle2 aria-hidden="true" />
          Comprobar
        </button>
        <button className="secondary" type="button" onClick={onRandom} disabled={filteredQuestions.length <= 1}>
          <Shuffle aria-hidden="true" />
          Aleatoria
        </button>
        <button
          className="secondary"
          type="button"
          onClick={() => onMove(1)}
          disabled={currentIndex >= filteredQuestions.length - 1}
        >
          Siguiente
          <ChevronRight aria-hidden="true" />
        </button>
      </div>

      <QuestionRail questions={filteredQuestions} currentIndex={currentIndex} progress={progress} onSelect={onSelectIndex} />
    </main>
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
}) {
  if (!activeExam) {
    return (
      <main className="workspace">
        <header className="workspace-header">
          <div>
            <span className="eyebrow">Simulacro</span>
            <h2>Examen de 40 preguntas</h2>
          </div>
          <div className="header-metrics">
            <Metric label="Aprobado" value="26/40" />
            <Metric label="Tiempo" value={timerMode === "off" ? "Sin límite" : timerMode === "standard" ? "60 min" : "75 min"} />
          </div>
        </header>

        <section className="timer-panel" aria-label="Temporizador del simulacro">
          <div>
            <Timer aria-hidden="true" />
            <strong>Temporizador</strong>
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
              Sin tiempo
            </label>
          </div>
        </section>

        <section className="exam-start-grid">
          {models.map((model) => (
            <button className="start-card" type="button" onClick={() => onStartModel(model)} key={model}>
              <Play aria-hidden="true" />
              <strong>Modelo {model}</strong>
              <span>40 preguntas oficiales en orden original.</span>
            </button>
          ))}
          <button className="start-card accent" type="button" onClick={onStartRandom}>
            <Shuffle aria-hidden="true" />
            <strong>Aleatorio</strong>
            <span>40 preguntas sin duplicados con distribución por capítulo.</span>
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
  const timeLabel = remainingMs === null ? "Sin límite" : formatRemainingTime(Math.max(remainingMs, 0));

  return (
    <main className="workspace">
      <header className="workspace-header">
        <div>
          <span className="eyebrow">Simulacro activo</span>
          <h2>{activeExam.blueprint.title}</h2>
        </div>
        <div className="header-metrics">
          <Metric label="Respondidas" value={`${answered}/40`} />
          <Metric label="Pregunta" value={`${activeExam.currentIndex + 1}/40`} />
          <Metric label="Tiempo" value={timeIsUp ? "Agotado" : timeLabel} />
        </div>
      </header>

      {timeIsUp && (
        <section className="time-warning">
          <strong>Tiempo agotado.</strong>
          <span>Puedes finalizar el simulacro para corregirlo o cancelarlo sin guardar.</span>
        </section>
      )}

      <QuestionCard
        question={currentQuestion}
        selected={activeExam.answers[currentQuestion.id] ?? []}
        revealed={false}
        progressText="Sin corrección hasta finalizar"
        flagged={false}
        locked={false}
        onToggle={(optionKey) => onToggle(currentQuestion, optionKey)}
      />

      <div className="action-bar">
        <button className="secondary" type="button" onClick={() => onMove(-1)} disabled={activeExam.currentIndex === 0}>
          <ChevronLeft aria-hidden="true" />
          Anterior
        </button>
        <button className="primary" type="button" onClick={onFinish}>
          <CheckCircle2 aria-hidden="true" />
          Finalizar
        </button>
        <button className="danger" type="button" onClick={onCancel}>
          <X aria-hidden="true" />
          Cancelar
        </button>
        <button
          className="secondary"
          type="button"
          onClick={() => onMove(1)}
          disabled={activeExam.currentIndex >= activeExam.blueprint.questionIds.length - 1}
        >
          Siguiente
          <ChevronRight aria-hidden="true" />
        </button>
      </div>

      <ExamRail questions={examQuestions} activeExam={activeExam} onSelect={onJump} />
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
}: {
  question: Question;
  selected: string[];
  revealed: boolean;
  progressText: string;
  flagged: boolean;
  locked: boolean;
  onToggle: (optionKey: string) => void;
  onFlag?: () => void;
}) {
  const displayOptions = useMemo(() => getDisplayOptions(question), [question]);

  return (
    <section className="question-card">
      <div className="question-meta">
        <span>{questionLabel(question)}</span>
        <span>{question.chapter}</span>
        <span>{question.reference}</span>
        <span>{question.kLevel}</span>
        <span>{question.selectionMode === "multiple" ? "Selección múltiple" : "Selección única"}</span>
      </div>
      <div className="question-title-row">
        <p className="prompt">{question.prompt}</p>
        {onFlag && (
          <button
            className="icon-button"
            type="button"
            onClick={onFlag}
            title={flagged ? "Quitar de marcadas" : "Marcar para repasar"}
            aria-label={flagged ? "Quitar pregunta de marcadas" : "Marcar pregunta para repasar"}
            data-tooltip={flagged ? "Quitar de marcadas" : "Marcar para repasar"}
          >
            {flagged ? <BookmarkCheck aria-hidden="true" /> : <Bookmark aria-hidden="true" />}
          </button>
        )}
      </div>

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
        <span>{question.selector}</span>
      </div>
    </section>
  );
}

function ExplanationPanel({ question, selected }: { question: Question; selected: string[] }) {
  const parsed = parseExplanation(question.explanation);
  const displayOptions = useMemo(() => getDisplayOptions(question), [question]);
  const displayKeyByOriginalKey = new Map(displayOptions.map((option) => [option.key, option.displayKey]));
  const displayOrderByOriginalKey = new Map(displayOptions.map((option, index) => [option.key, index]));
  const [isTheoryOpen, setIsTheoryOpen] = useState(false);
  const objective = getObjective(question.reference);

  if (!parsed.options.length) {
    return (
      <div className="explanation-panel">
        <TheoryButton objective={objective} onOpen={() => setIsTheoryOpen(true)} />
        <p className="explanation-text">{question.explanation}</p>
        {isTheoryOpen && objective && <TheoryModal objective={objective} onClose={() => setIsTheoryOpen(false)} />}
      </div>
    );
  }

  return (
    <div className="explanation-panel">
      <TheoryButton objective={objective} onOpen={() => setIsTheoryOpen(true)} />
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
                {isCorrect && <span className="reason-pill correct">Correcta</span>}
                {isSelected && <span className="reason-pill selected">Tu respuesta</span>}
              </div>
              <p>{cleanExplanationText(item.text)}</p>
            </div>
          );
        })}
      </div>
      {isTheoryOpen && objective && <TheoryModal objective={objective} onClose={() => setIsTheoryOpen(false)} />}
    </div>
  );
}

function TheoryButton({ objective, onOpen }: { objective: Objective | undefined; onOpen: () => void }) {
  if (!objective) return null;

  return (
    <button className="theory-button" type="button" onClick={onOpen}>
      <BookOpen aria-hidden="true" />
      Ver teoría
      {objective.syllabusPage ? <span>p. {objective.syllabusPage}</span> : null}
    </button>
  );
}

function TheoryModal({ objective, onClose }: { objective: Objective; onClose: () => void }) {
  return (
    <div className="theory-backdrop" role="presentation" onClick={onClose}>
      <section
        className="theory-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="theory-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button className="icon-button theory-close" type="button" onClick={onClose} title="Cerrar">
          <X aria-hidden="true" />
        </button>
        <span className="eyebrow">Syllabus CTFL v4.0.1</span>
        <h2 id="theory-title">{objective.code}</h2>
        <dl className="theory-details">
          <div>
            <dt>Objetivo</dt>
            <dd>{objective.text}</dd>
          </div>
          <div>
            <dt>Sección</dt>
            <dd>
              {objective.section}
              {objective.sectionTitle ? ` - ${objective.sectionTitle}` : ""}
            </dd>
          </div>
          <div>
            <dt>Página del PDF</dt>
            <dd>{objective.syllabusPage ? objective.syllabusPage : "No disponible"}</dd>
          </div>
        </dl>
        <p className="theory-note">
          Consulta esa página en <strong>Docs/ISTQB_CTFL_Syllabus_v4.0.1.pdf</strong>. El rationale oficial puede apoyarse
          también en conceptos de otras secciones del syllabus.
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
}: {
  questions: Question[];
  currentIndex: number;
  progress: ProgressState;
  onSelect: (index: number) => void;
}) {
  return (
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
            title={`${questionLabel(question)} - ${progressLabel(progress, question)}`}
          >
            {questionLabel(question)}
          </button>
        );
      })}
    </section>
  );
}

function ExamRail({
  questions,
  activeExam,
  onSelect,
}: {
  questions: Question[];
  activeExam: ExamState;
  onSelect: (index: number) => void;
}) {
  return (
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
  );
}

function ReviewView({ review, sessions }: { review: ReviewState | null; sessions: StoredSession[] }) {
  if (!review) {
    return (
      <main className="workspace">
        <header className="workspace-header">
          <div>
            <span className="eyebrow">Revisión</span>
            <h2>Historial reciente</h2>
          </div>
        </header>
        {sessions.length === 0 ? (
          <EmptyState title="Aún no hay simulacros terminados" text="Completa un simulacro para ver la revisión aquí." />
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
          <span className="eyebrow">Revisión</span>
          <h2>{review.title}</h2>
        </div>
        <div className="header-metrics">
          <Metric label="Puntos" value={`${review.score.score}/40`} />
          <Metric label="Resultado" value={review.score.passed ? "Apto" : "No apto"} />
          <Metric label="Porcentaje" value={`${review.score.percent}%`} />
        </div>
      </header>

      <section className={classNames("result-banner", review.score.passed ? "passed" : "failed")}>
        <strong>{review.score.passed ? "Aprobado" : "No aprobado"}</strong>
        <span>
          {review.score.correct} correctas, {review.score.incorrect} incorrectas y {review.score.blank} en blanco.
        </span>
      </section>

      <section className="review-list">
        {review.questions.map((question) => {
          const selected = review.answers[question.id] ?? [];
          const correct = isCorrectAnswer(question, selected);
          return (
            <article className="review-item" key={question.id}>
              <div className="review-head">
                <strong>{questionLabel(question)}</strong>
                <span className={classNames("score-pill", correct ? "passed" : "failed")}>
                  {correct ? "Correcta" : selected.length ? "Incorrecta" : "Blanco"}
                </span>
              </div>
              <p>{question.prompt}</p>
              <div className="answer-lines">
                <span>Tu respuesta: {selected.length ? displayAnswerLabels(question, selected) : "Sin responder"}</span>
                <span>Correcta: {displayAnswerLabels(question, question.correctAnswers)}</span>
              </div>
              <ExplanationPanel question={question} selected={selected} />
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
