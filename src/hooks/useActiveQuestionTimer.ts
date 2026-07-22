import { useCallback, useEffect, useRef, useState } from "react";

const TIMER_STORAGE_PREFIX = "istqb-ctfl-v4-question-timer";

function storedTimerKey(scope: string, questionId: string) {
  return `${TIMER_STORAGE_PREFIX}:${scope}:${questionId}`;
}

function readStoredElapsed(key: string) {
  try {
    const value = Number(window.sessionStorage.getItem(key));
    return Number.isFinite(value) ? Math.max(0, value) : 0;
  } catch {
    return 0;
  }
}

function writeStoredElapsed(key: string, elapsedMs: number) {
  try {
    window.sessionStorage.setItem(key, String(Math.max(0, Math.round(elapsedMs))));
  } catch {
    // Timing persistence is optional when session storage is unavailable.
  }
}

function removeStoredElapsed(key: string) {
  try {
    window.sessionStorage.removeItem(key);
  } catch {
    // Timing persistence is optional when session storage is unavailable.
  }
}

export function useActiveQuestionTimer(scope: string, questionId: string | null, running: boolean) {
  const elapsedByQuestion = useRef(new Map<string, number>());
  const finishedQuestions = useRef(new Set<string>());
  const activeQuestionId = useRef<string | null>(null);
  const activeTimerKey = useRef<string | null>(null);
  const scopeRef = useRef(scope);
  const elapsedRef = useRef(0);
  const runningRef = useRef(running);
  const windowFocusedRef = useRef(document.hasFocus());
  const lastTick = useRef(performance.now());
  const lastPersistedSecond = useRef(-1);
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    const previousKey = activeTimerKey.current;
    if (previousKey && !finishedQuestions.current.has(previousKey)) {
      elapsedByQuestion.current.set(previousKey, elapsedRef.current);
      writeStoredElapsed(previousKey, elapsedRef.current);
    }
    if (previousKey) finishedQuestions.current.delete(previousKey);

    scopeRef.current = scope;
    activeQuestionId.current = questionId;
    const nextKey = questionId ? storedTimerKey(scope, questionId) : null;
    activeTimerKey.current = nextKey;
    elapsedRef.current = nextKey ? elapsedByQuestion.current.get(nextKey) ?? readStoredElapsed(nextKey) : 0;
    lastPersistedSecond.current = Math.floor(elapsedRef.current / 1_000);
    lastTick.current = performance.now();
    setElapsedMs(elapsedRef.current);
  }, [questionId, scope]);

  useEffect(() => {
    runningRef.current = running;
    lastTick.current = performance.now();
  }, [running]);

  useEffect(() => {
    const persistCurrent = () => {
      if (activeTimerKey.current && !finishedQuestions.current.has(activeTimerKey.current)) {
        writeStoredElapsed(activeTimerKey.current, elapsedRef.current);
      }
    };
    const resetTick = () => {
      lastTick.current = performance.now();
    };
    const handleFocus = () => {
      windowFocusedRef.current = true;
      resetTick();
    };
    const handleBlur = () => {
      windowFocusedRef.current = false;
      resetTick();
    };
    document.addEventListener("visibilitychange", resetTick);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("blur", handleBlur);
    window.addEventListener("pagehide", persistCurrent);
    window.addEventListener("beforeunload", persistCurrent);
    const interval = window.setInterval(() => {
      const now = performance.now();
      const delta = now - lastTick.current;
      lastTick.current = now;
      if (!runningRef.current || document.visibilityState !== "visible" || !windowFocusedRef.current || !activeQuestionId.current) return;
      elapsedRef.current += delta;
      if (activeTimerKey.current) elapsedByQuestion.current.set(activeTimerKey.current, elapsedRef.current);
      const elapsedSecond = Math.floor(elapsedRef.current / 1_000);
      if (activeTimerKey.current && elapsedSecond !== lastPersistedSecond.current) {
        lastPersistedSecond.current = elapsedSecond;
        writeStoredElapsed(activeTimerKey.current, elapsedRef.current);
      }
      setElapsedMs(elapsedRef.current);
    }, 250);

    return () => {
      document.removeEventListener("visibilitychange", resetTick);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("pagehide", persistCurrent);
      window.removeEventListener("beforeunload", persistCurrent);
      window.clearInterval(interval);
      persistCurrent();
    };
  }, []);

  const finishAttempt = useCallback((finishedQuestionId: string) => {
    const key = finishedQuestionId === activeQuestionId.current && activeTimerKey.current
      ? activeTimerKey.current
      : storedTimerKey(scopeRef.current, finishedQuestionId);
    const value = finishedQuestionId === activeQuestionId.current
      ? elapsedRef.current
      : elapsedByQuestion.current.get(key) ?? readStoredElapsed(key);
    elapsedByQuestion.current.delete(key);
    removeStoredElapsed(key);
    finishedQuestions.current.add(key);
    if (finishedQuestionId === activeQuestionId.current) {
      elapsedRef.current = value;
      setElapsedMs(value);
    }
    return Math.max(0, Math.round(value));
  }, []);

  return { elapsedMs, finishAttempt };
}
