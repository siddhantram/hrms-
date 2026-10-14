import { NextRequest, NextResponse } from "next/server";

import { requireApiPermission } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { attendanceCorrectionSchema } from "@/lib/validation";
import { parseTimeOnDate } from "@/lib/hrms-date";

export async function GET(request: NextRequest) {
  const access = await requireApiPermission(request, "attendance:correction:review");
  if (access.response) return access.response;
  const manager = access.session.role === "MANAGER"
    ? await prisma.employee.findFirst({
        where: { companyId: access.session.companyId, userId: access.session.userId },
        select: { id: true },
      })
    : null;

  const corrections = await prisma.attendanceCorrection.findMany({
    where: {
      status: "PENDING",
      attendance: {
        employee: {
          companyId: access.session.companyId,
          ...(access.session.role === "MANAGER"
            ? { managerId: manager?.id ?? "" }
            : {}),
        },
      },
    },
    include: {
      attendance: {
        include: { employee: { select: { employeeId: true, firstName: true, lastName: true } } },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ data: corrections });
}

export async function POST(request: NextRequest) {
  const access = await requireApiPermission(request, "attendance:correction:create");
  if (access.response) return access.response;

  try {
    const body = attendanceCorrectionSchema.parse(await request.json());
    const attendance = await prisma.attendance.findFirst({
      where: {
        id: body.attendanceId,
        employee: {
          companyId: access.session.companyId,
          ...(access.session.role === "EMPLOYEE" ? { userId: access.session.userId } : {}),
        },
      },
      include: { corrections: { where: { status: "PENDING" }, select: { id: true } } },
    });

    if (!attendance) return NextResponse.json({ error: "Attendance record not found" }, { status: 404 });
    if (attendance.corrections.length > 0) {
      return NextResponse.json({ error: "A correction is already pending for this record" }, { status: 409 });
    }

    const requestedCheckIn = body.requestedCheckIn
      ? parseTimeOnDate(attendance.date, body.requestedCheckIn)
      : null;
    let requestedCheckOut = body.requestedCheckOut
      ? parseTimeOnDate(attendance.date, body.requestedCheckOut)
      : null;

    if (body.requestedCheckIn && !requestedCheckIn) {
      return NextResponse.json({ error: "Invalid requested check-in time" }, { status: 400 });
    }
    if (body.requestedCheckOut && !requestedCheckOut) {
      return NextResponse.json({ error: "Invalid requested check-out time" }, { status: 400 });
    }
    const baselineCheckIn = requestedCheckIn ?? attendance.checkIn;
    if (requestedCheckOut && baselineCheckIn && requestedCheckOut <= baselineCheckIn) {
      requestedCheckOut = new Date(requestedCheckOut.getTime() + 24 * 60 * 60 * 1000);
    }

    const correction = await prisma.attendanceCorrection.create({
      data: {
        attendanceId: attendance.id,
        requestedCheckIn,
        requestedCheckOut,
        reason: body.reason,
      },
    });

    return NextResponse.json({ data: correction }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid correction request.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}