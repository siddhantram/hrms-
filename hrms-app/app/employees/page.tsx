"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type Employee = { id: string; employeeId: string; firstName: string; lastName: string; email: string; status: string; department: { name: string } | null; designation: { name: string } | null };

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [canCreate, setCanCreate] = useState(false);
  const loadEmployees = useCallback(async () => {
    setLoading(true);
    const response = await fetch(`/api/employees?page=${page}&limit=20&search=${encodeURIComponent(query)}`, { cache: "no-store" });
    if (response.ok) { const result = await response.json(); setEmployees(result.data); setTotal(result.pagination.total); setTotalPages(result.pagination.totalPages); }
    setLoading(false);
  }, [page, query]);
  useEffect(() => { void loadEmployees(); }, [loadEmployees]);
  useEffect(() => {
    fetch("/api/auth/session", { cache: "no-store" }).then(async (response) => {
      if (response.ok) setCanCreate(["HR", "SUPER_ADMIN"].includes((await response.json()).user?.role));
    }).catch(() => setCanCreate(false));
  }, []);

  return (
    <main className="min-h-screen bg-slate-50 p-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-slate-500">HR Module</p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900">Employee Management</h1>
          </div>
          {canCreate && <Link href="/employees/new" className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-medium text-white">
            Add Employee
          </Link>}
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {[
            { label: "Employees matching filter", value: String(total) },
            { label: "Active on page", value: String(employees.filter((employee) => employee.status === "ACTIVE").length) },
            { label: "Current page", value: String(page) },
          ].map((item) => (
            <div key={item.label} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-500">{item.label}</p>
              <p className="mt-3 text-3xl font-semibold text-slate-900">{item.value}</p>
            </div>
          ))}
        </div>

        <form onSubmit={(event) => { event.preventDefault(); setPage(1); setQuery(search.trim()); }} className="mt-8 flex gap-2"><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, email, employee ID" className="w-full max-w-md border border-slate-300 bg-white px-3 py-2 text-sm" /><button className="bg-slate-950 px-4 py-2 text-sm font-medium text-white">Search</button></form>
        <div className="mt-4 overflow-x-auto border-y border-slate-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-100 text-slate-600">
              <tr>
                <th className="px-4 py-3 font-medium">Employee ID</th>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Department</th>
                <th className="px-4 py-3 font-medium">Designation</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((employee) => (
                <tr key={employee.id} className="border-t border-slate-200">
                  <td className="px-4 py-3 text-slate-600">{employee.employeeId}</td>
                  <td className="px-4 py-3 font-medium text-slate-900"><Link href={`/employees/${employee.id}`} className="hover:underline">{employee.firstName} {employee.lastName}</Link></td>
                  <td className="px-4 py-3 text-slate-600">{employee.email}</td>
                  <td className="px-4 py-3 text-slate-600">{employee.department?.name ?? "-"}</td>
                  <td className="px-4 py-3 text-slate-600">{employee.designation?.name ?? "-"}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                      {employee.status.replaceAll("_", " ")}
                    </span>
                  </td>
                </tr>
              ))}
              {!loading && employees.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">No employees found.</td></tr>}
              {loading && <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">Loading employees...</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex justify-end gap-3 text-sm"><button disabled={page <= 1} onClick={() => setPage((value) => value - 1)} className="underline disabled:text-slate-400">Previous</button><span>{page} / {Math.max(1, totalPages)}</span><button disabled={page >= totalPages} onClick={() => setPage((value) => value + 1)} className="underline disabled:text-slate-400">Next</button></div>
      </div>
    </main>
  );
}
