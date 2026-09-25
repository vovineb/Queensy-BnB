"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatDate } from "@/lib/format";

// Single-series column chart (no legend: the panel title names the series).
// Colour --color-chart-1 validated for chroma/lightness/contrast on the surface.
export function BookingTrendChart({ data }: { data: { day: string; bookings: number }[] }) {
  const total = data.reduce((s, d) => s + d.bookings, 0);
  return (
    <figure>
      <div className="h-56 w-full" role="img" aria-label={`Booking requests per day over the last ${data.length} days: ${total} in total.`}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -20 }} barCategoryGap={2}>
            <CartesianGrid vertical={false} stroke="var(--color-ink-100)" />
            <XAxis dataKey="day" tickLine={false} axisLine={{ stroke: "var(--color-ink-200)" }} tick={{ fontSize: 11, fill: "var(--color-ink-500)" }} tickFormatter={(d: string) => formatDate(d, { day: "numeric", month: "short" })} interval="preserveStartEnd" minTickGap={24} />
            <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "var(--color-ink-500)" }} width={40} />
            <Tooltip
              cursor={{ fill: "var(--color-ink-100)" }}
              contentStyle={{ borderRadius: 10, border: "1px solid var(--color-ink-200)", boxShadow: "var(--shadow-card)", fontSize: 13 }}
              labelFormatter={(d) => formatDate(String(d), { weekday: "short", day: "numeric", month: "short" })}
              formatter={(v) => [String(v), "Requests"]}
            />
            <Bar dataKey="bookings" fill="var(--color-chart-1)" radius={[4, 4, 0, 0]} maxBarSize={24} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <details className="mt-2 text-xs text-ink-500">
        <summary className="cursor-pointer">View as table</summary>
        <table className="mt-2 w-full text-left">
          <thead><tr><th className="py-1">Day</th><th className="py-1">Requests</th></tr></thead>
          <tbody>{data.filter((d) => d.bookings > 0).map((d) => <tr key={d.day}><td className="py-0.5">{formatDate(d.day)}</td><td>{d.bookings}</td></tr>)}</tbody>
        </table>
      </details>
    </figure>
  );
}
