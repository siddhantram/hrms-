"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type LeaveRow = {
  id: string;
  employeeId: string;
  type: string;
  days: number;
  status: string;
  startDate: string;
  endDate: string;
  reason: string | null;
  employee: { employeeId: string; firstName: string; lastName: string };
};

type LeaveBalanceRow = {
  employeeId: string;
  leaveType: string;
  allocatedDays: number;
  usedDays: number;
  remainingDays: number;
};

type EmployeeOption = { id: string; employeeId: string; firstName: string; lastName: string };

export default function LeavesPage() {
  const [requests, setRequests] = useState<LeaveRow[]>([]);
  const [balances, setBalances] = useState<LeaveBalanceRow[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [canReview, setCanReview] = useState(false);
  const [canManageBalance, setCanManageBalance] = useState(false);
  const [canCreateLeave, setCanCreateLeave] = useState(false);
  const [isEmployee, setIsEmployee] = useState(false);
  const [showApplication, setShowApplication] = useState(false);
  const [showBalanceForm, setShowBalanceForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");

  const loadData = useCallback(async () => {
    const [leaveResponse, attendanceResponse, sessionResponse] = await Promise.all([
      fetch("/api/leaves", { cache: "no-store" }),
      fetch("/api/attendance", { cache: "no-store" }),
      fetch("/api/auth/session", { cache: "no-store" }),
    ]);
    if (leaveResponse.ok) {
      const result = await leaveResponse.json();
      setRequests(result.data);
      setBalances(result.balances);
    }
    if (attendanceResponse.ok) {
      const result = await attendanceResponse.json();
      setEmployees(result.employees ?? []);
    }
    if (sessionResponse.ok) {
      const result = await sessionResponse.json();
      const role = result.user?.role;
      setIsEmployee(role === "EMPLOYEE");
      setCanReview(role !== "EMPLOYEE");
      setCanManageBalance(role === "HR" || role === "SUPER_ADMIN");
      setCanCreateLeave(role === "EMPLOYEE" || role === "HR" || role === "SUPER_ADMIN");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    let active = true;
    async function loadInitialData() {
      try {
        const [leaveResponse, attendanceResponse, sessionResponse] = await Promise.all([
          fetch("/api/leaves", { cache: "no-store" }),
          fetch("/api/attendance", { cache: "no-store" }),
          fetch("/api/auth/session", { cache: "no-store" }),
        ]);
        if (!active) return;
        if (leaveResponse.ok) {
          const result = await leaveResponse.json();
          setRequests(result.data);
          setBalances(result.balances);
        }
        if (attendanceResponse.ok) setEmployees((await attendanceResponse.json()).employees ?? []);
        if (sessionResponse.ok) {
          const role = (await sessionResponse.json()).user?.role;
          setIsEmployee(role === "EMPLOYEE");
          setCanReview(role !== "EMPLOYEE");
          setCanManageBalance(role === "HR" || role === "SUPER_ADMIN");
          setCanCreateLeave(role === "EMPLOYEE" || role === "HR" || role === "SUPER_ADMIN");
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadInitialData();
    return () => { active = false; };
  }, []);

  const summary = useMemo(() => {
    const approved = balances.reduce((sum, balance) => sum + balance.usedDays, 0);
    const pending = requests.filter((request) => request.status === "PENDING").length;
    const remaining = balances.reduce((sum, balance) => sum + balance.remainingDays, 0);

    return { approved, pending, remaining };
  }, [balances, requests]);

  async function handleDecision(id: string, decision: "APPROVED" | "REJECTED") {
    setWorking(true);
    setMessage("");
    const response = await fetch(`/api/leaves/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision }),
    });
    const result = await response.json();
    setWorking(false);
    setMessage(response.ok ? `Leave ${decision.toLowerCase()}.` : result.error ?? "Could not review leave.");
    if (response.ok) await loadData();
  }

  async function submitApplication(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setWorking(true);
    setMessage("");
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    const response = await fetch("/api/leaves", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const result = await response.json();
    setWorking(false);
    setMessage(response.ok ? "Leave request submitted." : result.error ?? "Could not submit leave request.");
    if (response.ok) {
      setShowApplication(false);
      await loadData();
    }
  }

  async function submitBalance(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setWorking(true);
    setMessage("");
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    const response = await fetch("/api/leaves/balances", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...values, allocatedDays: Number(values.allocatedDays) }),
    });
    const result = await response.json();
    setWorking(false);
    setMessage(response.ok ? "Leave balance saved." : result.error ?? "Could not save leave balance.");
    if (response.ok) {
      setShowBalanceForm(false);
      await loadData();
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <div className="mx-auto max-w-6xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Employee lifecycle</p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900">Leave workflow</h1>
          </div>
          <div className="flex gap-2">
            {canManageBalance && <button type="button" onClick={() => setShowBalanceForm((value) => !value)} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700">Set balance</button>}
            {canCreateLeave && <button type="button" onClick={() => setShowApplication((value) => !value)} className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-medium text-white">
              {showApplication ? "Close form" : "Apply leave"}
            </button>}
          </div>
        </div>

        {message && <p role="status" className="mb-4 rounded-lg bg-cyan-50 px-4 py-3 text-sm text-cyan-900">{message}</p>}

        {showApplication && (
          <form onSubmit={submitApplication} className="mb-8 grid gap-4 border border-slate-200 bg-slate-50 p-5 md:grid-cols-2">
            {!isEmployee && <label className="text-sm text-slate-700">Employee<select required name="employeeId" className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2">{employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.firstName} {employee.lastName} ({employee.employeeId})</option>)}</select></label>}
            <label className="text-sm text-slate-700">Leave type<select name="type" className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2"><option>Casual Leave</option><option>Sick Leave</option><option>Earned Leave</option><option>Paid Leave</option><option>Unpaid Leave</option></select></label>
            <label className="text-sm text-slate-700">Start date<input required type="date" name="startDate" className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2" /></label>
            <label className="text-sm text-slate-700">End date<input required type="date" name="endDate" className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2" /></label>
            <label className="text-sm text-slate-700 md:col-span-2">Reason<input name="reason" maxLength={500} className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2" /></label>
            <button disabled={working || (!isEmployee && employees.length === 0)} className="w-fit rounded-lg bg-cyan-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{working ? "Submitting..." : "Submit request"}</button>
          </form>
        )}

        {showBalanceForm && canManageBalance && (
          <form onSubmit={submitBalance} className="mb-8 grid gap-4 border border-slate-200 bg-cyan-50/50 p-5 md:grid-cols-3">
            <label className="text-sm text-slate-700">Employee<select required name="employeeId" className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2">{employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.firstName} {employee.lastName} ({employee.employeeId})</option>)}</select></label>
            <label className="text-sm text-slate-700">Leave type<select name="leaveType" className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2"><option>Casual Leave</option><option>Sick Leave</option><option>Earned Leave</option><option>Paid Leave</option><option>Unpaid Leave</option></select></label>
            <label className="text-sm text-slate-700">Allocated days<input required name="allocatedDays" type="number" min="0" max="365" defaultValue="12" className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2" /></label>
            <button disabled={working || employees.length === 0} className="w-fit rounded-lg bg-cyan-800 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">Save balance</button>
          </form>
        )}

        <div className="grid gap-4 md:grid-cols-3">
          {[
            { label: "Available", value: `${summary.remaining} days` },
            { label: "Used", value: `${summary.approved} days` },
            { label: "Pending", value: `${summary.pending} requests` },
          ].map((item) => (
            <div key={item.label} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-500">{item.label}</p>
              <p className="mt-3 text-2xl font-semibold text-slate-900">{item.value}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 overflow-hidden rounded-xl border border-slate-200">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-100 text-slate-600">
              <tr>
                <th className="px-4 py-3 font-medium">Employee</th>
                <th className="px-4 py-3 font-medium">Leave Type</th>
                <th className="px-4 py-3 font-medium">Days</th>
                <th className="px-4 py-3 font-medium">Dates</th>
                <th className="px-4 py-3 font-medium">Balance</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Decision</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((leave) => (
                <tr key={leave.id} className="border-t border-slate-200">
                  <td className="px-4 py-3 font-medium text-slate-900">{leave.employee.firstName} {leave.employee.lastName}</td>
                  <td className="px-4 py-3 text-slate-600">{leave.type}</td>
                  <td className="px-4 py-3 text-slate-600">{leave.days}</td>
                  <td className="px-4 py-3 text-slate-600">{leave.startDate.slice(0, 10)} – {leave.endDate.slice(0, 10)}</td>
                  <td className="px-4 py-3 text-slate-600">{balances.find((balance) => balance.employeeId === leave.employeeId && balance.leaveType === leave.type)?.remainingDays ?? "Not set"} days</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        leave.status === "APPROVED"
                          ? "bg-emerald-50 text-emerald-700"
                          : leave.status === "REJECTED"
                            ? "bg-rose-50 text-rose-700"
                            : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {leave.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {leave.status === "PENDING" && canReview ? (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={working}
                          onClick={() => void handleDecision(leave.id, "APPROVED")}
                          className="rounded-md bg-emerald-700 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-emerald-800 disabled:opacity-50"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          disabled={working}
                          onClick={() => void handleDecision(leave.id, "REJECTED")}
                          className="rounded-md border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
                        >
                          Reject
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-500">{leave.status === "PENDING" ? "Awaiting review" : "Reviewed"}</span>
                    )}
                  </td>
                </tr>
              ))}
              {!loading && requests.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-500">No leave requests yet.</td></tr>}
              {loading && <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-500">Loading leave requests...</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
