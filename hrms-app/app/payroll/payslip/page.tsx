"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type PayrollRow = { id: string; month: string; netSalary: string | number; employee: { firstName: string; lastName: string; employeeId: string } };
const money = (value: string | number, currency = "INR") => new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 2 }).format(Number(value));

export default function PayslipPage() {
  const [records, setRecords] = useState<PayrollRow[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch("/api/payroll", { cache: "no-store" }).then(async (response) => {
      if (response.ok) setRecords((await response.json()).data);
    }).finally(() => setLoading(false));
  }, []);

  return <main className="min-h-screen bg-slate-50 p-6 sm:p-8"><div className="mx-auto max-w-4xl"><div className="mb-6"><Link href="/payroll" className="text-sm font-medium text-cyan-800 underline">Back to payroll</Link><h1 className="mt-3 text-3xl font-bold text-slate-900">Payslips</h1></div><div className="divide-y divide-slate-200 border-y border-slate-200 bg-white">{records.map((record) => <div key={record.id} className="flex items-center justify-between gap-4 px-4 py-4"><div><p className="font-medium text-slate-900">{record.employee.firstName} {record.employee.lastName} · {record.employee.employeeId}</p><p className="text-sm text-slate-500">{record.month}</p></div><div className="flex items-center gap-4"><span className="text-sm font-semibold text-slate-900">{money(record.netSalary)}</span><Link href={`/payroll/payslip/${record.id}`} className="text-sm font-medium text-cyan-800 underline">Open</Link></div></div>)}{!loading && records.length === 0 && <p className="px-4 py-8 text-center text-slate-500">No payslips available.</p>}{loading && <p className="px-4 py-8 text-center text-slate-500">Loading payslips...</p>}</div></div></main>;
}
