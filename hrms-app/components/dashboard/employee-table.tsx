"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Employee = { id: string; employeeId: string; firstName: string; lastName: string; status: string; department: { name: string } | null; designation: { name: string } | null };

export function EmployeeTable() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  useEffect(() => {
    fetch("/api/employees?page=1&limit=5", { cache: "no-store" }).then(async (response) => {
      if (response.ok) setEmployees((await response.json()).data);
    }).catch(() => setEmployees([]));
  }, []);

  return (
    <div className="border-y border-slate-200 bg-white p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900">Recent Employees</h3>
        <Link href="/employees" className="text-sm font-medium text-slate-600 hover:text-slate-900">View all</Link>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500">
              <th className="pb-3 pr-6 font-medium">Name</th>
              <th className="pb-3 pr-6 font-medium">Employee ID</th>
              <th className="pb-3 pr-6 font-medium">Department</th>
              <th className="pb-3 pr-6 font-medium">Designation</th>
              <th className="pb-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((employee) => (
              <tr key={employee.id} className="border-b border-slate-100 last:border-none">
                <td className="py-3 pr-6 font-medium text-slate-900">{employee.firstName} {employee.lastName}</td>
                <td className="py-3 pr-6 text-slate-600">{employee.employeeId}</td>
                <td className="py-3 pr-6 text-slate-600">{employee.department?.name ?? "-"}</td>
                <td className="py-3 pr-6 text-slate-600">{employee.designation?.name ?? "-"}</td>
                <td className="py-3">
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                    {person.status}
                  </span>
                </td>
              </tr>
            ))}
            {employees.length === 0 && <tr><td colSpan={5} className="py-6 text-center text-sm text-slate-500">No employee records available.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
