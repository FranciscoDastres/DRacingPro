/**
 * Temporary brand logo placeholder shown in the top bar.
 *
 * Swap the contents for the real logo when available, e.g.:
 *   return <img src="/images/logo.svg" alt="Nombre del taller" className="h-7" />;
 */
export function BrandLogo() {
  return (
    <span className="inline-flex items-center gap-2 rounded-lg border border-dashed border-white/25 px-3 py-1.5">
      <span aria-hidden="true" className="bg-primary size-5 rounded-sm" />
      <span className="text-muted text-[10px] font-bold tracking-[0.24em] uppercase">
        Logo
      </span>
    </span>
  );
}
