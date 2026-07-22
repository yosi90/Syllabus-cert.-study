import { useId, useState } from "react";
import type { Language } from "../../app/content";
import { technicalTextSegments } from "../../app/technicalTerms";

function TechnicalTerm({ text, translation }: { text: string; translation: string }) {
  const [open, setOpen] = useState(false);
  const tooltipId = useId();

  return (
    <span
      className={`technical-term${open ? " is-open" : ""}`}
      role="button"
      tabIndex={0}
      lang="en"
      aria-label={text}
      aria-expanded={open}
      aria-describedby={tooltipId}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        setOpen((current) => !current);
      }}
      onKeyDown={(event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        event.stopPropagation();
        setOpen((current) => !current);
      }}
      onBlur={() => setOpen(false)}
    >
      {text}
      <span className="technical-term-tooltip" id={tooltipId} role="tooltip" lang="es">{translation}</span>
    </span>
  );
}

export function TechnicalText({ text, language }: { text: string; language: Language }) {
  if (language !== "es") return <>{text}</>;
  return <>{technicalTextSegments(text).map((segment, index) => segment.type === "text" ? (
    <span key={index}>{segment.text}</span>
  ) : (
    <TechnicalTerm text={segment.text} translation={segment.translation} key={segment.key} />
  ))}</>;
}
