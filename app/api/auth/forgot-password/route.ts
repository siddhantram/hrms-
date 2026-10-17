import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { forgotPasswordSchema } from "@/lib/validation";

const genericMessage = "If an account matches that email, reset instructions will be sent shortly.";

export async function POST(request: Request) {
  if (!process.env.EMAIL_API_KEY || !process.env.EMAIL_FROM || !process.env.NEXT_PUBLIC_APP_URL) {
    return NextResponse.json({ error: "Password reset email is not configured." }, { status: 503 });
  }

  try {
    const { email: submittedEmail } = forgotPasswordSchema.parse(await request.json());
    const user = await prisma.user.findUnique({ where: { email: submittedEmail.toLowerCase() } });
    if (!user) return NextResponse.json({ message: genericMessage });

    const now = new Date();
    const recentToken = await prisma.passwordResetToken.findFirst({
      where: { userId: user.id, createdAt: { gt: new Date(now.getTime() - 60_000) } },
      select: { id: true },
    });
    if (recentToken) return NextResponse.json({ message: genericMessage });

    await prisma.passwordResetToken.deleteMany({ where: { expiresAt: { lt: now } } });
    const token = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(token).digest("hex");
    await prisma.passwordResetToken.updateMany({ where: { userId: user.id, usedAt: null }, data: { usedAt: now } });
    const resetToken = await prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash, expiresAt: new Date(now.getTime() + 30 * 60_000) },
    });
    const resetUrl = new URL("/reset-password", process.env.NEXT_PUBLIC_APP_URL);
    resetUrl.searchParams.set("token", token);
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.EMAIL_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM,
        to: user.email,
        subject: "Reset your HRMS password",
        text: `Use this link to reset your password within 30 minutes: ${resetUrl.toString()}`,
      }),
    });
    if (!emailResponse.ok) {
      await prisma.passwordResetToken.update({ where: { id: resetToken.id }, data: { usedAt: new Date() } });
      console.error("Password reset email delivery failed.");
    }
    return NextResponse.json({ message: genericMessage });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid reset request.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}