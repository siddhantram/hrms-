import { NextRequest, NextResponse } from "next/server";

import { requireApiPermission } from "@/lib/api-auth";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const access = await requireApiPermission(request, "attendance:read");
  if (access.response) return access.response;
  const manager = access.session.role === "MANAGER"
    ? await prisma.employee.findFirst({ where: { companyId: access.session.companyId, userId: access.session.userId }, select: { id: true } })
    : null;
  const employeeScope = access.session.role === "EMPLOYEE"
    ? { companyId: access.session.companyId, userId: access.session.userId }
    : access.session.role === "MANAGER"
      ? { companyId: access.session.companyId, OR: [{ managerId: manager?.id ?? "" }, { userId: access.session.userId }] }
      : { companyId: access.session.companyId };
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  const [totalEmployees, present, late, onLeave] = await Promise.all([
    prisma.employee.count({ where: employeeScope }),
    prisma.attendance.count({ where: { employee: employeeScope, date: today, status: { in: ["PRESENT", "HALF_DAY"] } } }),
    prisma.attendance.count({ where: { employee: employeeScope, date: today, status: "LATE" } }),
    prisma.leave.count({ where: { companyId: access.session.companyId, employee: employeeScope, status: "APPROVED", startDate: { lt: tomorrow }, endDate: { gte: today } } }),
  ]);
  return NextResponse.json({ data: { totalEmployees, present, late, onLeave, absent: Math.max(0, totalEmployees - present - late - onLeave) } });
}