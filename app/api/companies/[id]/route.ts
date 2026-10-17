import { NextRequest, NextResponse } from "next/server";

import { requireApiPermission } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { companySchema } from "@/lib/validation";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireApiPermission(request, "company:update");
  if (access.response) return access.response;
  try {
    const { id } = await params;
    const body = companySchema.partial().parse(await request.json());
    const current = await prisma.company.findUnique({ where: { id } });
    if (!current) return NextResponse.json({ error: "Company not found" }, { status: 404 });
    const company = await prisma.company.update({
      where: { id },
      data: {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.email !== undefined ? { email: body.email || null } : {}),
        ...(body.phone !== undefined ? { phone: body.phone || null } : {}),
        ...(body.address !== undefined ? { address: body.address || null } : {}),
        ...(body.website !== undefined ? { website: body.website || null } : {}),
        ...(body.timezone !== undefined ? { timezone: body.timezone } : {}),
        ...(body.currency !== undefined ? { currency: body.currency } : {}),
      },
    });
    return NextResponse.json({ data: company });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not update company.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireApiPermission(request, "company:delete");
  if (access.response) return access.response;
  const { id } = await params;
  const company = await prisma.company.findUnique({ where: { id }, include: { _count: { select: { employees: true, users: true } } } });
  if (!company) return NextResponse.json({ error: "Company not found" }, { status: 404 });
  if (company._count.employees > 0 || company._count.users > 0) {
    return NextResponse.json({ error: "Companies with employees or users cannot be deleted." }, { status: 409 });
  }
  try {
    await prisma.company.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Company has linked records and cannot be deleted." }, { status: 409 });
  }
}