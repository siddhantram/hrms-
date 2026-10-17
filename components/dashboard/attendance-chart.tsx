"use client";

import { useEffect, useState } from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";

type MonthData = { month: string; present: number; late: number; overtime: number };

export function AttendanceChart() {
  const [data, setData] = useState<MonthData[]>([]);

  useEffect(() => {
    fetch("/api/attendance/summary", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return;
        const result = await response.json();
        setData(result.data);
      })
      .catch(() => setData([]));
  }, []);

  return (
    <div className="h-80 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900">Attendance Overview</h3>
        <span className="text-sm text-slate-500">Last six months</span>
      </div>
      <ResponsiveContainer width="100%" height="85%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
          <XAxis dataKey="month" tickLine={false} axisLine={false} stroke="#64748b" />
          <YAxis tickLine={false} axisLine={false} stroke="#64748b" />
          <Tooltip />
          <Bar dataKey="present" fill="#0f172a" radius={[6, 6, 0, 0]} />
          <Bar dataKey="late" fill="#0891b2" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
