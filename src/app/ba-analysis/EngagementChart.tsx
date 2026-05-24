"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

function fmt(n: number): string {
  if (n >= 1e9) return (n / 1e9).toFixed(1) + "B";
  if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(1) + "K";
  return n.toLocaleString();
}

export default function EngagementChart({ data }: { data: any[] }) {
  // Calculate average baseline for the reference line
  const avgBaseline =
    data.length > 0
      ? Math.round(data.reduce((s, d) => s + (d.baseline_vph || 0), 0) / data.length)
      : 0;

  return (
    <div className="h-60 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
          <defs>
            <linearGradient id="vphGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(255,255,255,0.05)"
            vertical={false}
          />
          <XAxis
            dataKey="captured_at"
            tick={{
              fill: "rgba(255,255,255,0.25)",
              fontSize: 9,
              fontFamily: "JetBrains Mono, monospace",
            }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{
              fill: "rgba(255,255,255,0.25)",
              fontSize: 9,
              fontFamily: "JetBrains Mono, monospace",
            }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => fmt(v)}
          />
          <Tooltip
            contentStyle={{
              background: "rgba(10, 8, 25, 0.96)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 10,
              fontFamily: "JetBrains Mono, monospace",
              fontSize: 11,
            }}
            labelStyle={{ color: "rgba(255,255,255,0.4)" }}
            itemStyle={{ color: "#a78bfa" }}
            formatter={(v: any) => [fmt(Number(v) || 0) + " VPH", ""]}
          />
          {avgBaseline > 0 && (
            <ReferenceLine
              y={avgBaseline}
              stroke="#f59e0b"
              strokeDasharray="4 3"
              strokeOpacity={0.5}
            />
          )}
          <Area
            type="monotone"
            dataKey="vph"
            stroke="#8b5cf6"
            strokeWidth={2}
            fill="url(#vphGradient)"
            dot={false}
            activeDot={{
              r: 4,
              fill: "#8b5cf6",
              stroke: "rgba(139,92,246,0.4)",
              strokeWidth: 8,
            }}
            name="VPH"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
