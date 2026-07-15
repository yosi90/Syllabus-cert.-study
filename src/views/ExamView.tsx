import { CheckCircle2, ChevronLeft, ChevronRight, Play, Shuffle, Timer, X } from "lucide-react";
import { questions } from "../data/bank";
import type { Question, SourceModel } from "../data/types";
import { findQuestionsByIds } from "../domain/exams";
import { models, type Copy, type ExamState, type Language, type TimerMode } from "../app/content";
import { formatRemainingTime } from "../app/presentation";
import { Metric } from "../components/common/CommonUi";
import { ExamRail, QuestionCard } from "../components/questions/QuestionUi";

export function ExamView({
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

