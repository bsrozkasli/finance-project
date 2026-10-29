import type { ReactNode } from 'react';

interface DashCardProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  className?: string;
  children: ReactNode;
}

/** Shared panel frame so every dashboard section has the same heading, spacing and landmark name. */
export default function DashCard({ title, subtitle, actions, className = '', children }: DashCardProps) {
  return (
    <section aria-label={title} className={`bg-bg-card border border-outline-variant rounded-md p-5 ${className}`}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-outline-variant/30 pb-3">
        <div>
          <h2 className="font-headline text-xs font-bold uppercase tracking-wide text-text-primary">{title}</h2>
          {subtitle && <p className="mt-1 text-xs text-text-muted">{subtitle}</p>}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}
