import { useEffect, useMemo, useState } from "react";
import { Menu, Moon, X } from "lucide-react";
import { HashRouter, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { chapters, examRules, questionBank, questions } from "./data/bank";
import type { Question, SourceModel } from "./data/types";
import { createModelExam, createRandomExam, findQuestionsByIds, type ExamBlueprint } from "./domain/exams";
import { emptyFilters, filterQuestions, summarizeProgress, type QuestionFilters } from "./domain/filters";
import { summarizeStudyDashboard } from "./domain/dashboard";
import { createAdaptiveQuestionIds, createReinforcementQuestionIds } from "./domain/adaptive";
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
  type PersistedStudySession,
  type StoredSession,
} from "./storage/progress";

import {
  SPANISH_TRANSLATION_NOTICE_KEY,
  tutorialContent,
  uiCopy,
  type ExamState,
  type FileOperationStatus,
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
  CompactThemeToggle,
  FlagLanguageToggle,
  OnboardingTutorial,
  StatsPanel,
  TranslationNotice,
} from "./components/common/CommonUi";

import { FiltersPanel } from "./components/sidebar/SidebarPanels";
import { PwaStatus } from "./components/common/PwaStatus";
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
import { useModalAccessibility } from "./hooks/useModalAccessibility";
import { useActiveQuestionTimer } from "./hooks/useActiveQuestionTimer";

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
  const [fileStatus, setFileStatus] = useState<FileOperationStatus>(null);
  const copy = uiCopy[language];
  const tutorial = tutorialContent[language];
  const tutorialSteps = tutorial.steps;
  const [filters, setFilters] = useState<QuestionFilters>(() => progress.study.filters);
  const [studyQuestionId, setStudyQuestionId] = useState<string | null>(() => progress.study.currentQuestionId);
  const [studyAnswers, setStudyAnswers] = useState<AnswerMap>(() => progress.study.answers);
  const [studyRevealed, setStudyRevealed] = useState(() => progress.study.revealed);
  const [activeStudySession, setActiveStudySession] = useState<PersistedStudySession | null>(() => progress.activeStudySession);
  const [activeExam, setActiveExam] = useState<ExamState | null>(() => progress.activeExam);
  const [examTimerMode, setExamTimerMode] = useState<TimerMode>(() => progress.activeExam?.timerMode ?? "standard");
  const [now, setNow] = useState(() => Date.now());
  const [review, setReview] = useState<ReviewState | null>(() =>
    restoreReview(progress.sessions.find((session) => session.id === progress.review.sessionId)),
  );
  const [pendingConfirmation, setPendingConfirmation] = useState<"cancel-exam" | "reset-progress" | null>(null);
  const [tutorialStep, setTutorialStep] = useState(0);
  const menuRef = useModalAccessibility<HTMLElement>(isMenuOpen, () => setIsMenuOpen(false));
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
    activeStudySession,
    review,
  });

  useEffect(() => {
    if (!activeExam?.endsAt) return undefined;
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [activeExam?.endsAt]);

  const filteredQuestions = useMemo(() => filterQuestions(questions, filters, progress, language), [filters, progress, language]);
  const studyQuestions = useMemo(
    () => activeStudySession ? findQuestionsByIds(questions, activeStudySession.questionIds) : filteredQuestions,
    [activeStudySession, filteredQuestions],
  );
  const progressSummary = useMemo(() => summarizeProgress(questions, progress), [progress]);
  const dashboard = useMemo(() => summarizeStudyDashboard(questions, chapters, progress), [progress]);
  const references = useMemo(() => Array.from(new Set(questions.map((question) => question.reference))).sort(), []);
  const tutorialTarget = progress.preferences.tutorialCompleted ? undefined : tutorialSteps[tutorialStep]?.target;
  const storedStudyIndex = studyQuestions.findIndex((question) => question.id === studyQuestionId);
  const studyIndex = activeStudySession
    ? Math.min(activeStudySession.currentIndex, Math.max(studyQuestions.length - 1, 0))
    : storedStudyIndex >= 0 ? storedStudyIndex : 0;
  const currentStudyQuestion = studyQuestions[studyIndex];
  const currentStudyRevealed = activeStudySession
    ? activeStudySession.revealed || activeStudySession.checkedQuestionIds.includes(currentStudyQuestion?.id ?? "")
    : studyRevealed;
  const { elapsedMs: activeQuestionTimeMs, finishAttempt: finishQuestionTimer } = useActiveQuestionTimer(
    currentStudyQuestion?.id ?? null,
    location.pathname === "/practice" && Boolean(currentStudyQuestion) && !currentStudyRevealed,
  );
  const currentExamQuestion = activeExam
    ? questions.find((question) => question.id === activeExam.blueprint.questionIds[activeExam.currentIndex])
    : undefined;
  const currentExamSelection = currentExamQuestion ? activeExam?.answers[currentExamQuestion.id] ?? [] : [];
  const currentExamTimed = currentExamQuestion ? activeExam?.questionActiveMs?.[currentExamQuestion.id] !== undefined : false;
  const { elapsedMs: activeExamQuestionTimeMs, finishAttempt: finishExamQuestionTimer } = useActiveQuestionTimer(
    currentExamQuestion?.id ?? null,
    location.pathname === "/exam"
      && Boolean(currentExamQuestion)
      && !currentExamTimed
      && currentExamSelection.length < (currentExamQuestion?.correctAnswers.length ?? 1)
      && (!activeExam?.endsAt || activeExam.endsAt > Date.now()),
  );

  useEffect(() => {
    if (activeStudySession) return;
    if (!studyQuestions.length) {
      if (studyQuestionId !== null) setStudyQuestionId(null);
      return;
    }
    if (storedStudyIndex < 0) {
      setStudyQuestionId(studyQuestions[0].id);
      setStudyRevealed(false);
    }
  }, [activeStudySession, studyQuestions, storedStudyIndex, studyQuestionId]);

  function updateProgress(next: ProgressState) {
    setProgress(next);
  }

  function handleStudyToggle(question: Question, optionKey: string) {
    const revealed = activeStudySession
      ? activeStudySession.revealed || activeStudySession.checkedQuestionIds.includes(question.id)
      : studyRevealed;
    if (revealed) return;
    if (activeStudySession) {
      setActiveStudySession((current) => current ? {
        ...current,
        answers: { ...current.answers, [question.id]: toggleAnswer(question, current.answers[question.id], optionKey) },
      } : current);
      return;
    }
    setStudyAnswers((current) => ({
      ...current,
      [question.id]: toggleAnswer(question, current[question.id], optionKey),
    }));
  }

  function handleStudyCheck(question: Question) {
    if (activeStudySession?.checkedQuestionIds.includes(question.id)) return;
    const selected = activeStudySession?.answers[question.id] ?? studyAnswers[question.id] ?? [];
    if (question.selectionMode === "multiple" && selected.length < question.correctAnswers.length) return;
    const correct = isCorrectAnswer(question, selected);
    const activeMs = finishQuestionTimer(question.id);
    updateProgress(recordQuestionAttempt(progress, question.id, selected, correct, new Date().toISOString(), activeMs));
    if (activeStudySession) {
      setActiveStudySession((current) => current ? {
        ...current,
        revealed: true,
        checkedQuestionIds: [...current.checkedQuestionIds, question.id],
      } : current);
    } else {
      setStudyRevealed(true);
    }
  }

  function handleStudyNext(direction: 1 | -1) {
    const next = Math.min(Math.max(studyIndex + direction, 0), Math.max(studyQuestions.length - 1, 0));
    if (activeStudySession) {
      setActiveStudySession((current) => current ? {
        ...current,
        currentIndex: next,
        revealed: current.checkedQuestionIds.includes(current.questionIds[next]),
      } : current);
      return;
    }
    setStudyQuestionId(studyQuestions[next]?.id ?? null);
    setStudyRevealed(false);
  }

  function handleStudyRandom() {
    if (activeStudySession) return;
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
      optionMode: "original",
      questionActiveMs: {},
    });
    setReview(null);
    navigate("/exam");
  }

  function cancelExam() {
    setPendingConfirmation("cancel-exam");
  }

  function updateExamAnswer(question: Question, optionKey: string) {
    if (!activeExam) return;
    const nextAnswers = toggleAnswer(question, activeExam.answers[question.id], optionKey);
    const alreadyTimed = activeExam.questionActiveMs?.[question.id] !== undefined;
    const completedSelection = nextAnswers.length >= question.correctAnswers.length;
    const activeMs = !alreadyTimed && completedSelection ? finishExamQuestionTimer(question.id) : undefined;
    setActiveExam({
      ...activeExam,
      answers: { ...activeExam.answers, [question.id]: nextAnswers },
      questionActiveMs: activeMs === undefined
        ? activeExam.questionActiveMs ?? {}
        : { ...activeExam.questionActiveMs, [question.id]: activeMs },
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
      nextProgress = recordQuestionAttempt(
        nextProgress,
        result.questionId,
        result.selectedAnswers,
        result.isCorrect,
        new Date().toISOString(),
        activeExam.questionActiveMs?.[result.questionId],
      );
    }

    const { results: _results, ...scoreSummary } = score;
    const session: StoredSession = {
      id: `${activeExam.blueprint.id}-${Date.now()}`,
      title: activeExam.blueprint.title,
      mode: "exam",
      sessionType: activeExam.blueprint.id.startsWith("model-") ? "official" : "random",
      optionMode: activeExam.optionMode,
      optionSeed: activeExam.blueprint.id,
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
      sessionType: activeExam.blueprint.id.startsWith("model-") ? "official" : "random",
      optionMode: activeExam.optionMode,
      optionSeed: activeExam.blueprint.id,
      title: activeExam.blueprint.title,
      questions: examQuestions,
      answers: activeExam.answers,
      score,
    });
    setActiveExam(null);
    navigate("/review");
  }

  async function handleImport(file: File) {
    setFileStatus({ kind: "loading", message: copy.importingProgress });
    try {
      const raw = await file.text();
      const imported = importProgress(raw);
      updateProgress(imported);
      setLanguage(imported.preferences.language ?? language);
      setTheme(imported.preferences.theme ?? theme);
      setFilters(imported.study.filters);
      setStudyQuestionId(imported.study.currentQuestionId);
      setStudyAnswers(imported.study.answers);
      setStudyRevealed(imported.study.revealed);
      setActiveStudySession(imported.activeStudySession);
      setActiveExam(imported.activeExam);
      setExamTimerMode(imported.activeExam?.timerMode ?? "standard");
      setReview(restoreReview(imported.sessions.find((session) => session.id === imported.review.sessionId)));
      setFileStatus({ kind: "success", message: copy.importSuccess });
      navigate(imported.preferences.lastRoute);
    } catch (error) {
      setFileStatus({
        kind: "error",
        message: error instanceof Error ? error.message : copy.importError,
      });
    }
  }

  function handleExport() {
    setFileStatus({ kind: "loading", message: copy.exportingProgress });
    try {
      const blob = new Blob([exportProgress(progress)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = language === "es" ? "istqb-ctfl-v4-progreso.json" : "istqb-ctfl-v4-progress.json";
      link.click();
      URL.revokeObjectURL(url);
      setFileStatus({ kind: "success", message: copy.exportSuccess });
    } catch {
      setFileStatus({ kind: "error", message: copy.exportError });
    }
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
      setActiveStudySession(null);
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

  function startStudyBatch(size: 10 | 20, mode: "adaptive" | "reinforcement" = "adaptive") {
    const seed = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const questionIds = mode === "reinforcement"
      ? createReinforcementQuestionIds(questions, progress, size, seed)
      : createAdaptiveQuestionIds(questions, progress, size, seed);
    setActiveStudySession({
      id: `adaptive-${seed}`,
      title: mode === "reinforcement"
        ? language === "es" ? `Refuerzo · ${size}` : `Reinforcement · ${size}`
        : language === "es" ? `Sesión adaptativa · ${size}` : `Adaptive session · ${size}`,
      size,
      seed,
      optionMode: "shuffled",
      optionSeed: seed,
      questionIds,
      currentIndex: 0,
      answers: {},
      revealed: false,
      checkedQuestionIds: [],
      startedAt: new Date().toISOString(),
      studyMode: mode,
    });
    navigate("/practice");
  }

  function finishStudySession() {
    if (!activeStudySession) return;
    const sessionQuestions = findQuestionsByIds(questions, activeStudySession.questionIds);
    const score = scoreQuestions(sessionQuestions, activeStudySession.answers, {
      ...examRules,
      questionsPerExam: sessionQuestions.length,
      passingScore: sessionQuestions.length + 1,
    });
    const { results: _results, ...scoreSummary } = score;
    const session: StoredSession = {
      id: activeStudySession.id,
      title: activeStudySession.title,
      mode: "study",
      sessionType: "adaptive",
      optionMode: activeStudySession.optionMode,
      optionSeed: activeStudySession.optionSeed,
      questionIds: activeStudySession.questionIds,
      answers: activeStudySession.answers,
      score: scoreSummary,
      completedAt: new Date().toISOString(),
    };
    updateProgress(addSession(progress, session));
    setReview({
      sessionId: session.id,
      sessionType: "adaptive",
      optionMode: activeStudySession.optionMode,
      optionSeed: activeStudySession.optionSeed,
      title: session.title,
      questions: sessionQuestions,
      answers: session.answers,
      score,
    });
    setActiveStudySession(null);
    navigate("/review");
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
        ref={menuRef}
        className={classNames("sidebar", isMenuOpen && "is-open", tutorialTarget === "layout" && "tutorial-highlight")}
        id="main-menu"
        aria-label={copy.studyControls}
        tabIndex={-1}
      >
        <div className="brand">
          <div className="brand-copy">
            <span className="eyebrow">ISTQB CTFL v4.0</span>
            <h1>{copy.trainer}</h1>
          </div>
          <div className="brand-language">
            <FlagLanguageToggle language={language} onChange={handleLanguageChange} label={copy.languageLabel} />
            <CompactThemeToggle theme={theme} onChange={setTheme} copy={copy} />
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
          fileStatus={fileStatus}
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
              canContinuePractice={Boolean(activeStudySession) || progressSummary.attempted > 0 || Object.keys(studyAnswers).length > 0}
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
              selected={currentStudyQuestion ? activeStudySession?.answers[currentStudyQuestion.id] ?? studyAnswers[currentStudyQuestion.id] ?? [] : []}
              revealed={currentStudyRevealed}
              progress={progress}
              onToggle={handleStudyToggle}
              onCheck={handleStudyCheck}
              onMove={handleStudyNext}
              onRandom={handleStudyRandom}
              onSelectIndex={(index) => {
                if (activeStudySession) {
                  setActiveStudySession((current) => current ? {
                    ...current,
                    currentIndex: index,
                    revealed: current.checkedQuestionIds.includes(current.questionIds[index]),
                  } : current);
                } else {
                  setStudyQuestionId(studyQuestions[index]?.id ?? null);
                  setStudyRevealed(false);
                }
              }}
              onFlag={handleFlag}
              highlighted={tutorialTarget === "practice"}
              language={language}
              onLanguageChange={handleLanguageChange}
              copy={copy}
              adaptiveSession={activeStudySession}
              onFinishSession={finishStudySession}
              onLeaveSession={() => navigate("/")}
              activeTimeMs={activeQuestionTimeMs}
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
              questionActiveTimeMs={activeExamQuestionTimeMs}
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
      <PwaStatus copy={copy} />

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
