export type TechnicalTermForm = {
  source: string;
  display?: string;
};

export type TechnicalTerm = {
  term: string;
  translation: string;
  forms: TechnicalTermForm[];
};

export const technicalTerms: TechnicalTerm[] = [
  { term: "acceptance test-driven development", translation: "desarrollo guiado por pruebas de aceptación", forms: [{ source: "desarrollo guiado por pruebas de aceptación" }, { source: "desarrollo basado en pruebas de aceptación" }, { source: "ATDD", display: "ATDD" }] },
  { term: "boundary value analysis", translation: "análisis de valores límite", forms: [{ source: "análisis de valores límite" }, { source: "BVA", display: "BVA" }] },
  { term: "equivalence partitioning", translation: "partición de equivalencia", forms: [{ source: "particiones de equivalencia", display: "equivalence partitions" }, { source: "partición de equivalencia" }, { source: "división de equivalencia" }, { source: "EP", display: "EP" }] },
  { term: "decision table testing", translation: "pruebas de tablas de decisión", forms: [{ source: "pruebas de tablas de decisión" }, { source: "prueba de tabla de decisión" }] },
  { term: "state transition testing", translation: "pruebas de transición de estados", forms: [{ source: "pruebas de transición de estados" }, { source: "prueba de transición de estado" }] },
  { term: "statement testing", translation: "pruebas de sentencias", forms: [{ source: "pruebas de sentencias" }, { source: "prueba de sentencias" }] },
  { term: "branch testing", translation: "pruebas de ramas", forms: [{ source: "pruebas de ramas" }, { source: "prueba de ramas" }] },
  { term: "exploratory testing", translation: "pruebas exploratorias", forms: [{ source: "pruebas exploratorias" }, { source: "prueba exploratoria" }] },
  { term: "checklist-based testing", translation: "pruebas basadas en checklists", forms: [{ source: "pruebas basadas en checklists" }, { source: "prueba basada en checklists" }] },
  { term: "regression testing", translation: "pruebas de regresión", forms: [{ source: "pruebas de regresión" }, { source: "prueba de regresión" }] },
  { term: "confirmation testing", translation: "pruebas de confirmación", forms: [{ source: "pruebas de confirmación" }, { source: "prueba de confirmación" }] },
  { term: "static testing", translation: "pruebas estáticas", forms: [{ source: "pruebas estáticas" }, { source: "prueba estática" }] },
  { term: "dynamic testing", translation: "pruebas dinámicas", forms: [{ source: "pruebas dinámicas" }, { source: "prueba dinámica" }] },
  { term: "risk-based testing", translation: "pruebas basadas en riesgos", forms: [{ source: "pruebas basadas en riesgos" }, { source: "prueba basada en riesgos" }] },
  { term: "test automation", translation: "automatización de pruebas", forms: [{ source: "automatización de pruebas" }] },
  { term: "test environment", translation: "entorno de prueba", forms: [{ source: "entornos de prueba", display: "test environments" }, { source: "entorno de prueba" }] },
  { term: "test execution", translation: "ejecución de pruebas", forms: [{ source: "ejecución de pruebas" }, { source: "ejecución de la prueba" }] },
  { term: "test implementation", translation: "implementación de pruebas", forms: [{ source: "implementación de pruebas" }] },
  { term: "test design", translation: "diseño de pruebas", forms: [{ source: "diseño de pruebas" }] },
  { term: "test analysis", translation: "análisis de pruebas", forms: [{ source: "análisis de pruebas" }] },
  { term: "test completion", translation: "finalización de pruebas", forms: [{ source: "finalización de pruebas" }, { source: "cierre de pruebas" }] },
  { term: "test planning", translation: "planificación de pruebas", forms: [{ source: "planificación de pruebas" }] },
  { term: "test monitoring", translation: "monitorización de pruebas", forms: [{ source: "monitorización de pruebas" }, { source: "seguimiento de pruebas" }] },
  { term: "test control", translation: "control de pruebas", forms: [{ source: "control de pruebas" }] },
  { term: "test management", translation: "gestión de pruebas", forms: [{ source: "gestión de pruebas" }] },
  { term: "test suite", translation: "conjunto de pruebas", forms: [{ source: "conjuntos de pruebas", display: "test suites" }, { source: "conjunto de pruebas" }] },
  { term: "test case", translation: "caso de prueba", forms: [{ source: "casos de prueba", display: "test cases" }, { source: "caso de prueba" }] },
  { term: "test condition", translation: "condición de prueba", forms: [{ source: "condiciones de prueba", display: "test conditions" }, { source: "condición de prueba" }] },
  { term: "test data", translation: "datos de prueba", forms: [{ source: "datos de prueba" }] },
  { term: "test basis", translation: "base de prueba", forms: [{ source: "bases de prueba", display: "test bases" }, { source: "base de prueba" }] },
  { term: "test object", translation: "objeto de prueba", forms: [{ source: "objetos de prueba", display: "test objects" }, { source: "objeto de prueba" }] },
  { term: "testware", translation: "productos de trabajo de prueba", forms: [{ source: "productos de trabajo de prueba" }, { source: "testware" }] },
  { term: "quality assurance", translation: "aseguramiento de la calidad", forms: [{ source: "aseguramiento de la calidad" }, { source: "QA", display: "QA" }] },
  { term: "quality control", translation: "control de calidad", forms: [{ source: "control de calidad" }, { source: "QC", display: "QC" }] },
  { term: "debugging", translation: "depuración", forms: [{ source: "depuración" }, { source: "debugging" }] },
  { term: "fault attack", translation: "ataque de fallo", forms: [{ source: "fault attacks", display: "fault attacks" }, { source: "fault attack" }, { source: "ataques de fallos", display: "fault attacks" }, { source: "ataque de fallos" }, { source: "ataques de fallo", display: "fault attacks" }, { source: "ataque de fallo" }, { source: "ataques de fallas", display: "fault attacks" }, { source: "ataque de fallas" }, { source: "ataques de falla", display: "fault attacks" }, { source: "ataque de falla" }] },
  { term: "coverage", translation: "cobertura", forms: [{ source: "cobertura" }] },
  { term: "walkthrough", translation: "recorrido", forms: [{ source: "recorrido" }, { source: "tutorial", display: "walkthrough" }] },
  { term: "technical review", translation: "revisión técnica", forms: [{ source: "revisiones técnicas", display: "technical reviews" }, { source: "revisión técnica" }] },
  { term: "informal review", translation: "revisión informal", forms: [{ source: "revisiones informales", display: "informal reviews" }, { source: "revisión informal" }] },
  { term: "inspection", translation: "inspección", forms: [{ source: "inspecciones", display: "inspections" }, { source: "inspección" }] },
  { term: "shift-left", translation: "desplazamiento de las pruebas hacia etapas tempranas", forms: [{ source: "shift-left" }] },
  { term: "whole team approach", translation: "enfoque de equipo completo", forms: [{ source: "enfoque de equipo completo" }] },
  { term: "DevOps", translation: "desarrollo y operaciones", forms: [{ source: "DevOps", display: "DevOps" }] },
  { term: "continuous integration", translation: "integración continua", forms: [{ source: "integración continua" }, { source: "CI", display: "CI" }] },
  { term: "continuous delivery", translation: "entrega continua", forms: [{ source: "entrega continua" }, { source: "CD", display: "CD" }] },
];

export type TechnicalTextSegment =
  | { type: "text"; text: string }
  | { type: "term"; text: string; translation: string; key: string };

const forms = technicalTerms
  .flatMap((entry) => entry.forms.map((form) => ({ ...form, entry })))
  .sort((left, right) => right.source.length - left.source.length);

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const termPattern = new RegExp(
  `(?<![\\p{L}\\p{N}])(${forms.map((form) => escapeRegExp(form.source)).join("|")})(?![\\p{L}\\p{N}])`,
  "giu",
);
const formBySource = new Map(forms.map((form) => [form.source.toLocaleLowerCase("es"), form]));

export function technicalTextSegments(text: string): TechnicalTextSegment[] {
  const segments: TechnicalTextSegment[] = [];
  let cursor = 0;

  for (const match of text.matchAll(termPattern)) {
    const index = match.index ?? 0;
    if (index > cursor) segments.push({ type: "text", text: text.slice(cursor, index) });
    const matchedText = match[0];
    const form = formBySource.get(matchedText.toLocaleLowerCase("es"));
    if (form) {
      segments.push({
        type: "term",
        text: form.display ?? form.entry.term,
        translation: form.entry.translation,
        key: `${form.entry.term}:${index}`,
      });
    } else {
      segments.push({ type: "text", text: matchedText });
    }
    cursor = index + matchedText.length;
  }

  if (cursor < text.length) segments.push({ type: "text", text: text.slice(cursor) });
  return segments.length ? segments : [{ type: "text", text }];
}
