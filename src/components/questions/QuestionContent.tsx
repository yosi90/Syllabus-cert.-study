import katex from "katex";
import { Square, Volume2 } from "lucide-react";
import { useEffect } from "react";
import type { Copy, Language } from "../../app/content";
import { localizedQuestion } from "../../app/presentation";
import type { Question } from "../../data/types";
import { useSpeechSynthesis } from "../../hooks/useSpeechSynthesis";

export function QuestionPromptContent({ question, language }: { question: Question; language: Language }) {
  const localized = localizedQuestion(question, language);
  if (!localized.promptParts?.length) return <>{localized.prompt}</>;

  return <>{localized.promptParts.map((part, index) => part.type === "text" ? (
    <span key={index}>{part.text}</span>
  ) : (
    <span className="math-expression" role="img" aria-label={part.spoken} key={index}>
      <span
        aria-hidden="true"
        dangerouslySetInnerHTML={{
          __html: katex.renderToString(part.latex, { throwOnError: false, output: "html" }),
        }}
      />
    </span>
  ))}</>;
}

export function SpeechButton({
  text,
  language,
  copy,
  kind,
}: {
  text: string;
  language: Language;
  copy: Copy;
  kind: "question" | "explanation";
}) {
  const { supported, speaking, speak, stop } = useSpeechSynthesis();
  useEffect(() => () => stop(), [text, language, stop]);
  if (!supported) return null;

  const label = speaking
    ? copy.stopReading
    : kind === "question" ? copy.readQuestion : copy.readExplanation;

  return (
    <button
      className="speech-button secondary"
      type="button"
      onClick={() => speaking ? stop() : speak(text, language)}
      aria-label={label}
      title={label}
    >
      {speaking ? <Square aria-hidden="true" /> : <Volume2 aria-hidden="true" />}
      <span>{label}</span>
    </button>
  );
}
