"use client";

import { useEffect, useState } from "react";

type ReportData = {
  summary: {
    attendanceRate: number;
    overtimeHours: number;
    leaveUtilization: number;
    payrollTotal: number;
    pendingApprovals: number;
  };
  chart: Array<{ month: string; present: number; late: number; overtime: number }>;
};

const emptyReport: ReportData = {
  summary: { attendanceRate: 0, overtimeHours: 0, leaveUtilization: 0, payrollTotal: 0, pendingApprovals: 0 },
  chart: [],
};

export default function ReportsPage() {
  const [report, setReport] = useState(emptyReport);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [reportType, setReportType] = useState("payroll");

  useEffect(() => {
    fetch("/api/reports", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Could not load reports");
        const result = await response.json();
        setReport(result.data);
      })
      .catch((error: unknown) => setMessage(error instanceof Error ? error.message : "Could not load reports"))
      .finally(() => setLoading(false));
  }, []);

  const handleExport = async () => {
    const response = await fetch(`/api/reports?format=csv&report=${reportType}`);
    if (!response.ok) {
      setMessage("Could not export the report.");
      return;
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `hrms-${reportType}-report.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const { summary, chart } = report;

  return (
    <main className="min-h-screen bg-slate-50 p-10">
      <div className="mx-auto max-w-6xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Reporting</p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900">Reports & Analytics</h1>
          </div>

          <div className="flex gap-2">
            <select value={reportType} onChange={(event) => setReportType(event.target.value)} aria-label="Export report type" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700">
              <option value="attendance">Attendance</option>
              <option value="leave">Leave</option>
              <option value="payroll">Payroll</option>
            </select>
            <button
              type="button"
              onClick={() => void handleExport()}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Export CSV
            </button>
          </div>
        </div>

        {message && <p role="status" className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">{message}</p>}
        {loading && <p className="mt-4 text-sm text-slate-500">Loading report data...</p>}

        <div className="mt-8 grid gap-5 md:grid-cols-4">
          {[
            ["Attendance Rate", `${summary.attendanceRate}%`],
            ["Overtime", `${summary.overtimeHours}h`],
            ["Leave Usage", `${summary.leaveUtilization}%`],
            ["Payroll Total", `₹${summary.payrollTotal.toLocaleString("en-IN")}`],
          ].map(([title, value]) => (
            <div key={title} className="rounded-xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-sm text-slate-500">{title}</p>
              <p className="mt-3 text-2xl font-semibold text-slate-900">{value}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.7fr_1fr]">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Monthly trend</h3>
              <span className="text-sm text-slate-500">This year</span>
            </div>

            <div className="flex h-52 items-end gap-4">
              {chart.map((item) => (
                <div key={item.month} className="flex flex-1 flex-col items-center gap-3">
                  <div className="flex h-40 w-full items-end justify-center gap-1 rounded-lg bg-white p-2 shadow-sm">
                    <div className="w-1/2 rounded-t-md bg-slate-900" style={{ height: `${Math.min(100, item.present)}%` }} title={`${item.present} present`} />
                    <div className="w-1/2 rounded-t-md bg-cyan-600" style={{ height: `${Math.min(100, item.late)}%` }} title={`${item.late} late`} />
                  </div>
                  <span className="text-xs font-medium text-slate-500">{item.month}</span>
                </div>
              ))}
              {!loading && chart.length === 0 && <p className="m-auto text-sm text-slate-500">No attendance data for this period.</p>}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
            <h3 className="text-lg font-semibold text-slate-900">Executive summary</h3>
            <div className="mt-4 space-y-4 text-sm text-slate-600">
              <div className="flex items-center justify-between rounded-lg bg-white p-3">
                <span>Pending approvals</span>
                <span className="font-semibold text-slate-900">{summary.pendingApprovals}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-white p-3">
                <span>Total overtime</span>
                <span className="font-semibold text-slate-900">{summary.overtimeHours.toFixed(2)}h</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-white p-3">
                <span>Payroll payouts</span>
                <span className="font-semibold text-slate-900">₹{summary.payrollTotal.toLocaleString("en-IN")}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
