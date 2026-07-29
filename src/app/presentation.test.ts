import { describe, expect, it } from "vitest";
import { questions } from "../data/bank";
import {
  cleanExplanationText,
  displayAnswerLabels,
  formatPromptText,
  getDisplayOptions,
  localizedQuestion,
  parseExplanation,
  parallelPromptListLayout,
  promptBlocks,
  questionSpeechText,
} from "./presentation";

describe("option presentation fidelity", () => {
  it("keeps original letters for official single-answer questions from every model", () => {
    for (const model of ["A", "B", "C", "D"]) {
      const question = questions.find((item) => item.sourceModel === model && item.sourceNumber === 1)!;
      const displayed = getDisplayOptions(question, "en", "original", `model-${model}`);

      expect(displayed.map((option) => option.key)).toEqual(question.options.map((option) => option.key));
      expect(displayed.map((option) => option.displayKey)).toEqual(question.options.map((option) => option.key.toUpperCase()));
    }
  });

  it("uses the same stable mapping for a multiple-answer question and its correction", () => {
    const question = questions.find((item) => item.selectionMode === "multiple")!;
    const first = getDisplayOptions(question, "es", "shuffled", "adaptive-seed");
    const second = getDisplayOptions(question, "es", "shuffled", "adaptive-seed");
    const displayKeyByAnswer = new Map(first.map((option) => [option.key, option.displayKey]));

    expect(first).toEqual(second);
    expect(displayAnswerLabels(question, question.correctAnswers, "es", "shuffled", "adaptive-seed"))
      .toBe(question.correctAnswers.map((key) => displayKeyByAnswer.get(key)).join(", "));
  });
});

describe("localized explanation and formula presentation", () => {
  it.each([
    ["Is correct. Because it matches.", "Because it matches."],
    ["Is not correct. Because it differs.", "Because it differs."],
    ["Es correcta. Porque coincide.", "Porque coincide."],
    ["No es correcto. Porque difiere.", "Porque difiere."],
    ["No es correctas: Porque difieren.", "Porque difieren."],
    ["No son correcto. Porque difieren.", "Porque difieren."],
    ["Son correcta. Porque coincide.", "Porque coincide."],
  ])("removes the status prefix from %s", (source, expected) => {
    expect(cleanExplanationText(source)).toBe(expected);
  });

  it("removes every answer-status prefix used by the question bank", () => {
    for (const question of questions) {
      for (const language of ["en", "es"] as const) {
        const parsed = parseExplanation(localizedQuestion(question, language).explanation, question.options.map((option) => option.key));
        for (const option of parsed.options) {
          expect(cleanExplanationText(option.text), `${question.id} (${language}) option ${option.key}`)
            .not.toMatch(/^(?:is\s+)?(?:not\s+)?correct|^(?:no\s+)?(?:es|son)\s+correct/i);
        }
      }
    }
  });

  it("uses one detailed explanation per option when B-23 contains a repeated answer summary", () => {
    const question = questions.find((item) => item.id === "B-23")!;
    for (const language of ["en", "es"] as const) {
      const parsed = parseExplanation(
        localizedQuestion(question, language).explanation,
        question.options.map((option) => option.key),
      );

      expect(parsed.options.map((option) => option.key)).toEqual(["a", "b", "c", "d"]);
      expect(parsed.options.every((option) => option.text.length > 40)).toBe(true);
    }
  });

  it("uses the accessible localized wording for the C-31 fraction", () => {
    const question = questions.find((item) => item.id === "C-31")!;
    expect(questionSpeechText(question, "en")).toContain("all divided by four");
    expect(questionSpeechText(question, "es")).toContain("todo dividido entre cuatro");
  });
});

describe("question prompt formatting", () => {
  it("keeps B-21's three partitions separate from the following coverage explanation", () => {
    const question = questions.find((item) => item.id === "B-21")!;

    for (const language of ["en", "es"] as const) {
      const localized = localizedQuestion(question, language);
      const parsed = parseExplanation(localized.explanation, question.options.map((option) => option.key));
      const blocks = promptBlocks(parsed.intro);

      expect(blocks.slice(0, 3).map((block) => block.type), `B-21 (${language})`).toEqual(["text", "list", "text"]);
      expect(blocks[1]).toMatchObject({ type: "list", items: [{ marker: "•" }, { marker: "•" }, { marker: "•" }] });
      expect(blocks[2]).toMatchObject({
        type: "text",
        text: expect.stringMatching(language === "es" ? /^Para lograr una cobertura completa/ : /^To achieve full coverage/),
      });
    }
  });

  it.each(["B-34", "B-39", "C-15", "C-17", "C-20", "C-26", "D-20"])(
    "places every list item in %s on its own line",
    (id) => {
      const question = questions.find((item) => item.id === id)!;
      for (const language of ["en", "es"] as const) {
        const formatted = formatPromptText(localizedQuestion(question, language).prompt);
        expect(formatted, `${id} (${language})`).toMatch(/\n(?:•|1\.|i\.|A\.) /);
      }
    },
  );

  it("separates both D-20 lists from their surrounding text", () => {
    const question = questions.find((item) => item.id === "D-20")!;
    const blocks = promptBlocks(localizedQuestion(question, "es").prompt);

    expect(blocks.map((block) => block.type)).toEqual(["text", "list", "text", "list", "text"]);
    expect(blocks.filter((block) => block.type === "list").map((block) => block.items.length)).toEqual([4, 2]);
    expect(blocks.at(-1)).toEqual(expect.objectContaining({
      type: "text",
      text: expect.stringMatching(/^¿Cuáles/),
    }));
  });

  it("keeps the four D-22 test cases together without treating result categories as list markers", () => {
    const question = questions.find((item) => item.id === "D-22")!;
    for (const language of ["en", "es"] as const) {
      const blocks = promptBlocks(localizedQuestion(question, language).prompt);
      const lists = blocks.filter((block) => block.type === "list");
      expect(lists).toHaveLength(1);
      expect(lists[0].items).toHaveLength(4);
      expect(lists[0].items.map((item) => item.text)).toEqual([
        expect.stringMatching(/categor(?:y|ía) A\.$/),
        expect.stringMatching(/categor(?:y|ía) B\.$/),
        expect.stringMatching(/categor(?:y|ía) C\.$/),
        expect.stringMatching(/categor(?:y|ía) D\.$/),
      ]);
    }
  });

  it("renders the five B-22 test cases as one real list", () => {
    const question = questions.find((item) => item.id === "B-22")!;
    for (const language of ["en", "es"] as const) {
      const blocks = promptBlocks(localizedQuestion(question, language).prompt);
      const lists = blocks.filter((block) => block.type === "list");

      expect(lists).toHaveLength(1);
      expect(lists[0].items.map((item) => item.marker)).toEqual(["TC1:", "TC2:", "TC3:", "TC4:", "TC5:"]);
      expect(blocks.findIndex((block) => block.type === "list")).toBeGreaterThan(0);
      expect(blocks.at(-1)).toEqual(expect.objectContaining({
        type: "text",
        text: expect.stringMatching(/^(?:What|¿Cuál)/),
      }));
    }
  });

  it("renders the A-38 defect report as one structured card", () => {
    const question = questions.find((item) => item.id === "A-38")!;
    for (const language of ["en", "es"] as const) {
      const blocks = promptBlocks(localizedQuestion(question, language).prompt);
      const reports = blocks.filter((block) => block.type === "list");

      expect(reports).toHaveLength(1);
      expect(reports[0].items).toHaveLength(7);
      expect(reports[0].items[0].text).toMatch(/^(?:Title|Título):/);
      expect(reports[0].items.at(-1)?.text).toMatch(/^(?:Priority and reference|Prioridad y referencia):/);
      expect(blocks.at(-1)).toEqual(expect.objectContaining({
        type: "text",
        text: expect.stringMatching(/^(?:What|¿Qué)/),
      }));
    }
  });

  it.each(["A-34", "B-34", "B-39", "C-17"])("renders the two lists in %s as separate cards", (id) => {
    const question = questions.find((item) => item.id === id)!;
    for (const language of ["en", "es"] as const) {
      expect(promptBlocks(localizedQuestion(question, language).prompt).filter((block) => block.type === "list"))
        .toHaveLength(2);
    }
  });

  it("gives each A-34 list its own heading", () => {
    const question = questions.find((item) => item.id === "A-34")!;
    for (const language of ["en", "es"] as const) {
      const lists = promptBlocks(localizedQuestion(question, language).prompt).filter((block) => block.type === "list");
      expect(lists.map((list) => list.items.length)).toEqual([4, 4]);
      const layout = parallelPromptListLayout(promptBlocks(localizedQuestion(question, language).prompt));
      expect(layout?.firstColumn[0]).toEqual(expect.objectContaining({
        type: "text",
        text: expect.stringMatching(/test categories|categorías de pruebas/),
      }));
      expect(layout?.secondColumn[0]).toEqual(expect.objectContaining({
        type: "text",
        text: expect.stringMatching(/testing quadrants|cuadrantes de pruebas/),
      }));
    }
    expect(parallelPromptListLayout(promptBlocks(localizedQuestion(question, "es").prompt))?.suffix)
      .toEqual([expect.objectContaining({ text: "¿Cómo se asignan las siguientes categorías de pruebas a los cuadrantes de pruebas ágiles?" })]);
  });

  it("keeps the first two sentences of C-21 in one prompt block", () => {
    const question = questions.find((item) => item.id === "C-21")!;
    for (const language of ["en", "es"] as const) {
      const blocks = promptBlocks(localizedQuestion(question, language).prompt);
      expect(blocks).toHaveLength(2);
      expect(blocks[0]).toEqual(expect.objectContaining({
        type: "text",
        text: expect.stringMatching(/business rule; you design|regla de negocio; usted diseña/),
      }));
    }
  });

  it("keeps all four B-39 tool categories inside the second card", () => {
    const question = questions.find((item) => item.id === "B-39")!;
    for (const language of ["en", "es"] as const) {
      const lists = promptBlocks(localizedQuestion(question, language).prompt)
        .filter((block) => block.type === "list");
      expect(lists.map((list) => list.items.length)).toEqual([4, 4]);
      expect(lists[1].items.at(-1)).toEqual(expect.objectContaining({
        marker: "D.",
        text: expect.stringMatching(/Collaboration tools|Herramientas de colaboración/),
      }));
    }
  });

  it("keeps the D-20 introduction and final question outside the two-column list area", () => {
    const question = questions.find((item) => item.id === "D-20")!;
    const layout = parallelPromptListLayout(promptBlocks(localizedQuestion(question, "es").prompt));

    expect(layout?.prefix).toEqual([expect.objectContaining({
      type: "text",
      text: expect.stringMatching(/^El sistema.*current year\)\.$/),
    })]);
    expect(layout?.firstColumn[0]).toEqual(expect.objectContaining({ text: expect.stringMatching(/^Sea D/) }));
    expect(layout?.secondColumn[0]).toEqual(expect.objectContaining({ text: expect.stringMatching(/^Su conjunto/) }));
    expect(layout?.suffix).toEqual([expect.objectContaining({ text: expect.stringMatching(/^¿Cuáles/) })]);
  });
});

describe("visual question presentation", () => {
  it("uses función del tester for testing role in A-06 and C-06", () => {
    const a06 = questions.find((item) => item.id === "A-06")!;
    const c06 = questions.find((item) => item.id === "C-06")!;
    const translatedTexts = [
      localizedQuestion(a06, "es").prompt,
      localizedQuestion(c06, "es").prompt,
      ...localizedQuestion(c06, "es").options.map((option) => option.text),
      localizedQuestion(c06, "es").explanation,
    ].join(" ");

    expect(localizedQuestion(a06, "es").prompt).toContain("función del tester");
    expect(localizedQuestion(c06, "es").prompt).toContain("funciones del tester");
    expect(translatedTexts).not.toMatch(/funciones? de pruebas?|rol de pruebas?/i);
  });

  it("keeps Manager in English in every Spanish question translation", () => {
    for (const question of questions) {
      const translation = question.translations?.es;
      if (!translation) continue;
      const pairs = [
        [question.prompt, translation.prompt ?? ""],
        [question.explanation, translation.explanation ?? ""],
        ...question.options.map((option) => [
          option.text,
          translation.options?.find((translated) => translated.key === option.key)?.text ?? "",
        ]),
      ];

      for (const [english, spanish] of pairs) {
        if (!/\bmanagers?\b/i.test(english)) continue;
        expect(spanish, `${question.id}: ${english}`).toMatch(/\bManagers?\b/);
        expect(spanish, `${question.id}: ${english}`).not.toMatch(/gerent|gestor|\bjefe\b/i);
      }
    }
  });

  it("does not repeat flattened table cells inside table-based prompts", () => {
    const tableQuestionIds = ["A-14", "A-21", "A-22", "A-33", "B-22", "B-31", "B-32", "B-38", "C-21", "C-22", "C-29", "C-38", "D-22", "D-23", "D-29", "D-32", "D-38"];
    const flattenedTablePattern = /Rule 1 Rule 2|Regla 1 Regla 2|R1 R2 R3|Req1 Req2|TC1 91|TC 001 Select|TC 001 Seleccionar|Project Development effort|Esfuerzo de desarrollo del proyecto/;

    for (const id of tableQuestionIds) {
      const question = questions.find((item) => item.id === id)!;
      expect(question.visual, id).toBeDefined();
      expect(question.prompt, `${id} (en)`).not.toMatch(flattenedTablePattern);
      expect(question.translations?.es?.prompt, `${id} (es)`).not.toMatch(flattenedTablePattern);
    }
  });

  it.each([
    ["B-38", /Execution of TC1|Ejecución de TC1/],
    ["C-21", /INPUT: value|ENTRADA: valor/],
    ["C-29", /AC1:/],
    ["C-38", /Application: WebShop|Aplicación: WebShop/],
    ["D-29", /Acceptance criteria:\s*1|Criterios de aceptación:\s*1/],
    ["D-38", /Defect ID: 001|ID de defecto: 001/],
  ])("does not duplicate the image contents in %s", (id, duplicatedContent) => {
    const question = questions.find((item) => item.id === id)!;
    expect(question.prompt).not.toMatch(duplicatedContent);
    expect(question.translations?.es?.prompt).not.toMatch(duplicatedContent);
  });
});
