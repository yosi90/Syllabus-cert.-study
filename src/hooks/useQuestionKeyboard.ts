import { useEffect, useRef } from "react";
import type { SelectionMode } from "../data/types";

function isDialogOpen() {
  return Boolean(document.querySelector('[role="dialog"], [role="alertdialog"]'));
}

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(target.closest(
    'textarea, select, input:not([type="radio"]):not([type="checkbox"]), [contenteditable="true"]',
  ));
}

function isAnswerInput(target: EventTarget | null) {
  return target instanceof HTMLInputElement
    && (target.type === "radio" || target.type === "checkbox")
    && Boolean(target.closest(".options-list"));
}

function isOtherInteractiveTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(target.closest('button, a, summary, input:not([type="radio"]):not([type="checkbox"])'));
}

export function useQuestionKeyboard({
  questionId,
  selectionMode,
  selectedAnswers = [],
  canNavigateAnswers = false,
  onToggleAnswer,
  canUsePrimaryAction = false,
  onPrimaryAction,
  canMovePrevious,
  canMoveNext,
  onMove,
}: {
  questionId?: string;
  selectionMode?: SelectionMode;
  selectedAnswers?: string[];
  canNavigateAnswers?: boolean;
  onToggleAnswer?: (optionKey: string) => void;
  canUsePrimaryAction?: boolean;
  onPrimaryAction?: () => void;
  canMovePrevious: boolean;
  canMoveNext: boolean;
  onMove: (direction: 1 | -1) => void;
}) {
  const cursorRef = useRef<{ questionId: string; index: number } | null>(null);

  useEffect(() => {
    cursorRef.current = null;
  }, [questionId]);

  useEffect(() => {
    function getAnswerInputs() {
      return Array.from(document.querySelectorAll<HTMLInputElement>(
        '.options-list input[type="radio"], .options-list input[type="checkbox"]',
      )).filter((input) => !input.disabled);
    }

    function handleFocusIn(event: FocusEvent) {
      if (!questionId || !isAnswerInput(event.target)) return;
      const inputs = getAnswerInputs();
      const index = inputs.indexOf(event.target as HTMLInputElement);
      if (index >= 0) cursorRef.current = { questionId, index };
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || isDialogOpen()) return;
      if (isEditableTarget(event.target)) return;

      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        const direction = event.key === "ArrowLeft" ? -1 : 1;
        const canMove = direction === -1 ? canMovePrevious : canMoveNext;
        if (!canMove) return;
        event.preventDefault();
        onMove(direction);
        return;
      }

      if (event.key === "ArrowUp" || event.key === "ArrowDown") {
        if (!questionId || !selectionMode || !canNavigateAnswers || !onToggleAnswer) return;
        const inputs = getAnswerInputs();
        if (!inputs.length) return;

        event.preventDefault();
        const direction = event.key === "ArrowUp" ? -1 : 1;
        const activeIndex = isAnswerInput(document.activeElement)
          ? inputs.indexOf(document.activeElement as HTMLInputElement)
          : -1;
        const storedCursor = cursorRef.current?.questionId === questionId
          ? cursorRef.current.index
          : -1;
        const cursorIndex = activeIndex >= 0 ? activeIndex : storedCursor;
        const checkedIndexes = inputs
          .map((input, index) => input.checked || selectedAnswers.includes(input.value) ? index : -1)
          .filter((index) => index >= 0);

        let targetIndex: number;
        let shouldSelectRadio = selectionMode === "single";

        if (cursorIndex >= 0 && cursorIndex < inputs.length) {
          targetIndex = (cursorIndex + direction + inputs.length) % inputs.length;
        } else if (selectionMode === "multiple") {
          if (checkedIndexes.length) {
            targetIndex = direction === -1
              ? checkedIndexes[0]
              : checkedIndexes[checkedIndexes.length - 1];
          } else {
            targetIndex = direction === -1 ? 0 : inputs.length - 1;
          }
          shouldSelectRadio = false;
        } else if (checkedIndexes.length) {
          targetIndex = (checkedIndexes[0] + direction + inputs.length) % inputs.length;
        } else {
          targetIndex = direction === -1 ? 0 : inputs.length - 1;
        }

        const targetInput = inputs[targetIndex];
        cursorRef.current = { questionId, index: targetIndex };
        targetInput.focus();
        if (shouldSelectRadio && !targetInput.checked) onToggleAnswer(targetInput.value);
        return;
      }

      if (event.key !== "Enter" || !canUsePrimaryAction || !onPrimaryAction) return;
      if (isOtherInteractiveTarget(event.target)) return;

      event.preventDefault();
      onPrimaryAction();
    }

    window.addEventListener("focusin", handleFocusIn);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("focusin", handleFocusIn);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    canMoveNext,
    canMovePrevious,
    canNavigateAnswers,
    canUsePrimaryAction,
    onMove,
    onPrimaryAction,
    onToggleAnswer,
    questionId,
    selectedAnswers,
    selectionMode,
  ]);
}
