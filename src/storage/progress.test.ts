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
  UNKNOWN_ACTIVE_TIME_MS,
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

  it("accumulates active answer time and backfills unknown legacy timing", () => {
    const first = recordQuestionAttempt(createEmptyProgress(), "A-01", ["a"], true, "2026-06-25T00:00:00.000Z", 12_400);
    const second = recordQuestionAttempt(first, "A-01", ["b"], false, "2026-06-25T00:01:00.000Z", 7_600);
    expect(second.questionProgress["A-01"]).toMatchObject({
      attempts: 2,
      totalActiveMs: 20_000,
      lastActiveMs: 7_600,
      timedAttempts: 2,
    });

    const restoredLegacy = importProgress(JSON.stringify({
      ...createEmptyProgress(),
      timingBackfillCompleted: false,
      questionProgress: {
        "B-01": { attempts: 1, correct: 1, lastCorrect: true, flagged: false, lastAnswers: ["a"], updatedAt: "2026-01-01" },
      },
    }));
    expect(restoredLegacy.questionProgress["B-01"]).toMatchObject({
      totalActiveMs: UNKNOWN_ACTIVE_TIME_MS,
      lastActiveMs: UNKNOWN_ACTIVE_TIME_MS,
      timedAttempts: 1,
    });

    const measured = recordQuestionAttempt(restoredLegacy, "B-01", ["a"], true, "2026-07-22T00:00:00.000Z", 12_500);
    expect(measured.questionProgress["B-01"]).toMatchObject({
      totalActiveMs: 12_500,
      lastActiveMs: 12_500,
      timedAttempts: 1,
    });
  });

  it("backfills answered questions at one second or less only once", () => {
    const imported = importProgress(JSON.stringify({
      ...createEmptyProgress(),
      timingBackfillCompleted: false,
      questionProgress: {
        fast: { attempts: 1, correct: 1, lastCorrect: true, flagged: false, lastAnswers: ["a"], updatedAt: "2026-01-01", totalActiveMs: 1_000, lastActiveMs: 1_000, timedAttempts: 1 },
        measured: { attempts: 1, correct: 1, lastCorrect: true, flagged: false, lastAnswers: ["a"], updatedAt: "2026-01-01", totalActiveMs: 1_001, lastActiveMs: 1_001, timedAttempts: 1 },
        unseen: { attempts: 0, correct: 0, lastCorrect: false, flagged: true, lastAnswers: [], updatedAt: "2026-01-01" },
      },
    }));

    expect(imported.timingBackfillCompleted).toBe(true);
    expect(imported.questionProgress.fast.totalActiveMs).toBe(UNKNOWN_ACTIVE_TIME_MS);
    expect(imported.questionProgress.measured.totalActiveMs).toBe(1_001);
    expect(imported.questionProgress.unseen.totalActiveMs).toBe(0);
    expect(importProgress(exportProgress(imported)).questionProgress.fast.totalActiveMs).toBe(UNKNOWN_ACTIVE_TIME_MS);
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
      optionMode: "original",
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

  it("persists and imports an active adaptive study session", () => {
    const storage = memoryStorage();
    const progress = createEmptyProgress();
    progress.activeStudySession = {
      id: "adaptive-seed",
      title: "Adaptive session · 10",
      size: 10,
      seed: "seed",
      optionMode: "shuffled",
      optionSeed: "seed",
      questionIds: ["A-01", "B-02"],
      currentIndex: 1,
      answers: { "A-01": ["a"] },
      revealed: false,
      checkedQuestionIds: ["A-01"],
      startedAt: "2026-07-15T00:00:00.000Z",
    };

    saveProgress(progress, storage);
    expect(loadProgress(storage).activeStudySession).toEqual(progress.activeStudySession);
    expect(importProgress(exportProgress(progress)).activeStudySession?.seed).toBe("seed");
  });

  it("adds compatible option modes to older version 2 sessions", () => {
    const imported = importProgress(JSON.stringify({
      ...createEmptyProgress(),
      sessions: [
        { id: "model-A-old", title: "Model A", mode: "exam", sessionType: "official", questionIds: [], answers: {}, score: {}, completedAt: "2026-01-01" },
        { id: "adaptive-old", title: "Adaptive", mode: "study", sessionType: "adaptive", questionIds: [], answers: {}, score: {}, completedAt: "2026-01-01" },
      ],
      activeExam: { blueprint: { id: "random", title: "Random", questionIds: [] }, currentIndex: 0, answers: {}, timerMode: "off", endsAt: null },
    }));

    expect(imported.sessions[0]).toMatchObject({ optionMode: "original", optionSeed: "model-A-old" });
    expect(imported.sessions[1]).toMatchObject({ optionMode: "shuffled", optionSeed: "adaptive-old" });
    expect(imported.activeExam?.optionMode).toBe("original");
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
