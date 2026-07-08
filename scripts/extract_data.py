from __future__ import annotations

import json
import re
import subprocess
import sys
from collections import Counter
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / "Docs"
OUT = ROOT / "src" / "data" / "question-bank.json"


CHAPTERS = [
    {
        "id": "FL-1",
        "name": "Fundamentals of Testing",
        "minutes": 180,
        "keywords": [
            "coverage",
            "debugging",
            "defect",
            "error",
            "failure",
            "quality",
            "quality assurance",
            "root cause",
            "test analysis",
            "test basis",
            "test case",
            "test condition",
            "test control",
            "test design",
            "test execution",
            "test implementation",
            "test monitoring",
            "test objective",
            "test oracle",
            "test planning",
            "testware",
            "traceability",
            "validation",
            "verification",
        ],
    },
    {
        "id": "FL-2",
        "name": "Testing Throughout the Software Development Lifecycle",
        "minutes": 130,
        "keywords": [
            "acceptance testing",
            "alpha testing",
            "beta testing",
            "component integration testing",
            "component testing",
            "confirmation testing",
            "functional testing",
            "integration testing",
            "maintenance testing",
            "non-functional testing",
            "regression testing",
            "shift-left",
            "system integration testing",
            "system testing",
            "test level",
            "test type",
            "white-box testing",
        ],
    },
    {
        "id": "FL-3",
        "name": "Static Testing",
        "minutes": 80,
        "keywords": [
            "anomaly",
            "formal review",
            "inspection",
            "review",
            "reviewer",
            "static analysis",
            "static testing",
            "technical review",
            "walkthrough",
        ],
    },
    {
        "id": "FL-4",
        "name": "Test Analysis and Design",
        "minutes": 390,
        "keywords": [
            "acceptance criteria",
            "black-box test technique",
            "boundary value analysis",
            "branch coverage",
            "checklist-based testing",
            "collaborative user story writing",
            "decision table testing",
            "equivalence partitioning",
            "experience-based test technique",
            "exploratory testing",
            "state transition testing",
            "statement coverage",
            "test charter",
            "test technique",
            "white-box test technique",
        ],
    },
    {
        "id": "FL-5",
        "name": "Managing the Test Activities",
        "minutes": 335,
        "keywords": [
            "configuration management",
            "defect management",
            "defect report",
            "entry criteria",
            "exit criteria",
            "product risk",
            "project risk",
            "risk",
            "risk analysis",
            "risk control",
            "risk identification",
            "risk level",
            "risk management",
            "risk mitigation",
            "risk monitoring",
            "risk-based testing",
            "test approach",
            "test completion report",
            "test estimation",
            "test manager",
            "test plan",
            "test progress report",
            "test strategy",
            "tester",
        ],
    },
    {
        "id": "FL-6",
        "name": "Test Tools",
        "minutes": 20,
        "keywords": [
            "test automation",
            "test execution tool",
            "test management tool",
        ],
    },
]


CHAPTER_DISTRIBUTION = {
    "FL-1": 8,
    "FL-2": 6,
    "FL-3": 4,
    "FL-4": 11,
    "FL-5": 9,
    "FL-6": 2,
}


MULTI_ANSWER_IDS = ["A-06", "A-31", "B-26", "C-04", "D-20", "D-30", "D-35"]


def ensure_pypdf():
    try:
        from pypdf import PdfReader  # type: ignore

        return PdfReader
    except Exception:
        cache = ROOT / ".cache" / "python-pypdf"
        if not (cache / "pypdf").exists():
            cache.mkdir(parents=True, exist_ok=True)
            subprocess.check_call(
                [
                    sys.executable,
                    "-m",
                    "pip",
                    "install",
                    "--quiet",
                    "--no-user",
                    "--target",
                    str(cache),
                    "pypdf",
                ]
            )
        sys.path.insert(0, str(cache))
        from pypdf import PdfReader  # type: ignore

        return PdfReader


PdfReader = ensure_pypdf()


def load_existing_question_translations() -> dict[str, dict[str, Any]]:
    if not OUT.exists():
        return {}
    try:
        bank = json.loads(OUT.read_text(encoding="utf-8"))
    except Exception:
        return {}
    return {
        question["id"]: question.get("translations", {})
        for question in bank.get("questions", [])
        if question.get("translations")
    }


def read_pdf(path: Path) -> str:
    reader = PdfReader(str(path))
    chunks = []
    for index, page in enumerate(reader.pages, start=1):
        chunks.append(f"\n\n===== PAGE {index} =====\n{page.extract_text() or ''}")
    return "".join(chunks)


def normalize_spaces(value: str) -> str:
    value = value.replace("\u00a0", " ")
    value = re.sub(r"(\w)-\s+(\w)", r"\1\2", value)
    value = re.sub(r"\s+", " ", value)
    value = value.replace(" ,", ",").replace(" .", ".").replace(" ?", "?").replace(" :", ":")
    return value.strip()


def clean_pdf_lines(text: str, kind: str) -> str:
    skipped = [
        r"^===== PAGE \d+ =====$",
        r"^Certified Tester, Foundation Level",
        r"^Sample Exam set [A-D]",
        rf"^Sample Exam .* {kind}$",
        r"^Version .* Page \d+ of \d+",
        r"^© International Software Testing Qualifications Board",
        r"^International$",
        r"^Software Testing$",
        r"^Qualifications Board$",
    ]
    lines = []
    for raw in text.splitlines():
        line = raw.strip()
        if not line:
            lines.append("")
            continue
        if any(re.search(pattern, line) for pattern in skipped):
            continue
        lines.append(line)
    return "\n".join(lines)


def selection_mode(selector: str, correct_answers: list[str]) -> str:
    if "two" in selector.lower() or len(correct_answers) > 1:
        return "multiple"
    return "single"


def extract_options(body: str) -> tuple[str, list[dict[str, str]], str]:
    selector_matches = list(re.finditer(r"(?im)^Select\s+(?:ONE|TWO)\s+options?\.?\s*$", body))
    selector = ""
    if selector_matches:
        match = selector_matches[-1]
        selector = normalize_spaces(match.group(0))
        body = body[: match.start()] + body[match.end() :]

    option_matches = list(re.finditer(r"(?m)^([a-e])\)\s+", body))
    if not option_matches:
        return normalize_spaces(body), [], selector

    answer_options = option_matches
    stem = body[: answer_options[0].start()]
    options = []
    for idx, match in enumerate(answer_options):
        start = match.end()
        end = answer_options[idx + 1].start() if idx + 1 < len(answer_options) else len(body)
        options.append({"key": match.group(1), "text": normalize_spaces(body[start:end])})
    return normalize_spaces(stem), options, selector


def parse_questions(path: Path) -> dict[int, dict[str, Any]]:
    text = clean_pdf_lines(read_pdf(path), "Questions")
    start = text.find("\nQuestions\n")
    if start >= 0:
        text = text[start:]
    text = re.split(r"Sample Exams set A\s+Appendix: Additional Questions|Appendix: Additional Questions", text)[0]
    matches = list(re.finditer(r"(?m)^Question #(\d{1,2}) \(1 Point\)\s*$", text))
    parsed: dict[int, dict[str, Any]] = {}
    for idx, match in enumerate(matches):
        number = int(match.group(1))
        if number > 40:
            continue
        start = match.end()
        end = matches[idx + 1].start() if idx + 1 < len(matches) else len(text)
        prompt, options, selector = extract_options(text[start:end])
        parsed[number] = {
            "prompt": prompt,
            "options": options,
            "selector": selector or "Select ONE option.",
            "notes": [],
        }
    return parsed


def parse_answer_guide(path: Path) -> dict[int, dict[str, Any]]:
    text = read_pdf(path)
    guide_text = text.split("3. Answers")[0]
    guide: dict[int, dict[str, Any]] = {}
    for match in re.finditer(
        r"(\d{1,2})\s+([a-e](?:,\s*[a-e])*)\s+(FL-\d\.\d\.\d)\s+(K[123])\s+1",
        guide_text,
    ):
        number = int(match.group(1))
        if not (1 <= number <= 40) or number in guide:
            continue
        answers, reference, raw_k = match.group(2), match.group(3), match.group(4)
        guide[number] = {
            "answers": [answer.strip() for answer in answers.split(",")],
            "reference": reference,
            "rawKLevel": raw_k,
            "kLevel": raw_k,
            "points": 1,
        }
    return guide


def parse_explanations(path: Path, guide: dict[int, dict[str, Any]]) -> dict[int, str]:
    text = read_pdf(path)
    starts = list(re.finditer(r"(?m)^Answers\s*$", text))
    if starts:
        text = text[starts[-1].end() :]
    text = re.split(r"Appendix: Answer Key for Additional Sample Questions|Appendix: Additional Answers", text)[0]
    text = clean_pdf_lines(text, "Answers")
    answer_pattern = r"[a-e](?:,\s*[a-e])*"
    matches = list(re.finditer(rf"(?m)^(\d{{1,2}})\s+({answer_pattern})\s+", text))
    explanations: dict[int, str] = {}
    for idx, match in enumerate(matches):
        number = int(match.group(1))
        if number not in guide:
            continue
        start = match.end()
        end = matches[idx + 1].start() if idx + 1 < len(matches) else len(text)
        segment = text[start:end]
        reference = guide[number]["reference"]
        raw_k = guide[number]["rawKLevel"]
        segment = re.sub(rf"{re.escape(reference)}\s+{re.escape(raw_k)}\s+1\s*$", "", segment, flags=re.M)
        segment = re.sub(r"(?m)^Number\s*$", "", segment)
        segment = re.sub(r"(?m)^Correct\s*$", "", segment)
        segment = re.sub(r"(?m)^Answer\s*$", "", segment)
        segment = re.sub(r"(?m)^Learning Objective\s*$", "", segment)
        segment = re.sub(r"(?m)^K-Level\s*$", "", segment)
        segment = re.sub(r"(?m)^Points\s*$", "", segment)
        explanations[number] = normalize_spaces(segment)
    return explanations


def chapter_from_reference(reference: str) -> str:
    match = re.match(r"FL-(\d)", reference)
    if not match:
        return "FL-1"
    return f"FL-{match.group(1)}"


def parse_objectives() -> list[dict[str, Any]]:
    objective_k_levels: dict[str, str] = {}
    for path in DOCS.glob("ISTQB_CTFL_v4.0_Sample-Exam-*-Answers_*.pdf"):
        guide = parse_answer_guide(path)
        for item in guide.values():
            objective_k_levels.setdefault(item["reference"], item["kLevel"])
    syllabus = parse_syllabus_reference()
    spanish_syllabus = parse_spanish_syllabus_reference()
    return [
        {
            "code": code,
            "kLevel": syllabus.get(code, {}).get("kLevel", objective_k_levels[code]),
            "text": syllabus.get(code, {}).get("text", "Objective text pending from CTFL v4.0.1 syllabus."),
            "chapter": chapter_from_reference(code),
            "section": syllabus.get(code, {}).get("section", section_from_objective(code)),
            "sectionTitle": syllabus.get(code, {}).get("sectionTitle", ""),
            "syllabusPage": syllabus.get(code, {}).get("syllabusPage"),
            "translations": {"es": spanish_syllabus.get("objectives", {}).get(code, {})}
            if code in spanish_syllabus.get("objectives", {})
            else {},
        }
        for code in sorted(objective_k_levels)
    ]


def section_from_objective(code: str) -> str:
    match = re.match(r"FL-(\d\.\d)\.\d", code)
    return match.group(1) if match else ""


def parse_syllabus_reference() -> dict[str, dict[str, Any]]:
    path = DOCS / "ISTQB_CTFL_Syllabus_v4.0.1.pdf"
    if not path.exists():
        return {}

    reader = PdfReader(str(path))
    section_pages: dict[str, dict[str, Any]] = {}
    objectives: dict[str, dict[str, Any]] = {}

    for page_index, page in enumerate(reader.pages, start=1):
        text = page.extract_text() or ""
        lines = [normalize_spaces(line) for line in text.splitlines()]
        for line in lines:
            section_match = re.match(r"^([1-6]\.\d)\.\s+(.+)$", line)
            if section_match:
                section, title = section_match.groups()
                if page_index >= 14 and "..." not in title:
                    section_pages.setdefault(
                        section,
                        {
                            "section": section,
                            "sectionTitle": title,
                            "syllabusPage": page_index,
                        },
                    )

            objective_match = re.match(r"^(FL-\d\.\d\.\d)\s+\((K[123])\)\s+(.+)$", line)
            if objective_match:
                code, k_level, objective_text = objective_match.groups()
                section = section_from_objective(code)
                objectives[code] = {
                    "kLevel": k_level,
                    "text": objective_text,
                    "section": section,
                    **section_pages.get(section, {}),
                }

    for code, objective in list(objectives.items()):
        section = objective.get("section", "")
        if section and not objective.get("syllabusPage") and section in section_pages:
            objective.update(section_pages[section])

    return objectives


def parse_spanish_syllabus_reference() -> dict[str, dict[str, Any]]:
    path = DOCS / "ISTQB_CTFL_Syllabus_v4.0_español.pdf"
    if not path.exists():
        return {"chapters": {}, "objectives": {}}

    reader = PdfReader(str(path))
    chapters: dict[str, dict[str, Any]] = {
        "FL-2": {
            "name": "Pruebas a lo Largo del Ciclo de Vida del Desarrollo de Software",
        }
    }
    section_pages: dict[str, dict[str, Any]] = {}
    objectives: dict[str, dict[str, Any]] = {}

    for page_index, page in enumerate(reader.pages, start=1):
        text = page.extract_text() or ""
        lines = [normalize_spaces(line) for line in text.splitlines()]
        for line in lines:
            chapter_match = re.match(r"^([1-6])\.\s+(.+?)\s+[–:-]\s+(\d+)\s+minutos?$", line, re.I)
            if chapter_match:
                chapter, title, minutes = chapter_match.groups()
                chapters[f"FL-{chapter}"] = {"name": title, "minutes": int(minutes)}

            section_match = re.match(r"^([1-6]\.\d)\.\s+(.+)$", line)
            if section_match:
                section, title = section_match.groups()
                if "..." not in title:
                    section_pages.setdefault(
                        section,
                        {
                            "sectionTitle": title,
                            "syllabusPage": page_index,
                        },
                    )

            objective_match = re.match(r"^(FL-\d\.\d\.\d)\s+\(\s*(K[123])\)\s+(.+)$", line)
            if objective_match:
                code, _k_level, objective_text = objective_match.groups()
                section = section_from_objective(code)
                objectives[code] = {
                    "text": objective_text,
                    **section_pages.get(section, {}),
                }

    for code, objective in list(objectives.items()):
        section = section_from_objective(code)
        if section in section_pages:
            objective.update(section_pages[section])

    return {"chapters": chapters, "objectives": objectives}


def load_sources() -> dict[str, Path]:
    files = {path.name: path for path in DOCS.iterdir() if path.is_file()}
    required: dict[str, Path] = {}
    for model in "ABCD":
        question_matches = sorted(DOCS.glob(f"ISTQB_CTFL_v4.0_Sample-Exam-{model}-Questions_v*.pdf"))
        answer_matches = sorted(DOCS.glob(f"ISTQB_CTFL_v4.0_Sample-Exam-{model}-Answers_v*.pdf"))
        if not question_matches:
            raise FileNotFoundError(f"Missing CTFL v4.0 questions for model {model}")
        if not answer_matches:
            raise FileNotFoundError(f"Missing CTFL v4.0 answers for model {model}")
        required[f"QUESTIONS-{model}"] = question_matches[-1]
        required[f"ANSWERS-{model}"] = answer_matches[-1]

    for optional in [
        "ISTQB_CTFL_Syllabus_v4.0.1.pdf",
        "ISTQB_Exam-Structures-and-Rules_v1.2.pdf",
        "ISTQB_Exam-Structure-Tables_v1.18.pdf",
    ]:
        if optional in files:
            required[optional] = files[optional]
    return required


def build_bank() -> dict[str, Any]:
    sources = load_sources()
    spanish_syllabus = parse_spanish_syllabus_reference()
    existing_translations = load_existing_question_translations()
    questions: list[dict[str, Any]] = []
    issues: list[str] = []

    for model in "ABCD":
        question_map = parse_questions(sources[f"QUESTIONS-{model}"])
        guide = parse_answer_guide(sources[f"ANSWERS-{model}"])
        explanations = parse_explanations(sources[f"ANSWERS-{model}"], guide)
        for number in range(1, 41):
            question_id = f"{model}-{number:02d}"
            if number not in question_map:
                issues.append(f"{question_id}: missing question text")
                continue
            if number not in guide:
                issues.append(f"{question_id}: missing answer guide")
                continue
            q = question_map[number]
            g = guide[number]
            reference = g["reference"]
            correct = g["answers"]
            item = {
                "id": question_id,
                "sourceModel": model,
                "sourceNumber": number,
                "chapter": chapter_from_reference(reference),
                "reference": reference,
                "kLevel": g["kLevel"],
                "rawKLevel": g["rawKLevel"],
                "prompt": q["prompt"],
                "options": q["options"],
                "correctAnswers": correct,
                "selectionMode": selection_mode(q["selector"], correct),
                "selector": q["selector"],
                "explanation": explanations.get(number, ""),
                "notes": q["notes"],
                "points": g["points"],
            }
            if question_id in existing_translations:
                item["translations"] = existing_translations[question_id]
            questions.append(item)

    return {
        "metadata": {
            "version": "4.0.1",
            "generatedFrom": [str(path.relative_to(ROOT)).replace("\\", "/") for path in sources.values()],
            "examRules": {
                "questionsPerExam": 40,
                "passingScore": 26,
                "passingPercent": 65,
                "pointsPerCorrectAnswer": 1,
                "penalty": 0,
                "durationMinutes": 60,
                "extendedDurationMinutes": 75,
            },
            "chapterDistribution": CHAPTER_DISTRIBUTION,
            "knownIssues": [
                "Sample Exam set A contains additional questions after the 40-question sample exam; these are excluded from the main bank.",
                "Question text and explanations are extracted from English official PDFs for CTFL v4.0/v4.0.1.",
            ],
            "countsByModel": Counter(q["sourceModel"] for q in questions),
            "countsByChapter": Counter(q["chapter"] for q in questions),
            "countsByKLevel": Counter(q["kLevel"] for q in questions),
            "extractionIssues": issues,
        },
        "chapters": [
            {
                **chapter,
                "translations": {"es": spanish_syllabus.get("chapters", {}).get(chapter["id"], {})}
                if chapter["id"] in spanish_syllabus.get("chapters", {})
                else {},
            }
            for chapter in CHAPTERS
        ],
        "objectives": parse_objectives(),
        "questions": questions,
    }


def main() -> None:
    bank = build_bank()
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(bank, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {OUT.relative_to(ROOT)}")
    print(f"Questions: {len(bank['questions'])}")
    print(f"By model: {dict(bank['metadata']['countsByModel'])}")
    print(f"By chapter: {dict(bank['metadata']['countsByChapter'])}")
    print(f"By K level: {dict(bank['metadata']['countsByKLevel'])}")
    if bank["metadata"]["extractionIssues"]:
        print("Extraction issues:")
        for issue in bank["metadata"]["extractionIssues"]:
            print(f"- {issue}")


if __name__ == "__main__":
    main()
