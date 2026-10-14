"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

type Payslip = {
  month: string;
  grossSalary: string | number;
  deductions: string | number | null;
  netSalary: string | number;
  company: { name: string; address: string | null; currency: string };
  employee: { employeeId: string; firstName: string; lastName: string; department: { name: string } | null; designation: { name: string } | null };
  items: Array<{ id: string; type: string; label: string; amount: string | number }>;
};

const money = (value: string | number, currency: string) => new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 2 }).format(Number(value));

export default function PayslipDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [payslip, setPayslip] = useState<Payslip | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    fetch(`/api/payroll/${id}`, { cache: "no-store" }).then(async (response) => {
      const result = await response.json();
      if (response.ok) setPayslip(result.data);
      else setError(result.error ?? "Payslip unavailable");
    }).catch(() => setError("Payslip unavailable"));
  }, [id]);

  if (error) return <main className="p-8 text-center text-slate-600">{error}</main>;
  if (!payslip) return <main className="p-8 text-center text-slate-600">Loading payslip...</main>;
  const earnings = payslip.items.filter((item) => item.type === "EARNING");
  const deductions = payslip.items.filter((item) => item.type === "DEDUCTION");

  return <main className="min-h-screen bg-slate-50 p-6 sm:p-8"><article className="mx-auto max-w-3xl border border-slate-200 bg-white p-8 print:border-0 print:shadow-none"><div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-6"><div><h1 className="text-2xl font-bold text-slate-900">{payslip.company.name}</h1><p className="mt-1 text-sm text-slate-500">{payslip.company.address}</p></div><div className="text-right"><p className="text-xs uppercase tracking-[0.2em] text-slate-500">Payslip</p><p className="mt-1 font-semibold text-slate-900">{payslip.month}</p></div></div><div className="grid gap-3 border-b border-slate-200 py-5 text-sm sm:grid-cols-2"><p><b>Employee:</b> {payslip.employee.firstName} {payslip.employee.lastName}</p><p><b>Employee ID:</b> {payslip.employee.employeeId}</p><p><b>Department:</b> {payslip.employee.department?.name ?? "-"}</p><p><b>Designation:</b> {payslip.employee.designation?.name ?? "-"}</p></div><div className="grid gap-8 py-6 sm:grid-cols-2">{[["Earnings", earnings], ["Deductions", deductions]].map(([title, rows]) => <section key={String(title)}><h2 className="mb-3 font-semibold text-slate-900">{String(title)}</h2><div className="space-y-2 text-sm">{(rows as typeof earnings).map((item) => <div key={item.id} className="flex justify-between gap-4 text-slate-600"><span>{item.label}</span><span>{money(item.amount, payslip.company.currency)}</span></div>)}</div></section>)}</div><div className="space-y-3 border-t border-slate-200 pt-5 text-sm"><div className="flex justify-between text-slate-600"><span>Gross earnings</span><span>{money(payslip.grossSalary, payslip.company.currency)}</span></div><div className="flex justify-between text-slate-600"><span>Total deductions</span><span>{money(payslip.deductions ?? 0, payslip.company.currency)}</span></div><div className="flex justify-between border-t border-slate-200 pt-4 text-lg font-bold text-slate-900"><span>Net pay</span><span>{money(payslip.netSalary, payslip.company.currency)}</span></div></div><button onClick={() => window.print()} className="mt-8 rounded-lg bg-slate-950 px-4 py-2 text-sm font-medium text-white print:hidden">Print / Save PDF</button></article></main>;
}