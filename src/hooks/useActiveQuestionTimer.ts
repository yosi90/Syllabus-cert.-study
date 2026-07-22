import { useCallback, useEffect, useRef, useState } from "react";

export function useActiveQuestionTimer(questionId: string | null, running: boolean) {
  const elapsedByQuestion = useRef(new Map<string, number>());
  const finishedQuestions = useRef(new Set<string>());
  const activeQuestionId = useRef<string | null>(null);
  const elapsedRef = useRef(0);
  const runningRef = useRef(running);
  const lastTick = useRef(performance.now());
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    const previousId = activeQuestionId.current;
    if (previousId && !finishedQuestions.current.has(previousId)) {
      elapsedByQuestion.current.set(previousId, elapsedRef.current);
    }
    if (previousId) finishedQuestions.current.delete(previousId);

    activeQuestionId.current = questionId;
    elapsedRef.current = questionId ? elapsedByQuestion.current.get(questionId) ?? 0 : 0;
    lastTick.current = performance.now();
    setElapsedMs(elapsedRef.current);
  }, [questionId]);

  useEffect(() => {
    runningRef.current = running;
    lastTick.current = performance.now();
  }, [running]);

  useEffect(() => {
    const resetTick = () => {
      lastTick.current = performance.now();
    };
    document.addEventListener("visibilitychange", resetTick);
    const interval = window.setInterval(() => {
      const now = performance.now();
      const delta = now - lastTick.current;
      lastTick.current = now;
      if (!runningRef.current || document.visibilityState !== "visible" || !activeQuestionId.current) return;
      elapsedRef.current += delta;
      elapsedByQuestion.current.set(activeQuestionId.current, elapsedRef.current);
      setElapsedMs(elapsedRef.current);
    }, 250);

    return () => {
      document.removeEventListener("visibilitychange", resetTick);
      window.clearInterval(interval);
    };
  }, []);

  const finishAttempt = useCallback((finishedQuestionId: string) => {
    const value = finishedQuestionId === activeQuestionId.current
      ? elapsedRef.current
      : elapsedByQuestion.current.get(finishedQuestionId) ?? 0;
    elapsedByQuestion.current.delete(finishedQuestionId);
    finishedQuestions.current.add(finishedQuestionId);
    if (finishedQuestionId === activeQuestionId.current) {
      elapsedRef.current = value;
      setElapsedMs(value);
    }
    return Math.max(0, Math.round(value));
  }, []);

  return { elapsedMs, finishAttempt };
}
