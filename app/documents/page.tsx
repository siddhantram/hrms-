"use client";

import { useCallback, useEffect, useState } from "react";

type DocumentRow = { id: string; name: string; url: string; type: string; employee: { employeeId: string; firstName: string; lastName: string } };
type Employee = { id: string; employeeId: string; firstName: string; lastName: string };

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [canUpload, setCanUpload] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const loadData = useCallback(async () => {
    const [docs, people, session] = await Promise.all([fetch("/api/documents", { cache: "no-store" }), fetch("/api/employees?limit=100", { cache: "no-store" }), fetch("/api/auth/session", { cache: "no-store" })]);
    if (docs.ok) setDocuments((await docs.json()).data);
    if (people.ok) setEmployees((await people.json()).data);
    if (session.ok) setCanUpload(["HR", "EMPLOYEE", "SUPER_ADMIN"].includes((await session.json()).user?.role));
    setLoading(false);
  }, []);
  useEffect(() => {
    let active = true;
    async function loadInitialData() {
      try {
        const [docs, people, session] = await Promise.all([fetch("/api/documents", { cache: "no-store" }), fetch("/api/employees?limit=100", { cache: "no-store" }), fetch("/api/auth/session", { cache: "no-store" })]);
        if (!active) return;
        if (docs.ok) setDocuments((await docs.json()).data);
        if (people.ok) setEmployees((await people.json()).data);
        if (session.ok) setCanUpload(["HR", "EMPLOYEE", "SUPER_ADMIN"].includes((await session.json()).user?.role));
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadInitialData();
    return () => { active = false; };
  }, []);
  async function uploadDocument(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setWorking(true);
    const response = await fetch("/api/documents", { method: "POST", body: new FormData(event.currentTarget) });
    const result = await response.json();
    setWorking(false);
    setMessage(response.ok ? "Document uploaded." : result.error ?? "Could not upload document.");
    if (response.ok) { setShowForm(false); await loadData(); }
  }

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <div className="mx-auto max-w-6xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Files</p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900">Documents</h1>
          </div>
          {canUpload && <button onClick={() => setShowForm((value) => !value)} className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-medium text-white">{showForm ? "Close" : "Upload document"}</button>}
        </div>
        {message && <p role="status" className="mb-4 bg-cyan-50 px-4 py-3 text-sm text-cyan-900">{message}</p>}
        {showForm && <form onSubmit={uploadDocument} className="mb-6 grid gap-4 border border-slate-200 bg-slate-50 p-5 sm:grid-cols-2"><label className="text-sm text-slate-700">Employee<select required name="employeeId" className="mt-1 block w-full border border-slate-300 bg-white px-3 py-2">{employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.firstName} {employee.lastName} · {employee.employeeId}</option>)}</select></label><label className="text-sm text-slate-700">Type<input name="type" required placeholder="Resume, ID Proof..." className="mt-1 block w-full border border-slate-300 bg-white px-3 py-2" /></label><label className="text-sm text-slate-700">Display name<input name="name" required maxLength={160} className="mt-1 block w-full border border-slate-300 bg-white px-3 py-2" /></label><label className="text-sm text-slate-700">File<input name="file" type="file" required accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/png,image/jpeg" className="mt-1 block w-full border border-slate-300 bg-white px-3 py-2" /></label><p className="text-xs text-slate-500 sm:col-span-2">PDF, Word, PNG, or JPEG. Maximum size 15 MB.</p><button disabled={working} className="w-fit rounded-lg bg-cyan-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-60">{working ? "Uploading..." : "Upload file"}</button></form>}

        <div className="grid gap-4">
          {documents.map((document) => (
            <div key={document.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div>
                <p className="font-medium text-slate-900">{document.name}</p>
                <p className="text-sm text-slate-500">{document.employee.firstName} {document.employee.lastName} · {document.type}</p>
              </div>
              <a href={document.url} target="_blank" rel="noreferrer" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700">Open</a>
            </div>
          ))}
          {!loading && documents.length === 0 && <p className="py-8 text-center text-slate-500">No documents registered.</p>}
          {loading && <p className="py-8 text-center text-slate-500">Loading documents...</p>}
        </div>
      </div>
    </main>
  );
}
