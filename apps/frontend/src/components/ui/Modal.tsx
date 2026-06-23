import { type ReactNode, useEffect } from 'react';

export function Modal({
  open,
  onClose,
  title,
  eyebrow,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  eyebrow?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      aria-label={title}
      aria-modal="true"
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
    >
      <div
        className="bg-surface relative w-full max-w-md rounded-3xl border border-white/10 p-6 shadow-2xl sm:p-7"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          aria-label="Cerrar"
          className="text-muted hover:border-primary hover:text-foreground absolute top-5 right-5 grid size-9 place-items-center rounded-full border border-white/10 transition"
          onClick={onClose}
          type="button"
        >
          ✕
        </button>
        {eyebrow && (
          <p className="text-accent text-xs font-semibold tracking-[0.1em] uppercase">
            {eyebrow}
          </p>
        )}
        <h2 className="font-display mt-1 text-xl font-extrabold tracking-tight text-white">
          {title}
        </h2>
        <div className="mt-5">{children}</div>
        {footer && <div className="mt-6 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}
