import Link from "next/link";
import { LayoutDashboard, Users, Building2, CalendarRange, Plane, WalletCards, BarChart3, FileText, Bell, Settings, ShieldCheck } from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/companies", label: "Companies", icon: Building2 },
  { href: "/employees", label: "Employees", icon: Users },
  { href: "/departments", label: "Departments", icon: Building2 },
  { href: "/designations", label: "Designations", icon: Building2 },
  { href: "/attendance", label: "Attendance", icon: CalendarRange },
  { href: "/leaves", label: "Leaves", icon: Plane },
  { href: "/payroll", label: "Payroll", icon: WalletCards },
  { href: "/performance", label: "Performance", icon: BarChart3 },
  { href: "/documents", label: "Documents", icon: FileText },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/audit-logs", label: "Audit Logs", icon: ShieldCheck },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/rbac", label: "RBAC", icon: ShieldCheck },
];

export function Sidebar() {
  return (
    <aside className="hidden h-screen w-72 shrink-0 border-r border-slate-200 bg-slate-950 p-5 text-slate-100 lg:block">
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500 font-bold text-slate-950">
          HR
        </div>
        <div>
          <p className="text-lg font-semibold">HRMS SaaS</p>
          <p className="text-xs text-slate-400">Multi-tenant</p>
        </div>
      </div>

      <nav className="space-y-2">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white"
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
