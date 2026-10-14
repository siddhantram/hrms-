"use client";

import { useCallback, useEffect, useState } from "react";

type Department = { id: string; name: string; description: string | null; _count: { employees: number } };

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const loadData = useCallback(async () => { const response = await fetch("/api/departments", { cache: "no-store" }); if (response.ok) setDepartments((await response.json()).data); setLoading(false); }, []);
  useEffect(() => { void loadData(); }, [loadData]);
  async function addDepartment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); const response = await fetch("/api/departments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(new FormData(event.currentTarget).entries())) }); const result = await response.json(); setMessage(response.ok ? "Department created." : result.error ?? "Could not create department."); if (response.ok) { setShowForm(false); await loadData(); }
  }

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <div className="mx-auto max-w-6xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Organization</p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900">Departments</h1>
          </div>
          <button onClick={() => setShowForm((value) => !value)} className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-medium text-white">{showForm ? "Close" : "Add Department"}</button>
        </div>
        {message && <p role="status" className="mb-4 bg-cyan-50 px-4 py-3 text-sm text-cyan-900">{message}</p>}
        {showForm && <form onSubmit={addDepartment} className="mb-6 flex flex-wrap gap-3 border border-slate-200 bg-slate-50 p-4"><input name="name" required minLength={2} placeholder="Department name" className="border border-slate-300 px-3 py-2" /><input name="description" placeholder="Description" className="min-w-56 flex-1 border border-slate-300 px-3 py-2" /><button className="rounded-lg bg-cyan-700 px-4 py-2 text-sm font-medium text-white">Save</button></form>}

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {departments.map((department) => (
            <div key={department.id} className="rounded-xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Department</p>
              <h2 className="mt-3 text-xl font-semibold text-slate-900">{department.name}</h2>
              <div className="mt-6 space-y-2 text-sm text-slate-600">
                <div className="flex justify-between"><span>Employees</span><span>{department._count.employees}</span></div>
                {department.description && <p>{department.description}</p>}
              </div>
            </div>
          ))}
          {!loading && departments.length === 0 && <p className="text-slate-500">No departments created yet.</p>}
        </div>
      </div>
    </main>
  );
}
