import { NextRequest, NextResponse } from "next/server";

import { requireApiPermission } from "@/lib/api-auth";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const access = await requireApiPermission(request, "profile:read");
  if (access.response) return access.response;
  const notifications = await prisma.notification.findMany({
    where: { companyId: access.session.companyId, userId: access.session.userId },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return NextResponse.json({ data: notifications });
}

export async function PATCH(request: NextRequest) {
  const access = await requireApiPermission(request, "profile:read");
  if (access.response) return access.response;
  try {
    const body = await request.json();
    if (typeof body.id !== "string" || !body.id) {
      return NextResponse.json({ error: "Notification ID is required" }, { status: 400 });
    }
    const updated = await prisma.notification.updateMany({
      where: { id: body.id, companyId: access.session.companyId, userId: access.session.userId },
      data: { read: true },
    });
    if (updated.count !== 1) return NextResponse.json({ error: "Notification not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not update notification.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}