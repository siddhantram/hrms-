import { NextRequest, NextResponse } from "next/server";

import { requireApiPermission } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { profileSchema } from "@/lib/validation";

export async function GET(request: NextRequest) {
  const access = await requireApiPermission(request, "profile:read");
  if (access.response) return access.response;
  const user = await prisma.user.findFirst({
    where: { id: access.session.userId, companyId: access.session.companyId },
    select: {
      firstName: true,
      lastName: true,
      email: true,
      role: true,
      company: { select: { name: true } },
    },
  });
  if (!user) return NextResponse.json({ error: "Account not found" }, { status: 404 });
  return NextResponse.json({ data: user });
}

export async function PATCH(request: NextRequest) {
  const access = await requireApiPermission(request, "profile:update");
  if (access.response) return access.response;
  try {
    const body = profileSchema.parse(await request.json());
    const user = await prisma.user.update({
      where: { id: access.session.userId },
      data: body,
      select: { firstName: true, lastName: true, email: true, role: true },
    });
    await prisma.activityLog.create({
      data: { companyId: access.session.companyId, userId: access.session.userId, action: "PROFILE_UPDATED", entity: "User", entityId: access.session.userId },
    });
    return NextResponse.json({ data: user });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not update profile.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}