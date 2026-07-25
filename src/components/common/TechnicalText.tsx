import katex from "katex";
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
  const riskFormula =
    String.raw`(?:Risk level = Risk likelihood \* Risk impact|Risk impact = Risk level / Risk likelihood|Risk impact = \$1,000 / 50% = \$1,000 / 0\.5 = \$2,000|nivel de riesgo = probabilidad del riesgo \* impacto del riesgo|impacto del riesgo = nivel de riesgo / probabilidad del riesgo|impacto del riesgo = \$1\.000 / 50% = \$1\.000 / 0,5 = \$2\.000)`;
  const formulaPattern = new RegExp(
    String.raw`(\bE\s*=\s*\([^.!?;\n]+?\)\s*\/\s*6(?:\s*=\s*\d+(?:[.,]\d+)?)?|${riskFormula})`,
    "gi",
  );
  const exactFormulaPattern = /^\bE\s*=\s*\([^.!?;\n]+?\)\s*\/\s*6(?:\s*=\s*\d+(?:[.,]\d+)?)?$/i;
  const exactRiskFormulaPattern = new RegExp(`^${riskFormula}$`, "i");
  const segments = text.split(formulaPattern).filter(Boolean);

  return <>{segments.map((segment, segmentIndex) => {
    if (exactFormulaPattern.test(segment) || exactRiskFormulaPattern.test(segment)) {
      const latex = exactFormulaPattern.test(segment) ? segment
        .split(/\s*=\s*/)
        .map((part) => {
          const fraction = part.match(/^\((.*)\)\s*\/\s*(\d+)$/);
          const expression = fraction ? fraction[1] : part;
          const formatted = expression
            .replace(/más probable|most likely|optimista|optimistic|pesimista|pessimistic/gi, (word) => `\\text{${word}}`)
            .replace(/\*/g, "\\times ");
          return fraction ? `\\frac{${formatted}}{${fraction[2]}}` : formatted;
        })
        .join("=") : segment
          .split(/\s*=\s*/)
          .map((part) => {
            const formatOperand = (operand: string) => operand
              .trim()
              .replace(/Risk level|Risk likelihood|Risk impact|nivel de riesgo|probabilidad del riesgo|impacto del riesgo/gi, (label) => `\\text{${label}}`)
              .replace(/\$/g, "\\$")
              .replace(/(?<=\d),(?=\d)/g, "{,}")
              .replace(/(?<=\d)\.(?=\d{3}\b)/g, "{.}")
              .replace(/%/g, "\\%");
            const fraction = part.split(/\s*\/\s*/);
            if (fraction.length === 2) return `\\frac{${formatOperand(fraction[0])}}{${formatOperand(fraction[1])}}`;
            return formatOperand(part).replace(/\*/g, "\\times ");
          })
          .join("=");
      return (
        <span
          className="math-expression"
          role="img"
          aria-label={segment}
          key={segmentIndex}
          dangerouslySetInnerHTML={{ __html: katex.renderToString(latex, { throwOnError: false, output: "html" }) }}
        />
      );
    }
    if (language !== "es") return <span key={segmentIndex}>{segment}</span>;
    return <span key={segmentIndex}>{technicalTextSegments(segment).map((technicalSegment, index) => technicalSegment.type === "text" ? (
      <span key={index}>{technicalSegment.text}</span>
    ) : (
      <TechnicalTerm text={technicalSegment.text} translation={technicalSegment.translation} key={technicalSegment.key} />
    ))}</span>;
  })}</>;
}
