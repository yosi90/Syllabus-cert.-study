import { describe, expect, it } from "vitest";
import {
  clearProgress,
  createEmptyProgress,
  exportProgress,
  importProgress,
  loadProgress,
  recordQuestionAttempt,
  saveProgress,
  setTutorialCompleted,
  toggleFlag,
  type StorageLike,
} from "./progress";

function memoryStorage(): StorageLike {
  const values = new Map<string, string>();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
}

describe("progress storage", () => {
  it("saves and loads progress", () => {
    const storage = memoryStorage();
    const progress = recordQuestionAttempt(createEmptyProgress(), "A-01", ["b"], true, "2026-06-25T00:00:00.000Z");
    saveProgress(progress, storage);
    expect(loadProgress(storage).questionProgress["A-01"].lastCorrect).toBe(true);
  });

  it("toggles flags without losing attempts", () => {
    const progress = recordQuestionAttempt(createEmptyProgress(), "A-01", ["a"], false);
    const flagged = toggleFlag(progress, "A-01");
    expect(flagged.questionProgress["A-01"].attempts).toBe(1);
    expect(flagged.questionProgress["A-01"].flagged).toBe(true);
  });

  it("exports, imports and clears progress", () => {
    const storage = memoryStorage();
    const progress = toggleFlag(createEmptyProgress(), "A-02");
    const imported = importProgress(exportProgress(progress));
    expect(imported.questionProgress["A-02"].flagged).toBe(true);
    saveProgress(imported, storage);
    expect(clearProgress(storage).sessions).toEqual([]);
    expect(loadProgress(storage).questionProgress).toEqual({});
  });

  it("tracks and normalizes tutorial completion", () => {
    const completed = setTutorialCompleted(createEmptyProgress(), true, "2026-06-25T00:00:00.000Z");
    expect(completed.preferences.tutorialCompleted).toBe(true);
    expect(completed.preferences.tutorialCompletedAt).toBe("2026-06-25T00:00:00.000Z");

    const imported = importProgress(
      JSON.stringify({
        version: 1,
        certification: "ctfl-v4",
        questionProgress: {},
        sessions: [],
        preferences: { lastMode: "study" },
      }),
    );
    expect(imported.preferences.tutorialCompleted).toBe(false);
    expect(imported.preferences.tutorialCompletedAt).toBeNull();
  });

  it("rejects incompatible progress exports", () => {
    expect(() =>
      importProgress(
        JSON.stringify({
          version: 1,
          questionProgress: {},
          sessions: [],
          preferences: { lastMode: "study" },
        }),
      ),
    ).toThrow("CTFL v4");
  });
});
