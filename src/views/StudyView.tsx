import { useEffect, useState } from "react";
import { CheckCircle2, ChevronLeft, ChevronRight, CircleAlert, Clock3, LogOut, Shuffle, XCircle } from "lucide-react";
import type { Question } from "../data/types";
import { isCorrectAnswer } from "../domain/scoring";
import type { PersistedStudySession, ProgressState } from "../storage/progress";
import type { Copy, Language } from "../app/content";
import { classNames, progressLabel } from "../app/presentation";
import { EmptyState, FlagLanguageToggle, KeyboardShortcutHint, Metric } from "../components/common/CommonUi";
import { ExplanationPanel, QuestionCard, QuestionRail } from "../components/questions/QuestionUi";
import { useQuestionKeyboard } from "../hooks/useQuestionKeyboard";

export function StudyView({
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
  adaptiveSession,
  onFinishSession,
  onLeaveSession,
  activeTimeMs,
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
  adaptiveSession: PersistedStudySession | null;
  onFinishSession: () => void;
  onLeaveSession: () => void;
  activeTimeMs: number;
}) {
  const [incompleteWarningQuestionId, setIncompleteWarningQuestionId] = useState<string | null>(null);
  const [attentionQuestionId, setAttentionQuestionId] = useState<string | null>(null);
  const flagged = currentQuestion
    ? progress.questionProgress[currentQuestion.id]?.flagged ?? false
    : false;

  useEffect(() => {
    if (currentQuestion) window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [currentQuestion?.id]);

  useEffect(() => {
    setAttentionQuestionId(currentQuestion && progress.questionProgress[currentQuestion.id]?.flagged
      ? currentQuestion.id
      : null);
  }, [currentQuestion?.id]);

  useEffect(() => {
    if (!flagged) setAttentionQuestionId(null);
  }, [flagged]);

  function handleCheck() {
    if (!currentQuestion) return;
    const incompleteSelection = currentQuestion.selectionMode === "multiple"
      && selected.length > 0
      && selected.length < currentQuestion.correctAnswers.length;
    if (incompleteSelection) {
      setIncompleteWarningQuestionId(currentQuestion.id);
      return;
    }
    onCheck(currentQuestion);
  }

  useQuestionKeyboard({
    questionId: currentQuestion?.id,
    selectionMode: currentQuestion?.selectionMode,
    selectedAnswers: selected,
    canNavigateAnswers: Boolean(currentQuestion && !revealed),
    onToggleAnswer: currentQuestion
      ? (optionKey) => onToggle(currentQuestion, optionKey)
      : undefined,
    canUsePrimaryAction: Boolean(currentQuestion && selected.length > 0 && !revealed),
    onPrimaryAction: handleCheck,
    canMovePrevious: Boolean(currentQuestion && currentIndex > 0),
    canMoveNext: Boolean(currentQuestion && currentIndex < filteredQuestions.length - 1),
    onMove,
  });

  if (!currentQuestion) {
    return (
      <main className="workspace">
        <EmptyState title={copy.noQuestions} text={copy.changeFilters} />
      </main>
    );
  }

  const isCorrect = revealed && isCorrectAnswer(currentQuestion, selected);
  const elapsedSeconds = Math.floor(activeTimeMs / 1_000);
  const elapsedLabel = `${Math.floor(elapsedSeconds / 60).toString().padStart(2, "0")}:${(elapsedSeconds % 60).toString().padStart(2, "0")}`;
  const requiredAnswers = currentQuestion.correctAnswers.length;
  const incompleteMultipleSelection = currentQuestion.selectionMode === "multiple"
    && selected.length > 0
    && selected.length < requiredAnswers;
  const showIncompleteWarning = incompleteWarningQuestionId === currentQuestion.id && incompleteMultipleSelection;

  return (
    <main className={classNames("workspace", highlighted && "tutorial-highlight")}>
      <header className="workspace-header">
        <div>
          <span className="eyebrow">{adaptiveSession ? copy.adaptivePractice : copy.practice}</span>
          <h2>{adaptiveSession?.title ?? copy.practiceTitle}</h2>
        </div>
        <div className="header-metrics">
          <Metric label={copy.filtered} value={filteredQuestions.length} />
          <Metric label={copy.current} value={`${currentIndex + 1}/${filteredQuestions.length}`} />
          <div className="question-timer" role="timer" aria-label={`${copy.questionTime}: ${elapsedLabel}`}>
            <Clock3 aria-hidden="true" />
            <Metric label={copy.questionTime} value={elapsedLabel} />
          </div>
          <FlagLanguageToggle language={language} onChange={onLanguageChange} label={copy.languageLabel} />
        </div>
      </header>

      <QuestionCard
        question={currentQuestion}
        selected={selected}
        revealed={revealed}
        progressText={progressLabel(progress, currentQuestion, copy)}
        flagged={flagged}
        emphasizeFlag={flagged && attentionQuestionId === currentQuestion.id}
        locked={revealed}
        onToggle={(optionKey) => onToggle(currentQuestion, optionKey)}
        onFlag={() => onFlag(currentQuestion.id)}
        language={language}
        copy={copy}
        optionMode="shuffled"
        optionSeed={adaptiveSession?.optionSeed}
      />

      {revealed && (
        <section className={classNames("feedback", isCorrect ? "correct" : "incorrect")}>
          <div className="feedback-title">
            {isCorrect ? <CheckCircle2 aria-hidden="true" /> : <XCircle aria-hidden="true" />}
            <strong>{isCorrect ? copy.correctAnswer : language === "es" ? "Incorrecta" : "Incorrect"}</strong>
          </div>
          <ExplanationPanel
            question={currentQuestion}
            selected={selected}
            language={language}
            copy={copy}
            optionMode="shuffled"
            optionSeed={adaptiveSession?.optionSeed}
          />
        </section>
      )}

      {showIncompleteWarning && (
        <div className="selection-warning" role="alert">
          <CircleAlert aria-hidden="true" />
          <span>{copy.incompleteMultiplePractice
            .replace("{count}", String(requiredAnswers))
            .replace("{remaining}", String(requiredAnswers - selected.length))}</span>
        </div>
      )}

      <div className="action-bar study-actions">
        <button
          className="secondary has-keyboard-shortcut"
          type="button"
          onClick={() => onMove(-1)}
          disabled={currentIndex === 0}
          aria-keyshortcuts="ArrowLeft"
        >
          <ChevronLeft aria-hidden="true" />
          {copy.previous}
          <KeyboardShortcutHint keys={["←"]} language={language} />
        </button>
        <button
          className="primary has-keyboard-shortcut"
          type="button"
          onClick={handleCheck}
          disabled={selected.length === 0 || revealed}
          aria-keyshortcuts="Enter"
        >
          <CheckCircle2 aria-hidden="true" />
          {copy.check}
          <KeyboardShortcutHint keys={["Enter"]} language={language} />
        </button>
        {adaptiveSession ? (
          <button className="secondary" type="button" onClick={onLeaveSession}>
            <LogOut aria-hidden="true" />
            {copy.leaveSession}
          </button>
        ) : (
          <button className="secondary" type="button" onClick={onRandom} disabled={filteredQuestions.length <= 1}>
            <Shuffle aria-hidden="true" />
            {copy.random}
          </button>
        )}
        {adaptiveSession && currentIndex >= filteredQuestions.length - 1 ? (
          <button className="primary" type="button" onClick={onFinishSession} disabled={!revealed}>
            <CheckCircle2 aria-hidden="true" />
            {copy.finishSession}
          </button>
        ) : (
          <button
            className="secondary has-keyboard-shortcut"
            type="button"
            onClick={() => onMove(1)}
            disabled={currentIndex >= filteredQuestions.length - 1}
            aria-keyshortcuts="ArrowRight"
          >
            {copy.next}
            <ChevronRight aria-hidden="true" />
            <KeyboardShortcutHint keys={["→"]} language={language} />
          </button>
        )}
      </div>

      <QuestionRail questions={filteredQuestions} currentIndex={currentIndex} progress={progress} onSelect={onSelectIndex} copy={copy} />
    </main>
  );
}
