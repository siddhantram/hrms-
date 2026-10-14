import { NextRequest, NextResponse } from "next/server";

import { requireApiPermission } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { companySchema } from "@/lib/validation";

export async function GET(request: NextRequest) {
  const access = await requireApiPermission(request, "company:read");
  if (access.response) return access.response;
  const companies = access.session.role === "SUPER_ADMIN"
    ? await prisma.company.findMany({ include: { _count: { select: { employees: true } } }, orderBy: { createdAt: "desc" }, take: 100 })
    : await prisma.company.findMany({ where: { id: access.session.companyId }, include: { _count: { select: { employees: true } } } });

  return NextResponse.json({ data: companies });
}

export async function POST(request: NextRequest) {
  const access = await requireApiPermission(request, "company:create");
  if (access.response) return access.response;
  try {
    const body = companySchema.parse(await request.json());

    const company = await prisma.company.create({
      data: {
        name: body.name,
        email: body.email || null,
        phone: body.phone || null,
        address: body.address || null,
        website: body.website || null,
        timezone: body.timezone,
        currency: body.currency,
      },
    });

    return NextResponse.json({ data: company }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid company payload.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
