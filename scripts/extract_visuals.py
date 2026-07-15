from __future__ import annotations

import re
from pathlib import Path

from extract_data import DOCS, QUESTION_VISUALS, ROOT, fitz


OUT = ROOT / "public" / "question-assets"


def question_starts(page) -> list[tuple[int, float]]:
    starts: list[tuple[int, float]] = []
    for block in page.get_text("blocks", sort=True):
        for match in re.finditer(r"Question #(\d{1,2}) \(1 Point\)", block[4]):
            starts.append((int(match.group(1)), block[1]))
    return sorted(starts, key=lambda item: item[1])


def visual_rects(page, y_start: float, y_end: float):
    drawings = [
        drawing["rect"]
        for drawing in page.get_drawings()
        if y_start <= (drawing["rect"].y0 + drawing["rect"].y1) / 2 < y_end
    ]
    images = [
        fitz.Rect(info["bbox"])
        for info in page.get_image_info()
        if y_start <= (info["bbox"][1] + info["bbox"][3]) / 2 < y_end
    ]
    return drawings + images


def largest_visual_cluster(rects, tolerance: float = 3) -> fitz.Rect:
    """Keep the main connected figure and discard isolated PDF glyph artefacts."""
    pending = [fitz.Rect(rect) for rect in rects]
    clusters: list[fitz.Rect] = []
    while pending:
        bounds = pending.pop()
        changed = True
        while changed:
            changed = False
            expanded = fitz.Rect(
                bounds.x0 - tolerance,
                bounds.y0 - tolerance,
                bounds.x1 + tolerance,
                bounds.y1 + tolerance,
            )
            for index in range(len(pending) - 1, -1, -1):
                if expanded.intersects(pending[index]):
                    bounds |= pending.pop(index)
                    changed = True
        clusters.append(bounds)
    return max(clusters, key=lambda rect: rect.width * rect.height)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    extracted: set[str] = set()

    for model in "ABCD":
        path = sorted(DOCS.glob(f"ISTQB_CTFL_v4.0_Sample-Exam-{model}-Questions_v*.pdf"))[-1]
        document = fitz.open(path)
        for page in document:
            starts = question_starts(page)
            if len(starts) > 10:  # Ignore the table of contents.
                continue
            for index, (number, y_start) in enumerate(starts):
                question_id = f"{model}-{number:02d}"
                if question_id not in QUESTION_VISUALS:
                    continue
                y_end = starts[index + 1][1] if index + 1 < len(starts) else page.rect.height - 45
                rects = visual_rects(page, y_start, y_end)
                if not rects:
                    raise RuntimeError(f"{question_id}: no visual region found")

                bounds = largest_visual_cluster(rects)
                clip = fitz.Rect(
                    max(35, bounds.x0 - 8),
                    max(y_start, bounds.y0 - 6),
                    min(page.rect.width - 35, bounds.x1 + 8),
                    min(y_end, bounds.y1 + 2),
                )
                pixmap = page.get_pixmap(matrix=fitz.Matrix(3, 3), clip=clip, alpha=False)
                pixmap.save(OUT / f"{question_id.lower()}.png")
                extracted.add(question_id)

    missing = set(QUESTION_VISUALS) - extracted
    if missing:
        raise RuntimeError(f"Missing visual assets: {', '.join(sorted(missing))}")
    print(f"Extracted {len(extracted)} visual assets to {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
