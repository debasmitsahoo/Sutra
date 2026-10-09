"use client";
import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { fmtNum } from "@/lib/format";

const tip = {
  contentStyle: { borderRadius: 12, border: "1px solid #e5e7eb", boxShadow: "0 4px 12px rgb(0 0 0 / 0.06)", fontSize: 12 },
  formatter: (v: unknown) => `${fmtNum(Number(v))} tCO2e`,
};

export function TrendChart({ data }: { data: { month: string; s1: number; s2: number; s3: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ left: -10, right: 8, top: 8 }}>
        <defs>
          {[["s1", "#f97316"], ["s2", "#3b82f6"], ["s3", "#8b5cf6"]].map(([k, c]) => (
            <linearGradient key={k} id={k} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={c} stopOpacity={0.25} />
              <stop offset="100%" stopColor={c} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid vertical={false} stroke="#eef0f3" />
        <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} stroke="#94a3b8" />
        <YAxis tickLine={false} axisLine={false} fontSize={12} stroke="#94a3b8" tickFormatter={(v) => fmtNum(v)} />
        <Tooltip {...tip} />
        <Area type="monotone" dataKey="s3" name="Scope 3" stroke="#8b5cf6" strokeWidth={2} fill="url(#s3)" />
        <Area type="monotone" dataKey="s1" name="Scope 1" stroke="#f97316" strokeWidth={2} fill="url(#s1)" />
        <Area type="monotone" dataKey="s2" name="Scope 2" stroke="#3b82f6" strokeWidth={2} fill="url(#s2)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function ScopeDonut({ data }: { data: { name: string; value: number; color: string }[] }) {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <PieChart>
        <Pie data={data} dataKey="value" innerRadius={55} outerRadius={80} paddingAngle={3} stroke="none">
          {data.map((d) => <Cell key={d.name} fill={d.color} />)}
        </Pie>
        <Tooltip {...tip} />
      </PieChart>
    </ResponsiveContainer>
  );
}
