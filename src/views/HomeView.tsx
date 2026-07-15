import { BookOpen, Bookmark, CircleAlert, Eye, Play, Timer } from "lucide-react";
import type { StudyDashboard } from "../domain/dashboard";
import type { Copy, Language } from "../app/content";
import { localizedChapterName } from "../app/presentation";
import { FlagLanguageToggle, Metric } from "../components/common/CommonUi";

function BreakdownRow({
  label,
  coverage,
  accuracy,
  copy,
}: {
  label: string;
  coverage: number;
  accuracy: number | null;
  copy: Copy;
}) {
  return (
    <div className="dashboard-breakdown-row">
      <div className="dashboard-breakdown-copy">
        <strong>{label}</strong>
        <span>{copy.coverage} {coverage}% · {copy.accuracy} {accuracy === null ? "—" : `${accuracy}%`}</span>
      </div>
      <progress max={100} value={coverage} aria-label={`${label}: ${copy.coverage} ${coverage}%`} />
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
  onStartStudy: (size: 10 | 20) => void;
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

      <section className="dashboard-section" aria-labelledby="snapshot-title">
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
          <h3>{copy.quickStudy}</h3>
          <p className="quick-study-description">{copy.quickStudyDescription}</p>
          <div className="dashboard-buttons">
            <button className="primary" type="button" onClick={() => onStartStudy(10)}><Play aria-hidden="true" />{copy.quick10}</button>
            <button className="secondary" type="button" onClick={() => onStartStudy(20)}><BookOpen aria-hidden="true" />{copy.complete20}</button>
          </div>
        </article>

        <article className="dashboard-section dashboard-resume-card">
          <span className="eyebrow">{copy.resumeTitle}</span>
          <h3>{copy.resumeTitle}</h3>
          <div className="dashboard-buttons vertical">
            {canContinuePractice && <button className="secondary" type="button" onClick={onContinuePractice}><BookOpen aria-hidden="true" />{copy.continueStudy}</button>}
            {hasActiveExam && <button className="primary" type="button" onClick={onContinueExam}><Timer aria-hidden="true" />{copy.continueExam}</button>}
            {!canContinuePractice && !hasActiveExam && <span className="dashboard-note">{copy.noAccuracy}</span>}
          </div>
        </article>
      </section>

      <section className="dashboard-columns">
        <article className="dashboard-section">
          <h3>{copy.progressByChapter}</h3>
          <div className="dashboard-breakdown-list">
            {dashboard.byChapter.map((item) => (
              <BreakdownRow key={item.id} label={`${item.id} · ${localizedChapterName(item.id, language)}`} coverage={item.coverage} accuracy={item.accuracy} copy={copy} />
            ))}
          </div>
        </article>
        <article className="dashboard-section">
          <h3>{copy.progressByLevel}</h3>
          <div className="dashboard-breakdown-list">
            {dashboard.byKLevel.map((item) => <BreakdownRow key={item.id} label={item.id} coverage={item.coverage} accuracy={item.accuracy} copy={copy} />)}
          </div>
        </article>
      </section>

      <section className="dashboard-section" aria-labelledby="weak-title">
        <h3 id="weak-title">{copy.weakAreas}</h3>
        <p>{dashboard.weakChapterIds.length ? copy.weakDescription : copy.noWeakAreas}</p>
        {dashboard.weakChapterIds.length > 0 && (
          <div className="weak-area-list">
            {dashboard.weakChapterIds.map((chapterId) => {
              const item = dashboard.byChapter.find((entry) => entry.id === chapterId)!;
              return <span key={chapterId}>{chapterId} · {localizedChapterName(chapterId, language)} · {copy.accuracy} {item.accuracy}%</span>;
            })}
          </div>
        )}
      </section>
    </main>
  );
}
