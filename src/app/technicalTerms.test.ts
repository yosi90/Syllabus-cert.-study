import { describe, expect, it } from "vitest";
import { technicalTextSegments } from "./technicalTerms";

describe("technical term localization", () => {
  it("prefers a multi-word term over its contained generic terms", () => {
    const segments = technicalTextSegments("Los casos de prueba se ejecutan durante las pruebas de regresión.");
    const terms = segments.filter((segment) => segment.type === "term");

    expect(terms.map((segment) => segment.text)).toEqual(["test cases", "regression testing"]);
    expect(terms.map((segment) => segment.translation)).toEqual(["caso de prueba", "pruebas de regresión"]);
  });

  it("leaves ordinary QA vocabulary and established anglicisms unmarked", () => {
    expect(technicalTextSegments("El error, los defectos y los fallos son relevantes."))
      .toEqual([{ type: "text", text: "El error, los defectos y los fallos son relevantes." }]);
    expect(technicalTextSegments("La palabra terror no es el término."))
      .toEqual([{ type: "text", text: "La palabra terror no es el término." }]);
    expect(technicalTextSegments("El tester diseñó dos tests a partir del checklist durante las pruebas."))
      .toEqual([{ type: "text", text: "El tester diseñó dos tests a partir del checklist durante las pruebas." }]);
  });

  it("still recognizes fault attack without treating ordinary testing as a term", () => {
    const segments = technicalTextSegments("Las pruebas son un proceso. Un ataque de fallo puede revelar fallas.");
    const terms = segments.filter((segment) => segment.type === "term");

    expect(terms.map((segment) => [segment.text, segment.translation])).toEqual([
      ["fault attack", "ataque de fallo"],
    ]);
  });
});
