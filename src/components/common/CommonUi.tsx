import { useRef } from "react";
import { CheckCircle2, ChevronLeft, ChevronRight } from "lucide-react";
import { summarizeProgress } from "../../domain/filters";
import type { Copy, Language, TutorialContent } from "../../app/content";
import { classNames } from "../../app/presentation";
import { useModalAccessibility } from "../../hooks/useModalAccessibility";

export function ConfirmDialog({
  title,
  text,
  confirmLabel,
  cancelLabel,
  destructive,
  onConfirm,
  onCancel,
}: {
  title: string;
  text: string;
  confirmLabel: string;
  cancelLabel: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useModalAccessibility<HTMLElement>(true, onCancel, cancelRef);

  return (
    <div className="notice-backdrop" role="presentation" onClick={onCancel}>
      <section
        ref={dialogRef}
        className="notice-modal confirm-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-text"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="confirm-dialog-title">{title}</h2>
        <p id="confirm-dialog-text">{text}</p>
        <div className="confirm-actions">
          <button ref={cancelRef} className="secondary" type="button" onClick={onCancel}>{cancelLabel}</button>
          <button className={destructive ? "danger" : "primary"} type="button" onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </section>
    </div>
  );
}

export function TranslationNotice({ copy, onClose }: { copy: Copy; onClose: () => void }) {
  const actionRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useModalAccessibility<HTMLElement>(true, onClose, actionRef);
  return (
    <div className="notice-backdrop" role="presentation" onClick={onClose}>
      <section
        ref={dialogRef}
        className="notice-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="translation-notice-title"
        aria-describedby="translation-notice-text"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="translation-notice-title">{copy.translationNoticeTitle}</h2>
        <p id="translation-notice-text">{copy.translationNoticeText}</p>
        <button ref={actionRef} className="primary" type="button" onClick={onClose}>
          <CheckCircle2 aria-hidden="true" />
          {copy.translationNoticeAction}
        </button>
      </section>
    </div>
  );
}

export function StatsPanel({
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

export function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="metric">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}


export function FlagLanguageToggle({ language, onChange, label = "Language" }: { language: Language; onChange: (language: Language) => void; label?: string }) {
  return (
    <div className="flag-language-toggle" role="group" aria-label={label}>
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


export function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <section className="empty-state">
      <strong>{title}</strong>
      <span>{text}</span>
    </section>
  );
}

export function OnboardingTutorial({
  content,
  currentStep,
  totalSteps,
  onBack,
  onNext,
  onSkip,
  onComplete,
}: {
  content: TutorialContent;
  currentStep: number;
  totalSteps: number;
  onBack: () => void;
  onNext: () => void;
  onSkip: () => void;
  onComplete: () => void;
}) {
  const step = content.steps[currentStep];
  const isLastStep = currentStep === totalSteps - 1;
  const skipRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useModalAccessibility<HTMLElement>(true, onSkip, skipRef);

  return (
    <>
      <div className="tutorial-backdrop" role="presentation" />
      <section
        ref={dialogRef}
        className={classNames("tutorial-modal", `placement-${step.placement}`)}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tutorial-title"
        aria-describedby="tutorial-body"
      >
        <div className="tutorial-header">
          <div>
            <span className="eyebrow">{content.label}</span>
            <h2 id="tutorial-title">{step.title}</h2>
          </div>
          <button ref={skipRef} className="tutorial-skip" type="button" onClick={onSkip}>
            {content.skip}
          </button>
        </div>
        <p id="tutorial-body">{step.body}</p>
        <ul>
          {step.points.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>
        <div className="tutorial-progress" aria-label={content.stepLabel(currentStep + 1, totalSteps)}>
          {content.steps.map((item, index) => (
            <span
              className={classNames("tutorial-dot", index === currentStep && "active")}
              aria-current={index === currentStep ? "step" : undefined}
              key={item.title}
            />
          ))}
        </div>
        <div className="tutorial-actions">
          <button className="secondary" type="button" onClick={onBack} disabled={currentStep === 0}>
            <ChevronLeft aria-hidden="true" />
            {content.back}
          </button>
          {isLastStep ? (
            <button className="primary" type="button" onClick={onComplete}>
              <CheckCircle2 aria-hidden="true" />
              {content.complete}
            </button>
          ) : (
            <button className="primary" type="button" onClick={onNext}>
              {content.next}
              <ChevronRight aria-hidden="true" />
            </button>
          )}
        </div>
      </section>
    </>
  );
}
