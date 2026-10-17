import { NextRequest, NextResponse } from "next/server";

import { requireApiPermission } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { performanceReviewUpdateSchema } from "@/lib/validation";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const access = await requireApiPermission(request, "performance:update");
  if (access.response) return access.response;
  try {
    const { id } = await params;
    const body = performanceReviewUpdateSchema.parse(await request.json());
    const manager = access.session.role === "MANAGER"
      ? await prisma.employee.findFirst({ where: { companyId: access.session.companyId, userId: access.session.userId }, select: { id: true } })
      : null;
    const review = await prisma.performanceReview.findFirst({
      where: {
        id,
        employee: {
          companyId: access.session.companyId,
          ...(access.session.role === "EMPLOYEE"
            ? { userId: access.session.userId }
            : access.session.role === "MANAGER"
              ? { managerId: manager?.id ?? "" }
              : {}),
        },
      },
    });
    if (!review) return NextResponse.json({ error: "Review not found" }, { status: 404 });
    const updated = await prisma.performanceReview.update({
      where: { id },
      data: {
        ...(body.rating !== undefined ? { rating: body.rating } : {}),
        ...(body.feedback !== undefined ? { feedback: body.feedback } : {}),
        ...(body.status ? { status: body.status } : {}),
      },
      include: { employee: { select: { employeeId: true, firstName: true, lastName: true } } },
    });
    await prisma.activityLog.create({
      data: {
        companyId: access.session.companyId,
        userId: access.session.userId,
        action: "PERFORMANCE_REVIEW_UPDATED",
        entity: "PerformanceReview",
        entityId: id,
        oldData: JSON.stringify({ rating: review.rating, status: review.status }),
        newData: JSON.stringify({ rating: updated.rating, status: updated.status }),
      },
    });
    return NextResponse.json({ data: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not update review.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}