import { NextRequest, NextResponse } from "next/server";

import { requireApiPermission } from "@/lib/api-auth";
import { parseDateOnly } from "@/lib/hrms-date";
import { prisma } from "@/lib/db";
import { holidaySchema } from "@/lib/validation";

export async function GET(request: NextRequest) {
  const access = await requireApiPermission(request, "holiday:read");
  if (access.response) return access.response;
  const year = Number(request.nextUrl.searchParams.get("year"));
  const holidays = await prisma.holiday.findMany({
    where: {
      companyId: access.session.companyId,
      ...(Number.isInteger(year) && year >= 2000 && year <= 2100
        ? { date: { gte: new Date(Date.UTC(year, 0, 1)), lt: new Date(Date.UTC(year + 1, 0, 1)) } }
        : {}),
    },
    orderBy: { date: "asc" },
  });
  return NextResponse.json({ data: holidays });
}

export async function POST(request: NextRequest) {
  const access = await requireApiPermission(request, "holiday:create");
  if (access.response) return access.response;
  try {
    const body = holidaySchema.parse(await request.json());
    const date = parseDateOnly(body.date);
    if (!date) return NextResponse.json({ error: "Enter a valid calendar date." }, { status: 400 });
    const duplicate = await prisma.holiday.findFirst({ where: { companyId: access.session.companyId, name: body.name, date } });
    if (duplicate) return NextResponse.json({ error: "This holiday is already listed." }, { status: 409 });
    const holiday = await prisma.holiday.create({
      data: { companyId: access.session.companyId, name: body.name, date, description: body.description || null, isOptional: body.isOptional },
    });
    await prisma.activityLog.create({
      data: { companyId: access.session.companyId, userId: access.session.userId, action: "HOLIDAY_CREATED", entity: "Holiday", entityId: holiday.id },
    });
    return NextResponse.json({ data: holiday }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not create holiday.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}