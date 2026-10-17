"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function NewEmployeePage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const payload = Object.fromEntries(formData.entries());

    setIsSubmitting(true);

    const response = await fetch("/api/employees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setIsSubmitting(false);

    if (response.ok) {
      router.push("/employees");
      router.refresh();
      return;
    }

    const data = await response.json();
    alert(data.error ?? "Could not create employee.");
  }

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-8">
          <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Employee onboarding</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">Add employee</h1>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-5 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Employee ID</label>
            <input name="employeeId" required className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5" />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Status</label>
            <select name="status" defaultValue="ACTIVE" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
              <option value="ACTIVE">Active</option>
              <option value="ON_LEAVE">On Leave</option>
              <option value="PENDING">Pending</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">First name</label>
            <input name="firstName" required className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5" />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Last name</label>
            <input name="lastName" required className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5" />
          </div>
          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium text-slate-700">Email</label>
            <input type="email" name="email" required className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5" />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Department</label>
            <input name="department" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5" />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Designation</label>
            <input name="designation" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5" />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Phone</label>
            <input name="phone" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5" />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Salary</label>
            <input name="salary" type="number" min="0" step="0.01" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5" />
          </div>
          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium text-slate-700">Joining date</label>
            <input type="date" name="joiningDate" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5" />
          </div>

          <div className="md:col-span-2 mt-2 flex gap-3">
            <button type="submit" disabled={isSubmitting} className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-medium text-white disabled:opacity-60">
              {isSubmitting ? "Saving..." : "Save employee"}
            </button>
            <button type="button" onClick={() => router.back()} className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-medium text-slate-700">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
