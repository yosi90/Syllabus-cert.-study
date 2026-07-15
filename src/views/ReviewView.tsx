import { ChevronLeft } from "lucide-react";
import { questions } from "../data/bank";
import { findQuestionsByIds } from "../domain/exams";
import { isCorrectAnswer } from "../domain/scoring";
import type { StoredSession } from "../storage/progress";
import type { Copy, Language, ReviewState } from "../app/content";
import {
  classNames,
  displayAnswerLabels,
  getSessionType,
  localizedQuestion,
  questionLabel,
} from "../app/presentation";
import { EmptyState, Metric } from "../components/common/CommonUi";
import { ExplanationPanel, QuestionVisual } from "../components/questions/QuestionUi";

export function ReviewView({
  review,
  sessions,
  language,
  copy,
  onOpenReview,
  onBackToHistory,
}: {
  review: ReviewState | null;
  sessions: StoredSession[];
  language: Language;
  copy: Copy;
  onOpenReview: (session: StoredSession) => void;
  onBackToHistory: () => void;
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
            {sessions.map((session) => {
              const compatible = findQuestionsByIds(questions, session.questionIds).length === session.questionIds.length;
              const type = getSessionType(session);
              const typeLabel = type === "official" ? copy.officialExam : type === "random" ? copy.randomExam : copy.adaptiveSession;
              return (
                <article className={classNames("session-row", !compatible && "incompatible")} key={session.id}>
                  <div className="session-copy">
                    <div className="session-heading">
                      <strong>{session.title}</strong>
                      <span className="session-type">{typeLabel}</span>
                    </div>
                    <span>{new Date(session.completedAt).toLocaleString(language === "es" ? "es-ES" : "en-GB")}</span>
                    {!compatible && <span className="session-warning">{copy.incompatibleSession}</span>}
                  </div>
                  <div className="session-result">
                    <div className={classNames("score-pill", session.score.passed ? "passed" : "failed")}>
                      {session.score.score}/{session.score.total} · {session.score.passed ? copy.passed : copy.failed}
                    </div>
                    <button className="secondary compact" type="button" disabled={!compatible} onClick={() => onOpenReview(session)}>
                      {copy.openReview}
                    </button>
                  </div>
                </article>
              );
            })}
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
          <Metric label={copy.points} value={`${review.score.score}/${review.score.total}`} />
          <Metric label={copy.result} value={review.score.passed ? copy.passed : copy.failed} />
          <Metric label={copy.percent} value={`${review.score.percent}%`} />
        </div>
        <button className="secondary" type="button" onClick={onBackToHistory}>
          <ChevronLeft aria-hidden="true" />
          {copy.backToHistory}
        </button>
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

