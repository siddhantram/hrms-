import { NextResponse } from "next/server";

import { createSessionToken, hashPassword, setSessionCookie } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { registerSchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const body = registerSchema.parse(await request.json());
    const email = body.email.toLowerCase();

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 },
      );
    }

    const company = await prisma.company.create({
      data: {
        name: body.companyName,
        email,
        timezone: "UTC",
        currency: "INR",
      },
    });

    const user = await prisma.user.create({
      data: {
        companyId: company.id,
        email,
        firstName: body.firstName,
        lastName: body.lastName,
        passwordHash: await hashPassword(body.password),
        role: body.role,
        isVerified: true,
      },
    });

    const sessionToken = await createSessionToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      companyId: company.id,
    });

    const response = NextResponse.json(
      {
        message: "Registration successful.",
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role,
        },
      },
      { status: 201 },
    );

    return setSessionCookie(response, sessionToken);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid registration details.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
