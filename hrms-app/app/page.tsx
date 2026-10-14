import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col bg-slate-950 text-white">
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 py-10">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500 font-bold text-slate-950">
              HR
            </div>
            <div>
              <p className="text-lg font-semibold">HRMS SaaS</p>
              <p className="text-xs text-slate-400">Multi-tenant platform</p>
            </div>
          </div>
          <nav className="flex items-center gap-4 text-sm text-slate-300">
            <Link href="/dashboard" className="hover:text-white">Dashboard</Link>
            <Link href="/companies" className="hover:text-white">Companies</Link>
            <Link href="/employees" className="hover:text-white">Employees</Link>
            <Link href="/departments" className="hover:text-white">Departments</Link>
            <Link href="/designations" className="hover:text-white">Designations</Link>
            <Link href="/attendance" className="hover:text-white">Attendance</Link>
            <Link href="/leaves" className="hover:text-white">Leaves</Link>
            <Link href="/payroll" className="hover:text-white">Payroll</Link>
            <Link href="/performance" className="hover:text-white">Performance</Link>
            <Link href="/documents" className="hover:text-white">Documents</Link>
            <Link href="/reports" className="hover:text-white">Reports</Link>
            <Link href="/notifications" className="hover:text-white">Notifications</Link>
            <Link href="/audit-logs" className="hover:text-white">Audit Logs</Link>
          </nav>
        </header>

        <section className="grid flex-1 items-center gap-10 py-16 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <span className="inline-flex rounded-full border border-cyan-500/40 bg-cyan-500/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.22em] text-cyan-300">
              Next.js HR management system
            </span>
            <h1 className="mt-6 text-5xl font-bold tracking-tight text-white md:text-6xl">
              Multi-tenant HRMS built for modern teams.
            </h1>
            <p className="mt-6 max-w-xl text-lg text-slate-300">
              Designed around role-based access, employee lifecycle management, attendance workflows, leave approvals, payroll tracking, reporting and audit-friendly architecture.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                href="/dashboard"
                className="rounded-lg bg-cyan-500 px-5 py-3 font-medium text-slate-950 transition hover:bg-cyan-400"
              >
                Open dashboard
              </Link>
              <Link
                href="/employees"
                className="rounded-lg border border-slate-700 bg-slate-900 px-5 py-3 font-medium text-white transition hover:border-slate-500"
              >
                Explore modules
              </Link>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              {[
                ["RBAC", "Super Admin, HR, Manager, Employee"],
                ["Attendance", "Check-in, logs, leave, overtime"],
                ["Payroll", "Salary engine, deductions, payslips"],
              ].map(([title, text]) => (
                <div key={title} className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
                  <p className="text-sm font-semibold text-white">{title}</p>
                  <p className="mt-2 text-sm text-slate-400">{text}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl shadow-cyan-950/20">
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-5">
              <p className="text-sm text-slate-400">System Focus</p>
              <ul className="mt-5 space-y-3 text-sm text-slate-200">
                <li>• Next.js 16 + TypeScript</li>
                <li>• PostgreSQL + Prisma</li>
                <li>• Role permissions + tenant isolation</li>
                <li>• Attendance, leave, payroll, reporting</li>
                <li>• Production-grade architecture</li>
              </ul>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
