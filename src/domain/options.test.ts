import { describe, expect, it } from "vitest";
import type { QuestionOption } from "../data/types";
import { orderOptions } from "./options";

const options: QuestionOption[] = [
  { key: "a", text: "Alpha" },
  { key: "b", text: "Beta" },
  { key: "c", text: "Gamma" },
  { key: "d", text: "Delta" },
];

describe("option ordering", () => {
  it("preserves the official letters and order in original mode", () => {
    expect(orderOptions(options, "original", "ignored").map((option) => option.key)).toEqual(["a", "b", "c", "d"]);
  });

  it("creates a stable shuffled order without mutating the source", () => {
    const first = orderOptions(options, "shuffled", "session:A-01").map((option) => option.key);
    const second = orderOptions(options, "shuffled", "session:A-01").map((option) => option.key);

    expect(first).toEqual(second);
    expect(first).not.toEqual(["a", "b", "c", "d"]);
    expect([...first].sort()).toEqual(["a", "b", "c", "d"]);
    expect(options.map((option) => option.key)).toEqual(["a", "b", "c", "d"]);
  });
});
