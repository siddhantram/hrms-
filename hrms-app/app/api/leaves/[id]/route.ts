import { NextRequest, NextResponse } from "next/server";

import { requireApiPermission } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { leaveDecisionSchema } from "@/lib/validation";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const access = await requireApiPermission(request, "leave:approve");
  if (access.response) return access.response;

  try {
    const { id } = await params;
    const body = leaveDecisionSchema.parse(await request.json());
    const manager = access.session.role === "MANAGER"
      ? await prisma.employee.findFirst({
          where: { companyId: access.session.companyId, userId: access.session.userId },
          select: { id: true },
        })
      : null;
    const leave = await prisma.$transaction(async (transaction) => {
      const current = await transaction.leave.findFirst({
        where: {
          id,
          companyId: access.session.companyId,
          status: "PENDING",
          ...(access.session.role === "MANAGER"
            ? { employee: { managerId: manager?.id ?? "" } }
            : {}),
        },
        include: { employee: { select: { userId: true, firstName: true, lastName: true } } },
      });
      if (!current) throw new Error("Leave request not found or already reviewed");

      if (body.decision === "APPROVED") {
        const balance = await transaction.leaveBalance.updateMany({
          where: {
            employeeId: current.employeeId,
            leaveType: current.type,
            remainingDays: { gte: current.days },
          },
          data: {
            remainingDays: { decrement: current.days },
            usedDays: { increment: current.days },
          },
        });
        if (balance.count !== 1) throw new Error("Insufficient leave balance or balance not configured");
      }

      const claimed = await transaction.leave.updateMany({
        where: { id, companyId: access.session.companyId, status: "PENDING" },
        data: { status: body.decision },
      });
      if (claimed.count !== 1) throw new Error("Leave request was already reviewed");

      await transaction.activityLog.create({
        data: {
          companyId: access.session.companyId,
          userId: access.session.userId,
          action: `LEAVE_${body.decision}`,
          entity: "Leave",
          entityId: id,
          oldData: JSON.stringify({ status: current.status }),
          newData: JSON.stringify({ status: body.decision, reviewNote: body.reviewNote }),
        },
      });
      if (current.employee.userId) {
        await transaction.notification.create({
          data: {
            companyId: access.session.companyId,
            userId: current.employee.userId,
            title: `Leave ${body.decision.toLowerCase()}`,
            message: `Your ${current.type} request for ${current.days} day(s) was ${body.decision.toLowerCase()}.`,
            type: "LEAVE",
          },
        });
      }

      return transaction.leave.findUnique({
        where: { id },
        include: { employee: { select: { employeeId: true, firstName: true, lastName: true } } },
      });
    });

    return NextResponse.json({ data: leave });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not review leave request.";
    return NextResponse.json({ error: message }, { status: 409 });
  }
}