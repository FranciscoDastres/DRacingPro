import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { formatCLP } from '../../components/ui/money';

const CHART_COLORS = ['#ff2948', '#39e991', '#ffb84d', '#718096', '#9b87f5'];

const tooltipStyle = {
  background: '#141b24',
  border: '1px solid rgba(255,255,255,.1)',
  borderRadius: 12,
  color: '#f5f7fa',
  fontSize: 12,
};

export function RevenueAreaChart({
  data,
}: {
  data: Array<{ date: string; ingresos: number }>;
}) {
  return (
    <div
      className="mt-5 h-72"
      role="img"
      aria-label="Gráfico de ingresos diarios"
    >
      <ResponsiveContainer height="100%" width="100%">
        <AreaChart data={data} margin={{ left: -16, right: 8 }}>
          <defs>
            <linearGradient id="revenueGradient" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#ff2948" stopOpacity={0.42} />
              <stop offset="100%" stopColor="#ff2948" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="rgba(255,255,255,.055)" vertical={false} />
          <XAxis
            axisLine={false}
            dataKey="date"
            minTickGap={22}
            tick={{ fill: '#8d98a8', fontSize: 10 }}
            tickLine={false}
          />
          <YAxis
            axisLine={false}
            tick={{ fill: '#8d98a8', fontSize: 10 }}
            tickFormatter={(value: number) => `$${Math.round(value / 1000)}k`}
            tickLine={false}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(value) => [formatCLP(Number(value)), 'Ingresos']}
            labelStyle={{ color: '#f5f7fa' }}
          />
          <Area
            dataKey="ingresos"
            fill="url(#revenueGradient)"
            stroke="#ff2948"
            strokeWidth={2.5}
            type="monotone"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function StatusDonutChart({
  data,
}: {
  data: Array<{ name: string; value: number }>;
}) {
  return (
    <>
      <div
        className="mx-auto mt-4 h-44 max-w-60"
        role="img"
        aria-label="Distribución de citas por estado"
      >
        <ResponsiveContainer height="100%" width="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              innerRadius={52}
              outerRadius={72}
              paddingAngle={4}
              stroke="none"
            >
              {data.map((item, index) => (
                <Cell
                  fill={CHART_COLORS[index % CHART_COLORS.length]!}
                  key={item.name}
                />
              ))}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {data.slice(0, 6).map((item, index) => (
          <div className="flex items-center gap-2 text-xs" key={item.name}>
            <span
              className="size-2 rounded-full"
              style={{
                background: CHART_COLORS[index % CHART_COLORS.length]!,
              }}
            />
            <span className="text-muted truncate">{item.name}</span>
            <span className="ml-auto font-semibold">{item.value}</span>
          </div>
        ))}
      </div>
    </>
  );
}
