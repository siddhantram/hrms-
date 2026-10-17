import { NextRequest, NextResponse } from "next/server";

import { requireApiPermission } from "@/lib/api-auth";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const access = await requireApiPermission(request, "attendance:read");
  if (access.response) return access.response;

  const manager = access.session.role === "MANAGER"
    ? await prisma.employee.findFirst({
        where: { companyId: access.session.companyId, userId: access.session.userId },
        select: { id: true },
      })
    : null;
  const employeeScope = access.session.role === "EMPLOYEE"
    ? { companyId: access.session.companyId, userId: access.session.userId }
    : access.session.role === "MANAGER"
      ? { companyId: access.session.companyId, OR: [{ managerId: manager?.id ?? "" }, { userId: access.session.userId }] }
      : { companyId: access.session.companyId };
  const today = new Date();
  const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 5, 1));
  const rows = await prisma.attendance.findMany({
    where: { employee: employeeScope, date: { gte: start } },
    select: { date: true, status: true, overtimeHours: true },
  });

  const chart = Array.from({ length: 6 }, (_, index) => {
    const monthStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 5 + index, 1));
    const monthKey = monthStart.toISOString().slice(0, 7);
    const monthRows = rows.filter((row) => row.date.toISOString().slice(0, 7) === monthKey);
    return {
      month: monthStart.toLocaleString("en", { month: "short", timeZone: "UTC" }),
      present: monthRows.filter((row) => row.status === "PRESENT" || row.status === "HALF_DAY").length,
      late: monthRows.filter((row) => row.status === "LATE").length,
      overtime: Number(monthRows.reduce((sum, row) => sum + row.overtimeHours, 0).toFixed(2)),
    };
  });

  return NextResponse.json({ data: chart });
}