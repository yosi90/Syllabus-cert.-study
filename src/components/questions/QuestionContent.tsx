import katex from "katex";
import { Square, Volume2 } from "lucide-react";
import { useEffect } from "react";
import type { Copy, Language } from "../../app/content";
import { localizedQuestion, parallelPromptListLayout, promptBlocks } from "../../app/presentation";
import type { Question } from "../../data/types";
import { useSpeechSynthesis } from "../../hooks/useSpeechSynthesis";
import { TechnicalText } from "../common/TechnicalText";

function PromptBlocks({ blocks, language }: { blocks: ReturnType<typeof promptBlocks>; language: Language }) {
  return <>{blocks.map((block, index) => block.type === "text" ? (
    <span className="question-prompt-text" key={index}><TechnicalText text={block.text} language={language} /></span>
  ) : (
    <span className="question-prompt-list" role="list" key={index}>
      {block.items.map((item, itemIndex) => (
        <span className="question-prompt-list-item" role="listitem" key={itemIndex}>
          <span className="question-prompt-list-marker" aria-hidden="true">{item.marker}</span>
          <span><TechnicalText text={item.text} language={language} /></span>
        </span>
      ))}
    </span>
  ))}</>;
}

export function QuestionPromptContent({ question, language }: { question: Question; language: Language }) {
  const localized = localizedQuestion(question, language);
  if (!localized.promptParts?.length) {
    const blocks = promptBlocks(localized.prompt);
    const parallelLists = parallelPromptListLayout(blocks);
    if (parallelLists) {
      return (
        <span className="question-prompt-content">
          <PromptBlocks blocks={parallelLists.prefix} language={language} />
          <span className="question-prompt-dual-list">
            <span className="question-prompt-list-column">
              <PromptBlocks blocks={parallelLists.firstColumn} language={language} />
            </span>
            <span className="question-prompt-list-column">
              <PromptBlocks blocks={parallelLists.secondColumn} language={language} />
            </span>
          </span>
          <PromptBlocks blocks={parallelLists.suffix} language={language} />
        </span>
      );
    }

    return (
      <span className="question-prompt-content">
        <PromptBlocks blocks={blocks} language={language} />
      </span>
    );
  }

  return <>{localized.promptParts.map((part, index) => part.type === "text" ? (
    <span key={index}><TechnicalText text={part.text} language={language} /></span>
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
