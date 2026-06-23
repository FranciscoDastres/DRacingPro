export interface TabItem<T extends string> {
  value: T;
  label: string;
  count?: number;
}

export function Tabs<T extends string>({
  items,
  value,
  onChange,
}: {
  items: TabItem<T>[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div
      className="inline-flex rounded-xl border border-white/10 bg-white/[0.03] p-1"
      role="tablist"
    >
      {items.map((item) => {
        const active = item.value === value;
        return (
          <button
            aria-selected={active}
            className={`rounded-lg px-4 py-1.5 text-xs font-semibold tracking-[0.04em] uppercase transition ${
              active
                ? 'bg-primary text-white'
                : 'text-muted hover:text-foreground'
            }`}
            key={item.value}
            onClick={() => onChange(item.value)}
            role="tab"
            type="button"
          >
            {item.label}
            {typeof item.count === 'number' && (
              <span
                className={`ml-1.5 ${active ? 'text-white/70' : 'text-muted/70'}`}
              >
                {item.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
