import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { requireApiPermission } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { employeeSchema } from "@/lib/validation";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const access = await requireApiPermission(request, "employee:read");
  const selfAccess = access.response ? await requireApiPermission(request, "profile:read") : null;
  if (access.response && selfAccess?.response) return access.response;
  const session = access.session ?? selfAccess?.session;
  if (!session) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const { id } = await params;
  const employee = await prisma.employee.findFirst({
    where: {
      id,
      companyId: session.companyId,
      ...(session.role === "EMPLOYEE" ? { userId: session.userId } : {}),
    },
    include: {
      department: true,
      designation: true,
    },
  });

  if (!employee) {
    return NextResponse.json({ error: "Employee not found" }, { status: 404 });
  }

  return NextResponse.json({ data: employee });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const access = await requireApiPermission(request, "employee:update");
  if (access.response) return access.response;
  try {
    const { id } = await params;
    const body = employeeSchema.partial().parse(await request.json());

    const current = await prisma.employee.findFirst({ where: { id, companyId: access.session.companyId } });
    if (!current) return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    const employee = await prisma.employee.update({
      where: { id: current.id },
      data: {
        ...(body.employeeId ? { employeeId: body.employeeId } : {}),
        ...(body.firstName ? { firstName: body.firstName } : {}),
        ...(body.lastName ? { lastName: body.lastName } : {}),
        ...(body.email ? { email: body.email } : {}),
        ...(body.phone !== undefined ? { phone: body.phone || null } : {}),
        ...(body.status ? { status: body.status } : {}),
        ...(body.joiningDate ? { joiningDate: new Date(body.joiningDate) } : {}),
        ...(body.salary !== undefined
          ? { salary: body.salary ? new Prisma.Decimal(body.salary) : null }
          : {}),
      },
    });
    await prisma.activityLog.create({
      data: {
        companyId: access.session.companyId,
        userId: access.session.userId,
        action: "EMPLOYEE_UPDATED",
        entity: "Employee",
        entityId: employee.id,
        oldData: JSON.stringify({ status: current.status, salary: current.salary?.toString() }),
        newData: JSON.stringify({ status: employee.status, salary: employee.salary?.toString() }),
      },
    });

    return NextResponse.json({ data: employee });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid employee payload.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const access = await requireApiPermission(request, "employee:delete");
  if (access.response) return access.response;
  const { id } = await params;
  const employee = await prisma.employee.findFirst({ where: { id, companyId: access.session.companyId } });
  if (!employee) return NextResponse.json({ error: "Employee not found" }, { status: 404 });
  await prisma.employee.delete({ where: { id: employee.id } });
  await prisma.activityLog.create({
    data: { companyId: access.session.companyId, userId: access.session.userId, action: "EMPLOYEE_DELETED", entity: "Employee", entityId: employee.id },
  });

  return NextResponse.json({ success: true });
}
