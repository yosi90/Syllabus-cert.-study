import { useCallback, useEffect, useRef, useState } from "react";
import type { Language } from "../app/content";

let activeOwner: symbol | null = null;
let stopActiveOwner: (() => void) | null = null;

export function useSpeechSynthesis() {
  const owner = useRef(Symbol("speech-owner"));
  const [speaking, setSpeaking] = useState(false);
  const supported = typeof window !== "undefined"
    && typeof window.speechSynthesis !== "undefined"
    && typeof window.SpeechSynthesisUtterance === "function";

  const stop = useCallback(() => {
    if (!supported || activeOwner !== owner.current) return;
    window.speechSynthesis.cancel();
    activeOwner = null;
    stopActiveOwner = null;
    setSpeaking(false);
  }, [supported]);

  const speak = useCallback((text: string, language: Language) => {
    if (!supported || !text.trim()) return;
    stopActiveOwner?.();

    const utterance = new SpeechSynthesisUtterance(text);
    const locale = language === "es" ? "es-ES" : "en-GB";
    const voices = window.speechSynthesis.getVoices();
    utterance.lang = locale;
    utterance.voice = voices.find((voice) => voice.lang.toLowerCase() === locale.toLowerCase())
      ?? voices.find((voice) => voice.lang.toLowerCase().startsWith(language))
      ?? null;

    activeOwner = owner.current;
    stopActiveOwner = () => {
      window.speechSynthesis.cancel();
      setSpeaking(false);
    };
    utterance.onend = utterance.onerror = () => {
      if (activeOwner === owner.current) {
        activeOwner = null;
        stopActiveOwner = null;
      }
      setSpeaking(false);
    };
    setSpeaking(true);
    window.speechSynthesis.speak(utterance);
  }, [supported]);

  useEffect(() => () => {
    if (activeOwner === owner.current) stop();
  }, [stop]);

  return { supported, speaking, speak, stop };
}
