import { useMemo, useRef, useState } from "react";
import {
  BookOpen,
  Bookmark,
  BookmarkCheck,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  X,
} from "lucide-react";
import type { Objective, Question } from "../../data/types";
import { isCorrectAnswer } from "../../domain/scoring";
import type { OptionMode } from "../../domain/options";
import { useModalAccessibility } from "../../hooks/useModalAccessibility";
import type { ProgressState } from "../../storage/progress";
import type { Copy, ExamState, Language } from "../../app/content";
import {
  classNames,
  cleanExplanationText,
  displayAnswerLabels,
  getDisplayOptions,
  getObjective,
  localizedObjective,
  localizedQuestion,
  parseExplanation,
  progressLabel,
  questionLabel,
  selectorLabel,
} from "../../app/presentation";
import { buildExplanationSpeech, buildQuestionSpeech } from "../../app/speech";
import { QuestionPromptContent, SpeechButton } from "./QuestionContent";

export function QuestionCard({
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
  optionMode,
  optionSeed,
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
  optionMode: OptionMode;
  optionSeed?: string;
}) {
  const displayOptions = useMemo(
    () => getDisplayOptions(question, language, optionMode, optionSeed),
    [question, language, optionMode, optionSeed],
  );

  return (
    <section className="question-card" aria-labelledby={`question-${question.id}-title`}>
      <div className="question-meta">
        <span>{questionLabel(question)}</span>
        <span>{question.chapter}</span>
        <span>{question.reference}</span>
        <span>{question.kLevel}</span>
        <span>{question.selectionMode === "multiple" ? copy.multiple : copy.single}</span>
      </div>
      <div className="question-title-row">
        <h3 className="prompt" id={`question-${question.id}-title`}><QuestionPromptContent question={question} language={language} /></h3>
        <div className="question-title-actions">
          <SpeechButton
            text={buildQuestionSpeech(question, language, copy, optionMode, optionSeed)}
            language={language}
            copy={copy}
            kind="question"
          />
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

export function QuestionVisual({ question, language, copy }: { question: Question; language: Language; copy: Copy }) {
  const [isOpen, setIsOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useModalAccessibility<HTMLElement>(isOpen, () => setIsOpen(false), closeRef);
  const visual = question.visual;

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
            ref={dialogRef}
            className="image-modal"
            role="dialog"
            aria-modal="true"
            aria-label={alt}
            tabIndex={-1}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              ref={closeRef}
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

export function ExplanationPanel({
  question,
  selected,
  language,
  copy,
  optionMode,
  optionSeed,
}: {
  question: Question;
  selected: string[];
  language: Language;
  copy: Copy;
  optionMode: OptionMode;
  optionSeed?: string;
}) {
  const localized = localizedQuestion(question, language);
  const parsed = parseExplanation(localized.explanation);
  const displayOptions = useMemo(
    () => getDisplayOptions(question, language, optionMode, optionSeed),
    [question, language, optionMode, optionSeed],
  );
  const displayKeyByOriginalKey = new Map(displayOptions.map((option) => [option.key, option.displayKey]));
  const displayOrderByOriginalKey = new Map(displayOptions.map((option, index) => [option.key, index]));
  const [isTheoryOpen, setIsTheoryOpen] = useState(false);
  const objective = getObjective(question.reference);

  if (!parsed.options.length) {
    return (
      <div className="explanation-panel">
        <div className="explanation-actions">
          <TheoryButton objective={objective} onOpen={() => setIsTheoryOpen(true)} language={language} copy={copy} />
          <SpeechButton text={buildExplanationSpeech(question, selected, language, copy, optionMode, optionSeed)} language={language} copy={copy} kind="explanation" />
        </div>
        <p className="explanation-text">{localized.explanation}</p>
        {isTheoryOpen && objective && <TheoryModal objective={objective} onClose={() => setIsTheoryOpen(false)} language={language} copy={copy} />}
      </div>
    );
  }

  return (
    <div className="explanation-panel">
      <div className="explanation-actions">
        <TheoryButton objective={objective} onOpen={() => setIsTheoryOpen(true)} language={language} copy={copy} />
        <SpeechButton text={buildExplanationSpeech(question, selected, language, copy, optionMode, optionSeed)} language={language} copy={copy} kind="explanation" />
      </div>
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
                <span className={classNames("reason-pill", isCorrect ? "correct" : "incorrect")}>
                  {isCorrect ? copy.correctAnswer : copy.incorrectAnswer}
                </span>
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

export function TheoryButton({
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

export function TheoryModal({
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
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useModalAccessibility<HTMLElement>(true, onClose, closeRef);
  return (
    <div className="theory-backdrop" role="presentation" onClick={onClose}>
      <section
        ref={dialogRef}
        className="theory-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="theory-title"
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          ref={closeRef}
          className="icon-button theory-close"
          type="button"
          onClick={onClose}
          title={language === "es" ? "Cerrar" : "Close"}
          aria-label={language === "es" ? "Cerrar" : "Close"}
        >
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

export function QuestionRail({
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

export function ExamRail({
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
