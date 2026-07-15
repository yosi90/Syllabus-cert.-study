import { describe, expect, it } from "vitest";
import {
  clearProgress,
  createEmptyProgress,
  exportProgress,
  importProgress,
  LEGACY_STORAGE_KEY,
  loadProgress,
  recordQuestionAttempt,
  saveProgress,
  setTutorialCompleted,
  STORAGE_KEY,
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

  it("migrates a version 1 save and preserves its learning history", () => {
    const storage = memoryStorage();
    storage.setItem(
      LEGACY_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        certification: "ctfl-v4",
        questionProgress: {
          "A-01": {
            attempts: 2,
            correct: 1,
            lastCorrect: false,
            flagged: true,
            lastAnswers: ["a"],
            updatedAt: "2026-07-01T00:00:00.000Z",
          },
        },
        sessions: [],
        preferences: { lastMode: "exam", tutorialCompleted: true },
      }),
    );

    const migrated = loadProgress(storage);
    expect(migrated.version).toBe(2);
    expect(migrated.questionProgress["A-01"].attempts).toBe(2);
    expect(migrated.questionProgress["A-01"].flagged).toBe(true);
    expect(migrated.preferences.tutorialCompleted).toBe(true);
    expect(storage.getItem(STORAGE_KEY)).not.toBeNull();
  });

  it("persists workspace preferences, study state and an active exam", () => {
    const storage = memoryStorage();
    const progress = createEmptyProgress();
    progress.preferences = {
      ...progress.preferences,
      language: "es",
      theme: "dark",
      lastRoute: "/exam",
      lastMode: "exam",
    };
    progress.study = {
      filters: { ...progress.study.filters, models: ["B"], status: "incorrect" },
      currentQuestionId: "B-08",
      answers: { "B-08": ["b"] },
      revealed: true,
    };
    progress.activeExam = {
      blueprint: { id: "model-B", title: "Modelo B", questionIds: ["B-01", "B-02"] },
      currentIndex: 1,
      answers: { "B-01": ["a"] },
      timerMode: "standard",
      endsAt: 1_800_000,
    };

    saveProgress(progress, storage);
    const restored = loadProgress(storage);
    expect(restored.preferences).toMatchObject({ language: "es", theme: "dark", lastRoute: "/exam" });
    expect(restored.study).toMatchObject({ currentQuestionId: "B-08", revealed: true });
    expect(restored.study.filters.models).toEqual(["B"]);
    expect(restored.activeExam).toEqual(progress.activeExam);
    expect(importProgress(exportProgress(restored)).activeExam).toEqual(progress.activeExam);
  });

  it("persists the selected historical review", () => {
    const storage = memoryStorage();
    const progress = createEmptyProgress();
    progress.review.sessionId = "model-A-2026";
    saveProgress(progress, storage);

    expect(loadProgress(storage).review.sessionId).toBe("model-A-2026");
    expect(importProgress(exportProgress(progress)).review.sessionId).toBe("model-A-2026");
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
