"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function EngagementChart({ data }: { data: any[] }) {
  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
          <Line type="monotone" dataKey="vph" stroke="oklch(0.7 0.2 180)" strokeWidth={3} name="VPH" dot={{ r: 4, fill: "oklch(0.7 0.2 180)" }} activeDot={{ r: 6 }} />
          <Line type="monotone" dataKey="baseline_vph" stroke="#64748b" strokeWidth={2} strokeDasharray="5 5" name="Baseline VPH" dot={false} />
          <CartesianGrid stroke="#334155" strokeDasharray="5 5" vertical={false} opacity={0.5} />
          <XAxis dataKey="captured_at" stroke="#64748b" tick={{ fill: '#64748b', fontSize: 12 }} tickLine={false} axisLine={false} dy={10} />
          <YAxis stroke="#64748b" tick={{ fill: '#64748b', fontSize: 12 }} tickLine={false} axisLine={false} dx={-10} />
          <Tooltip 
            contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)' }}
            itemStyle={{ color: '#fff', fontWeight: 600 }}
            labelStyle={{ color: '#94a3b8', marginBottom: '4px' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
