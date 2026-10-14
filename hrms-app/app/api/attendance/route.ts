import { NextRequest, NextResponse } from "next/server";

import { requireApiPermission } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { calculateOvertimeHours, normalizeAttendanceRecord } from "@/lib/attendance";
import { clockTime, parseDateOnly } from "@/lib/hrms-date";
import { attendancePunchSchema } from "@/lib/validation";

export async function GET(request: NextRequest) {
  const access = await requireApiPermission(request, "attendance:read");
  if (access.response) return access.response;

  const { searchParams } = new URL(request.url);
  const dateValue = searchParams.get("date");
  const date = dateValue ? parseDateOnly(dateValue) : null;
  if (dateValue && !date) {
    return NextResponse.json({ error: "Date must use YYYY-MM-DD format" }, { status: 400 });
  }

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
  const [records, employees] = await Promise.all([
    prisma.attendance.findMany({
      where: {
        employee: employeeScope,
        ...(date ? { date } : {}),
      },
      include: {
        employee: { select: { id: true, employeeId: true, firstName: true, lastName: true } },
        corrections: { where: { status: "PENDING" }, select: { id: true } },
      },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      take: 250,
    }),
    prisma.employee.findMany({
      where: { ...employeeScope, ...(access.session.role === "HR" || access.session.role === "SUPER_ADMIN" ? { status: "ACTIVE" } : {}) },
      select: { id: true, employeeId: true, firstName: true, lastName: true },
      orderBy: { firstName: "asc" },
      take: 500,
    }),
  ]);

  return NextResponse.json({
    employees,
    data: records.map((record) => ({
      ...record,
      employeeName: `${record.employee.firstName} ${record.employee.lastName}`,
      pendingCorrection: record.corrections.length > 0,
    })),
  });
}

export async function POST(request: NextRequest) {
  const access = await requireApiPermission(request, "attendance:create");
  if (access.response) return access.response;

  try {
    const body = attendancePunchSchema.parse(await request.json());
    const manager = access.session.role === "MANAGER"
      ? await prisma.employee.findFirst({
          where: { companyId: access.session.companyId, userId: access.session.userId },
          select: { id: true },
        })
      : null;
    const employee = access.session.role !== "EMPLOYEE" && body.employeeId
      ? await prisma.employee.findFirst({
          where: {
            id: body.employeeId,
            companyId: access.session.companyId,
            ...(access.session.role === "MANAGER" ? { managerId: manager?.id ?? "" } : {}),
          },
        })
      : await prisma.employee.findFirst({
          where: { companyId: access.session.companyId, userId: access.session.userId },
        });

    if (!employee) {
      return NextResponse.json({ error: "No employee profile is linked to this account" }, { status: 404 });
    }

    if (body.action === "CHECK_IN") {
      const today = new Date().toISOString().slice(0, 10);
      const date = body.date ? parseDateOnly(body.date) : parseDateOnly(today);
      if (!date) return NextResponse.json({ error: "Date must use YYYY-MM-DD format" }, { status: 400 });
      if (access.session.role === "EMPLOYEE" && date.toISOString().slice(0, 10) !== today) {
        return NextResponse.json({ error: "Employees can only check in for today" }, { status: 403 });
      }

      const checkIn = new Date();
      const checkInClock = clockTime(checkIn);
      const status = checkInClock && checkInClock > "09:30" ? "LATE" : "PRESENT";
      const attendance = await prisma.attendance.create({
        data: { employeeId: employee.id, date, checkIn, status },
      });

      return NextResponse.json({ data: attendance }, { status: 201 });
    }

    const attendance = await prisma.attendance.findFirst({
      where: { employeeId: employee.id, checkIn: { not: null }, checkOut: null },
      orderBy: { date: "desc" },
    });

    if (!attendance?.checkIn) {
      return NextResponse.json({ error: "No open check-in was found" }, { status: 409 });
    }

    const checkOut = new Date();
    if (checkOut.getTime() <= attendance.checkIn.getTime()) {
      return NextResponse.json({ error: "Check-out must be after check-in" }, { status: 400 });
    }

    const checkInClock = clockTime(attendance.checkIn);
    const checkOutClock = clockTime(checkOut);
    if (!checkInClock || !checkOutClock) {
      return NextResponse.json({ error: "Could not determine attendance times" }, { status: 400 });
    }

    const normalized = normalizeAttendanceRecord({
      employeeId: employee.id,
      date: attendance.date.toISOString().slice(0, 10),
      checkIn: checkInClock,
      checkOut: checkOutClock,
      status: "PRESENT",
    });
    const updated = await prisma.attendance.update({
      where: { id: attendance.id },
      data: {
        checkOut,
        workingHours: normalized.workingHours,
        overtimeHours: calculateOvertimeHours(normalized.workingHours ?? 0),
        status: normalized.status,
      },
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid attendance request.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
