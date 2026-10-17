"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type Employee = { id: string; employeeId: string; firstName: string; lastName: string };
type Goal = {
  id: string;
  title: string;
  description: string | null;
  target: string | null;
  deadline: string | null;
  progress: number;
  status: string;
  employee: Employee;
};

export default function PerformanceGoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Goal | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");

  const loadData = useCallback(async () => {
    const [goalResponse, employeeResponse, sessionResponse] = await Promise.all([
      fetch("/api/performance/goals", { cache: "no-store" }),
      fetch("/api/employees?limit=100", { cache: "no-store" }),
      fetch("/api/auth/session", { cache: "no-store" }),
    ]);
    if (goalResponse.ok) setGoals((await goalResponse.json()).data);
    if (employeeResponse.ok) setEmployees((await employeeResponse.json()).data);
    if (sessionResponse.ok) setCanManage(["HR", "MANAGER", "SUPER_ADMIN"].includes((await sessionResponse.json()).user?.role));
    setLoading(false);
  }, []);

  useEffect(() => {
    let active = true;
    async function loadInitialData() {
      try {
        const [goalResponse, employeeResponse, sessionResponse] = await Promise.all([
          fetch("/api/performance/goals", { cache: "no-store" }),
          fetch("/api/employees?limit=100", { cache: "no-store" }),
          fetch("/api/auth/session", { cache: "no-store" }),
        ]);
        if (!active) return;
        if (goalResponse.ok) setGoals((await goalResponse.json()).data);
        if (employeeResponse.ok) setEmployees((await employeeResponse.json()).data);
        if (sessionResponse.ok) setCanManage(["HR", "MANAGER", "SUPER_ADMIN"].includes((await sessionResponse.json()).user?.role));
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadInitialData();
    return () => { active = false; };
  }, []);

  async function saveGoal(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setWorking(true);
    setMessage("");
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    const response = await fetch(editing ? `/api/performance/goals/${editing.id}` : "/api/performance/goals", {
      method: editing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...values,
        progress: Number(values.progress ?? 0),
      }),
    });
    const result = await response.json();
    setWorking(false);
    setMessage(response.ok ? `Goal ${editing ? "updated" : "assigned"}.` : result.error ?? "Could not save goal.");
    if (response.ok) {
      setShowForm(false);
      setEditing(null);
      await loadData();
    }
  }

  async function updateProgress(goal: Goal, form: HTMLFormElement) {
    setWorking(true);
    setMessage("");
    const progress = Number(new FormData(form).get("progress"));
    const response = await fetch(`/api/performance/goals/${goal.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ progress }),
    });
    const result = await response.json();
    setWorking(false);
    setMessage(response.ok ? "Goal progress updated." : result.error ?? "Could not update progress.");
    if (response.ok) await loadData();
  }

  return (
    <main className="min-h-screen bg-slate-50 p-6 sm:p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <Link href="/performance" className="text-sm text-slate-600 hover:text-slate-950">Performance reviews</Link>
            <h1 className="mt-2 text-3xl font-bold text-slate-900">Performance goals</h1>
          </div>
          {canManage && <button onClick={() => { setEditing(null); setShowForm((visible) => !visible); }} className="bg-slate-950 px-4 py-2 text-sm font-medium text-white">{showForm ? "Close" : "Assign goal"}</button>}
        </div>

        {message && <p role="status" className="mb-4 bg-cyan-50 px-4 py-3 text-sm text-cyan-900">{message}</p>}
        {showForm && canManage && (
          <form key={editing?.id ?? "new"} onSubmit={saveGoal} className="mb-6 grid gap-4 border border-slate-200 bg-white p-5 sm:grid-cols-2">
            {!editing && <label className="text-sm text-slate-700">Employee<select name="employeeId" required className="mt-1 block w-full border border-slate-300 bg-white px-3 py-2">{employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.firstName} {employee.lastName} · {employee.employeeId}</option>)}</select></label>}
            <label className="text-sm text-slate-700">Goal<input name="title" required minLength={2} maxLength={160} defaultValue={editing?.title ?? ""} className="mt-1 block w-full border border-slate-300 px-3 py-2" /></label>
            <label className="text-sm text-slate-700">Target<input name="target" maxLength={300} defaultValue={editing?.target ?? ""} className="mt-1 block w-full border border-slate-300 px-3 py-2" /></label>
            <label className="text-sm text-slate-700 sm:col-span-2">Description<textarea name="description" maxLength={3000} defaultValue={editing?.description ?? ""} className="mt-1 block w-full border border-slate-300 px-3 py-2" rows={3} /></label>
            <label className="text-sm text-slate-700">Deadline<input name="deadline" type="date" defaultValue={editing?.deadline?.slice(0, 10) ?? ""} className="mt-1 block w-full border border-slate-300 px-3 py-2" /></label>
            {editing && <label className="text-sm text-slate-700">Status<select name="status" defaultValue={editing.status} className="mt-1 block w-full border border-slate-300 bg-white px-3 py-2"><option value="ACTIVE">Active</option><option value="COMPLETED">Completed</option><option value="CANCELLED">Cancelled</option></select></label>}
            {editing && <label className="text-sm text-slate-700">Progress (%)<input name="progress" type="number" min={0} max={100} defaultValue={editing.progress} className="mt-1 block w-full border border-slate-300 px-3 py-2" /></label>}
            <div className="flex items-end gap-3"><button disabled={working || (!editing && employees.length === 0)} className="bg-cyan-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-60">{working ? "Saving..." : editing ? "Save changes" : "Assign goal"}</button>{editing && <button type="button" onClick={() => { setEditing(null); setShowForm(false); }} className="text-sm text-slate-600">Cancel</button>}</div>
          </form>
        )}

        <div className="space-y-3">
          {goals.map((goal) => (
            <article key={goal.id} className="border-y border-slate-200 bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="font-semibold text-slate-900">{goal.title}</h2>
                  <p className="mt-1 text-sm text-slate-500">{goal.employee.firstName} {goal.employee.lastName} · {goal.employee.employeeId}</p>
                  {goal.description && <p className="mt-3 max-w-3xl text-sm text-slate-600">{goal.description}</p>}
                  {goal.target && <p className="mt-2 text-sm text-slate-600">Target: {goal.target}</p>}
                </div>
                <div className="text-right text-sm text-slate-500"><p>{goal.status.replaceAll("_", " ")}</p>{goal.deadline && <p className="mt-1">Due {new Date(goal.deadline).toLocaleDateString()}</p>}</div>
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-4">
                <div className="min-w-48 flex-1">
                  <div className="mb-1 flex justify-between text-xs text-slate-500"><span>Progress</span><span>{goal.progress}%</span></div>
                  <div className="h-2 bg-slate-100"><div className="h-full bg-cyan-700" style={{ width: `${goal.progress}%` }} /></div>
                </div>
                <div className="flex items-center gap-4">
                  <form onSubmit={(event) => { event.preventDefault(); void updateProgress(goal, event.currentTarget); }} className="flex items-center gap-2">
                    <label className="sr-only" htmlFor={`progress-${goal.id}`}>Progress percentage</label>
                    <input id={`progress-${goal.id}`} name="progress" type="number" min={0} max={100} defaultValue={goal.progress} className="w-20 border border-slate-300 px-2 py-1 text-sm" />
                    <button disabled={working || goal.status === "CANCELLED"} className="text-sm font-medium text-cyan-800 underline disabled:text-slate-400">Update progress</button>
                  </form>
                  {canManage && <button onClick={() => { setEditing(goal); setShowForm(true); }} className="text-sm text-slate-600 underline">Edit</button>}
                </div>
              </div>
            </article>
          ))}
          {!loading && goals.length === 0 && <p className="border-y border-slate-200 bg-white py-10 text-center text-sm text-slate-500">No performance goals have been assigned.</p>}
          {loading && <p className="py-10 text-center text-sm text-slate-500">Loading goals...</p>}
        </div>
      </div>
    </main>
  );
}
