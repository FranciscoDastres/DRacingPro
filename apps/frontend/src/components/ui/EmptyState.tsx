import { type ReactNode } from 'react';

import { Icon, type IconName } from './Icon';

export function EmptyState({
  icon = 'spark',
  title,
  description,
  action,
}: {
  icon?: IconName;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/12 bg-white/[0.02] px-6 py-12 text-center">
      <span className="text-muted grid size-12 place-items-center rounded-2xl bg-white/5">
        <Icon className="size-6" name={icon} />
      </span>
      <p className="font-display mt-4 text-base font-bold text-white">
        {title}
      </p>
      {description && (
        <p className="text-muted mt-1 max-w-sm text-sm">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
