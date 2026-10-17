"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

type Employee = {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  status: string;
  salary: string | number | null;
  joiningDate: string | null;
  department: { name: string } | null;
  designation: { name: string } | null;
};

function EmployeeDetailsContent() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [canEdit, setCanEdit] = useState(false);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch(`/api/employees/${id}`, { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? "Could not load employee.");
        setEmployee(result.data);
      })
      .catch((error: unknown) => setMessage(error instanceof Error ? error.message : "Could not load employee."))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    fetch("/api/auth/session", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return;
        const result = await response.json();
        setCanEdit(["HR", "SUPER_ADMIN"].includes(result.user?.role));
      })
      .catch(() => setCanEdit(false));
  }, []);

  async function updateEmployee(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setWorking(true);
    setMessage("");
    const response = await fetch(`/api/employees/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(new FormData(event.currentTarget).entries())),
    });
    const result = await response.json();
    setWorking(false);
    if (!response.ok) {
      setMessage(result.error ?? "Could not update employee.");
      return;
    }
    setEmployee(result.data);
    setMessage("Employee updated.");
  }

  async function deleteEmployee() {
    if (!window.confirm("Delete this employee and their associated records?")) return;
    setWorking(true);
    const response = await fetch(`/api/employees/${id}`, { method: "DELETE" });
    const result = await response.json();
    setWorking(false);
    if (!response.ok) {
      setMessage(result.error ?? "Could not delete employee.");
      return;
    }
    router.push("/employees");
  }

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <div className="mx-auto max-w-3xl">
        <Link href="/employees" className="text-sm text-slate-600 hover:text-slate-950">Back to employees</Link>
        <div className="mt-5 border border-slate-200 bg-white p-6 sm:p-8">
          <h1 className="text-2xl font-bold text-slate-900">Employee profile</h1>
          {message && <p role="status" className="mt-4 bg-cyan-50 px-4 py-3 text-sm text-cyan-900">{message}</p>}
          {loading && <p className="mt-6 text-sm text-slate-500">Loading employee...</p>}
          {!loading && employee && (
            <>
              <p className="mt-2 text-sm text-slate-500">{employee.department?.name ?? "No department"} · {employee.designation?.name ?? "No designation"}</p>
              <form onSubmit={updateEmployee} className="mt-6 grid gap-4 sm:grid-cols-2">
                <label className="text-sm text-slate-700">Employee ID<input disabled={!canEdit} name="employeeId" required minLength={2} defaultValue={employee.employeeId} className="mt-1 block w-full border border-slate-300 px-3 py-2 disabled:bg-slate-100" /></label>
                <label className="text-sm text-slate-700">Status<select disabled={!canEdit} name="status" defaultValue={employee.status} className="mt-1 block w-full border border-slate-300 bg-white px-3 py-2 disabled:bg-slate-100"><option value="ACTIVE">Active</option><option value="ON_LEAVE">On leave</option><option value="PENDING">Pending</option><option value="INACTIVE">Inactive</option></select></label>
                <label className="text-sm text-slate-700">First name<input disabled={!canEdit} name="firstName" required minLength={2} defaultValue={employee.firstName} className="mt-1 block w-full border border-slate-300 px-3 py-2 disabled:bg-slate-100" /></label>
                <label className="text-sm text-slate-700">Last name<input disabled={!canEdit} name="lastName" required minLength={2} defaultValue={employee.lastName} className="mt-1 block w-full border border-slate-300 px-3 py-2 disabled:bg-slate-100" /></label>
                <label className="text-sm text-slate-700 sm:col-span-2">Email<input disabled={!canEdit} type="email" name="email" required defaultValue={employee.email} className="mt-1 block w-full border border-slate-300 px-3 py-2 disabled:bg-slate-100" /></label>
                <label className="text-sm text-slate-700">Phone<input disabled={!canEdit} name="phone" defaultValue={employee.phone ?? ""} className="mt-1 block w-full border border-slate-300 px-3 py-2 disabled:bg-slate-100" /></label>
                <label className="text-sm text-slate-700">Salary<input disabled={!canEdit} type="number" name="salary" min="0" step="0.01" defaultValue={employee.salary ?? ""} className="mt-1 block w-full border border-slate-300 px-3 py-2 disabled:bg-slate-100" /></label>
                <label className="text-sm text-slate-700">Department<input disabled={!canEdit} name="department" defaultValue={employee.department?.name ?? ""} className="mt-1 block w-full border border-slate-300 px-3 py-2 disabled:bg-slate-100" /></label>
                <label className="text-sm text-slate-700">Designation<input disabled={!canEdit} name="designation" defaultValue={employee.designation?.name ?? ""} className="mt-1 block w-full border border-slate-300 px-3 py-2 disabled:bg-slate-100" /></label>
                <label className="text-sm text-slate-700">Joining date<input disabled={!canEdit} type="date" name="joiningDate" defaultValue={employee.joiningDate?.slice(0, 10) ?? ""} className="mt-1 block w-full border border-slate-300 px-3 py-2 disabled:bg-slate-100" /></label>
                {canEdit && <div className="flex items-end gap-3 sm:col-span-2">
                  <button disabled={working} className="bg-slate-950 px-4 py-2 text-sm font-medium text-white disabled:opacity-60">{working ? "Saving..." : "Save changes"}</button>
                  <button type="button" disabled={working} onClick={() => void deleteEmployee()} className="border border-red-300 px-4 py-2 text-sm font-medium text-red-700 disabled:opacity-60">Delete employee</button>
                </div>}
              </form>
            </>
          )}
        </div>
      </div>
    </main>
  );
}

export default function EmployeeDetailsPage() {
  return <Suspense fallback={<main className="min-h-screen bg-slate-50 p-8 text-sm text-slate-500">Loading employee profile...</main>}><EmployeeDetailsContent /></Suspense>;
}