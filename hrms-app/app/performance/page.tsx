"use client";

import { useCallback, useEffect, useState } from "react";

type Employee = { id: string; employeeId: string; firstName: string; lastName: string };
type Review = { id: string; cycle: string; rating: number | null; feedback: string | null; status: string; employee: Employee };

export default function PerformancePage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const loadData = useCallback(async () => {
    const [reviewResponse, employeeResponse, sessionResponse] = await Promise.all([
      fetch("/api/performance", { cache: "no-store" }),
      fetch("/api/employees?limit=100", { cache: "no-store" }),
      fetch("/api/auth/session", { cache: "no-store" }),
    ]);
    if (reviewResponse.ok) setReviews((await reviewResponse.json()).data);
    if (employeeResponse.ok) setEmployees((await employeeResponse.json()).data);
    if (sessionResponse.ok) setCanManage(["HR", "MANAGER", "SUPER_ADMIN"].includes((await sessionResponse.json()).user?.role));
    setLoading(false);
  }, []);
  useEffect(() => { void loadData(); }, [loadData]);

  async function createReview(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setWorking(true); setMessage("");
    const response = await fetch("/api/performance", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(new FormData(event.currentTarget).entries())) });
    const result = await response.json(); setWorking(false); setMessage(response.ok ? "Review created." : result.error ?? "Could not create review.");
    if (response.ok) { setShowForm(false); await loadData(); }
  }

  async function completeReview(review: Review, form: HTMLFormElement) {
    setWorking(true); setMessage("");
    const values = Object.fromEntries(new FormData(form).entries());
    const response = await fetch(`/api/performance/${review.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rating: Number(values.rating), feedback: values.feedback, status: "COMPLETE" }) });
    const result = await response.json(); setWorking(false); setMessage(response.ok ? "Review saved." : result.error ?? "Could not save review.");
    if (response.ok) await loadData();
  }

  return (
    <main className="min-h-screen bg-slate-50 p-6 sm:p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-slate-500">People review</p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900">Performance</h1>
          </div>
          {canManage && <button onClick={() => setShowForm((value) => !value)} className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-medium text-white">{showForm ? "Close" : "Start review"}</button>}
        </div>
        {message && <p role="status" className="mb-4 bg-cyan-50 px-4 py-3 text-sm text-cyan-900">{message}</p>}
        {showForm && <form onSubmit={createReview} className="mb-6 grid gap-4 border border-slate-200 bg-white p-5 sm:grid-cols-3"><label className="text-sm text-slate-700">Employee<select name="employeeId" required className="mt-1 block w-full border border-slate-300 px-3 py-2">{employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.firstName} {employee.lastName} · {employee.employeeId}</option>)}</select></label><label className="text-sm text-slate-700">Review cycle<input name="cycle" required minLength={2} defaultValue="Q4 2026" className="mt-1 block w-full border border-slate-300 px-3 py-2" /></label><button disabled={working || employees.length === 0} className="self-end rounded-lg bg-cyan-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">Create review</button></form>}

        <div className="overflow-x-auto border-y border-slate-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-100 text-slate-600">
              <tr>
                <th className="px-4 py-3 font-medium">Employee</th>
                <th className="px-4 py-3 font-medium">Cycle</th>
                <th className="px-4 py-3 font-medium">Rating</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {reviews.map((review) => (
                <tr key={review.id} className="border-t border-slate-200">
                  <td className="px-4 py-3 font-medium text-slate-900">{review.employee.firstName} {review.employee.lastName}</td>
                  <td className="px-4 py-3 text-slate-600">{review.cycle}</td>
                  <td className="px-4 py-3 text-slate-600">{review.rating ? `${review.rating}/5` : "-"}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-cyan-50 px-2.5 py-1 text-xs font-medium text-cyan-700">
                      {review.status.replaceAll("_", " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3">{canManage && review.status !== "COMPLETE" ? <form onSubmit={(event) => { event.preventDefault(); void completeReview(review, event.currentTarget); }} className="flex flex-wrap gap-2"><select name="rating" defaultValue={review.rating ?? 3} aria-label="Performance rating" className="border border-slate-300 px-2 py-1"><option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4">4</option><option value="5">5</option></select><input name="feedback" defaultValue={review.feedback ?? ""} placeholder="Feedback" className="w-36 border border-slate-300 px-2 py-1" /><button disabled={working} className="text-xs font-medium text-cyan-800 underline">Save</button></form> : "-"}</td>
                </tr>
              ))}
              {!loading && reviews.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">No performance reviews yet.</td></tr>}
              {loading && <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">Loading reviews...</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
