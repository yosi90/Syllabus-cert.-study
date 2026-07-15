from __future__ import annotations

import json
import re
import sys
import time
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / ".cache" / "python-translate"
BANK = ROOT / "src" / "data" / "question-bank.json"

if str(CACHE) not in sys.path:
    sys.path.insert(0, str(CACHE))


def get_translation_engine():
    try:
        from deep_translator import GoogleTranslator  # type: ignore

        translator = GoogleTranslator(source="en", target="es")
        return lambda value: translator.translate(value)
    except Exception:
        pass

    try:
        from argostranslate import package, translate  # type: ignore
    except Exception as error:
        raise SystemExit(
            "No translation engine is installed. Run: "
            "python -m pip install --no-user --target .cache\\python-translate deep-translator argostranslate"
        ) from error

    installed = translate.get_installed_languages()
    has_model = any(
        language.code == "en"
        and any(target.to_lang.code == "es" for target in getattr(language, "translations_to", []))
        for language in installed
    )
    if not has_model:
        package.update_package_index()
        available = package.get_available_packages()
        model = next((item for item in available if item.from_code == "en" and item.to_code == "es"), None)
        if model is None:
            raise SystemExit("No Argos Translate en->es package was found.")
        package.install_from_path(model.download())
    return lambda value: translate.translate(value, "en", "es")


translate_raw = get_translation_engine()
FORCE = "--force" in sys.argv
LIMIT_ARG = next((arg for arg in sys.argv if arg.startswith("--limit=")), "")
LIMIT = int(LIMIT_ARG.split("=", 1)[1]) if LIMIT_ARG else 0
OFFSET_ARG = next((arg for arg in sys.argv if arg.startswith("--offset=")), "")
OFFSET = int(OFFSET_ARG.split("=", 1)[1]) if OFFSET_ARG else 0


GLOSSARY = [
    (r"\bsoftware testing\b", "pruebas de software"),
    (r"\btesting\b", "pruebas"),
    (r"\btest basis\b", "base de prueba"),
    (r"\btest case\b", "caso de prueba"),
    (r"\btest cases\b", "casos de prueba"),
    (r"\btest condition\b", "condicion de prueba"),
    (r"\btest conditions\b", "condiciones de prueba"),
    (r"\btest data\b", "datos de prueba"),
    (r"\btest design\b", "diseno de la prueba"),
    (r"\btest execution\b", "ejecucion de prueba"),
    (r"\btest implementation\b", "implementacion de prueba"),
    (r"\btest monitoring\b", "monitoreo de prueba"),
    (r"\btest objective\b", "objetivo de prueba"),
    (r"\btest planning\b", "planificacion de prueba"),
    (r"\btestware\b", "testware"),
    (r"\bdefect report\b", "informe de defecto"),
    (r"\bdefect reports\b", "informes de defecto"),
    (r"\broot cause\b", "causa raiz"),
    (r"\bfailure\b", "falla"),
    (r"\bfailures\b", "fallas"),
    (r"\bdefect\b", "defecto"),
    (r"\bdefects\b", "defectos"),
    (r"\bquality assurance\b", "aseguramiento de la calidad"),
    (r"\bverification\b", "verificacion"),
    (r"\bvalidation\b", "validacion"),
    (r"\bacceptance testing\b", "pruebas de aceptacion"),
    (r"\bcomponent testing\b", "pruebas de componentes"),
    (r"\bintegration testing\b", "pruebas de integracion"),
    (r"\bsystem testing\b", "pruebas del sistema"),
    (r"\bregression testing\b", "pruebas de regresion"),
    (r"\bconfirmation testing\b", "pruebas de confirmacion"),
    (r"\bstatic testing\b", "pruebas estaticas"),
    (r"\bdynamic testing\b", "pruebas dinamicas"),
    (r"\bblack-box\b", "caja negra"),
    (r"\bwhite-box\b", "caja blanca"),
    (r"\bboundary value analysis\b", "analisis de valores limite"),
    (r"\bequivalence partitioning\b", "particion de equivalencia"),
    (r"\bdecision table testing\b", "pruebas de tabla de decision"),
    (r"\bstate transition testing\b", "pruebas de transicion de estados"),
    (r"\bstatement coverage\b", "cobertura de sentencias"),
    (r"\bbranch coverage\b", "cobertura de ramas"),
    (r"\brisk-based testing\b", "pruebas basadas en riesgos"),
    (r"\bentry criteria\b", "criterios de entrada"),
    (r"\bexit criteria\b", "criterios de salida"),
]

FIXUPS = [
    ("condicion", "condición"),
    ("condiciones", "condiciones"),
    ("diseno", "diseño"),
    ("ejecucion", "ejecución"),
    ("implementacion", "implementación"),
    ("planificacion", "planificación"),
    ("raiz", "raíz"),
    ("verificacion", "verificación"),
    ("validacion", "validación"),
    ("aceptacion", "aceptación"),
    ("integracion", "integración"),
    ("estaticas", "estáticas"),
    ("dinamicas", "dinámicas"),
    ("analisis", "análisis"),
    ("limite", "límite"),
    ("particion", "partición"),
    ("decision", "decisión"),
    ("transicion", "transición"),
    ("evaluadores", "testers"),
    ("evaluador", "tester"),
    ("provadores", "testers"),
    ("provador", "tester"),
    ("probadores", "testers"),
    ("probador", "tester"),
    ("desarrollado por pruebas", "desarrollo guiado por pruebas"),
]


def normalize(value: str) -> str:
    value = re.sub(r"\s+", " ", value).strip()
    value = re.sub(r"\s+Sample Exams set [A-D]\s*$", "", value, flags=re.I)
    value = re.sub(r"\s+Conjunto de exámenes de muestra [A-D]\.?\s*$", "", value, flags=re.I)
    value = value.replace(" ,", ",").replace(" .", ".").replace(" ?", "?").replace(" :", ":")
    value = value.replace("¿ ", "¿").replace("¡ ", "¡")
    for before, after in FIXUPS:
        value = re.sub(before, after, value, flags=re.I)
    return value


def apply_source_glossary(value: str) -> str:
    for pattern, replacement in GLOSSARY:
        value = re.sub(pattern, replacement, value, flags=re.I)
    return value


def translate_text(value: str) -> str:
    if not value.strip():
        return ""
    prepared = normalize(value)
    return normalize(translate_raw(prepared))


def translate_selector(selector: str, selection_mode: str) -> str:
    if selection_mode == "multiple":
        return "Selecciona DOS opciones."
    return "Selecciona UNA opción."


def translate_explanation(value: str) -> str:
    matches = list(re.finditer(r"(?:^|\s)([a-e])\)\s+", value))
    if not matches:
        return translate_text(value)

    first = matches[0]
    intro = value[: first.start()].strip()
    parts: list[str] = []
    if intro:
        parts.append(translate_text(intro))

    for index, match in enumerate(matches):
        start = match.end()
        end = matches[index + 1].start() if index + 1 < len(matches) else len(value)
        option_text = value[start:end].strip()
        parts.append(f"{match.group(1)}) {translate_text(option_text)}")

    return " ".join(part for part in parts if part)


def translate_question(question: dict[str, Any]) -> dict[str, Any]:
    return {
        "prompt": translate_text(question["prompt"]),
        "options": [
            {
                "key": option["key"],
                "text": translate_text(option["text"]),
            }
            for option in question["options"]
        ],
        "selector": translate_selector(question["selector"], question["selectionMode"]),
        "explanation": translate_explanation(question.get("explanation", "")),
    }


def main() -> None:
    bank = json.loads(BANK.read_text(encoding="utf-8"))
    translated = 0
    for index, question in enumerate(bank["questions"]):
        if index < OFFSET:
            continue
        if LIMIT and translated >= LIMIT:
            break
        translations = question.setdefault("translations", {})
        existing = translations.get("es", {})
        if not FORCE and all(existing.get(field) for field in ["prompt", "options", "selector", "explanation"]):
            continue
        translations["es"] = translate_question(question)
        translated += 1
        print(f"translated {question['id']}")
        BANK.write_text(json.dumps(bank, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        time.sleep(0.2)

    BANK.write_text(json.dumps(bank, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Updated {BANK.relative_to(ROOT)}")
    print(f"Translated questions: {translated}")


if __name__ == "__main__":
    main()
