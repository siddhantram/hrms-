"use client";

import { useEffect, useState } from "react";

type Activity = { id: string; action: string; entity: string; entityId: string | null; oldData: string | null; newData: string | null; createdAt: string; user: { firstName: string; lastName: string; email: string } | null };

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  useEffect(() => {
    fetch(`/api/audit-logs?page=${page}`, { cache: "no-store" }).then(async (response) => {
      if (response.ok) { const result = await response.json(); setLogs(result.data); setTotalPages(result.pagination.totalPages); }
    }).finally(() => setLoading(false));
  }, [page]);

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <div className="mx-auto max-w-5xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-8">
          <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Security</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">Audit logs</h1>
        </div>

        <div className="space-y-4">
          {logs.map((log) => (
            <div key={log.id} className="border-b border-slate-200 py-4 text-sm text-slate-600">
              <div className="flex items-center justify-between gap-3">
                <p><span className="font-medium text-slate-900">{log.user ? `${log.user.firstName} ${log.user.lastName}` : "System"}</span> {log.action.replaceAll("_", " ").toLowerCase()}</p>
                <time>{new Date(log.createdAt).toLocaleString()}</time>
              </div>
              <p className="mt-2">{log.entity}{log.entityId ? ` · ${log.entityId}` : ""}</p>
              {log.newData && <details className="mt-2"><summary className="cursor-pointer text-xs">Details</summary><pre className="mt-2 overflow-x-auto whitespace-pre-wrap text-xs">{log.newData}</pre></details>}
            </div>
          ))}
          {!loading && logs.length === 0 && <p className="py-8 text-center text-slate-500">No activity has been logged yet.</p>}
          {loading && <p className="py-8 text-center text-slate-500">Loading audit history...</p>}
        </div>
        <div className="mt-4 flex justify-end gap-3 text-sm"><button disabled={page <= 1} onClick={() => setPage((value) => value - 1)} className="text-slate-700 underline disabled:text-slate-400">Previous</button><span className="text-slate-500">{page} / {Math.max(1, totalPages)}</span><button disabled={page >= totalPages} onClick={() => setPage((value) => value + 1)} className="text-slate-700 underline disabled:text-slate-400">Next</button></div>
      </div>
    </main>
  );
}
