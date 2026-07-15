import { useRef, type ChangeEvent, type ReactNode } from "react";
import {
  CircleHelp,
  Download,
  FileUp,
  Filter,
  RotateCcw,
  Search,
  Trash2,
  XCircle,
} from "lucide-react";
import { chapters } from "../../data/bank";
import { emptyFilters, type QuestionFilters } from "../../domain/filters";
import {
  kLevels,
  models,
  type Copy,
  type FileOperationStatus,
  type Language,
} from "../../app/content";
import {
  classNames,
  hasActiveFilters,
  localizedChapterName,
} from "../../app/presentation";

export function FiltersPanel({
  filters,
  setFilters,
  references,
  tutorialTarget,
  onExport,
  onImport,
  onReset,
  onTutorialReset,
  fileStatus,
  language,
  copy,
}: {
  filters: QuestionFilters;
  setFilters: (filters: QuestionFilters) => void;
  references: string[];
  tutorialTarget: string | undefined;
  onExport: () => void;
  onImport: (file: File) => Promise<void>;
  onReset: () => void;
  onTutorialReset: () => void;
  fileStatus: FileOperationStatus;
  language: Language;
  copy: Copy;
}) {
  const fileInput = useRef<HTMLInputElement | null>(null);

  function toggleValue<T extends string>(values: T[], value: T) {
    return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
  }

  function readImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    void onImport(file);
    event.target.value = "";
  }

  const filtersActive = hasActiveFilters(filters);

  return (
    <section className={classNames("panel filters", tutorialTarget === "layout" && "tutorial-highlight")}>
      <h2>
        <Filter aria-hidden="true" />
        {copy.filters}
      </h2>

      <div className="search-row">
        <label className="search-box">
          <Search aria-hidden="true" />
          <input
            aria-label={copy.searchPlaceholder}
            value={filters.query}
            onChange={(event) => setFilters({ ...filters, query: event.target.value })}
            placeholder={copy.searchPlaceholder}
          />
        </label>
        {filtersActive && (
          <button
            className="icon-button compact"
            type="button"
            onClick={() => setFilters(emptyFilters)}
            title={copy.clearFilters}
            aria-label={copy.clearFilters}
            data-tooltip={copy.clearFilters}
          >
            <RotateCcw aria-hidden="true" />
          </button>
        )}
      </div>

      <FilterGroup title={copy.model} highlighted={tutorialTarget === "modes"}>
        {models.map((model) => (
          <label className="check-pill" key={model}>
            <input
              type="checkbox"
              checked={filters.models.includes(model)}
              onChange={() => setFilters({ ...filters, models: toggleValue(filters.models, model) })}
            />
            {model}
          </label>
        ))}
      </FilterGroup>

      <FilterGroup title={copy.chapter} highlighted={tutorialTarget === "chapters"}>
        {chapters.map((chapter) => (
          <label className="check-pill wide" key={chapter.id} title={localizedChapterName(chapter.id, language)}>
            <input
              type="checkbox"
              checked={filters.chapters.includes(chapter.id)}
              onChange={() => setFilters({ ...filters, chapters: toggleValue(filters.chapters, chapter.id) })}
            />
            {chapter.id}
          </label>
        ))}
      </FilterGroup>

      <FilterGroup title="K-Level" highlighted={tutorialTarget === "k-level"}>
        {kLevels.map((level) => (
          <label className="check-pill" key={level}>
            <input
              type="checkbox"
              checked={filters.kLevels.includes(level)}
              onChange={() => setFilters({ ...filters, kLevels: toggleValue(filters.kLevels, level) })}
            />
            {level}
          </label>
        ))}
      </FilterGroup>

      <label className={classNames("field-label", tutorialTarget === "reference-status" && "tutorial-highlight")}>
        {copy.reference}
        <select
          value={filters.references[0] ?? ""}
          onChange={(event) =>
            setFilters({ ...filters, references: event.target.value ? [event.target.value] : [] })
          }
        >
          <option value="">{copy.all}</option>
          {references.map((reference) => (
            <option value={reference} key={reference}>
              {reference}
            </option>
          ))}
        </select>
      </label>

      <label className={classNames("field-label", tutorialTarget === "reference-status" && "tutorial-highlight")}>
        {copy.status}
        <select
          value={filters.status}
          onChange={(event) => setFilters({ ...filters, status: event.target.value as QuestionFilters["status"] })}
        >
          <option value="all">{copy.all}</option>
          <option value="unseen">{copy.unseen}</option>
          <option value="correct">{copy.lastCorrect}</option>
          <option value="incorrect">{copy.lastIncorrect}</option>
          <option value="flagged">{copy.flagged}</option>
        </select>
      </label>

      <div className={classNames("filter-actions", tutorialTarget === "progress-actions" && "tutorial-highlight")}>
        <button className="secondary" type="button" onClick={onExport} disabled={fileStatus?.kind === "loading"}>
          <Download aria-hidden="true" />
          {copy.export}
        </button>
        <button className="secondary" type="button" onClick={() => fileInput.current?.click()} disabled={fileStatus?.kind === "loading"}>
          <FileUp aria-hidden="true" />
          {copy.import}
        </button>
        <button className="secondary" type="button" onClick={onTutorialReset}>
          <CircleHelp aria-hidden="true" />
          {copy.tutorial}
        </button>
        <button className="danger" type="button" onClick={onReset}>
          <Trash2 aria-hidden="true" />
          {copy.delete}
        </button>
      </div>
      {fileStatus && (
        <p
          className={classNames("file-status", fileStatus.kind)}
          role={fileStatus.kind === "error" ? "alert" : "status"}
          aria-live={fileStatus.kind === "error" ? "assertive" : "polite"}
        >
          {fileStatus.message}
        </p>
      )}
      <input ref={fileInput} className="visually-hidden" type="file" accept="application/json" onChange={readImport} />
    </section>
  );
}

export function FilterGroup({
  title,
  children,
  highlighted = false,
}: {
  title: string;
  children: ReactNode;
  highlighted?: boolean;
}) {
  return (
    <fieldset className={classNames("filter-group", highlighted && "tutorial-highlight")}>
      <legend>{title}</legend>
      <div className="pill-row">{children}</div>
    </fieldset>
  );
}
