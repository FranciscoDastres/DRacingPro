import { type ReactNode } from 'react';

export type BadgeTone =
  | 'neutral'
  | 'primary'
  | 'success'
  | 'warning'
  | 'info'
  | 'danger';

const tones: Record<BadgeTone, string> = {
  danger: 'text-[#ff8088] bg-[#ff5a66]/12 border-[#ff5a66]/25',
  info: 'text-[#7cc4ff] bg-[#7cc4ff]/12 border-[#7cc4ff]/25',
  neutral: 'text-muted bg-white/5 border-white/10',
  primary: 'text-accent bg-accent/12 border-accent/25',
  success: 'text-success bg-success/12 border-success/25',
  warning: 'text-warning bg-warning/12 border-warning/25',
};

export function Badge({
  children,
  tone = 'neutral',
}: {
  children: ReactNode;
  tone?: BadgeTone;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[0.68rem] font-semibold tracking-[0.04em] whitespace-nowrap ${tones[tone]}`}
    >
      {children}
    </span>
  );
}
