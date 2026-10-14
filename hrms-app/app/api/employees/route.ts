import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { requireApiPermission } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { employeeSchema } from "@/lib/validation";

export async function GET(request: NextRequest) {
  const access = await requireApiPermission(request, "employee:read");
  const isSelf = access.response && await requireApiPermission(request, "profile:read");
  if (access.response && (!isSelf || isSelf.response)) return access.response;
  const session = access.session ?? isSelf?.session;
  if (!session) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") ?? "10")));
  const search = searchParams.get("search")?.trim();
  const manager = session.role === "MANAGER"
    ? await prisma.employee.findFirst({ where: { companyId: session.companyId, userId: session.userId }, select: { id: true } })
    : null;
  const scope: Prisma.EmployeeWhereInput = {
    companyId: session.companyId,
    ...(session.role === "EMPLOYEE"
      ? { userId: session.userId }
      : session.role === "MANAGER"
        ? { OR: [{ managerId: manager?.id ?? "" }, { userId: session.userId }] }
        : {}),
  };
  const where: Prisma.EmployeeWhereInput = search
    ? { AND: [scope, { OR: [
      { firstName: { contains: search, mode: "insensitive" } },
      { lastName: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { employeeId: { contains: search, mode: "insensitive" } },
    ] }] }
    : scope;

  const skipped = (page - 1) * limit;
  const total = await prisma.employee.count({ where });

  const employees = await prisma.employee.findMany({
    where,
    include: {
      department: true,
      designation: true,
    },
    skip: skipped,
    take: limit,
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    data: employees,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  });
}

export async function POST(request: NextRequest) {
  const access = await requireApiPermission(request, "employee:create");
  if (access.response) return access.response;
  try {
    const body = employeeSchema.parse(await request.json());
    const companyId = access.session.companyId;

    let departmentId: string | undefined;
    if (body.department) {
      const department = await prisma.department.upsert({
        where: { companyId_name: { companyId, name: body.department } },
        create: { companyId, name: body.department },
        update: {},
      });
      departmentId = department.id;
    }

    let designationId: string | undefined;
    if (body.designation) {
      const designation = await prisma.designation.upsert({
        where: { companyId_name: { companyId, name: body.designation } },
        create: { companyId, name: body.designation },
        update: {},
      });
      designationId = designation.id;
    }

    const employee = await prisma.employee.create({
      data: {
        companyId,
        employeeId: body.employeeId,
        firstName: body.firstName,
        lastName: body.lastName,
        email: body.email,
        phone: body.phone || null,
        departmentId,
        designationId,
        status: body.status,
        salary: body.salary ? new Prisma.Decimal(body.salary) : null,
        joiningDate: body.joiningDate ? new Date(body.joiningDate) : new Date(),
      },
      include: {
        department: true,
        designation: true,
      },
    });

    await prisma.activityLog.create({
      data: {
        companyId,
        userId: access.session.userId,
        action: "EMPLOYEE_CREATED",
        entity: "Employee",
        entityId: employee.id,
        newData: JSON.stringify({ employeeId: employee.employeeId, email: employee.email }),
      },
    });

    return NextResponse.json({ data: employee }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid employee payload.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
