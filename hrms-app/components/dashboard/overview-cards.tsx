"use client";

import { Users, UserCheck, CalendarClock, UserX } from "lucide-react";
import { useEffect, useState } from "react";

const metrics = [
  { key: "totalEmployees", label: "Employees", icon: Users },
  { key: "present", label: "Present today", icon: UserCheck },
  { key: "onLeave", label: "On leave", icon: CalendarClock },
  { key: "absent", label: "Absent today", icon: UserX },
] as const;

export function OverviewCards() {
  const [data, setData] = useState<Record<string, number>>({});
  useEffect(() => {
    fetch("/api/dashboard/summary", { cache: "no-store" }).then(async (response) => {
      if (response.ok) setData((await response.json()).data);
    }).catch(() => setData({}));
  }, []);

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {metrics.map(({ key, label, icon: Icon }) => {
        return (
          <div key={key} className="border-l-2 border-cyan-600 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">{label}</p>
              <span className="bg-cyan-50 p-2 text-cyan-800">
                <Icon className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-4 flex items-end justify-between">
              <h3 className="text-2xl font-semibold text-slate-900">{data[key] ?? "-"}</h3>
            </div>
          </div>
        );
      })}
    </div>
  );
}
