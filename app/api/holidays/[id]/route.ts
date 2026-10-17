import { NextRequest, NextResponse } from "next/server";

import { requireApiPermission } from "@/lib/api-auth";
import { parseDateOnly } from "@/lib/hrms-date";
import { prisma } from "@/lib/db";
import { holidaySchema } from "@/lib/validation";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireApiPermission(request, "holiday:update");
  if (access.response) return access.response;
  try {
    const { id } = await params;
    const body = holidaySchema.partial().parse(await request.json());
    const current = await prisma.holiday.findFirst({ where: { id, companyId: access.session.companyId } });
    if (!current) return NextResponse.json({ error: "Holiday not found" }, { status: 404 });
    const date = body.date === undefined ? undefined : parseDateOnly(body.date);
    if (body.date !== undefined && !date) return NextResponse.json({ error: "Enter a valid calendar date." }, { status: 400 });
    const updated = await prisma.holiday.update({
      where: { id },
      data: {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(date ? { date } : {}),
        ...(body.description !== undefined ? { description: body.description || null } : {}),
        ...(body.isOptional !== undefined ? { isOptional: body.isOptional } : {}),
      },
    });
    await prisma.activityLog.create({
      data: { companyId: access.session.companyId, userId: access.session.userId, action: "HOLIDAY_UPDATED", entity: "Holiday", entityId: id },
    });
    return NextResponse.json({ data: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not update holiday.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireApiPermission(request, "holiday:delete");
  if (access.response) return access.response;
  const { id } = await params;
  const holiday = await prisma.holiday.findFirst({ where: { id, companyId: access.session.companyId } });
  if (!holiday) return NextResponse.json({ error: "Holiday not found" }, { status: 404 });
  await prisma.holiday.delete({ where: { id } });
  await prisma.activityLog.create({
    data: { companyId: access.session.companyId, userId: access.session.userId, action: "HOLIDAY_DELETED", entity: "Holiday", entityId: id },
  });
  return NextResponse.json({ success: true });
}