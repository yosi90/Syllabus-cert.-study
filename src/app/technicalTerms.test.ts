import { describe, expect, it } from "vitest";
import { technicalTextSegments } from "./technicalTerms";

describe("technical term localization", () => {
  it("prefers a multi-word term over its contained generic terms", () => {
    const segments = technicalTextSegments("Las particiones de equivalencia se usan durante las pruebas de regresión.");
    const terms = segments.filter((segment) => segment.type === "term");

    expect(terms.map((segment) => segment.text)).toEqual(["equivalence partitions", "regression testing"]);
    expect(terms.map((segment) => segment.translation)).toEqual(["partición de equivalencia", "pruebas de regresión"]);
  });

  it("leaves ordinary QA vocabulary and established anglicisms unmarked", () => {
    expect(technicalTextSegments("El error, los defectos y los fallos son relevantes."))
      .toEqual([{ type: "text", text: "El error, los defectos y los fallos son relevantes." }]);
    expect(technicalTextSegments("La palabra terror no es el término."))
      .toEqual([{ type: "text", text: "La palabra terror no es el término." }]);
    expect(technicalTextSegments("El tester diseñó dos tests a partir del checklist durante las pruebas."))
      .toEqual([{ type: "text", text: "El tester diseñó dos tests a partir del checklist durante las pruebas." }]);
    expect(technicalTextSegments("El caso de prueba usa datos de prueba y condiciones de prueba de la base de prueba durante la ejecución de pruebas estáticas, con automatización de pruebas, en un entorno de prueba y dentro de un conjunto de pruebas, para medir la cobertura del objeto de prueba."))
      .toEqual([{ type: "text", text: "El caso de prueba usa datos de prueba y condiciones de prueba de la base de prueba durante la ejecución de pruebas estáticas, con automatización de pruebas, en un entorno de prueba y dentro de un conjunto de pruebas, para medir la cobertura del objeto de prueba." }]);
  });

  it("still recognizes fault attack without treating ordinary testing as a term", () => {
    const segments = technicalTextSegments("Las pruebas son un proceso. Un ataque de fallo puede revelar fallas.");
    const terms = segments.filter((segment) => segment.type === "term");

    expect(terms.map((segment) => [segment.text, segment.translation])).toEqual([
      ["fault attack", "ataque de fallo"],
    ]);
  });

  it("leaves the requested testing activities unmarked", () => {
    const text = "La planificación de pruebas, la gestión de pruebas, la implementación de pruebas, las pruebas dinámicas, las pruebas exploratorias y la depuración (debugging).";
    expect(technicalTextSegments(text)).toEqual([{ type: "text", text }]);
  });

  it("recognizes decision tables, performance efficiency testing and commits", () => {
    const segments = technicalTextSegments(
      "Las pruebas de tabla de decisiones y las pruebas de eficiencia del rendimiento se registran en varios commits.",
    );
    const terms = segments.filter((segment) => segment.type === "term");

    expect(terms.map((segment) => [segment.text, segment.translation])).toEqual([
      ["decision table testing", "pruebas de tabla de decisiones"],
      ["performance efficiency testing", "pruebas de eficiencia del rendimiento"],
      ["commits", "confirmación de cambios"],
    ]);
  });

  it("treats ATDD, BDD and TDD consistently as technical language", () => {
    const segments = technicalTextSegments(
      "En el desarrollo basado en pruebas de aceptación (ATDD), el desarrollo impulsado por el comportamiento (BDD) y el desarrollo guiado por pruebas (TDD) se usan enfoques distintos. Después se comparan ATDD, BDD y TDD.",
    );
    const terms = segments.filter((segment) => segment.type === "term");

    expect(terms.map((segment) => [segment.text, segment.translation])).toEqual([
      ["acceptance test-driven development", "desarrollo guiado por pruebas de aceptación"],
      ["ATDD", "desarrollo guiado por pruebas de aceptación"],
      ["behavior-driven development", "desarrollo impulsado por el comportamiento"],
      ["BDD", "desarrollo impulsado por el comportamiento"],
      ["test-driven development", "desarrollo guiado por pruebas"],
      ["TDD", "desarrollo guiado por pruebas"],
      ["ATDD", "desarrollo guiado por pruebas de aceptación"],
      ["BDD", "desarrollo impulsado por el comportamiento"],
      ["TDD", "desarrollo guiado por pruebas"],
    ]);
  });

  it("treats configuration management and CM as the same technical term", () => {
    const segments = technicalTextSegments(
      "La gestión de la configuración (CM) y la gestión de configuración utilizan herramientas CM.",
    );
    const terms = segments.filter((segment) => segment.type === "term");

    expect(terms.map((segment) => [segment.text, segment.translation])).toEqual([
      ["configuration management", "gestión de la configuración"],
      ["CM", "gestión de la configuración"],
      ["configuration management", "gestión de la configuración"],
      ["CM", "gestión de la configuración"],
    ]);
  });
});
