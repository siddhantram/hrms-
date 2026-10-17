"use client";

import { useCallback, useEffect, useState } from "react";

type Designation = { id: string; name: string; description: string | null; _count: { employees: number } };

export default function DesignationsPage() {
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingDesignation, setEditingDesignation] = useState<Designation | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const loadData = useCallback(async () => { const response = await fetch("/api/designations", { cache: "no-store" }); if (response.ok) setDesignations((await response.json()).data); setLoading(false); }, []);
  useEffect(() => {
    let active = true;
    fetch("/api/designations", { cache: "no-store" })
      .then(async (response) => { if (active && response.ok) setDesignations((await response.json()).data); })
      .catch(() => undefined)
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  async function saveDesignation(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); const response = await fetch(editingDesignation ? `/api/designations/${editingDesignation.id}` : "/api/designations", { method: editingDesignation ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(new FormData(event.currentTarget).entries())) }); const result = await response.json(); setMessage(response.ok ? `Designation ${editingDesignation ? "updated" : "created"}.` : result.error ?? "Could not save designation."); if (response.ok) { setShowForm(false); setEditingDesignation(null); await loadData(); }
  }
  async function deleteDesignation(designation: Designation) {
    if (!window.confirm(`Delete ${designation.name}?`)) return;
    const response = await fetch(`/api/designations/${designation.id}`, { method: "DELETE" }); const result = await response.json(); setMessage(response.ok ? "Designation deleted." : result.error ?? "Could not delete designation."); if (response.ok) await loadData();
  }

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Structure</p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900">Designations</h1>
          </div>
          <button onClick={() => { setEditingDesignation(null); setShowForm((value) => !value); }} className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-medium text-white">{showForm ? "Close" : "Add Designation"}</button>
        </div>
        {message && <p role="status" className="mb-4 bg-cyan-50 px-4 py-3 text-sm text-cyan-900">{message}</p>}
        {showForm && <form key={editingDesignation?.id ?? "new"} onSubmit={saveDesignation} className="mb-6 flex flex-wrap gap-3 border border-slate-200 bg-white p-4"><input name="name" required minLength={2} defaultValue={editingDesignation?.name ?? ""} placeholder="Designation name" className="border border-slate-300 px-3 py-2" /><input name="description" defaultValue={editingDesignation?.description ?? ""} placeholder="Description" className="min-w-56 flex-1 border border-slate-300 px-3 py-2" /><button className="rounded-lg bg-cyan-700 px-4 py-2 text-sm font-medium text-white">{editingDesignation ? "Update" : "Save"}</button></form>}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {designations.map((designation) => (
            <div key={designation.id} className="border-b border-slate-200 bg-white p-4">
              <p className="text-sm font-medium text-slate-900">{designation.name}</p>
              <p className="mt-2 text-xs text-slate-500">{designation._count.employees} employees</p>
              {designation.description && <p className="mt-1 text-sm text-slate-600">{designation.description}</p>}
              <div className="mt-3 flex gap-3"><button onClick={() => { setEditingDesignation(designation); setShowForm(true); }} className="text-sm text-cyan-800 underline">Edit</button><button onClick={() => void deleteDesignation(designation)} className="text-sm text-red-700 underline">Delete</button></div>
            </div>
          ))}
          {!loading && designations.length === 0 && <p className="text-slate-500">No designations created yet.</p>}
          {loading && <p className="text-slate-500">Loading designations...</p>}
        </div>
      </div>
    </main>
  );
}
