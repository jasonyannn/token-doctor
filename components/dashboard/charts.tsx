"use client";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { format, money } from "../../lib/analytics";
export function Chart({
  title,
  rows,
  metric = "tokens",
  trend = false,
  modelLabels = false,
}: {
  title: string;
  rows: Record<string, string | number>[];
  metric?: string;
  trend?: boolean;
  modelLabels?: boolean;
}) {
  const formatValue = (value: number) =>
    metric === "cost" ? money(value) : format(value);
  const trendRows = rows.map((row) => ({
    ...row,
    name:
      typeof row.name === "string" && /^\d{4}-\d{2}-\d{2}$/.test(row.name)
        ? row.name.slice(5)
        : row.name,
  }));
  return (
    <section className="panel chart">
      <h2>{title}</h2>
      {rows.length ? (
        trend ? (
          <div className="plot">
            <ResponsiveContainer>
              <AreaChart
                data={trendRows}
                margin={{ top: 12, right: 12, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient
                    id={metric + "-fill"}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor="#7652e8" stopOpacity={0.25} />
                    <stop
                      offset="100%"
                      stopColor="#7652e8"
                      stopOpacity={0.02}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  vertical={false}
                  stroke="var(--line)"
                  strokeDasharray="4 4"
                />
                <XAxis
                  dataKey="name"
                  tickLine={false}
                  axisLine={false}
                  minTickGap={22}
                  tick={{ fontSize: 11, fill: "var(--muted)" }}
                />
                <YAxis
                  width={53}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={formatValue}
                  tick={{ fontSize: 11, fill: "var(--muted)" }}
                />
                <Tooltip formatter={(value) => formatValue(Number(value))} />
                <Area
                  type="monotone"
                  dataKey={metric}
                  stroke="#7652e8"
                  strokeWidth={2.5}
                  fill={`url(#${metric}-fill)`}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="plot">
            <ResponsiveContainer>
              <BarChart data={rows} layout="vertical" margin={{ right: 12 }}>
                <XAxis type="number" hide />
                <YAxis
                  dataKey="name"
                  type="category"
                  width={modelLabels ? 160 : 110}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) =>
                    !modelLabels && value.length > 17
                      ? value.slice(0, 15) + "…"
                      : value
                  }
                  tick={{ fontSize: 11, fill: "var(--muted)" }}
                />
                <Tooltip formatter={(value) => formatValue(Number(value))} />
                <Bar
                  dataKey={metric}
                  fill="#7652e8"
                  radius={[0, 5, 5, 0]}
                  maxBarSize={21}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )
      ) : (
        <p className="empty">No matching records</p>
      )}
    </section>
  );
}
