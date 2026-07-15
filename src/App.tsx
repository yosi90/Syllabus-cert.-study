import { useEffect, useMemo, useState } from "react";
import { Menu, Moon, X } from "lucide-react";
import { HashRouter, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { chapters, examRules, questionBank, questions } from "./data/bank";
import type { Question, SourceModel } from "./data/types";
import { createModelExam, createRandomExam, findQuestionsByIds, type ExamBlueprint } from "./domain/exams";
import { emptyFilters, filterQuestions, summarizeProgress, type QuestionFilters } from "./domain/filters";
import { summarizeStudyDashboard } from "./domain/dashboard";
import { isCorrectAnswer, scoreQuestions, toggleAnswer, type AnswerMap } from "./domain/scoring";
import {
  addSession,
  clearProgress,
  exportProgress,
  importProgress,
  recordQuestionAttempt,
  setTutorialCompleted,
  toggleFlag,
  type ProgressState,
  type StoredSession,
} from "./storage/progress";

import {
  SPANISH_TRANSLATION_NOTICE_KEY,
  tutorialContent,
  uiCopy,
  type ExamState,
  type Language,
  type ReviewState,
  type TimerMode,
} from "./app/content";
import {
  classNames,
  restoreReview,
} from "./app/presentation";

import {
  ConfirmDialog,
  FlagLanguageToggle,
  OnboardingTutorial,
  StatsPanel,
  TranslationNotice,
} from "./components/common/CommonUi";

import { FiltersPanel } from "./components/sidebar/SidebarPanels";
import { MobilePrimaryNavigation, ModeNavigation } from "./components/navigation/AppNavigation";

import { ExamView } from "./views/ExamView";
import { ReviewView } from "./views/ReviewView";
import { StudyView } from "./views/StudyView";
import { HomeView } from "./views/HomeView";
import {
  useLastRouteRestoration,
  usePersistentTheme,
  useTrainerProgress,
  useWorkspacePersistence,
} from "./hooks/useTrainerPersistence";

function AppShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const [progress, setProgress] = useTrainerProgress();
  const [language, setLanguage] = useState<Language>(() => {
    if (progress.preferences.language) return progress.preferences.language;
    return navigator.language.toLowerCase().startsWith("es") ? "es" : "en";
  });
  const [theme, setTheme] = usePersistentTheme(progress.preferences.theme);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showSpanishNotice, setShowSpanishNotice] = useState(false);
  const copy = uiCopy[language];
  const tutorial = tutorialContent[language];
  const tutorialSteps = tutorial.steps;
  const [filters, setFilters] = useState<QuestionFilters>(() => progress.study.filters);
  const [studyQuestionId, setStudyQuestionId] = useState<string | null>(() => progress.study.currentQuestionId);
  const [studyAnswers, setStudyAnswers] = useState<AnswerMap>(() => progress.study.answers);
  const [studyRevealed, setStudyRevealed] = useState(() => progress.study.revealed);
  const [studyBatchSize, setStudyBatchSize] = useState<10 | 20 | null>(null);
  const [activeExam, setActiveExam] = useState<ExamState | null>(() => progress.activeExam);
  const [examTimerMode, setExamTimerMode] = useState<TimerMode>(() => progress.activeExam?.timerMode ?? "standard");
  const [now, setNow] = useState(() => Date.now());
  const [review, setReview] = useState<ReviewState | null>(() =>
    restoreReview(progress.sessions.find((session) => session.id === progress.review.sessionId)),
  );
  const [pendingConfirmation, setPendingConfirmation] = useState<"cancel-exam" | "reset-progress" | null>(null);
  const [tutorialStep, setTutorialStep] = useState(0);
  useLastRouteRestoration(location.pathname, progress.preferences.lastRoute, navigate);

  useWorkspacePersistence({
    setProgress,
    pathname: location.pathname,
    language,
    theme,
    filters,
    studyQuestionId,
    studyAnswers,
    studyRevealed,
    activeExam,
    review,
  });

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
  const studyQuestions = useMemo(
    () => studyBatchSize ? filteredQuestions.slice(0, studyBatchSize) : filteredQuestions,
    [filteredQuestions, studyBatchSize],
  );
  const progressSummary = useMemo(() => summarizeProgress(questions, progress), [progress]);
  const dashboard = useMemo(() => summarizeStudyDashboard(questions, chapters, progress), [progress]);
  const references = useMemo(() => Array.from(new Set(questions.map((question) => question.reference))).sort(), []);
  const tutorialTarget = progress.preferences.tutorialCompleted ? undefined : tutorialSteps[tutorialStep]?.target;
  const storedStudyIndex = studyQuestions.findIndex((question) => question.id === studyQuestionId);
  const studyIndex = storedStudyIndex >= 0 ? storedStudyIndex : 0;
  const currentStudyQuestion = studyQuestions[studyIndex];

  useEffect(() => {
    if (!studyQuestions.length) {
      if (studyQuestionId !== null) setStudyQuestionId(null);
      return;
    }
    if (storedStudyIndex < 0) {
      setStudyQuestionId(studyQuestions[0].id);
      setStudyRevealed(false);
    }
  }, [studyQuestions, storedStudyIndex, studyQuestionId]);

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
    const next = Math.min(Math.max(studyIndex + direction, 0), Math.max(studyQuestions.length - 1, 0));
    setStudyQuestionId(studyQuestions[next]?.id ?? null);
    setStudyRevealed(false);
  }

  function handleStudyRandom() {
    if (studyQuestions.length <= 1) return;
    let next = studyIndex;
    while (next === studyIndex) {
      next = Math.floor(Math.random() * studyQuestions.length);
    }
    setStudyQuestionId(studyQuestions[next]?.id ?? null);
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
    setPendingConfirmation("cancel-exam");
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
      sessionType: activeExam.blueprint.id.startsWith("model-") ? "official" : "random",
      sourceModel: activeExam.blueprint.id.startsWith("model-")
        ? (activeExam.blueprint.id.slice(-1) as SourceModel)
        : undefined,
      questionIds: activeExam.blueprint.questionIds,
      answers: activeExam.answers,
      score: scoreSummary,
      completedAt: new Date().toISOString(),
    };

    updateProgress(addSession(nextProgress, session));
    setReview({
      sessionId: session.id,
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
      setLanguage(imported.preferences.language ?? language);
      setTheme(imported.preferences.theme ?? theme);
      setFilters(imported.study.filters);
      setStudyQuestionId(imported.study.currentQuestionId);
      setStudyAnswers(imported.study.answers);
      setStudyRevealed(imported.study.revealed);
      setActiveExam(imported.activeExam);
      setExamTimerMode(imported.activeExam?.timerMode ?? "standard");
      setReview(restoreReview(imported.sessions.find((session) => session.id === imported.review.sessionId)));
      navigate(imported.preferences.lastRoute);
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
    setPendingConfirmation("reset-progress");
  }

  function confirmPendingAction() {
    if (pendingConfirmation === "cancel-exam") {
      setActiveExam(null);
      navigate("/exam");
    } else if (pendingConfirmation === "reset-progress") {
      updateProgress(clearProgress());
      setTutorialStep(0);
      setFilters(emptyFilters);
      setStudyQuestionId(null);
      setStudyAnswers({});
      setStudyRevealed(false);
      setReview(null);
      setActiveExam(null);
      navigate("/");
    }
    setPendingConfirmation(null);
  }

  function openSessionReview(session: StoredSession) {
    const restored = restoreReview(session);
    if (!restored) return;
    setReview(restored);
    navigate("/review");
  }

  function startStudyBatch(size: 10 | 20) {
    setFilters(emptyFilters);
    setStudyBatchSize(size);
    setStudyQuestionId(questions[0]?.id ?? null);
    setStudyRevealed(false);
    navigate("/practice");
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

        <ModeNavigation copy={copy} highlighted={tutorialTarget === "modes"} onNavigate={() => setIsMenuOpen(false)} />

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
            <HomeView
              dashboard={dashboard}
              language={language}
              copy={copy}
              canContinuePractice={studyBatchSize !== null || progressSummary.attempted > 0 || Object.keys(studyAnswers).length > 0}
              hasActiveExam={Boolean(activeExam)}
              onStartStudy={startStudyBatch}
              onContinuePractice={() => navigate("/practice")}
              onContinueExam={() => navigate("/exam")}
              onLanguageChange={handleLanguageChange}
            />
          }
        />
        <Route
          path="/practice"
          element={
            <StudyView
              filteredQuestions={studyQuestions}
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
                setStudyQuestionId(studyQuestions[index]?.id ?? null);
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
        <Route
          path="/review"
          element={
            <ReviewView
              review={review}
              sessions={progress.sessions}
              language={language}
              copy={copy}
              onOpenReview={openSessionReview}
              onBackToHistory={() => setReview(null)}
            />
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <MobilePrimaryNavigation copy={copy} onNavigate={() => setIsMenuOpen(false)} />

      {!progress.preferences.tutorialCompleted && (
        <OnboardingTutorial
          content={tutorial}
          currentStep={tutorialStep}
          totalSteps={tutorialSteps.length}
          onBack={() => setTutorialStep((current) => Math.max(current - 1, 0))}
          onNext={() =>
            setTutorialStep((current) => Math.min(current + 1, tutorialSteps.length - 1))
          }
          onSkip={handleTutorialComplete}
          onComplete={handleTutorialComplete}
        />
      )}
      {showSpanishNotice && <TranslationNotice copy={copy} onClose={closeSpanishNotice} />}
      {pendingConfirmation && (
        <ConfirmDialog
          title={pendingConfirmation === "cancel-exam" ? copy.cancelExamTitle : copy.resetTitle}
          text={pendingConfirmation === "cancel-exam" ? copy.cancelExamText : copy.resetText}
          confirmLabel={pendingConfirmation === "cancel-exam" ? copy.confirmCancelExam : copy.confirmReset}
          cancelLabel={copy.keepWorking}
          destructive
          onConfirm={confirmPendingAction}
          onCancel={() => setPendingConfirmation(null)}
        />
      )}
    </div>
  );
}

export function App() {
  return (
    <HashRouter>
      <AppShell />
    </HashRouter>
  );
}
