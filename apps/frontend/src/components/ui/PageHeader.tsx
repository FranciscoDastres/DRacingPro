import { type ReactNode } from 'react';

export function PageHeader({
  title,
  subtitle,
  actions,
  eyebrow,
}: {
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
  eyebrow?: string;
}) {
  return (
    <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && (
          <p className="text-accent mb-1 text-[0.7rem] font-semibold tracking-[0.18em] uppercase">
            {eyebrow}
          </p>
        )}
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
          {title}
        </h1>
        {subtitle && (
          <p className="text-muted mt-1.5 max-w-2xl text-sm">{subtitle}</p>
        )}
      </div>
      {actions && (
        <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
      )}
    </header>
  );
}
