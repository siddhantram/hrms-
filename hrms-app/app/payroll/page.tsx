"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type Employee = { id: string; employeeId: string; firstName: string; lastName: string; salary: string | number | null };
type PayrollRecord = {
  id: string;
  month: string;
  grossSalary: string | number;
  deductions: string | number | null;
  netSalary: string | number;
  status: string;
  employee: { firstName: string; lastName: string; employeeId: string };
};

const currency = (amount: string | number | null) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(amount ?? 0));

export default function PayrollPage() {
  const [records, setRecords] = useState<PayrollRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [canGenerate, setCanGenerate] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));

  const loadData = useCallback(async () => {
    const [payrollResponse, employeeResponse, sessionResponse] = await Promise.all([
      fetch("/api/payroll", { cache: "no-store" }),
      fetch("/api/employees?limit=100", { cache: "no-store" }),
      fetch("/api/auth/session", { cache: "no-store" }),
    ]);
    if (payrollResponse.ok) setRecords((await payrollResponse.json()).data);
    if (employeeResponse.ok) {
      const result = await employeeResponse.json();
      setEmployees(result.data);
      setSelectedEmployee((current) => current || result.data[0]?.id || "");
    }
    if (sessionResponse.ok) {
      const role = (await sessionResponse.json()).user?.role;
      setCanGenerate(role === "HR" || role === "SUPER_ADMIN");
    }
    setLoading(false);
  }, []);

  useEffect(() => { void loadData(); }, [loadData]);

  async function generatePayroll(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setWorking(true);
    setMessage("");
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    const response = await fetch("/api/payroll", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const result = await response.json();
    setWorking(false);
    setMessage(response.ok ? "Payroll generated." : result.error ?? "Could not generate payroll.");
    if (response.ok) { setShowForm(false); await loadData(); }
  }

  const grossTotal = records.reduce((sum, record) => sum + Number(record.grossSalary), 0);
  const deductionTotal = records.reduce((sum, record) => sum + Number(record.deductions ?? 0), 0);
  const netTotal = records.reduce((sum, record) => sum + Number(record.netSalary), 0);

  return (
    <main className="min-h-screen bg-slate-50 p-6 sm:p-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div><p className="text-sm uppercase tracking-[0.2em] text-slate-500">Compensation</p><h1 className="mt-2 text-3xl font-bold text-slate-900">Payroll</h1></div>
          <div className="flex gap-2">
            <Link href="/payroll/payslip" className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700">Payslips</Link>
            {canGenerate && <button onClick={() => setShowForm((value) => !value)} className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-medium text-white">{showForm ? "Close" : "Generate payroll"}</button>}
          </div>
        </header>
        {message && <p role="status" className="mb-4 rounded-lg bg-cyan-50 px-4 py-3 text-sm text-cyan-900">{message}</p>}
        {showForm && canGenerate && <form onSubmit={generatePayroll} className="mb-6 grid gap-4 border border-slate-200 bg-white p-5 sm:grid-cols-3">
          <label className="text-sm text-slate-700">Employee<select required name="employeeId" value={selectedEmployee} onChange={(event) => setSelectedEmployee(event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2">{employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.firstName} {employee.lastName} · {employee.employeeId}</option>)}</select></label>
          <label className="text-sm text-slate-700">Payroll month<input required name="month" type="month" value={month} onChange={(event) => setMonth(event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2" /></label>
          {[["basic", "Basic salary", true], ["hra", "HRA", false], ["allowance", "Allowances", false], ["bonus", "Bonus", false], ["overtime", "Overtime pay", false], ["tax", "Tax", false], ["pf", "PF", false], ["otherDeductions", "Other deductions", false]].map(([name, label, required]) => <label key={String(name)} className="text-sm text-slate-700">{String(label)}<input required={Boolean(required)} name={String(name)} type="number" min="0" step="0.01" defaultValue={name === "basic" ? Number(employees.find((employee) => employee.id === selectedEmployee)?.salary ?? 0) : 0} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2" /></label>)}
          <button disabled={working || employees.length === 0} className="w-fit self-end rounded-lg bg-cyan-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{working ? "Generating..." : "Generate"}</button>
        </form>}
        <section className="grid gap-4 sm:grid-cols-3">
          {[{ label: "Gross payroll", value: currency(grossTotal) }, { label: "Deductions", value: currency(deductionTotal) }, { label: "Net payout", value: currency(netTotal) }].map((item) => <div key={item.label} className="border-l-2 border-cyan-600 bg-white px-4 py-3 shadow-sm"><p className="text-sm text-slate-500">{item.label}</p><p className="mt-1 text-xl font-semibold text-slate-900">{item.value}</p></div>)}
        </section>
        <div className="mt-8 overflow-x-auto border-y border-slate-200 bg-white">
          <table className="min-w-full text-left text-sm"><thead className="bg-slate-100 text-slate-600"><tr><th className="px-4 py-3 font-medium">Employee</th><th className="px-4 py-3 font-medium">Month</th><th className="px-4 py-3 font-medium">Gross</th><th className="px-4 py-3 font-medium">Deductions</th><th className="px-4 py-3 font-medium">Net</th><th className="px-4 py-3 font-medium">Payslip</th></tr></thead>
            <tbody>{records.map((record) => <tr key={record.id} className="border-t border-slate-200"><td className="px-4 py-3 font-medium text-slate-900">{record.employee.firstName} {record.employee.lastName}</td><td className="px-4 py-3 text-slate-600">{record.month}</td><td className="px-4 py-3 text-slate-600">{currency(record.grossSalary)}</td><td className="px-4 py-3 text-slate-600">{currency(record.deductions)}</td><td className="px-4 py-3 text-slate-600">{currency(record.netSalary)}</td><td className="px-4 py-3"><Link className="font-medium text-cyan-800 underline" href={`/payroll/payslip/${record.id}`}>View</Link></td></tr>)}
              {!loading && records.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">No payroll records yet.</td></tr>}{loading && <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">Loading payroll...</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
