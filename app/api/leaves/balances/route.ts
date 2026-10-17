import { NextRequest, NextResponse } from "next/server";

import { requireApiPermission } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { leaveBalanceSchema } from "@/lib/validation";

export async function POST(request: NextRequest) {
  const access = await requireApiPermission(request, "leave:balance:manage");
  if (access.response) return access.response;

  try {
    const body = leaveBalanceSchema.parse(await request.json());
    const employee = await prisma.employee.findFirst({
      where: { id: body.employeeId, companyId: access.session.companyId },
      select: { id: true },
    });
    if (!employee) return NextResponse.json({ error: "Employee not found" }, { status: 404 });

    const balance = await prisma.$transaction(async (transaction) => {
      const existing = await transaction.leaveBalance.findUnique({
        where: { employeeId_leaveType: { employeeId: employee.id, leaveType: body.leaveType } },
      });
      let updated;
      if (existing) {
        const change = await transaction.leaveBalance.updateMany({
          where: { id: existing.id, usedDays: { lte: body.allocatedDays } },
          data: {
            allocatedDays: body.allocatedDays,
            remainingDays: { increment: body.allocatedDays - existing.allocatedDays },
          },
        });
        if (change.count !== 1) throw new Error("Allocation cannot be lower than days already used");
        updated = await transaction.leaveBalance.findUniqueOrThrow({ where: { id: existing.id } });
      } else {
        updated = await transaction.leaveBalance.create({
          data: {
            employeeId: employee.id,
            leaveType: body.leaveType,
            allocatedDays: body.allocatedDays,
            remainingDays: body.allocatedDays,
          },
        });
      }

      await transaction.activityLog.create({
        data: {
          companyId: access.session.companyId,
          userId: access.session.userId,
          action: "LEAVE_BALANCE_SET",
          entity: "LeaveBalance",
          entityId: updated.id,
          oldData: existing ? JSON.stringify({ allocatedDays: existing.allocatedDays }) : null,
          newData: JSON.stringify({ employeeId: employee.id, leaveType: body.leaveType, allocatedDays: body.allocatedDays }),
        },
      });
      return updated;
    });

    return NextResponse.json({ data: balance });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid leave balance.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}