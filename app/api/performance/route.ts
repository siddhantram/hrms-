import { NextRequest, NextResponse } from "next/server";

import { requireApiPermission } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { performanceReviewSchema } from "@/lib/validation";

export async function GET(request: NextRequest) {
  const access = await requireApiPermission(request, "performance:read");
  if (access.response) return access.response;
  const manager = access.session.role === "MANAGER"
    ? await prisma.employee.findFirst({ where: { companyId: access.session.companyId, userId: access.session.userId }, select: { id: true } })
    : null;
  const employeeScope = access.session.role === "EMPLOYEE"
    ? { userId: access.session.userId, companyId: access.session.companyId }
    : access.session.role === "MANAGER"
      ? { companyId: access.session.companyId, OR: [{ managerId: manager?.id ?? "" }, { userId: access.session.userId }] }
      : { companyId: access.session.companyId };
  const reviews = await prisma.performanceReview.findMany({
    where: { employee: employeeScope },
    include: { employee: { select: { id: true, employeeId: true, firstName: true, lastName: true } } },
    orderBy: { createdAt: "desc" },
    take: 500,
  });
  return NextResponse.json({ data: reviews });
}

export async function POST(request: NextRequest) {
  const access = await requireApiPermission(request, "performance:create");
  if (access.response) return access.response;
  try {
    const body = performanceReviewSchema.parse(await request.json());
    const manager = access.session.role === "MANAGER"
      ? await prisma.employee.findFirst({ where: { companyId: access.session.companyId, userId: access.session.userId }, select: { id: true } })
      : null;
    const employee = await prisma.employee.findFirst({
      where: {
        id: body.employeeId,
        companyId: access.session.companyId,
        ...(access.session.role === "MANAGER" ? { managerId: manager?.id ?? "" } : {}),
      },
      select: { id: true },
    });
    if (!employee) return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    const review = await prisma.performanceReview.create({
      data: { employeeId: employee.id, cycle: body.cycle },
      include: { employee: { select: { employeeId: true, firstName: true, lastName: true } } },
    });
    await prisma.activityLog.create({
      data: {
        companyId: access.session.companyId,
        userId: access.session.userId,
        action: "PERFORMANCE_REVIEW_CREATED",
        entity: "PerformanceReview",
        entityId: review.id,
        newData: JSON.stringify({ employeeId: employee.id, cycle: review.cycle }),
      },
    });
    return NextResponse.json({ data: review }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid review request.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}