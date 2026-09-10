import type { ReactNode } from "react";

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  /** Right-aligned slot for a page-level action (e.g. a button), rendered
   * next to the title on wide screens and below it on narrow ones. */
  action?: ReactNode;
}

/** The eyebrow + h1 + subcopy pattern repeated across ~12 authenticated
 * pages, centralized so heading size/weight/spacing stays consistent
 * without being copy-pasted per page. */
export default function PageHeader({ eyebrow, title, subtitle, action }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex flex-col gap-1">
        {eyebrow && (
          <p className="text-xs font-bold uppercase tracking-widest text-mentee">{eyebrow}</p>
        )}
        <h1 className="font-display text-3xl font-semibold tracking-tight text-ink">{title}</h1>
        {subtitle && <p className="text-sm text-muted">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
