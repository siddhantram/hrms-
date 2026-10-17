import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { requireApiPermission } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { payrollRunSchema } from "@/lib/validation";

export async function GET(request: NextRequest) {
  const access = await requireApiPermission(request, "payroll:read");
  if (access.response) return access.response;
  const records = await prisma.payroll.findMany({
    where: access.session.role === "EMPLOYEE"
      ? { companyId: access.session.companyId, employee: { userId: access.session.userId } }
      : { companyId: access.session.companyId },
    include: {
      employee: { select: { id: true, employeeId: true, firstName: true, lastName: true, department: { select: { name: true } } } },
      items: true,
    },
    orderBy: [{ month: "desc" }, { createdAt: "desc" }],
    take: 500,
  });
  return NextResponse.json({ data: records });
}

export async function POST(request: NextRequest) {
  const access = await requireApiPermission(request, "payroll:create");
  if (access.response) return access.response;
  try {
    const body = payrollRunSchema.parse(await request.json());
    const employee = await prisma.employee.findFirst({
      where: { id: body.employeeId, companyId: access.session.companyId },
    });
    if (!employee) return NextResponse.json({ error: "Employee not found" }, { status: 404 });

    const gross = body.basic + body.hra + body.allowance + body.bonus + body.overtime;
    const deductions = body.tax + body.pf + body.otherDeductions;
    if (deductions > gross) return NextResponse.json({ error: "Deductions cannot exceed gross earnings" }, { status: 400 });
    const net = gross - deductions;

    const payroll = await prisma.$transaction(async (transaction) => {
      const created = await transaction.payroll.create({
        data: {
          companyId: access.session.companyId,
          employeeId: employee.id,
          month: body.month,
          grossSalary: new Prisma.Decimal(gross),
          deductions: new Prisma.Decimal(deductions),
          netSalary: new Prisma.Decimal(net),
          status: "GENERATED",
          items: {
            create: [
              { type: "EARNING", label: "Basic salary", amount: body.basic },
              { type: "EARNING", label: "HRA", amount: body.hra },
              { type: "EARNING", label: "Allowance", amount: body.allowance },
              { type: "EARNING", label: "Bonus", amount: body.bonus },
              { type: "EARNING", label: "Overtime", amount: body.overtime },
              { type: "DEDUCTION", label: "Tax", amount: body.tax },
              { type: "DEDUCTION", label: "PF", amount: body.pf },
              { type: "DEDUCTION", label: "Other deductions", amount: body.otherDeductions },
            ],
          },
        },
        include: { employee: { include: { user: { select: { id: true } } } }, items: true },
      });
      if (created.employee.user) {
        await transaction.notification.create({
          data: {
            companyId: access.session.companyId,
            userId: created.employee.user.id,
            title: "Payroll generated",
            message: `Your ${body.month} payslip is ready.`,
            type: "PAYROLL",
          },
        });
      }
      await transaction.activityLog.create({
        data: {
          companyId: access.session.companyId,
          userId: access.session.userId,
          action: "PAYROLL_GENERATED",
          entity: "Payroll",
          entityId: created.id,
          newData: JSON.stringify({ employeeId: employee.id, month: body.month, gross, deductions, net }),
        },
      });
      return created;
    });
    return NextResponse.json({ data: payroll }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid payroll payload.";
    const status = error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002" ? 409 : 400;
    return NextResponse.json({ error: status === 409 ? "Payroll already exists for this employee and month" : message }, { status });
  }
}
