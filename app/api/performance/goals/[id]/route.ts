import { NextRequest, NextResponse } from "next/server";

import { requireApiPermission } from "@/lib/api-auth";
import { parseDateOnly } from "@/lib/hrms-date";
import { prisma } from "@/lib/db";
import { performanceGoalUpdateSchema } from "@/lib/validation";

async function employeeScope(companyId: string, role: string, userId: string) {
  if (role === "EMPLOYEE") return { companyId, userId };
  if (role !== "MANAGER") return { companyId };
  const manager = await prisma.employee.findFirst({ where: { companyId, userId }, select: { id: true } });
  return { companyId, OR: [{ managerId: manager?.id ?? "" }, { userId }] };
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireApiPermission(request, "performance:goal:update:self");
  if (access.response) return access.response;
  try {
    const { id } = await params;
    const body = performanceGoalUpdateSchema.parse(await request.json());
    const scope = await employeeScope(access.session.companyId, access.session.role, access.session.userId);
    const current = await prisma.performanceGoal.findFirst({ where: { id, employee: scope } });
    if (!current) return NextResponse.json({ error: "Goal not found" }, { status: 404 });
    const isEmployee = access.session.role === "EMPLOYEE";
    if (isEmployee && current.status === "CANCELLED") return NextResponse.json({ error: "Cancelled goals cannot be updated." }, { status: 409 });
    const deadline = body.deadline ? parseDateOnly(body.deadline) : body.deadline === "" ? null : undefined;
    if (body.deadline && !deadline) return NextResponse.json({ error: "Enter a valid deadline." }, { status: 400 });
    const data = isEmployee
      ? {
          ...(body.progress !== undefined ? { progress: body.progress } : {}),
          ...(body.progress !== undefined ? { status: body.progress === 100 ? "COMPLETED" : "ACTIVE" } : {}),
        }
      : {
          ...(body.title !== undefined ? { title: body.title } : {}),
          ...(body.description !== undefined ? { description: body.description || null } : {}),
          ...(body.target !== undefined ? { target: body.target || null } : {}),
          ...(deadline !== undefined ? { deadline } : {}),
          ...(body.progress !== undefined ? { progress: body.progress } : {}),
          ...(body.status !== undefined ? { status: body.status } : {}),
        };
    const goal = await prisma.performanceGoal.update({
      where: { id },
      data,
      include: { employee: { select: { id: true, employeeId: true, firstName: true, lastName: true } } },
    });
    await prisma.activityLog.create({
      data: {
        companyId: access.session.companyId,
        userId: access.session.userId,
        action: "PERFORMANCE_GOAL_UPDATED",
        entity: "PerformanceGoal",
        entityId: id,
        oldData: JSON.stringify({ progress: current.progress, status: current.status }),
        newData: JSON.stringify({ progress: goal.progress, status: goal.status }),
      },
    });
    return NextResponse.json({ data: goal });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not update goal.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}