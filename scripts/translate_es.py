from __future__ import annotations

import json
import re
import time
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
BANK_PATH = ROOT / "src" / "data" / "question-bank.json"
CACHE_PATH = ROOT / ".cache" / "question-bank-es-translations.json"
PDF_TABLE_HEADER_EN = "Question (#) Explanation / Rationale Learning Objective (LO) K-Level Number of"
PDF_TABLE_HEADER_ES = re.compile(
    r"\s*Pregunta \((?:#|n\.º)\)\s*Explicación\s*/\s*"
    r"(?:Justificación|Fundamento|Fundamentación)\s*"
    r"Objetivo de aprendizaje \(LO\) Nivel K Número de\s*",
    re.IGNORECASE,
)

# Keep CTFL terminology aligned with the official Spanish syllabus. Replacing these
# expressions before machine translation prevents context-free translations such as
# "cobertura de sucursales" for "branch coverage".
GLOSSARY = {
    "software development lifecycle": "ciclo de vida de desarrollo de software",
    "collaborative user story writing": "redacción colaborativa de historias de usuario",
    "three-point estimation technique": "técnica de estimación de tres puntos",
    "experience-based test technique": "técnica de prueba basada en la experiencia",
    "black-box test technique": "técnica de prueba de caja negra",
    "white-box test technique": "técnica de prueba de caja blanca",
    "boundary value analysis": "análisis de valores límite",
    "equivalence partitioning": "partición de equivalencia",
    "equivalence partitions": "particiones de equivalencia",
    "equivalence partition": "partición de equivalencia",
    "decision table testing": "pruebas de tabla de decisiones",
    "state transition testing": "pruebas de transición de estados",
    "checklist-based testing": "pruebas basadas en checklists",
    "exploratory testing": "pruebas exploratorias",
    "error guessing": "predicción de errores",
    "statement coverage": "cobertura de sentencias",
    "branch coverage": "cobertura de ramas",
    "statement testing": "pruebas de sentencias",
    "branch testing": "pruebas de ramas",
    "coverage items": "elementos de cobertura",
    "coverage item": "elemento de cobertura",
    "executable statements": "sentencias ejecutables",
    "executable statement": "sentencia ejecutable",
    "whole team approach": "enfoque de equipo completo",
    "independence of testing": "independencia de las pruebas",
    "quality assurance": "aseguramiento de la calidad",
    "root causes": "causas raíz",
    "root cause": "causa raíz",
    "risk-based testing": "pruebas basadas en riesgos",
    "risk likelihood": "probabilidad del riesgo",
    "risk impact": "impacto del riesgo",
    "risk level": "nivel de riesgo",
    "product risks": "riesgos de producto",
    "product risk": "riesgo de producto",
    "project risks": "riesgos de proyecto",
    "project risk": "riesgo de proyecto",
    "configuration management": "gestión de la configuración",
    "test completion report": "informe de finalización de la prueba",
    "test progress report": "informe de progreso de la prueba",
    "defect reports": "informes de defectos",
    "defect report": "informe de defectos",
    "entry criteria": "criterios de entrada",
    "entry criterion": "criterio de entrada",
    "exit criteria": "criterios de salida",
    "exit criterion": "criterio de salida",
    "test objectives": "objetivos de prueba",
    "test objective": "objetivo de prueba",
    "test conditions": "condiciones de prueba",
    "test condition": "condición de prueba",
    "test cases": "casos de prueba",
    "test case": "caso de prueba",
    "test procedures": "procedimientos de prueba",
    "test procedure": "procedimiento de prueba",
    "test environments": "entornos de prueba",
    "test environment": "entorno de prueba",
    "test levels": "niveles de prueba",
    "test level": "nivel de prueba",
    "test types": "tipos de prueba",
    "test type": "tipo de prueba",
    "test basis": "base de prueba",
    "test data": "datos de prueba",
    "test plan": "plan de prueba",
    "test strategy": "estrategia de prueba",
    "test approach": "enfoque de prueba",
    "test process": "proceso de prueba",
    "test analysis": "análisis de prueba",
    "test design": "diseño de prueba",
    "test implementation": "implementación de prueba",
    "test execution": "ejecución de prueba",
    "test completion": "finalización de la prueba",
    "test monitoring": "seguimiento de la prueba",
    "test control": "control de la prueba",
    "test management": "gestión de pruebas",
    "test manager": "gestor de pruebas",
    "component integration testing": "pruebas de integración de componentes",
    "system integration testing": "pruebas de integración de sistemas",
    "component testing": "pruebas de componentes",
    "system testing": "pruebas de sistema",
    "acceptance testing": "pruebas de aceptación",
    "confirmation testing": "pruebas de confirmación",
    "regression testing": "pruebas de regresión",
    "functional testing": "pruebas funcionales",
    "non-functional testing": "pruebas no funcionales",
    "static testing": "pruebas estáticas",
    "dynamic testing": "pruebas dinámicas",
    "test automation": "automatización de pruebas",
    "work products": "productos de trabajo",
    "work product": "producto de trabajo",
    "testers": "testers",
    "tester": "tester",
    "checklists": "checklists",
    "checklist": "checklist",
    "branches": "ramas",
    "branch": "rama",
}


def apply_glossary(text: str) -> str:
    result = text
    for source, target in sorted(GLOSSARY.items(), key=lambda item: len(item[0]), reverse=True):
        result = re.sub(rf"\b{re.escape(source)}\b", target, result, flags=re.IGNORECASE)
    return result


def clean_translation_artifacts(text: str) -> str:
    text = re.sub(
        r"pregunta retrospectiva \(#\)\s*Explicación\s*/\s*(?:Justificación|Fundamento)\s*"
        r"Objetivo de aprendizaje \(LO\) Nivel K Número de",
        "retrospectiva",
        text,
        flags=re.IGNORECASE,
    )
    return re.sub(r"\s+", " ", PDF_TABLE_HEADER_ES.sub(" ", text)).strip()


def polish_translation(question_id: str, field: str, text: str) -> str:
    text = clean_translation_artifacts(text)
    text = re.sub(r"\byo(?=\s*,\s*(?:ii|iii|iv|v)\b)", "i", text, flags=re.IGNORECASE)
    text = re.sub(r"\bi,\s*ii tengo una influencia significativa\b", "i, ii tienen una influencia significativa", text, flags=re.IGNORECASE)
    text = re.sub(r"\banalisis de limite valores\b", "análisis de valores límite", text, flags=re.IGNORECASE)
    text = re.sub(r"\banalisis de prueba\b", "análisis de prueba", text, flags=re.IGNORECASE)
    text = re.sub(r"\bpruebas de integracion\b", "pruebas de integración", text, flags=re.IGNORECASE)
    text = re.sub(r"\bpruebas de aceptacion\b", "pruebas de aceptación", text, flags=re.IGNORECASE)
    text = re.sub(r"\bActions\b", "Acciones", text)
    text = re.sub(r"\b(?:evaluadores|provadores|probadores)\b", "testers", text, flags=re.IGNORECASE)
    text = re.sub(r"\b(?:evaluador|provador|probador)\b", "tester", text, flags=re.IGNORECASE)
    text = re.sub(r"\brespaldaría\b", "daría soporte a", text, flags=re.IGNORECASE)
    text = re.sub(r"\brespaldan\b", "dan soporte a", text, flags=re.IGNORECASE)
    text = re.sub(r"\brespalda\b", "da soporte a", text, flags=re.IGNORECASE)
    text = re.sub(r"\brespaldar\b", "dar soporte a", text, flags=re.IGNORECASE)
    text = re.sub(r"\bdiseño de prueba y herramientas de implementación\b", "herramientas de diseño e implementación de pruebas", text, flags=re.IGNORECASE)
    text = re.sub(r"\bherramientas de diseño de prueba e implementación de prueba\b", "herramientas de diseño e implementación de pruebas", text, flags=re.IGNORECASE)

    for subject in [
        "testers",
        "pruebas de sistema",
        "pruebas de integración de sistemas",
        "pruebas de integración de componentes",
        "pruebas de tabla de decisiones",
        "pruebas de ramas",
        "pruebas exploratorias",
        "pruebas funcionales",
    ]:
        text = re.sub(rf"(^|(?<=[.!?])\s+)({re.escape(subject)})\b", rf"\1Los \2" if subject == "testers" else rf"\1Las \2", text, flags=re.IGNORECASE)

    text = re.sub(r"\bLos testers trabajará\b", "Los testers trabajarán", text, flags=re.IGNORECASE)
    text = re.sub(r"\bLas (pruebas [^.]{0,70}?) es\b", r"Las \1 son", text, flags=re.IGNORECASE)
    text = re.sub(r"\bLas (pruebas [^.]{0,70}?) examina\b", r"Las \1 examinan", text, flags=re.IGNORECASE)
    text = re.sub(r"\bLas (pruebas [^.]{0,70}?) incluye\b", r"Las \1 incluyen", text, flags=re.IGNORECASE)
    text = re.sub(r"\bLas (pruebas [^.]{0,70}?) utiliza\b", r"Las \1 utilizan", text, flags=re.IGNORECASE)
    text = re.sub(r"\bLas pruebas exploratorias son útil\b", "Las pruebas exploratorias son útiles", text, flags=re.IGNORECASE)
    text = re.sub(r"\bLas pruebas exploratorias también son útil\b", "Las pruebas exploratorias también son útiles", text, flags=re.IGNORECASE)
    text = re.sub(r"\bsistema completo y cubre pruebas\b", "sistema completo y cubren pruebas", text, flags=re.IGNORECASE)

    if question_id == "A-05" and field == "prompt":
        text = text.replace("caja blanca frente a la configuración del entorno de prueba", "caja blanca v. La configuración del entorno de prueba")
    if question_id == "D-05" and field == "prompt":
        text = text.replace("orden de ejecución vs. casos de prueba", "orden de ejecución v. Casos de prueba")
    if question_id == "D-08" and field == "prompt":
        text = text.replace(
            "responsables de la calidad versus los testers que tienen sesgos diferentes a los de los desarrolladores",
            "responsables de la calidad v. Los testers tienen sesgos diferentes a los de los desarrolladores",
        )
    if question_id == "D-39" and field == "prompt":
        text = text.replace(
            "iv. pruebas no funcionales herramientas v. herramientas de diseño e implementación de pruebas",
            "iv. Herramientas de pruebas no funcionales v. Herramientas de diseño e implementación de pruebas",
        )
    if question_id == "D-39" and field == "explanation":
        text = text.replace("v. diseño de prueba y herramientas de implementación", "v. Herramientas de diseño e implementación de pruebas")
    if question_id == "B-24" and field == "prompt":
        text = text.replace("oraciones", "afirmaciones")
    if question_id == "B-25" and field == "explanation":
        text = text.replace("declaraciones del código fuente", "sentencias del código fuente")

    if question_id == "B-33" and field == "explanation":
        text = text.replace(
            "Las pruebas de integración de componentes son tecnología de cara a pruebas que apoya al equipo",
            "Las pruebas de integración de componentes son pruebas orientadas a la tecnología que apoyan al equipo",
        )
    if (question_id == "B-19" and field == "option:a") or question_id == "B-24" or (question_id == "D-24" and field == "explanation"):
        text = re.sub(r"\bdeclaraciones\b", "sentencias", text, flags=re.IGNORECASE)
        text = re.sub(r"\bdeclaración\b", "sentencia", text, flags=re.IGNORECASE)
        text = re.sub(r"\bafirmación\b", "sentencia", text, flags=re.IGNORECASE)

    if field.startswith("option:") and not re.match(r"^[ivx]+(?:\s*,|\s+y\s+)", text, re.IGNORECASE):
        text = text[:1].upper() + text[1:]
    return text


def translate(text: str) -> str:
    prepared = apply_glossary(text)
    query = urllib.parse.urlencode(
        {
            "client": "gtx",
            "sl": "en",
            "tl": "es",
            "dt": "t",
            "q": prepared,
        }
    ).encode("utf-8")
    request = urllib.request.Request(
        "https://translate.googleapis.com/translate_a/single",
        data=query,
        headers={"User-Agent": "Mozilla/5.0"},
    )
    last_error: Exception | None = None
    for attempt in range(5):
        try:
            with urllib.request.urlopen(request, timeout=30) as response:
                payload = json.load(response)
            result = "".join(part[0] for part in payload[0] if part[0]).strip()
            if result:
                return result
        except Exception as error:
            last_error = error
            time.sleep(2**attempt)
    raise RuntimeError(f"Could not translate text after five attempts: {text[:80]!r}") from last_error


def main() -> None:
    bank = json.loads(BANK_PATH.read_text(encoding="utf-8"))
    CACHE_PATH.parent.mkdir(parents=True, exist_ok=True)
    cache = json.loads(CACHE_PATH.read_text(encoding="utf-8")) if CACHE_PATH.exists() else {}

    # Migrate cached translations made before PDF table headers were removed from
    # explanations. This avoids sending otherwise identical content for translation.
    for source, translated in list(cache.items()):
        clean_source = re.sub(rf"\s*{re.escape(PDF_TABLE_HEADER_EN)}\s*", " ", source).strip()
        if clean_source != source and clean_source not in cache:
            cache[clean_source] = clean_translation_artifacts(translated)
    cache = {source: clean_translation_artifacts(translated) for source, translated in cache.items()}

    source_texts = {
        text
        for question in bank["questions"]
        for text in [question["prompt"], question["explanation"], *(option["text"] for option in question["options"])]
    }
    missing = [text for text in source_texts if text not in cache]
    print(f"Translating {len(missing)} new strings ({len(source_texts)} total)")

    with ThreadPoolExecutor(max_workers=2) as executor:
        futures = {executor.submit(translate, text): text for text in missing}
        for index, future in enumerate(as_completed(futures), start=1):
            source = futures[future]
            cache[source] = clean_translation_artifacts(future.result())
            if index % 25 == 0 or index == len(missing):
                CACHE_PATH.write_text(json.dumps(cache, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
                print(f"Translated {index}/{len(missing)}")

    for question in bank["questions"]:
        spanish = question.setdefault("translations", {}).setdefault("es", {})
        spanish["prompt"] = polish_translation(question["id"], "prompt", cache[question["prompt"]])
        spanish["options"] = [
            {"key": option["key"], "text": polish_translation(question["id"], f"option:{option['key']}", cache[option["text"]])}
            for option in question["options"]
        ]
        spanish["selector"] = "Selecciona DOS opciones." if question["selectionMode"] == "multiple" else "Selecciona UNA opción."
        spanish["explanation"] = polish_translation(question["id"], "explanation", cache[question["explanation"]])

    BANK_PATH.write_text(json.dumps(bank, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Updated {BANK_PATH.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
