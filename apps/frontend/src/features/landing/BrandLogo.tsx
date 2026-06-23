/**
 * Temporary brand logo placeholder shown in the top bar.
 *
 * Swap the contents for the real logo when available, e.g.:
 *   return <img src="/images/logo.svg" alt="Nombre del taller" className="h-7" />;
 */
export function BrandLogo() {
  return (
    <span className="inline-flex items-center gap-2 rounded-lg border border-dashed border-black/20 px-3.5 py-2">
      <span aria-hidden="true" className="bg-primary size-6 rounded-sm" />
      <span className="text-[11px] font-bold tracking-[0.24em] text-[#6a6a6a] uppercase">
        Logo
      </span>
    </span>
  );
}
