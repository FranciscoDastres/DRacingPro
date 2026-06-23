import { type ButtonHTMLAttributes, type ReactNode } from 'react';

import { Icon, type IconName } from './Icon';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md';

const base =
  'inline-flex items-center justify-center gap-2 rounded-xl font-display font-semibold tracking-[0.03em] uppercase whitespace-nowrap transition disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary';

const variants: Record<Variant, string> = {
  danger:
    'bg-transparent text-[#ff8088] border border-[#ff5a66]/30 hover:bg-[#ff5a66]/10 hover:text-[#ffb0b5]',
  ghost: 'bg-transparent text-muted hover:text-foreground hover:bg-white/5',
  primary:
    'bg-primary text-white shadow-[0_10px_30px_rgba(230,0,35,0.28)] hover:bg-accent hover:-translate-y-px',
  secondary:
    'border border-white/15 bg-white/[0.04] text-foreground hover:border-white/30 hover:bg-white/[0.08]',
};

const sizes: Record<Size, string> = {
  md: 'min-h-11 px-5 text-xs',
  sm: 'min-h-9 px-3.5 text-[0.7rem]',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: IconName;
  children?: ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  children,
  className = '',
  disabled,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || loading}
      type={type}
      {...rest}
    >
      {loading ? (
        <span
          aria-hidden="true"
          className="size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      ) : (
        icon && <Icon className="size-4" name={icon} />
      )}
      {children}
    </button>
  );
}
