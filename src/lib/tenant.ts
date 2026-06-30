import { NextResponse } from "next/server";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";

export interface TenantContext {
  userId: string;
  organizationId: string;
  role: "OWNER" | "ADMIN" | "MEMBER";
}

/**
 * Every tenant-scoped API route must call this first and bail out on the
 * error response it returns. This is the single choke point that guarantees
 * a request can never act on data outside its own organization: callers
 * receive `organizationId` from the session (server-derived, never from
 * client-supplied input) and must use it in every Prisma `where` clause.
 */
export async function requireTenant(): Promise<TenantContext | NextResponse> {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!session.user.organizationId) {
    return NextResponse.json(
      { error: "No organization found for this account. Complete onboarding first." },
      { status: 403 },
    );
  }

  return {
    userId: session.user.id,
    organizationId: session.user.organizationId,
    role: session.user.role ?? "MEMBER",
  };
}

export function isTenantContext(value: TenantContext | NextResponse): value is TenantContext {
  return !(value instanceof NextResponse);
}

/**
 * Server Component variant of `requireTenant()`. Pages can't return a
 * `NextResponse` the way route handlers can, so this redirects instead of
 * returning an error response. Safe to call from any page nested under the
 * `(app)` layout, which already guards on session + organizationId.
 */
export async function requireTenantOrRedirect(): Promise<TenantContext> {
  const ctx = await requireTenant();
  if (!isTenantContext(ctx)) {
    redirect("/auth/sign-in");
  }
  return ctx;
}

export function requireRole(
  ctx: TenantContext,
  allowed: Array<TenantContext["role"]>,
): NextResponse | null {
  if (!allowed.includes(ctx.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}
