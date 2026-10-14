"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { buildAttendanceSummary, type AttendanceRecord } from "@/lib/attendance";

type EmployeeOption = { id: string; employeeId: string; firstName: string; lastName: string };
type Correction = {
  id: string;
  reason: string;
  requestedCheckIn: string | null;
  requestedCheckOut: string | null;
  attendance: { employee: EmployeeOption; date: string };
};

export default function AttendancePage() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [corrections, setCorrections] = useState<Correction[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [correctionRecord, setCorrectionRecord] = useState<AttendanceRecord | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const summary = useMemo(() => buildAttendanceSummary(records), [records]);

  const loadData = useCallback(async () => {
    const response = await fetch("/api/attendance", { cache: "no-store" });
    if (response.ok) {
      const result = await response.json();
      setRecords(result.data);
      setEmployees(result.employees ?? []);
      setSelectedEmployeeId((current) => current || result.employees?.[0]?.id || "");
    }

    const correctionResponse = await fetch("/api/attendance/corrections", { cache: "no-store" });
    if (correctionResponse.ok) {
      const result = await correctionResponse.json();
      setCorrections(result.data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  async function punch(action: "CHECK_IN" | "CHECK_OUT") {
    setWorking(true);
    setMessage("");
    const response = await fetch("/api/attendance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, employeeId: selectedEmployeeId || undefined }),
    });
    const result = await response.json();
    setWorking(false);
    setMessage(response.ok ? "Attendance saved." : result.error ?? "Could not save attendance.");
    if (response.ok) await loadData();
  }

  async function submitCorrection(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!correctionRecord?.id) return;
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    setWorking(true);
    const response = await fetch("/api/attendance/corrections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ attendanceId: correctionRecord.id, ...values }),
    });
    const result = await response.json();
    setWorking(false);
    setMessage(response.ok ? "Correction submitted for review." : result.error ?? "Could not submit correction.");
    if (response.ok) {
      setCorrectionRecord(null);
      await loadData();
    }
  }

  async function reviewCorrection(id: string, decision: "APPROVED" | "REJECTED") {
    const response = await fetch(`/api/attendance/corrections/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision }),
    });
    const result = await response.json();
    setMessage(response.ok ? `Correction ${decision.toLowerCase()}.` : result.error ?? "Could not review correction.");
    if (response.ok) await loadData();
  }

  return (
    <main className="min-h-screen bg-slate-50 p-6 sm:p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Time tracking</p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900">Attendance</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {employees.length > 1 && (
              <select
                value={selectedEmployeeId}
                onChange={(event) => setSelectedEmployeeId(event.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                aria-label="Select employee"
              >
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>{employee.firstName} {employee.lastName}</option>
                ))}
              </select>
            )}
            <button type="button" disabled={working || !selectedEmployeeId} onClick={() => void punch("CHECK_IN")} className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
              Check in
            </button>
            <button type="button" disabled={working || !selectedEmployeeId} onClick={() => void punch("CHECK_OUT")} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 disabled:opacity-50">
              Check out
            </button>
          </div>
        </div>

        {message && <p role="status" className="mb-4 rounded-lg bg-cyan-50 px-4 py-3 text-sm text-cyan-900">{message}</p>}

        <div className="mb-6 grid gap-3 sm:grid-cols-4">
          {[
            { label: "Present", value: summary.present },
            { label: "Late", value: summary.late },
            { label: "Overtime", value: `${summary.totalOvertime}h` },
            { label: "Pending corrections", value: summary.pendingCorrections },
          ].map((item) => (
            <div key={item.label} className="border-l-2 border-cyan-500 bg-white px-4 py-3 shadow-sm">
              <p className="text-sm text-slate-500">{item.label}</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">{item.value}</p>
            </div>
          ))}
        </div>

        <div className="overflow-x-auto border-y border-slate-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-100 text-slate-600">
              <tr>
                <th className="px-4 py-3 font-medium">Employee</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Check-in</th>
                <th className="px-4 py-3 font-medium">Check-out</th>
                <th className="px-4 py-3 font-medium">Hours</th>
                <th className="px-4 py-3 font-medium">Overtime</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Correction</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => (
                <tr key={record.id} className="border-t border-slate-200">
                  <td className="px-4 py-3 font-medium text-slate-900">{record.employeeName ?? record.employeeId}</td>
                  <td className="px-4 py-3 text-slate-600">{record.date.slice(0, 10)}</td>
                  <td className="px-4 py-3 text-slate-600">{record.checkIn ? new Date(record.checkIn).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "-"}</td>
                  <td className="px-4 py-3 text-slate-600">{record.checkOut ? new Date(record.checkOut).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "-"}</td>
                  <td className="px-4 py-3 text-slate-600">{record.workingHours ?? 0}h</td>
                  <td className="px-4 py-3 text-slate-600">{record.overtimeHours ?? 0}h</td>
                  <td className="px-4 py-3"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">{record.status}</span></td>
                  <td className="px-4 py-3">
                    <button type="button" disabled={!record.id || Boolean(record.pendingCorrection)} onClick={() => setCorrectionRecord(record)} className="text-xs font-medium text-cyan-800 underline disabled:text-slate-400">
                      {record.pendingCorrection ? "Pending" : "Request"}
                    </button>
                  </td>
                </tr>
              ))}
              {!loading && records.length === 0 && <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-500">No attendance records yet.</td></tr>}
              {loading && <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-500">Loading attendance...</td></tr>}
            </tbody>
          </table>
        </div>

        {correctionRecord && (
          <form onSubmit={submitCorrection} className="mt-6 grid gap-4 border border-slate-200 bg-white p-5 sm:grid-cols-4">
            <div className="sm:col-span-4"><h2 className="font-semibold text-slate-900">Request attendance correction</h2><p className="mt-1 text-sm text-slate-500">{correctionRecord.employeeName} · {correctionRecord.date}</p></div>
            <label className="text-sm text-slate-700">Correct check-in<input name="requestedCheckIn" type="time" className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2" /></label>
            <label className="text-sm text-slate-700">Correct check-out<input name="requestedCheckOut" type="time" className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2" /></label>
            <label className="text-sm text-slate-700 sm:col-span-2">Reason<input name="reason" required minLength={5} maxLength={500} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2" /></label>
            <div className="flex gap-3 sm:col-span-4"><button disabled={working} className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-medium text-white">Submit correction</button><button type="button" onClick={() => setCorrectionRecord(null)} className="text-sm text-slate-600">Cancel</button></div>
          </form>
        )}

        {corrections.length > 0 && (
          <section className="mt-8 border-t border-slate-200 pt-5">
            <h2 className="mb-3 text-lg font-semibold text-slate-900">Correction approvals</h2>
            <div className="space-y-3">
              {corrections.map((correction) => (
                <div key={correction.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 py-3">
                  <div><p className="font-medium text-slate-900">{correction.attendance.employee.firstName} {correction.attendance.employee.lastName} · {correction.attendance.date.slice(0, 10)}</p><p className="text-sm text-slate-600">{correction.reason}</p></div>
                  <div className="flex gap-2"><button type="button" onClick={() => void reviewCorrection(correction.id, "APPROVED")} className="rounded-md bg-emerald-700 px-3 py-1.5 text-xs font-medium text-white">Approve</button><button type="button" onClick={() => void reviewCorrection(correction.id, "REJECTED")} className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700">Reject</button></div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
