import { useMemo, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  Gauge,
  RotateCcw,
  Timer,
  TrendingDown,
  TrendingUp,
  XCircle,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Copy, Language } from "../app/content";
import { localizedChapterName } from "../app/presentation";
import {
  compareReviewPriority,
  type LearningMetrics,
  type MetricsDimension,
  type MetricsOrigin,
  type PerformanceBreakdown,
} from "../domain/metrics";
import { DashboardSectionTitle, DashboardStatPill, InfoTooltip } from "../components/common/DashboardUi";

export type ReviewScope = {
  dimension: MetricsDimension;
  id: string;
};

type BreakdownSort = "review" | "accuracy" | "time";

function formatDuration(milliseconds: number | null, language: Language) {
  if (milliseconds === null) return "—";
  const seconds = milliseconds / 1_000;
  return `${new Intl.NumberFormat(language, { maximumFractionDigits: seconds < 10 ? 1 : 0 }).format(seconds)} s`;
}

function formatTotalTime(milliseconds: number, language: Language) {
  const totalMinutes = Math.round(milliseconds / 60_000);
  if (totalMinutes < 60) return `${totalMinutes} min`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes
    ? `${hours} h ${new Intl.NumberFormat(language).format(minutes)} min`
    : `${hours} h`;
}

function signalValue(value: number | null, suffix = "%") {
  return value === null ? "—" : `${value}${suffix}`;
}

function SignalCard({
  label,
  value,
  sample,
  help,
  delta,
  copy,
}: {
  label: string;
  value: number | null;
  sample: number;
  help: string;
  delta?: number | null;
  copy: Copy;
}) {
  return (
    <article className="learning-signal-card">
      <div className="learning-signal-heading">
        <span>{label}</span>
        <InfoTooltip label={label} text={help} />
      </div>
      <strong>{signalValue(value)}</strong>
      {delta !== undefined && delta !== null && (
        <span className={`metric-delta ${delta >= 0 ? "positive" : "negative"}`}>
          {delta >= 0 ? <TrendingUp aria-hidden="true" /> : <TrendingDown aria-hidden="true" />}
          {delta > 0 ? "+" : ""}{delta} pp · {copy.comparedWithPrevious}
        </span>
      )}
      <small>
        {value === null ? copy.insufficientData : `${copy.sampleLabel}: ${sample}`}
      </small>
    </article>
  );
}

function questionTypeLabel(id: string, copy: Copy) {
  const labels: Record<string, string> = {
    simple: copy.questionTypeSimple,
    visual: copy.questionTypeVisual,
    list: copy.questionTypeList,
    "multiple-response": copy.questionTypeMultiple,
    matching: copy.questionTypeMatching,
    scenario: copy.questionTypeScenario,
    calculation: copy.questionTypeCalculation,
  };
  return labels[id] ?? id;
}

function breakdownLabel(item: PerformanceBreakdown, dimension: MetricsDimension, language: Language, copy: Copy) {
  if (dimension === "chapter") return `${item.id} · ${localizedChapterName(item.id, language)}`;
  if (dimension === "questionType") return questionTypeLabel(item.id, copy);
  return item.id;
}

function reviewSizes(available: number) {
  if (available >= 20) return [10, 20];
  if (available >= 10) return [10, available];
  return available > 0 ? [available] : [];
}

function ReviewButtons({
  item,
  scope,
  copy,
  onStartReview,
}: {
  item: PerformanceBreakdown;
  scope: ReviewScope;
  copy: Copy;
  onStartReview: (scope: ReviewScope, size: number) => void;
}) {
  const sizes = Array.from(new Set(reviewSizes(item.availableQuestionIds.length)));
  return (
    <div className="metric-review-actions">
      {sizes.map((size) => {
        const total = item.availableQuestionIds.length;
        const label = size === 10 && total > 10
          ? copy.review10
          : size === 20
            ? copy.review20
            : total >= 10
              ? `${copy.reviewAll} · ${size}`
              : `${copy.reviewAvailable} · ${size}`;
        return (
          <button key={size} className="secondary reinforcement" type="button" onClick={() => onStartReview(scope, size)}>
            <RotateCcw aria-hidden="true" />
            {label}
          </button>
        );
      })}
    </div>
  );
}

function RecommendationCard({
  item,
  dimension,
  language,
  copy,
  onStartReview,
}: {
  item: PerformanceBreakdown | null;
  dimension: MetricsDimension;
  language: Language;
  copy: Copy;
  onStartReview: (scope: ReviewScope, size: number) => void;
}) {
  const dimensionLabel = dimension === "chapter"
    ? copy.dimensionChapter
    : dimension === "kLevel"
      ? copy.dimensionKLevel
      : copy.dimensionQuestionType;
  if (!item) {
    return (
      <article className="metric-recommendation-card is-empty">
        <span>{dimensionLabel}</span>
        <strong>{copy.insufficientData}</strong>
      </article>
    );
  }
  return (
    <article className="metric-recommendation-card">
      <span>{dimensionLabel}</span>
      <strong>{breakdownLabel(item, dimension, language, copy)}</strong>
      <p>
        {item.pendingErrors} {copy.reviewReasonErrors} · {item.accuracy ?? "—"}% {copy.reviewReasonAccuracy}
        {item.medianActiveMs !== null ? ` · ${formatDuration(item.medianActiveMs, language)} ${copy.reviewReasonTime}` : ""}
      </p>
      <ReviewButtons
        item={item}
        scope={{ dimension, id: item.id }}
        copy={copy}
        onStartReview={onStartReview}
      />
    </article>
  );
}

function PerformanceRow({
  item,
  dimension,
  language,
  copy,
  onStartReview,
}: {
  item: PerformanceBreakdown;
  dimension: MetricsDimension;
  language: Language;
  copy: Copy;
  onStartReview: (scope: ReviewScope, size: number) => void;
}) {
  return (
    <article className="performance-row">
      <div className="performance-row-title">
        <strong>{breakdownLabel(item, dimension, language, copy)}</strong>
        <span>{item.attemptedQuestions}/{item.totalQuestions} · {item.attempts} {copy.attemptsLabel.toLowerCase()}</span>
      </div>
      <div className="performance-row-metrics">
        <span><small>{copy.accuracy}</small><strong>{signalValue(item.accuracy)}</strong></span>
        <span><small>{copy.recentMetric}</small><strong>{signalValue(item.recentAccuracy)}</strong></span>
        <span>
          <small>{copy.trendMetric}</small>
          <strong className={item.trendDelta === null ? "" : item.trendDelta >= 0 ? "positive" : "negative"}>
            {item.trendDelta === null ? "—" : `${item.trendDelta > 0 ? "+" : ""}${item.trendDelta} pp`}
          </strong>
        </span>
        <span><small>{copy.medianMetric}</small><strong>{formatDuration(item.medianActiveMs, language)}</strong></span>
      </div>
      <div className="performance-error-bar" aria-label={`${item.pendingErrors} ${copy.reviewReasonErrors}`}>
        <span style={{ width: `${item.attemptedQuestions ? (item.pendingErrors / item.attemptedQuestions) * 100 : 0}%` }} />
      </div>
      <ReviewButtons
        item={item}
        scope={{ dimension, id: item.id }}
        copy={copy}
        onStartReview={onStartReview}
      />
    </article>
  );
}

export function MetricsView({
  metrics,
  origin,
  language,
  copy,
  onOriginChange,
  onStartReview,
}: {
  metrics: LearningMetrics;
  origin: MetricsOrigin;
  language: Language;
  copy: Copy;
  onOriginChange: (origin: MetricsOrigin) => void;
  onStartReview: (scope: ReviewScope, size: number) => void;
}) {
  const [dimension, setDimension] = useState<MetricsDimension>("chapter");
  const [sort, setSort] = useState<BreakdownSort>("review");
  const currentBreakdown = dimension === "chapter"
    ? metrics.byChapter
    : dimension === "kLevel"
      ? metrics.byKLevel
      : metrics.byQuestionType;
  const currentDimensionLabel = dimension === "chapter"
    ? copy.dimensionChapter
    : dimension === "kLevel"
      ? copy.dimensionKLevel
      : copy.dimensionQuestionType;
  const sortedBreakdown = useMemo(() => [...currentBreakdown].sort((left, right) => {
    if (sort === "accuracy") return (left.accuracy ?? 101) - (right.accuracy ?? 101) || left.id.localeCompare(right.id);
    if (sort === "time") return (right.medianActiveMs ?? -1) - (left.medianActiveMs ?? -1) || left.id.localeCompare(right.id);
    return compareReviewPriority(left, right);
  }), [currentBreakdown, sort]);
  const chartTooltipStyle = {
    background: "var(--analytics-surface-strong)",
    border: "1px solid var(--analytics-border)",
    borderRadius: 8,
    color: "var(--analytics-text)",
  };

  return (
    <main className="workspace metrics-workspace">
      <header className="workspace-header metrics-page-header">
        <h2>{copy.metricsTitle}</h2>
        <div className="metrics-origin-toggle" role="group" aria-label={copy.metricsTitle}>
          {([
            ["all", copy.metricsAll],
            ["study", copy.metricsStudy],
            ["exam", copy.metricsExam],
          ] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={origin === value ? "active" : undefined}
              aria-pressed={origin === value}
              onClick={() => onOriginChange(value)}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      <section className="dashboard-section metrics-section" aria-labelledby="metrics-summary-title">
        <DashboardSectionTitle id="metrics-summary-title">{copy.metricsSummary}</DashboardSectionTitle>
        <div className="dashboard-stat-grid metrics-summary-grid">
          <DashboardStatPill icon={<Gauge />} value={signalValue(metrics.recentAccuracy.value)} label={copy.recentAccuracy} />
          <DashboardStatPill icon={<Timer />} value={formatDuration(metrics.medianActiveMs.value, language)} label={copy.medianResponseTime} />
          <DashboardStatPill icon={<Clock3 />} value={formatTotalTime(metrics.activeMsLast30Days, language)} label={copy.activeLast30Days} />
          <DashboardStatPill icon={<CalendarDays />} value={metrics.activeDaysLast30Days} label={copy.studyDaysLast30Days} />
        </div>
        {metrics.trackedAttempts === 0 && <p className="metrics-empty-note">{copy.noMetricsHistory}</p>}
      </section>

      <section className="dashboard-section metrics-section" aria-labelledby="learning-signals-title">
        <DashboardSectionTitle id="learning-signals-title">{copy.learningSignals}</DashboardSectionTitle>
        <div className="learning-signals-grid">
          <SignalCard label={copy.recentEvolution} value={metrics.trend.value} delta={metrics.trend.delta} sample={metrics.trend.sample} help={copy.recentEvolutionHelp} copy={copy} />
          <SignalCard label={copy.firstAttemptAccuracy} value={metrics.firstAttemptAccuracy.value} sample={metrics.firstAttemptAccuracy.sample} help={copy.firstAttemptHelp} copy={copy} />
          <SignalCard label={copy.recoveryRate} value={metrics.recoveryAccuracy.value} sample={metrics.recoveryAccuracy.sample} help={copy.recoveryHelp} copy={copy} />
          <SignalCard label={copy.retentionRate} value={metrics.retentionAccuracy.value} sample={metrics.retentionAccuracy.sample} help={copy.retentionHelp} copy={copy} />
        </div>
      </section>

      <section className="dashboard-section metrics-section" aria-labelledby="metrics-evolution-title">
        <DashboardSectionTitle id="metrics-evolution-title">{copy.performanceEvolution}</DashboardSectionTitle>
        <div className="metrics-chart-grid">
          <article className="metric-chart-card">
            <h4>{copy.accuracyEvolution}</h4>
            {metrics.buckets.length ? (
              <ResponsiveContainer width="100%" height={230}>
                <AreaChart data={metrics.buckets} accessibilityLayer>
                  <defs>
                    <linearGradient id="accuracyFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--analytics-accent)" stopOpacity={0.5} />
                      <stop offset="95%" stopColor="var(--analytics-accent)" stopOpacity={0.03} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--analytics-grid)" strokeDasharray="4 5" vertical={false} />
                  <XAxis dataKey="label" stroke="var(--analytics-muted)" tickLine={false} axisLine={false} />
                  <YAxis domain={[0, 100]} width={34} stroke="var(--analytics-muted)" tickLine={false} axisLine={false} unit="%" />
                  <Tooltip contentStyle={chartTooltipStyle} formatter={(value) => [`${value}%`, copy.accuracy]} />
                  <Area type="monotone" dataKey="accuracy" stroke="var(--analytics-accent)" strokeWidth={3} fill="url(#accuracyFill)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : <p className="metrics-chart-empty">{copy.insufficientData}</p>}
          </article>
          <article className="metric-chart-card">
            <h4>{copy.responseTimeEvolution}</h4>
            {metrics.buckets.some((bucket) => bucket.medianActiveMs !== null) ? (
              <ResponsiveContainer width="100%" height={230}>
                <AreaChart data={metrics.buckets.map((bucket) => ({ ...bucket, seconds: bucket.medianActiveMs === null ? null : Math.round(bucket.medianActiveMs / 1_000) }))} accessibilityLayer>
                  <defs>
                    <linearGradient id="timeFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--analytics-secondary)" stopOpacity={0.45} />
                      <stop offset="95%" stopColor="var(--analytics-secondary)" stopOpacity={0.03} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--analytics-grid)" strokeDasharray="4 5" vertical={false} />
                  <XAxis dataKey="label" stroke="var(--analytics-muted)" tickLine={false} axisLine={false} />
                  <YAxis width={34} stroke="var(--analytics-muted)" tickLine={false} axisLine={false} unit="s" />
                  <Tooltip contentStyle={chartTooltipStyle} formatter={(value) => [`${value} s`, copy.medianResponseTime]} />
                  <Area type="monotone" dataKey="seconds" stroke="var(--analytics-secondary)" strokeWidth={3} fill="url(#timeFill)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : <p className="metrics-chart-empty">{copy.insufficientData}</p>}
          </article>
          <article className="metric-chart-card metric-activity-chart">
            <h4>{copy.studyActivity}</h4>
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={metrics.weeklyActivity} accessibilityLayer>
                <CartesianGrid stroke="var(--analytics-grid)" strokeDasharray="4 5" vertical={false} />
                <XAxis dataKey="label" stroke="var(--analytics-muted)" tickLine={false} axisLine={false} />
                <YAxis width={34} stroke="var(--analytics-muted)" tickLine={false} axisLine={false} />
                <Tooltip contentStyle={chartTooltipStyle} />
                <Bar dataKey="attempts" name={copy.attemptsLabel} fill="var(--analytics-accent)" radius={[5, 5, 0, 0]} />
                <Bar dataKey="activeMinutes" name={copy.activeMinutes} fill="var(--analytics-secondary)" radius={[5, 5, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </article>
          <article className="metric-chart-card metric-result-time">
            <h4>{copy.correctVsIncorrectTime}</h4>
            <div className="result-time-comparison">
              <DashboardStatPill icon={<CheckCircle2 />} value={formatDuration(metrics.correctTiming.value, language)} label={`${copy.correctMedian} · ${metrics.correctTiming.sample}`} className="is-correct" />
              <DashboardStatPill icon={<XCircle />} value={formatDuration(metrics.incorrectTiming.value, language)} label={`${copy.incorrectMedian} · ${metrics.incorrectTiming.sample}`} className="is-incorrect" />
            </div>
          </article>
        </div>
      </section>

      <section className="dashboard-section metrics-section" aria-labelledby="review-recommendations-title">
        <DashboardSectionTitle id="review-recommendations-title">{copy.reviewRecommendations}</DashboardSectionTitle>
        <div className="metric-recommendations-grid">
          <RecommendationCard item={metrics.recommendations.chapter} dimension="chapter" language={language} copy={copy} onStartReview={onStartReview} />
          <RecommendationCard item={metrics.recommendations.kLevel} dimension="kLevel" language={language} copy={copy} onStartReview={onStartReview} />
          <RecommendationCard item={metrics.recommendations.questionType} dimension="questionType" language={language} copy={copy} onStartReview={onStartReview} />
        </div>
      </section>

      <section className="dashboard-section metrics-section performance-explorer-section" aria-labelledby="performance-explorer-title">
        <DashboardSectionTitle
          id="performance-explorer-title"
          help={dimension === "questionType" ? copy.overlappingTypesNote : undefined}
        >
          {copy.performanceExplorer}
        </DashboardSectionTitle>
        <div className="performance-controls">
          <div className="performance-dimension-tabs" role="tablist" aria-label={copy.performanceExplorer}>
            {([
              ["chapter", copy.dimensionChapter],
              ["kLevel", copy.dimensionKLevel],
              ["questionType", copy.dimensionQuestionType],
            ] as const).map(([value, label]) => (
              <button key={value} type="button" role="tab" aria-selected={dimension === value} className={dimension === value ? "active" : undefined} onClick={() => setDimension(value)}>
                {label}
              </button>
            ))}
          </div>
          <label>
            <span className="visually-hidden">{copy.performanceExplorer}</span>
            <select value={sort} onChange={(event) => setSort(event.target.value as BreakdownSort)}>
              <option value="review">{copy.sortReviewPriority}</option>
              <option value="accuracy">{copy.sortLowestAccuracy}</option>
              <option value="time">{copy.sortLongestTime}</option>
            </select>
          </label>
        </div>
        <div className="performance-table-header" aria-hidden="true">
          <span>{currentDimensionLabel}</span>
          <span>{copy.accuracy}</span>
          <span>{copy.recentMetric}</span>
          <span>{copy.trendMetric}</span>
          <span>{copy.medianMetric}</span>
          <span>{copy.reviewAvailable}</span>
        </div>
        <div className="performance-list">
          {sortedBreakdown.map((item) => (
            <PerformanceRow
              key={item.id}
              item={item}
              dimension={dimension}
              language={language}
              copy={copy}
              onStartReview={onStartReview}
            />
          ))}
        </div>
      </section>
    </main>
  );
}
