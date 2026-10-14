"use client";

import { useCallback, useEffect, useState } from "react";

type NotificationRow = { id: string; title: string; message: string; type: string; read: boolean; createdAt: string };

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const loadData = useCallback(async () => {
    const response = await fetch("/api/notifications", { cache: "no-store" });
    if (response.ok) setNotifications((await response.json()).data);
    setLoading(false);
  }, []);
  useEffect(() => { void loadData(); }, [loadData]);
  async function markRead(id: string) {
    await fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    await loadData();
  }

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <div className="mx-auto max-w-5xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-8">
          <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Communication</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">Notifications</h1>
        </div>

        <div className="space-y-4">
          {notifications.map((item) => (
            <div key={item.id} className={`border-b border-slate-200 p-4 ${item.read ? "bg-white" : "bg-cyan-50/50"}`}>
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium text-slate-900">{item.title}</p>
                <time className="text-xs text-slate-500">{new Date(item.createdAt).toLocaleString()}</time>
              </div>
              <p className="mt-2 text-sm text-slate-600">{item.message}</p>
              {!item.read && <button onClick={() => void markRead(item.id)} className="mt-2 text-xs font-medium text-cyan-800 underline">Mark read</button>}
            </div>
          ))}
          {!loading && notifications.length === 0 && <p className="py-8 text-center text-slate-500">No notifications.</p>}
          {loading && <p className="py-8 text-center text-slate-500">Loading notifications...</p>}
        </div>
      </div>
    </main>
  );
}
