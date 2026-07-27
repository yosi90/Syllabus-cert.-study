import type { ReactNode } from "react";
import {
  Check,
  ChevronDown,
  Filter,
  RotateCcw,
  Search,
} from "lucide-react";
import { chapters } from "../../data/bank";
import { emptyFilters, type QuestionFilters, type QuestionStatus } from "../../domain/filters";
import {
  kLevels,
  models,
  type Copy,
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
  open,
  onOpenChange,
  language,
  copy,
}: {
  filters: QuestionFilters;
  setFilters: (filters: QuestionFilters) => void;
  references: string[];
  tutorialTarget: string | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  language: Language;
  copy: Copy;
}) {
  function toggleValue<T extends string>(values: T[], value: T) {
    return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
  }

  const filtersActive = hasActiveFilters(filters);
  const statusOptions: Array<{ value: QuestionStatus; label: string }> = [
    { value: "unseen", label: copy.unseen },
    { value: "correct", label: copy.lastCorrect },
    { value: "incorrect", label: copy.lastIncorrect },
    { value: "flagged", label: copy.flagged },
  ];

  return (
    <details
      className={classNames("panel filters panel-disclosure", tutorialTarget === "layout" && "tutorial-highlight")}
      open={open}
      onToggle={(event) => onOpenChange(event.currentTarget.open)}
    >
      <summary>
        <h2>
          <Filter aria-hidden="true" />
          {copy.filters}
        </h2>
        <ChevronDown className="disclosure-chevron" aria-hidden="true" />
      </summary>

      <div className="panel-disclosure-content">
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
              <span className="check-indicator" aria-hidden="true"><Check /></span>
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
              <span className="check-indicator" aria-hidden="true"><Check /></span>
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
              <span className="check-indicator" aria-hidden="true"><Check /></span>
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

        <FilterGroup title={copy.status} highlighted={tutorialTarget === "reference-status"}>
          {statusOptions.map((status) => (
            <label className="check-pill wide" key={status.value}>
              <input
                type="checkbox"
                checked={filters.status.includes(status.value)}
                onChange={() => setFilters({ ...filters, status: toggleValue(filters.status, status.value) })}
              />
              <span className="check-indicator" aria-hidden="true"><Check /></span>
              {status.label}
            </label>
          ))}
        </FilterGroup>
      </div>
    </details>
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
