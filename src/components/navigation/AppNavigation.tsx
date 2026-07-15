import { BookOpen, House, RotateCcw, Timer } from "lucide-react";
import { NavLink } from "react-router-dom";
import type { Copy } from "../../app/content";
import { classNames } from "../../app/presentation";

export function ModeNavigation({
  copy,
  highlighted,
  onNavigate,
}: {
  copy: Copy;
  highlighted: boolean;
  onNavigate: () => void;
}) {
  return (
    <nav className={classNames("mode-tabs", highlighted && "tutorial-highlight")} aria-label={copy.modesLabel}>
      <NavLink to="/" end onClick={onNavigate}>{copy.home}</NavLink>
      <NavLink to="/practice" onClick={onNavigate}>{copy.practice}</NavLink>
      <NavLink to="/exam" onClick={onNavigate}>{copy.exam}</NavLink>
      <NavLink to="/review" onClick={onNavigate}>{copy.review}</NavLink>
    </nav>
  );
}

export function MobilePrimaryNavigation({ copy, onNavigate }: { copy: Copy; onNavigate: () => void }) {
  return (
    <nav className="mobile-primary-nav" aria-label={copy.modesLabel}>
      <NavLink to="/" end onClick={onNavigate}>
        <House aria-hidden="true" />
        <span>{copy.home}</span>
      </NavLink>
      <NavLink to="/practice" onClick={onNavigate}>
        <BookOpen aria-hidden="true" />
        <span>{copy.practice}</span>
      </NavLink>
      <NavLink to="/exam" onClick={onNavigate}>
        <Timer aria-hidden="true" />
        <span>{copy.exam}</span>
      </NavLink>
      <NavLink to="/review" onClick={onNavigate}>
        <RotateCcw aria-hidden="true" />
        <span>{copy.review}</span>
      </NavLink>
    </nav>
  );
}
