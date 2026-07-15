import { CheckCircle2, ChevronLeft, ChevronRight, LogOut, Shuffle, XCircle } from "lucide-react";
import type { Question } from "../data/types";
import { isCorrectAnswer } from "../domain/scoring";
import type { PersistedStudySession, ProgressState } from "../storage/progress";
import type { Copy, Language } from "../app/content";
import { classNames, progressLabel } from "../app/presentation";
import { EmptyState, FlagLanguageToggle, Metric } from "../components/common/CommonUi";
import { ExplanationPanel, QuestionCard, QuestionRail } from "../components/questions/QuestionUi";

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
          <span className="eyebrow">{adaptiveSession ? copy.adaptivePractice : copy.practice}</span>
          <h2>{adaptiveSession?.title ?? copy.practiceTitle}</h2>
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
          <button className="primary" type="button" onClick={onFinishSession}>
            <CheckCircle2 aria-hidden="true" />
            {copy.finishSession}
          </button>
        ) : (
          <button
            className="secondary"
            type="button"
            onClick={() => onMove(1)}
            disabled={currentIndex >= filteredQuestions.length - 1}
          >
            {copy.next}
            <ChevronRight aria-hidden="true" />
          </button>
        )}
      </div>

      <QuestionRail questions={filteredQuestions} currentIndex={currentIndex} progress={progress} onSelect={onSelectIndex} copy={copy} />
    </main>
  );
}
