export interface ChartPoint {
  label: string;
  value: number;
  /** Optional formatted value for tooltips/labels (defaults to value). */
  display?: string;
}

/**
 * Lightweight, dependency-free vertical bar chart rendered as inline SVG.
 * Used for revenue-by-day. Bars scale to the max value in the series.
 */
export function BarChart({ data }: { data: ChartPoint[] }) {
  const max = Math.max(1, ...data.map((point) => point.value));
  const width = Math.max(data.length * 44, 220);
  const height = 160;
  const gap = 14;
  const barWidth = (width - gap * (data.length + 1)) / Math.max(data.length, 1);

  return (
    <svg
      className="h-44 w-full"
      preserveAspectRatio="none"
      role="img"
      viewBox={`0 0 ${width} ${height + 28}`}
    >
      {data.map((point, index) => {
        const barHeight = (point.value / max) * height;
        const x = gap + index * (barWidth + gap);
        const y = height - barHeight;
        return (
          <g key={index}>
            <rect
              fill="url(#barGradient)"
              height={Math.max(barHeight, 2)}
              rx="4"
              width={barWidth}
              x={x}
              y={y}
            >
              <title>{`${point.label}: ${point.display ?? point.value}`}</title>
            </rect>
            <text
              className="fill-[#8f8f8f] text-[10px]"
              textAnchor="middle"
              x={x + barWidth / 2}
              y={height + 18}
            >
              {point.label}
            </text>
          </g>
        );
      })}
      <defs>
        <linearGradient id="barGradient" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#ff2948" />
          <stop offset="100%" stopColor="#e60023" stopOpacity="0.55" />
        </linearGradient>
      </defs>
    </svg>
  );
}

/**
 * Horizontal ranked bars with labels and values, ideal for revenue-by-service.
 */
export function BarList({ data }: { data: ChartPoint[] }) {
  const max = Math.max(1, ...data.map((point) => point.value));
  return (
    <ul className="space-y-3">
      {data.map((point, index) => (
        <li key={index}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
            <span className="text-foreground truncate">{point.label}</span>
            <span className="text-muted shrink-0 tabular-nums">
              {point.display ?? point.value}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/5">
            <div
              className="from-accent to-primary h-full rounded-full bg-gradient-to-r"
              style={{ width: `${Math.max((point.value / max) * 100, 3)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
