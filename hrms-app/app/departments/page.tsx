"use client";

import { useCallback, useEffect, useState } from "react";

type Department = { id: string; name: string; description: string | null; _count: { employees: number } };

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const loadData = useCallback(async () => { const response = await fetch("/api/departments", { cache: "no-store" }); if (response.ok) setDepartments((await response.json()).data); setLoading(false); }, []);
  useEffect(() => { void loadData(); }, [loadData]);
  async function saveDepartment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); const response = await fetch(editingDepartment ? `/api/departments/${editingDepartment.id}` : "/api/departments", { method: editingDepartment ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(new FormData(event.currentTarget).entries())) }); const result = await response.json(); setMessage(response.ok ? `Department ${editingDepartment ? "updated" : "created"}.` : result.error ?? "Could not save department."); if (response.ok) { setShowForm(false); setEditingDepartment(null); await loadData(); }
  }
  async function deleteDepartment(department: Department) {
    if (!window.confirm(`Delete ${department.name}?`)) return;
    const response = await fetch(`/api/departments/${department.id}`, { method: "DELETE" }); const result = await response.json(); setMessage(response.ok ? "Department deleted." : result.error ?? "Could not delete department."); if (response.ok) await loadData();
  }

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <div className="mx-auto max-w-6xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Organization</p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900">Departments</h1>
          </div>
          <button onClick={() => { setEditingDepartment(null); setShowForm((value) => !value); }} className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-medium text-white">{showForm ? "Close" : "Add Department"}</button>
        </div>
        {message && <p role="status" className="mb-4 bg-cyan-50 px-4 py-3 text-sm text-cyan-900">{message}</p>}
        {showForm && <form key={editingDepartment?.id ?? "new"} onSubmit={saveDepartment} className="mb-6 flex flex-wrap gap-3 border border-slate-200 bg-slate-50 p-4"><input name="name" required minLength={2} defaultValue={editingDepartment?.name ?? ""} placeholder="Department name" className="border border-slate-300 px-3 py-2" /><input name="description" defaultValue={editingDepartment?.description ?? ""} placeholder="Description" className="min-w-56 flex-1 border border-slate-300 px-3 py-2" /><button className="rounded-lg bg-cyan-700 px-4 py-2 text-sm font-medium text-white">{editingDepartment ? "Update" : "Save"}</button></form>}

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {departments.map((department) => (
            <div key={department.id} className="rounded-xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Department</p>
              <h2 className="mt-3 text-xl font-semibold text-slate-900">{department.name}</h2>
              <div className="mt-6 space-y-2 text-sm text-slate-600">
                <div className="flex justify-between"><span>Employees</span><span>{department._count.employees}</span></div>
                {department.description && <p>{department.description}</p>}
                <div className="flex gap-3 pt-2"><button onClick={() => { setEditingDepartment(department); setShowForm(true); }} className="text-cyan-800 underline">Edit</button><button onClick={() => void deleteDepartment(department)} className="text-red-700 underline">Delete</button></div>
              </div>
            </div>
          ))}
          {!loading && departments.length === 0 && <p className="text-slate-500">No departments created yet.</p>}
        </div>
      </div>
    </main>
  );
}
