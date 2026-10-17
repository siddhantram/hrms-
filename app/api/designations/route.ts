import { NextRequest, NextResponse } from "next/server";

import { requireApiPermission } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { designationSchema } from "@/lib/validation";

export async function GET(request: NextRequest) {
  const access = await requireApiPermission(request, "department:read");
  if (access.response) return access.response;
  const designations = await prisma.designation.findMany({
    where: { companyId: access.session.companyId },
    include: { _count: { select: { employees: true } } },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ data: designations });
}

export async function POST(request: NextRequest) {
  const access = await requireApiPermission(request, "department:create");
  if (access.response) return access.response;
  try {
    const body = designationSchema.parse(await request.json());
    const designation = await prisma.designation.create({
      data: {
        companyId: access.session.companyId,
        name: body.name,
        description: body.description || null,
      },
    });

    return NextResponse.json({ data: designation }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid designation payload.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
