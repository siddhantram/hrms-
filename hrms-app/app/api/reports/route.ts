import { NextRequest, NextResponse } from "next/server";

import { requireApiPermission } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { buildReportSummary, exportCsv } from "@/lib/reports";

export async function GET(request: NextRequest) {
  const access = await requireApiPermission(request, "reports:read");
  if (access.response) return access.response;

  const now = new Date();
  const rangeStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5, 1));
  const [attendanceRecords, leaveRequests, payrollEntries] = await Promise.all([
    prisma.attendance.findMany({
      where: { employee: { companyId: access.session.companyId }, date: { gte: rangeStart } },
      select: {
        status: true,
        workingHours: true,
        overtimeHours: true,
        date: true,
        checkIn: true,
        checkOut: true,
        employee: { select: { employeeId: true, firstName: true, lastName: true } },
      },
    }),
    prisma.leave.findMany({
      where: { companyId: access.session.companyId, createdAt: { gte: rangeStart } },
      select: {
        status: true,
        days: true,
        type: true,
        startDate: true,
        endDate: true,
        employee: { select: { employeeId: true, firstName: true, lastName: true } },
      },
    }),
    prisma.payroll.findMany({
      where: { companyId: access.session.companyId, createdAt: { gte: rangeStart } },
      select: { netSalary: true, month: true, employee: { select: { firstName: true, lastName: true } } },
    }),
  ]);

  const summary = buildReportSummary({
    attendanceRecords,
    leaveRequests,
    payrollEntries: payrollEntries.map((entry) => ({ net: Number(entry.netSalary) })),
  });
  const chart = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5 + index, 1));
    const monthKey = date.toISOString().slice(0, 7);
    const monthRecords = attendanceRecords.filter((record) => record.date.toISOString().slice(0, 7) === monthKey);
    return {
      month: date.toLocaleString("en", { month: "short", timeZone: "UTC" }),
      present: monthRecords.filter((record) => record.status === "PRESENT" || record.status === "HALF_DAY").length,
      late: monthRecords.filter((record) => record.status === "LATE").length,
      overtime: Number(monthRecords.reduce((sum, record) => sum + record.overtimeHours, 0).toFixed(2)),
    };
  });
  const payroll = payrollEntries.map((entry) => ({
    employee: `${entry.employee.firstName} ${entry.employee.lastName}`,
    month: entry.month,
    net: Number(entry.netSalary),
  }));

  const searchParams = new URL(request.url).searchParams;
  if (searchParams.get("format") === "csv") {
    const reportType = searchParams.get("report") ?? "payroll";
    if (!["attendance", "leave", "payroll"].includes(reportType)) {
      return NextResponse.json({ error: "Report must be attendance, leave, or payroll" }, { status: 400 });
    }
    const exportData = reportType === "attendance"
      ? {
          rows: attendanceRecords.map((entry) => ({
            employeeId: entry.employee.employeeId,
            employee: `${entry.employee.firstName} ${entry.employee.lastName}`,
            date: entry.date.toISOString().slice(0, 10),
            checkIn: entry.checkIn?.toISOString() ?? "",
            checkOut: entry.checkOut?.toISOString() ?? "",
            status: entry.status,
            workingHours: entry.workingHours ?? 0,
            overtimeHours: entry.overtimeHours,
          })),
          columns: ["employeeId", "employee", "date", "checkIn", "checkOut", "status", "workingHours", "overtimeHours"],
        }
      : reportType === "leave"
        ? {
            rows: leaveRequests.map((entry) => ({
              employeeId: entry.employee.employeeId,
              employee: `${entry.employee.firstName} ${entry.employee.lastName}`,
              type: entry.type,
              startDate: entry.startDate.toISOString().slice(0, 10),
              endDate: entry.endDate.toISOString().slice(0, 10),
              days: entry.days,
              status: entry.status,
            })),
            columns: ["employeeId", "employee", "type", "startDate", "endDate", "days", "status"],
          }
        : { rows: payroll, columns: ["employee", "month", "net"] };
    return new NextResponse(exportCsv(exportData.rows, exportData.columns), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="hrms-${reportType}-report.csv"`,
      },
    });
  }

  return NextResponse.json({ data: { summary, chart, payroll } });
}
