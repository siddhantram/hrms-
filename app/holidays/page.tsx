"use client";

import { useCallback, useEffect, useState } from "react";

type Holiday = { id: string; name: string; date: string; description: string | null; isOptional: boolean };

export default function HolidaysPage() {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [editing, setEditing] = useState<Holiday | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");

  const loadData = useCallback(async () => {
    const response = await fetch("/api/holidays", { cache: "no-store" });
    if (response.ok) setHolidays((await response.json()).data);
    setLoading(false);
  }, []);

  useEffect(() => {
    let active = true;
    fetch("/api/holidays", { cache: "no-store" })
      .then(async (response) => { if (active && response.ok) setHolidays((await response.json()).data); })
      .catch(() => undefined)
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    fetch("/api/auth/session", { cache: "no-store" }).then(async (response) => {
      if (response.ok) setCanManage(["HR", "SUPER_ADMIN"].includes((await response.json()).user?.role));
    }).catch(() => setCanManage(false));
  }, []);

  async function saveHoliday(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setWorking(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const response = await fetch(editing ? `/api/holidays/${editing.id}` : "/api/holidays", {
      method: editing ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        date: form.get("date"),
        description: form.get("description"),
        isOptional: form.has("isOptional"),
      }),
    });
    const result = await response.json();
    setWorking(false);
    setMessage(response.ok ? `Holiday ${editing ? "updated" : "added"}.` : result.error ?? "Could not save holiday.");
    if (response.ok) {
      setShowForm(false);
      setEditing(null);
      await loadData();
    }
  }

  async function deleteHoliday(holiday: Holiday) {
    if (!window.confirm(`Delete ${holiday.name}?`)) return;
    const response = await fetch(`/api/holidays/${holiday.id}`, { method: "DELETE" });
    const result = await response.json();
    setMessage(response.ok ? "Holiday deleted." : result.error ?? "Could not delete holiday.");
    if (response.ok) await loadData();
  }

  return (
    <main className="min-h-screen bg-slate-50 p-6 sm:p-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Company calendar</p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900">Holidays</h1>
          </div>
          {canManage && <button onClick={() => { setEditing(null); setShowForm((visible) => !visible); }} className="bg-slate-950 px-4 py-2 text-sm font-medium text-white">{showForm ? "Close" : "Add holiday"}</button>}
        </div>

        {message && <p role="status" className="mb-4 bg-cyan-50 px-4 py-3 text-sm text-cyan-900">{message}</p>}
        {showForm && canManage && (
          <form key={editing?.id ?? "new"} onSubmit={saveHoliday} className="mb-6 grid gap-4 border border-slate-200 bg-white p-5 sm:grid-cols-2">
            <label className="text-sm text-slate-700">Name<input name="name" required minLength={2} maxLength={120} defaultValue={editing?.name ?? ""} className="mt-1 block w-full border border-slate-300 px-3 py-2" /></label>
            <label className="text-sm text-slate-700">Date<input name="date" type="date" required defaultValue={editing?.date.slice(0, 10) ?? ""} className="mt-1 block w-full border border-slate-300 px-3 py-2" /></label>
            <label className="text-sm text-slate-700 sm:col-span-2">Description<input name="description" maxLength={500} defaultValue={editing?.description ?? ""} className="mt-1 block w-full border border-slate-300 px-3 py-2" /></label>
            <label className="flex items-center gap-2 text-sm text-slate-700"><input name="isOptional" type="checkbox" defaultChecked={editing?.isOptional ?? false} />Optional holiday</label>
            <div className="flex items-center gap-3"><button disabled={working} className="bg-cyan-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-60">{working ? "Saving..." : editing ? "Save changes" : "Add holiday"}</button>{editing && <button type="button" onClick={() => { setEditing(null); setShowForm(false); }} className="text-sm text-slate-600">Cancel</button>}</div>
          </form>
        )}

        <div className="overflow-x-auto border-y border-slate-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-100 text-slate-600"><tr><th className="px-4 py-3 font-medium">Date</th><th className="px-4 py-3 font-medium">Holiday</th><th className="px-4 py-3 font-medium">Type</th><th className="px-4 py-3 font-medium">Description</th>{canManage && <th className="px-4 py-3 font-medium">Actions</th>}</tr></thead>
            <tbody>
              {holidays.map((holiday) => (
                <tr key={holiday.id} className="border-t border-slate-200">
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">{new Date(holiday.date).toLocaleDateString()}</td>
                  <td className="px-4 py-3 font-medium text-slate-900">{holiday.name}</td>
                  <td className="px-4 py-3 text-slate-600">{holiday.isOptional ? "Optional" : "Company"}</td>
                  <td className="px-4 py-3 text-slate-600">{holiday.description ?? "-"}</td>
                  {canManage && <td className="px-4 py-3"><div className="flex gap-3"><button onClick={() => { setEditing(holiday); setShowForm(true); }} className="text-cyan-800 underline">Edit</button><button onClick={() => void deleteHoliday(holiday)} className="text-red-700 underline">Delete</button></div></td>}
                </tr>
              ))}
              {!loading && holidays.length === 0 && <tr><td colSpan={canManage ? 5 : 4} className="px-4 py-8 text-center text-slate-500">No holidays have been added.</td></tr>}
              {loading && <tr><td colSpan={canManage ? 5 : 4} className="px-4 py-8 text-center text-slate-500">Loading holidays...</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
