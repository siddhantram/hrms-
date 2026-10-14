"use client";

import { useEffect, useState } from "react";

type Department = { id: string; name: string; _count: { employees: number } };
const colors = ["bg-slate-900", "bg-cyan-700", "bg-emerald-600", "bg-amber-600", "bg-slate-400"];

export function DepartmentDistribution() {
  const [departments, setDepartments] = useState<Department[]>([]);
  useEffect(() => {
    fetch("/api/departments", { cache: "no-store" }).then(async (response) => {
      if (response.ok) setDepartments((await response.json()).data);
    }).catch(() => setDepartments([]));
  }, []);
  const total = departments.reduce((sum, department) => sum + department._count.employees, 0);

  return (
    <section className="bg-white p-5 shadow-sm">
      <h3 className="text-lg font-semibold text-slate-900">Department distribution</h3>
      <div className="mt-6 space-y-4">
        {departments.slice(0, 6).map((department, index) => {
          const percentage = total ? Math.round((department._count.employees / total) * 100) : 0;
          return <div key={department.id}><div className="mb-2 flex items-center justify-between gap-3 text-sm text-slate-600"><span>{department.name}</span><span>{department._count.employees} · {percentage}%</span></div><div className="h-2.5 w-full overflow-hidden bg-slate-100"><div className={`h-full ${colors[index % colors.length]}`} style={{ width: `${percentage}%` }} /></div></div>;
        })}
        {departments.length === 0 && <p className="text-sm text-slate-500">No department data available.</p>}
      </div>
    </section>
  );
}