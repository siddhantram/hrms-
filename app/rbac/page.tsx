import { canAccess, type UserRole } from "@/lib/permissions";

const roles: UserRole[] = ["SUPER_ADMIN", "HR", "MANAGER", "EMPLOYEE"];
const permissions = [
  "company:read",
  "company:create",
  "employee:read",
  "employee:create",
  "employee:update",
  "employee:delete",
  "attendance:read",
  "attendance:create",
  "leave:read",
  "leave:approve",
  "payroll:read",
  "payroll:create",
  "reports:read",
  "performance:read",
  "performance:create",
  "document:read",
  "document:create",
  "audit:read",
  "holiday:read",
  "holiday:create",
  "profile:update",
];

export default function RbacPage() {
  return (
    <main className="min-h-screen bg-slate-50 p-6 sm:p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6">
          <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Access control</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">Role permissions</h1>
        </div>
        <div className="overflow-x-auto border-y border-slate-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-100 text-slate-600"><tr><th className="sticky left-0 bg-slate-100 px-4 py-3 font-medium">Capability</th>{roles.map((role) => <th key={role} className="px-4 py-3 font-medium">{role.replaceAll("_", " ")}</th>)}</tr></thead>
            <tbody>
              {permissions.map((permission) => <tr key={permission} className="border-t border-slate-200"><th scope="row" className="sticky left-0 bg-white px-4 py-3 font-medium text-slate-800">{permission}</th>{roles.map((role) => <td key={role} className="px-4 py-3 text-center">{canAccess(role, permission) ? <span className="font-medium text-emerald-700">Allowed</span> : <span className="text-slate-400">-</span>}</td>)}</tr>)}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
