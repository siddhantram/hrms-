import { NextRequest, NextResponse } from "next/server";

import { requireApiPermission } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { documentSchema } from "@/lib/validation";

export async function GET(request: NextRequest) {
  const access = await requireApiPermission(request, "document:read");
  if (access.response) return access.response;
  const documents = await prisma.document.findMany({
    where: access.session.role === "EMPLOYEE"
      ? { companyId: access.session.companyId, employee: { userId: access.session.userId } }
      : { companyId: access.session.companyId },
    include: { employee: { select: { employeeId: true, firstName: true, lastName: true } } },
    orderBy: { uploadedAt: "desc" },
    take: 500,
  });
  return NextResponse.json({ data: documents });
}

export async function POST(request: NextRequest) {
  const access = await requireApiPermission(request, "document:create");
  if (access.response) return access.response;
  try {
    const body = documentSchema.parse(await request.json());
    const employee = access.session.role === "EMPLOYEE"
      ? await prisma.employee.findFirst({ where: { companyId: access.session.companyId, userId: access.session.userId }, select: { id: true } })
      : body.employeeId
        ? await prisma.employee.findFirst({ where: { id: body.employeeId, companyId: access.session.companyId }, select: { id: true } })
        : null;
    if (!employee) return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    const document = await prisma.document.create({
      data: { companyId: access.session.companyId, employeeId: employee.id, name: body.name, url: body.url, type: body.type },
      include: { employee: { select: { employeeId: true, firstName: true, lastName: true } } },
    });
    await prisma.activityLog.create({
      data: {
        companyId: access.session.companyId,
        userId: access.session.userId,
        action: "DOCUMENT_REGISTERED",
        entity: "Document",
        entityId: document.id,
        newData: JSON.stringify({ employeeId: employee.id, name: document.name, type: document.type }),
      },
    });
    return NextResponse.json({ data: document }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid document details.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}