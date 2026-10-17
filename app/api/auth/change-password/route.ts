import { NextRequest, NextResponse } from "next/server";

import { requireApiPermission } from "@/lib/api-auth";
import { hashPassword, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { changePasswordSchema } from "@/lib/validation";

export async function POST(request: NextRequest) {
  const access = await requireApiPermission(request, "profile:update");
  if (access.response) return access.response;
  try {
    const body = changePasswordSchema.parse(await request.json());
    const user = await prisma.user.findFirst({ where: { id: access.session.userId, companyId: access.session.companyId } });
    if (!user || !(await verifyPassword(body.currentPassword, user.passwordHash))) {
      return NextResponse.json({ error: "Current password is incorrect." }, { status: 400 });
    }
    const now = new Date();
    await prisma.$transaction([
      prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(body.newPassword) } }),
      prisma.passwordResetToken.updateMany({ where: { userId: user.id, usedAt: null }, data: { usedAt: now } }),
      prisma.activityLog.create({
        data: { companyId: user.companyId, userId: user.id, action: "PASSWORD_CHANGED", entity: "User", entityId: user.id },
      }),
    ]);
    return NextResponse.json({ message: "Password changed successfully." });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not change password.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}