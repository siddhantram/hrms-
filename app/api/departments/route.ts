import { NextRequest, NextResponse } from "next/server";

import { requireApiPermission } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { departmentSchema } from "@/lib/validation";

export async function GET(request: NextRequest) {
  const access = await requireApiPermission(request, "department:read");
  if (access.response) return access.response;
  const departments = await prisma.department.findMany({
    where: { companyId: access.session.companyId },
    include: { _count: { select: { employees: true } } },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ data: departments });
}

export async function POST(request: NextRequest) {
  const access = await requireApiPermission(request, "department:create");
  if (access.response) return access.response;
  try {
    const body = departmentSchema.parse(await request.json());
    const department = await prisma.department.create({
      data: { companyId: access.session.companyId, name: body.name, description: body.description || null },
    });
    return NextResponse.json({ data: department }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid department payload.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
