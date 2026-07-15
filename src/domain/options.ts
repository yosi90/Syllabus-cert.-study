import type { QuestionOption } from "../data/types";

export type OptionMode = "original" | "shuffled";

export function hashString(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function orderOptions(options: QuestionOption[], mode: OptionMode, seed: string): QuestionOption[] {
  const ordered = [...options];
  if (mode === "original") return ordered;

  const originalOrder = ordered.map((option) => option.key).join("");
  let state = hashString(seed);
  for (let index = ordered.length - 1; index > 0; index -= 1) {
    state = Math.imul(state ^ (state >>> 15), 2246822507) >>> 0;
    const swapIndex = state % (index + 1);
    [ordered[index], ordered[swapIndex]] = [ordered[swapIndex], ordered[index]];
  }
  if (ordered.length > 1 && ordered.map((option) => option.key).join("") === originalOrder) {
    ordered.push(ordered.shift()!);
  }
  return ordered;
}
