import { NextRequest, NextResponse } from "next/server";

import { requireApiPermission } from "@/lib/api-auth";
import { parseDateOnly } from "@/lib/hrms-date";
import { prisma } from "@/lib/db";
import { performanceGoalSchema } from "@/lib/validation";

async function employeeScope(companyId: string, role: string, userId: string) {
  if (role === "EMPLOYEE") return { companyId, userId };
  if (role !== "MANAGER") return { companyId };
  const manager = await prisma.employee.findFirst({ where: { companyId, userId }, select: { id: true } });
  return { companyId, OR: [{ managerId: manager?.id ?? "" }, { userId }] };
}

export async function GET(request: NextRequest) {
  const access = await requireApiPermission(request, "performance:read");
  if (access.response) return access.response;
  const scope = await employeeScope(access.session.companyId, access.session.role, access.session.userId);
  const goals = await prisma.performanceGoal.findMany({
    where: { employee: scope },
    include: { employee: { select: { id: true, employeeId: true, firstName: true, lastName: true } } },
    orderBy: [{ status: "asc" }, { deadline: "asc" }, { createdAt: "desc" }],
    take: 500,
  });
  return NextResponse.json({ data: goals });
}

export async function POST(request: NextRequest) {
  const access = await requireApiPermission(request, "performance:create");
  if (access.response) return access.response;
  try {
    const body = performanceGoalSchema.parse(await request.json());
    const scope = await employeeScope(access.session.companyId, access.session.role, access.session.userId);
    const employee = await prisma.employee.findFirst({ where: { id: body.employeeId, ...scope }, select: { id: true } });
    if (!employee) return NextResponse.json({ error: "Employee not found in your team." }, { status: 404 });
    const deadline = body.deadline ? parseDateOnly(body.deadline) : null;
    if (body.deadline && !deadline) return NextResponse.json({ error: "Enter a valid deadline." }, { status: 400 });
    const goal = await prisma.performanceGoal.create({
      data: {
        employeeId: employee.id,
        title: body.title,
        description: body.description || null,
        target: body.target || null,
        deadline,
        progress: body.progress,
        status: body.status,
      },
      include: { employee: { select: { id: true, employeeId: true, firstName: true, lastName: true } } },
    });
    await prisma.activityLog.create({
      data: { companyId: access.session.companyId, userId: access.session.userId, action: "PERFORMANCE_GOAL_CREATED", entity: "PerformanceGoal", entityId: goal.id },
    });
    return NextResponse.json({ data: goal }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not create performance goal.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}