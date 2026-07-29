import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { CircleHelp } from "lucide-react";

export function InfoTooltip({ label, text }: { label: string; text: string }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const rootRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return undefined;
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () => document.removeEventListener("pointerdown", closeOnOutsideClick);
  }, [open]);

  return (
    <span
      ref={rootRef}
      className={`info-tooltip${open ? " is-open" : ""}`}
      onKeyDown={(event) => {
        if (event.key === "Escape") setOpen(false);
      }}
    >
      <button
        type="button"
        aria-label={label}
        aria-describedby={id}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <CircleHelp aria-hidden="true" />
      </button>
      <span id={id} className="info-tooltip-content" role="tooltip">{text}</span>
    </span>
  );
}

export function DashboardSectionTitle({
  children,
  help,
  helpLabel,
  id,
}: {
  children: ReactNode;
  help?: string;
  helpLabel?: string;
  id?: string;
}) {
  return (
    <div className="dashboard-section-title-row">
      <h3 className="dashboard-section-title" id={id}>{children}</h3>
      {help && <InfoTooltip label={helpLabel ?? String(children)} text={help} />}
    </div>
  );
}

export function DashboardStatPill({
  icon,
  value,
  label,
  className,
}: {
  icon: ReactNode;
  value: ReactNode;
  label: ReactNode;
  className?: string;
}) {
  return (
    <article className={`dashboard-stat-pill${className ? ` ${className}` : ""}`}>
      <span className="dashboard-stat-icon" aria-hidden="true">{icon}</span>
      <strong>{value}</strong>
      <span>{label}</span>
    </article>
  );
}
