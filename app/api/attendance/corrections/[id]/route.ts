import { NextRequest, NextResponse } from "next/server";

import { requireApiPermission } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { normalizeAttendanceRecord } from "@/lib/attendance";
import { clockTime } from "@/lib/hrms-date";
import { attendanceCorrectionDecisionSchema } from "@/lib/validation";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const access = await requireApiPermission(request, "attendance:correction:review");
  if (access.response) return access.response;

  try {
    const { id } = await params;
    const body = attendanceCorrectionDecisionSchema.parse(await request.json());
    const manager = access.session.role === "MANAGER"
      ? await prisma.employee.findFirst({
          where: { companyId: access.session.companyId, userId: access.session.userId },
          select: { id: true },
        })
      : null;

    const correction = await prisma.$transaction(async (transaction) => {
      const current = await transaction.attendanceCorrection.findFirst({
        where: {
          id,
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
        include: { attendance: { include: { employee: true } } },
      });
      if (!current) throw new Error("Correction not found or already reviewed");

      const claimed = await transaction.attendanceCorrection.updateMany({
        where: { id, status: "PENDING" },
        data: {
          status: body.decision,
          reviewedBy: access.session.userId,
          reviewNote: body.reviewNote || null,
        },
      });
      if (claimed.count !== 1) throw new Error("Correction was already reviewed");

      if (body.decision === "APPROVED") {
        const checkIn = current.requestedCheckIn ?? current.attendance.checkIn;
        const checkOut = current.requestedCheckOut ?? current.attendance.checkOut;
        const normalized = normalizeAttendanceRecord({
          employeeId: current.attendance.employeeId,
          date: current.attendance.date.toISOString().slice(0, 10),
          checkIn: clockTime(checkIn),
          checkOut: clockTime(checkOut),
          status: "PRESENT",
        });
        const workingHours = normalized.workingHours ?? 0;

        await transaction.attendance.update({
          where: { id: current.attendanceId },
          data: {
            checkIn,
            checkOut,
            workingHours,
            overtimeHours: Math.max(0, Number((workingHours - 9).toFixed(2))),
            status: normalized.status,
            notes: current.reason,
          },
        });
      }

      await transaction.activityLog.create({
        data: {
          companyId: access.session.companyId,
          userId: access.session.userId,
          action: `ATTENDANCE_CORRECTION_${body.decision}`,
          entity: "AttendanceCorrection",
          entityId: current.id,
          oldData: JSON.stringify({ checkIn: current.attendance.checkIn, checkOut: current.attendance.checkOut }),
          newData: JSON.stringify({
            requestedCheckIn: current.requestedCheckIn,
            requestedCheckOut: current.requestedCheckOut,
            reviewNote: body.reviewNote,
          }),
        },
      });

      return transaction.attendanceCorrection.findUnique({ where: { id } });
    });

    return NextResponse.json({ data: correction });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not review correction.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}