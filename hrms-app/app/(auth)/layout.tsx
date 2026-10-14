import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-10 text-slate-900">
      <div className="w-full max-w-5xl overflow-hidden rounded-3xl border border-slate-800 bg-white shadow-2xl shadow-slate-950/20">
        <div className="grid min-h-[700px] lg:grid-cols-2">
          <div className="hidden bg-slate-950 p-10 text-white lg:flex lg:flex-col lg:justify-between">
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-400 font-black text-slate-950">
                HR
              </div>
              <p className="mt-8 text-sm uppercase tracking-[0.24em] text-cyan-300">HRMS SaaS</p>
              <h1 className="mt-4 max-w-sm text-4xl font-bold leading-tight">
                Secure workforce operations for modern companies.
              </h1>
            </div>

            <div className="space-y-4 text-sm text-slate-300">
              <p>• Multi-tenant access control</p>
              <p>• Attendance, leave, payroll workflows</p>
              <p>• Company-level analytics and audit logging</p>
            </div>
          </div>

          <div className="flex items-center justify-center bg-white p-6 sm:p-10">{children}</div>
        </div>
      </div>
    </main>
  );
}
