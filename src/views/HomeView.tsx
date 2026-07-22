import { BookOpen, BookText, BookUp, BookUp2, Bookmark, CircleAlert, Eye, Play, RefreshCcw, Timer } from "lucide-react";
import type { StudyDashboard } from "../domain/dashboard";
import type { Copy, Language } from "../app/content";
import { localizedChapterName } from "../app/presentation";
import { FlagLanguageToggle, Metric } from "../components/common/CommonUi";

function BreakdownRow({
  label,
  coverage,
  accuracy,
  total,
  correctAnswered,
  incorrectAnswered,
  copy,
}: {
  label: string;
  coverage: number;
  accuracy: number | null;
  total: number;
  correctAnswered: number;
  incorrectAnswered: number;
  copy: Copy;
}) {
  const unseen = total - correctAnswered - incorrectAnswered;
  const correctWidth = total ? (correctAnswered / total) * 100 : 0;
  const incorrectWidth = total ? (incorrectAnswered / total) * 100 : 0;
  const progressLabel = `${label}: ${copy.correct} ${correctAnswered}, ${copy.wrong} ${incorrectAnswered}, ${copy.unseen} ${unseen}`;
  return (
    <div className="dashboard-breakdown-row">
      <div className="dashboard-breakdown-copy">
        <strong>{label}</strong>
        <span>{copy.coverage} {coverage}% · {copy.accuracy} {accuracy === null ? "—" : `${accuracy}%`}</span>
      </div>
      <div
        className="dashboard-segmented-progress"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={correctAnswered + incorrectAnswered}
        aria-valuetext={progressLabel}
        aria-label={progressLabel}
        title={progressLabel}
      >
        {correctAnswered > 0 && <span className="is-correct" style={{ width: `${correctWidth}%` }} />}
        {incorrectAnswered > 0 && <span className="is-incorrect" style={{ width: `${incorrectWidth}%` }} />}
      </div>
    </div>
  );
}

function ProgressLegend({ copy }: { copy: Copy }) {
  return (
    <div className="dashboard-progress-legend" aria-label={`${copy.correct}, ${copy.wrong}, ${copy.unseen}`}>
      <span><i className="is-correct" aria-hidden="true" />{copy.correct}</span>
      <span><i className="is-incorrect" aria-hidden="true" />{copy.wrong}</span>
      <span><i className="is-unseen" aria-hidden="true" />{copy.unseen}</span>
    </div>
  );
}

export function HomeView({
  dashboard,
  language,
  copy,
  canContinuePractice,
  hasActiveExam,
  onStartStudy,
  onContinuePractice,
  onContinueExam,
  onLanguageChange,
}: {
  dashboard: StudyDashboard;
  language: Language;
  copy: Copy;
  canContinuePractice: boolean;
  hasActiveExam: boolean;
  onStartStudy: (size: 10 | 20, mode?: "adaptive" | "reinforcement") => void;
  onContinuePractice: () => void;
  onContinueExam: () => void;
  onLanguageChange: (language: Language) => void;
}) {
  return (
    <main className="workspace dashboard-workspace">
      <header className="workspace-header">
        <div>
          <h2>{copy.dashboardTitle}</h2>
        </div>
        <div className="header-metrics">
          <Metric label={copy.coverage} value={`${dashboard.coverage}%`} />
          <Metric label={copy.accuracy} value={dashboard.accuracy === null ? "—" : `${dashboard.accuracy}%`} />
          <Metric label={copy.attempts} value={dashboard.attempts} />
          <FlagLanguageToggle language={language} onChange={onLanguageChange} label={copy.languageLabel} />
        </div>
      </header>

      <section className="dashboard-section dashboard-snapshot" aria-labelledby="snapshot-title">
        <div className="dashboard-section-heading">
          <div className="dashboard-snapshot-title">
            <span className="eyebrow">{copy.currentSnapshot}</span>
            <h3 id="snapshot-title">{dashboard.attempted}/{dashboard.total}</h3>
          </div>
          {dashboard.accuracy === null && <span className="dashboard-note">{copy.noAccuracy}</span>}
        </div>
        <div className="dashboard-status-grid">
          <article><CircleAlert aria-hidden="true" /><strong>{dashboard.pendingErrors}</strong><span>{copy.pendingErrors}</span></article>
          <article><Bookmark aria-hidden="true" /><strong>{dashboard.flagged}</strong><span>{copy.flagged}</span></article>
          <article><Eye aria-hidden="true" /><strong>{dashboard.unseen}</strong><span>{copy.unseen}</span></article>
        </div>
      </section>

      <section className={`dashboard-action-grid${canContinuePractice || hasActiveExam ? "" : " no-resume"}`}>
        <article className="dashboard-section quick-study-card">
          <span className="eyebrow quick-study-eyebrow">{copy.quickStudy}</span>
          <p className="quick-study-description">{copy.quickStudyDescription}</p>
          <div className="dashboard-buttons">
            <button className="primary" type="button" onClick={() => onStartStudy(10)}><Play aria-hidden="true" />{copy.quick10}</button>
            <button className="secondary" type="button" onClick={() => onStartStudy(20)}><BookOpen aria-hidden="true" />{copy.complete20}</button>
            <button className="secondary reinforcement" type="button" onClick={() => onStartStudy(10, "reinforcement")}><RefreshCcw aria-hidden="true" />{copy.reinforcementQuick10}</button>
            <button className="secondary reinforcement" type="button" onClick={() => onStartStudy(20, "reinforcement")}><RefreshCcw aria-hidden="true" />{copy.reinforcementComplete20}</button>
            {canContinuePractice && <button className="secondary" type="button" onClick={onContinuePractice}><BookUp2 aria-hidden="true" />{copy.continueStudy}</button>}
            {hasActiveExam && <button className="primary" type="button" onClick={onContinueExam}><Timer aria-hidden="true" />{copy.continueExam}</button>}
            {!canContinuePractice && !hasActiveExam && <span className="dashboard-note">{copy.noAccuracy}</span>}
          </div>
        </article>

        <article className="dashboard-section dashboard-resume-card">
          <span className="eyebrow quick-study-eyebrow">{copy.weakAreas}</span>
          <p>{dashboard.weakChapterIds.length ? copy.weakDescription : copy.noWeakAreas}</p>
          {dashboard.weakChapterIds.length > 0 && (
            <div className="weak-area-list">
              {dashboard.weakChapterIds.map((chapterId) => {
                const item = dashboard.byChapter.find((entry) => entry.id === chapterId)!;
                return <span key={chapterId}>{chapterId} · {localizedChapterName(chapterId, language)} · {copy.accuracy} {item.accuracy}%</span>;
              })}
            </div>
          )}
        </article>
      </section>

      <section className="dashboard-columns">
        <article className="dashboard-section">
          <div className="dashboard-breakdown-heading"><h3>{copy.progressByChapter}</h3><ProgressLegend copy={copy} /></div>
          <div className="dashboard-breakdown-list">
            {dashboard.byChapter.map((item) => (
              <BreakdownRow key={item.id} label={`${item.id} · ${localizedChapterName(item.id, language)}`} coverage={item.coverage} accuracy={item.accuracy} total={item.total} correctAnswered={item.correctAnswered} incorrectAnswered={item.incorrectAnswered} copy={copy} />
            ))}
          </div>
        </article>
        <article className="dashboard-section">
          <div className="dashboard-breakdown-heading"><h3>{copy.progressByLevel}</h3><ProgressLegend copy={copy} /></div>
          <div className="dashboard-breakdown-list">
            {dashboard.byKLevel.map((item) => <BreakdownRow key={item.id} label={item.id} coverage={item.coverage} accuracy={item.accuracy} total={item.total} correctAnswered={item.correctAnswered} incorrectAnswered={item.incorrectAnswered} copy={copy} />)}
          </div>
        </article>
      </section>
    </main>
  );
}
