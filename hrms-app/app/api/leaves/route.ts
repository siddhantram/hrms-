import { NextRequest, NextResponse } from "next/server";

import { requireApiPermission } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { countWorkingDays, parseDateOnly } from "@/lib/hrms-date";
import { leaveRequestSchema } from "@/lib/validation";

export async function GET(request: NextRequest) {
  const access = await requireApiPermission(request, "leave:read");
  if (access.response) return access.response;
  const manager = access.session.role === "MANAGER"
    ? await prisma.employee.findFirst({
        where: { companyId: access.session.companyId, userId: access.session.userId },
        select: { id: true },
      })
    : null;

  const employeeFilter = access.session.role === "EMPLOYEE"
    ? { employee: { userId: access.session.userId, companyId: access.session.companyId } }
    : access.session.role === "MANAGER"
      ? {
          companyId: access.session.companyId,
          employee: {
            companyId: access.session.companyId,
            OR: [{ managerId: manager?.id ?? "" }, { userId: access.session.userId }],
          },
        }
      : { companyId: access.session.companyId };

  const [requests, balances] = await Promise.all([
    prisma.leave.findMany({
      where: employeeFilter,
      include: { employee: { select: { id: true, employeeId: true, firstName: true, lastName: true } } },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 500,
    }),
    prisma.leaveBalance.findMany({
      where: access.session.role === "EMPLOYEE"
        ? { employee: { userId: access.session.userId, companyId: access.session.companyId } }
        : access.session.role === "MANAGER"
          ? { employee: { companyId: access.session.companyId, managerId: manager?.id ?? "" } }
          : { employee: { companyId: access.session.companyId } },
      orderBy: [{ employeeId: "asc" }, { leaveType: "asc" }],
    }),
  ]);

  return NextResponse.json({ data: requests, balances });
}

export async function POST(request: NextRequest) {
  const access = await requireApiPermission(request, "leave:create");
  if (access.response) return access.response;

  try {
    const body = leaveRequestSchema.parse(await request.json());
    const employee = access.session.role === "EMPLOYEE"
      ? await prisma.employee.findFirst({ where: { userId: access.session.userId, companyId: access.session.companyId } })
      : body.employeeId
        ? await prisma.employee.findFirst({ where: { id: body.employeeId, companyId: access.session.companyId } })
        : null;
    if (!employee) return NextResponse.json({ error: "Employee profile not found" }, { status: 404 });

    const startDate = parseDateOnly(body.startDate);
    const endDate = parseDateOnly(body.endDate);
    if (!startDate || !endDate) {
      return NextResponse.json({ error: "Dates must be valid YYYY-MM-DD values" }, { status: 400 });
    }

    const holidays = await prisma.holiday.findMany({
      where: { companyId: access.session.companyId, isOptional: false, date: { gte: startDate, lte: endDate } },
      select: { date: true },
    });
    const days = countWorkingDays(startDate, endDate, holidays.map((holiday) => holiday.date.toISOString().slice(0, 10)));
    if (days === 0) {
      return NextResponse.json({ error: "The selected dates contain no working days" }, { status: 400 });
    }

    const balance = await prisma.leaveBalance.findUnique({
      where: { employeeId_leaveType: { employeeId: employee.id, leaveType: body.type } },
    });
    if (!balance) {
      return NextResponse.json({ error: "A leave balance has not been configured for this leave type" }, { status: 409 });
    }
    const pending = await prisma.leave.aggregate({
      where: { employeeId: employee.id, type: body.type, status: "PENDING" },
      _sum: { days: true },
    });
    if ((pending._sum.days ?? 0) + days > balance.remainingDays) {
      return NextResponse.json({ error: "Requested leave exceeds the available balance" }, { status: 409 });
    }

    const overlap = await prisma.leave.findFirst({
      where: {
        employeeId: employee.id,
        status: { in: ["PENDING", "APPROVED"] },
        startDate: { lte: endDate },
        endDate: { gte: startDate },
      },
    });
    if (overlap) {
      return NextResponse.json({ error: "This request overlaps another pending or approved leave" }, { status: 409 });
    }

    const leave = await prisma.$transaction(async (transaction) => {
      const created = await transaction.leave.create({
        data: {
          companyId: access.session.companyId,
          employeeId: employee.id,
          type: body.type,
          startDate,
          endDate,
          days,
          reason: body.reason || null,
        },
        include: { employee: { select: { employeeId: true, firstName: true, lastName: true, managerId: true } } },
      });
      await transaction.activityLog.create({
        data: {
          companyId: access.session.companyId,
          userId: access.session.userId,
          action: "LEAVE_REQUEST_CREATED",
          entity: "Leave",
          entityId: created.id,
          newData: JSON.stringify({ type: created.type, days: created.days, startDate: created.startDate }),
        },
      });
      const managerUser = created.employee.managerId
        ? await transaction.employee.findUnique({ where: { id: created.employee.managerId }, select: { userId: true } })
        : null;
      const recipientIds = managerUser?.userId
        ? [managerUser.userId]
        : (await transaction.user.findMany({ where: { companyId: access.session.companyId, role: "HR", isActive: true }, select: { id: true } })).map((user) => user.id);
      if (recipientIds.length > 0) {
        await transaction.notification.createMany({
          data: recipientIds.map((userId) => ({
            companyId: access.session.companyId,
            userId,
            title: "Leave request submitted",
            message: `${created.employee.firstName} ${created.employee.lastName} requested ${created.days} day(s) of ${created.type}.`,
            type: "LEAVE",
          })),
        });
      }
      return created;
    });

    return NextResponse.json({ data: leave }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid leave request.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
