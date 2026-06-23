import { type HTMLAttributes, type ReactNode } from 'react';

import { Icon, type IconName } from './Icon';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  /** Adds a subtle hover lift; useful for clickable cards. */
  interactive?: boolean;
}

export function Card({
  children,
  interactive = false,
  className = '',
  ...rest
}: CardProps) {
  return (
    <div
      className={`bg-surface rounded-2xl border border-white/10 ${
        interactive
          ? 'hover:border-primary/40 transition hover:-translate-y-0.5'
          : ''
      } ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}

export interface StatCardProps {
  label: string;
  value: ReactNode;
  icon?: IconName;
  hint?: ReactNode;
  accent?: 'primary' | 'success' | 'warning';
}

const accentClasses = {
  primary: 'text-primary bg-primary/10',
  success: 'text-success bg-success/10',
  warning: 'text-warning bg-warning/10',
};

export function StatCard({
  label,
  value,
  icon,
  hint,
  accent = 'primary',
}: StatCardProps) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-muted text-[0.7rem] font-semibold tracking-[0.12em] uppercase">
          {label}
        </p>
        {icon && (
          <span
            className={`grid size-9 shrink-0 place-items-center rounded-xl ${accentClasses[accent]}`}
          >
            <Icon className="size-4.5" name={icon} />
          </span>
        )}
      </div>
      <p className="font-display mt-3 text-2xl font-extrabold tracking-tight text-white">
        {value}
      </p>
      {hint && <p className="text-muted mt-1 text-xs">{hint}</p>}
    </Card>
  );
}
