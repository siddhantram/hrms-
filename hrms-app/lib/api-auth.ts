import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { getSessionFromRequest, type SessionUser } from "@/lib/auth";
import { canAccess } from "@/lib/permissions";

type Authorized = { session: SessionUser; response?: never };
type Unauthorized = { session?: never; response: NextResponse };

export async function requireApiPermission(request: NextRequest, permission: string): Promise<Authorized | Unauthorized> {
  const session = await getSessionFromRequest(request);

  if (!session) {
    return { response: NextResponse.json({ error: "Authentication required" }, { status: 401 }) };
  }

  if (!canAccess(session.role, permission)) {
    return { response: NextResponse.json({ error: "You do not have permission to perform this action" }, { status: 403 }) };
  }

  return { session };
}