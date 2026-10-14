import { OverviewCards } from "@/components/dashboard/overview-cards";
import { AttendanceChart } from "@/components/dashboard/attendance-chart";
import { DepartmentDistribution } from "@/components/dashboard/department-distribution";
import { EmployeeTable } from "@/components/dashboard/employee-table";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Topbar } from "@/components/dashboard/topbar";

export default function DashboardPage() {
  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="flex-1 space-y-6 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.18em] text-slate-500">Overview</p>
              <h1 className="mt-2 text-3xl font-bold text-slate-900">HR Dashboard</h1>
            </div>
            <div className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700">
              Live reporting
            </div>
          </div>

          <OverviewCards />

          <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
            <AttendanceChart />
            <DepartmentDistribution />
          </div>

          <EmployeeTable />
        </main>
      </div>
    </div>
  );
}
