"use client";

import { useCallback, useEffect, useState } from "react";

type Company = { id: string; name: string; email: string | null; phone: string | null; address: string | null; website: string | null; timezone: string; currency: string; _count?: { employees: number } };

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [canCreate, setCanCreate] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const loadData = useCallback(async () => {
    const [companyResponse, sessionResponse] = await Promise.all([fetch("/api/companies", { cache: "no-store" }), fetch("/api/auth/session", { cache: "no-store" })]);
    if (companyResponse.ok) setCompanies((await companyResponse.json()).data);
    if (sessionResponse.ok) setCanCreate((await sessionResponse.json()).user?.role === "SUPER_ADMIN");
    setLoading(false);
  }, []);
  useEffect(() => { void loadData(); }, [loadData]);
  async function saveCompany(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); const response = await fetch(editingCompany ? `/api/companies/${editingCompany.id}` : "/api/companies", { method: editingCompany ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(new FormData(event.currentTarget).entries())) });
    const result = await response.json(); setMessage(response.ok ? `Company ${editingCompany ? "updated" : "created"}.` : result.error ?? "Could not save company.");
    if (response.ok) { setShowForm(false); setEditingCompany(null); await loadData(); }
  }
  async function deleteCompany(company: Company) {
    if (!window.confirm(`Delete ${company.name}?`)) return;
    const response = await fetch(`/api/companies/${company.id}`, { method: "DELETE" }); const result = await response.json();
    setMessage(response.ok ? "Company deleted." : result.error ?? "Could not delete company."); if (response.ok) await loadData();
  }

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Company setup</p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900">Companies</h1>
          </div>
          {canCreate && <button onClick={() => { setEditingCompany(null); setShowForm((value) => !value); }} className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-medium text-white">{showForm ? "Close" : "Add company"}</button>}
        </div>
        {message && <p role="status" className="mb-4 bg-cyan-50 px-4 py-3 text-sm text-cyan-900">{message}</p>}
        {showForm && <form key={editingCompany?.id ?? "new"} onSubmit={saveCompany} className="mb-6 grid gap-4 border border-slate-200 bg-white p-5 sm:grid-cols-2"><label className="text-sm">Company name<input required name="name" minLength={2} defaultValue={editingCompany?.name ?? ""} className="mt-1 block w-full border border-slate-300 px-3 py-2" /></label><label className="text-sm">Email<input type="email" name="email" defaultValue={editingCompany?.email ?? ""} className="mt-1 block w-full border border-slate-300 px-3 py-2" /></label><label className="text-sm">Phone<input name="phone" defaultValue={editingCompany?.phone ?? ""} className="mt-1 block w-full border border-slate-300 px-3 py-2" /></label><label className="text-sm">Website<input type="url" name="website" defaultValue={editingCompany?.website ?? ""} className="mt-1 block w-full border border-slate-300 px-3 py-2" /></label><label className="text-sm sm:col-span-2">Address<input name="address" defaultValue={editingCompany?.address ?? ""} className="mt-1 block w-full border border-slate-300 px-3 py-2" /></label><label className="text-sm">Timezone<input name="timezone" defaultValue={editingCompany?.timezone ?? "UTC"} className="mt-1 block w-full border border-slate-300 px-3 py-2" /></label><label className="text-sm">Currency<input name="currency" defaultValue={editingCompany?.currency ?? "INR"} maxLength={3} className="mt-1 block w-full border border-slate-300 px-3 py-2" /></label><button className="w-fit rounded-lg bg-cyan-700 px-4 py-2 text-sm font-medium text-white">{editingCompany ? "Update company" : "Create company"}</button></form>}

        <div className="grid gap-6 md:grid-cols-3">
          {[
            { label: "Companies", value: String(companies.length) },
            { label: "Employees", value: String(companies.reduce((sum, company) => sum + (company._count?.employees ?? 0), 0)) },
            { label: "Currency types", value: String(new Set(companies.map((company) => company.currency)).size) },
          ].map((item) => (
            <div key={item.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">{item.label}</p>
              <p className="mt-3 text-3xl font-semibold text-slate-900">{item.value}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          {companies.map((company) => (
            <div key={company.name} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-lg font-semibold text-slate-900">{company.name}</p>
                  <p className="text-sm text-slate-500">{company.address ?? "Company workspace"}</p>
                </div>
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                  Active
                </span>
              </div>

              {canCreate && <div className="mb-4 flex gap-3 text-sm"><button onClick={() => { setEditingCompany(company); setShowForm(true); }} className="text-cyan-800 underline">Edit</button><button onClick={() => void deleteCompany(company)} className="text-red-700 underline">Delete</button></div>}

              <dl className="space-y-2 text-sm text-slate-600">
                <div className="flex justify-between gap-3"><dt>Email</dt><dd>{company.email}</dd></div>
                <div className="flex justify-between gap-3"><dt>Phone</dt><dd>{company.phone}</dd></div>
                <div className="flex justify-between gap-3"><dt>Timezone</dt><dd>{company.timezone}</dd></div>
                <div className="flex justify-between gap-3"><dt>Currency</dt><dd>{company.currency}</dd></div>
                <div className="flex justify-between gap-3"><dt>Employees</dt><dd>{company._count?.employees ?? 0}</dd></div>
              </dl>
            </div>
          ))}
          {!loading && companies.length === 0 && <p className="text-slate-500">No companies found for this account.</p>}
        </div>
      </div>
    </main>
  );
}
