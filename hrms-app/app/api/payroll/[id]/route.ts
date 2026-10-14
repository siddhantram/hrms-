import { NextRequest, NextResponse } from "next/server";

import { requireApiPermission } from "@/lib/api-auth";
import { prisma } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const access = await requireApiPermission(request, "payroll:read");
  if (access.response) return access.response;
  const { id } = await params;
  const payroll = await prisma.payroll.findFirst({
    where: {
      id,
      companyId: access.session.companyId,
      ...(access.session.role === "EMPLOYEE" ? { employee: { userId: access.session.userId } } : {}),
    },
    include: {
      employee: { include: { department: true, designation: true } },
      company: { select: { name: true, address: true, email: true, currency: true } },
      items: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!payroll) return NextResponse.json({ error: "Payslip not found" }, { status: 404 });
  return NextResponse.json({ data: payroll });
}