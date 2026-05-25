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

interface ChartDataPoint {
  // Channel-level chart: aggregated data
  hour?: string;
  total_vph?: number;
  video_count?: number;
  // Video-level chart: per-video data (used by video detail page)
  captured_at?: string;
  vph?: number;
  baseline_vph?: number;
}

export default function EngagementChart({ data }: { data: ChartDataPoint[] }) {
  if (data.length === 0) return null;

  // Detect data format: channel-level (hour, total_vph) or video-level (captured_at, vph)
  const isChannelChart = data[0].hour !== undefined;

  // Normalize data for chart
  const chartData = data.map(d => {
    const rawTime = isChannelChart ? (d.hour || '') : (d.captured_at || '');
    return {
      rawTime,
      vph: isChannelChart ? (d.total_vph || 0) : (d.vph || 0),
      baseline: isChannelChart ? 0 : (d.baseline_vph || 0),
      videoCount: d.video_count || 0,
    };
  });

  // Calculate average for reference line
  const avgVph = Math.round(
    chartData.reduce((s, d) => s + d.vph, 0) / chartData.length
  );

  // For video-level, compute baseline reference
  const avgBaseline = !isChannelChart
    ? Math.round(chartData.reduce((s, d) => s + d.baseline, 0) / chartData.length)
    : 0;

  return (
    <div className="h-60 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
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
            dataKey="rawTime"
            tick={{
              fill: "rgba(255,255,255,0.25)",
              fontSize: 9,
              fontFamily: "JetBrains Mono, monospace",
            }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
            tickFormatter={(tick) => {
              if (!tick) return '';
              try {
                // Ensure correct local time conversion on browser
                const date = new Date(tick.includes('T') ? tick : tick.replace(' ', 'T') + 'Z');
                const hours = String(date.getHours()).padStart(2, '0');
                const minutes = String(date.getMinutes()).padStart(2, '0');
                return `${hours}:${minutes}`;
              } catch {
                return tick;
              }
            }}
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
            labelFormatter={(labelValue) => {
              if (!labelValue) return '';
              try {
                const date = new Date(labelValue.includes('T') ? labelValue : labelValue.replace(' ', 'T') + 'Z');
                const hours = String(date.getHours()).padStart(2, '0');
                const minutes = String(date.getMinutes()).padStart(2, '0');
                return `${hours}:${minutes}`;
              } catch {
                return labelValue;
              }
            }}
            formatter={(value: any, _name: any, props: any) => {
              const vph = fmt(Number(value) || 0) + " VPH";
              const vc = props?.payload?.videoCount;
              if (vc && vc > 0) {
                return [vph + ` · ${vc} videos`, ""];
              }
              return [vph, ""];
            }}
          />
          {/* Reference line: baseline for video charts, average for channel charts */}
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
