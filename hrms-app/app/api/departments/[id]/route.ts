import { NextRequest, NextResponse } from "next/server";

import { requireApiPermission } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { departmentSchema } from "@/lib/validation";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireApiPermission(request, "department:update");
  if (access.response) return access.response;
  try {
    const { id } = await params;
    const body = departmentSchema.partial().parse(await request.json());
    const current = await prisma.department.findFirst({ where: { id, companyId: access.session.companyId } });
    if (!current) return NextResponse.json({ error: "Department not found" }, { status: 404 });
    const department = await prisma.department.update({
      where: { id: current.id },
      data: {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.description !== undefined ? { description: body.description || null } : {}),
      },
    });
    return NextResponse.json({ data: department });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not update department.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireApiPermission(request, "department:delete");
  if (access.response) return access.response;
  const { id } = await params;
  const department = await prisma.department.findFirst({ where: { id, companyId: access.session.companyId }, include: { _count: { select: { employees: true } } } });
  if (!department) return NextResponse.json({ error: "Department not found" }, { status: 404 });
  if (department._count.employees > 0) return NextResponse.json({ error: "Reassign employees before deleting this department." }, { status: 409 });
  await prisma.department.delete({ where: { id: department.id } });
  return NextResponse.json({ success: true });
}