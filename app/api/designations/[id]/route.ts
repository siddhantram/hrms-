import { NextRequest, NextResponse } from "next/server";

import { requireApiPermission } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { designationSchema } from "@/lib/validation";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireApiPermission(request, "department:update");
  if (access.response) return access.response;
  try {
    const { id } = await params;
    const body = designationSchema.partial().parse(await request.json());
    const current = await prisma.designation.findFirst({ where: { id, companyId: access.session.companyId } });
    if (!current) return NextResponse.json({ error: "Designation not found" }, { status: 404 });
    const designation = await prisma.designation.update({
      where: { id: current.id },
      data: {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.description !== undefined ? { description: body.description || null } : {}),
      },
    });
    return NextResponse.json({ data: designation });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not update designation.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireApiPermission(request, "department:delete");
  if (access.response) return access.response;
  const { id } = await params;
  const designation = await prisma.designation.findFirst({ where: { id, companyId: access.session.companyId }, include: { _count: { select: { employees: true } } } });
  if (!designation) return NextResponse.json({ error: "Designation not found" }, { status: 404 });
  if (designation._count.employees > 0) return NextResponse.json({ error: "Reassign employees before deleting this designation." }, { status: 409 });
  await prisma.designation.delete({ where: { id: designation.id } });
  return NextResponse.json({ success: true });
}