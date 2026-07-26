import { useEffect } from "react";

function isDialogOpen() {
  return Boolean(document.querySelector('[role="dialog"]'));
}

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(target.closest('textarea, select, [contenteditable="true"]'));
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
  canCheck = false,
  onCheck,
  canMovePrevious,
  canMoveNext,
  onMove,
}: {
  canCheck?: boolean;
  onCheck?: () => void;
  canMovePrevious: boolean;
  canMoveNext: boolean;
  onMove: (direction: 1 | -1) => void;
}) {
  useEffect(() => {
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

      if (!canCheck || !onCheck || (event.key !== "Enter" && event.key !== " ")) return;

      // Space chooses an unselected option and toggles checkboxes. On an
      // already-selected radio it is free to act as the Check shortcut.
      if (event.key === " " && isAnswerInput(event.target)) {
        const input = event.target as HTMLInputElement;
        if (input.type !== "radio" || !input.checked) return;
      }
      if (isOtherInteractiveTarget(event.target)) return;

      event.preventDefault();
      onCheck();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [canCheck, canMoveNext, canMovePrevious, onCheck, onMove]);
}
