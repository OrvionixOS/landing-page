import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validations/auth";
import { slugify } from "@/lib/utils";
import { logAudit } from "@/lib/audit";
import { rateLimit, getClientIp } from "@/lib/security/rate-limit";

const BCRYPT_ROUNDS = 12;

function currentPeriod(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Appends a short random suffix until the slug is free. Bounded to avoid an infinite loop under pathological collisions. */
async function uniqueOrgSlug(base: string): Promise<string> {
  const root = slugify(base) || "org";
  for (let attempt = 0; attempt < 25; attempt++) {
    const candidate = attempt === 0 ? root : `${root}-${Math.random().toString(36).slice(2, 7)}`;
    const existing = await prisma.organization.findUnique({ where: { slug: candidate } });
    if (!existing) return candidate;
  }
  throw new Error("Could not generate a unique organization slug");
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request.headers);
  const limit = rateLimit(`register:${ip}`, 5, 60 * 60 * 1000);
  if (!limit.success) {
    return NextResponse.json(
      { error: "Too many registration attempts. Please try again later." },
      { status: 429 },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { name, email, password, organizationName } = parsed.data;
  const normalizedEmail = email.toLowerCase();

  const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existingUser) {
    return NextResponse.json(
      { error: "An account with this email already exists." },
      { status: 409 },
    );
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const slug = await uniqueOrgSlug(organizationName);
  const period = currentPeriod();

  const result = await prisma.$transaction(async (tx) => {
    const organization = await tx.organization.create({
      data: { name: organizationName, slug },
    });

    const user = await tx.user.create({
      data: { name, email: normalizedEmail, passwordHash },
    });

    await tx.membership.create({
      data: { userId: user.id, organizationId: organization.id, role: "OWNER" },
    });

    await tx.subscription.create({
      data: { organizationId: organization.id, plan: "FREE_TRIAL", status: "TRIALING" },
    });

    await tx.usage.create({
      data: { organizationId: organization.id, period },
    });

    return { user, organization };
  });

  await logAudit({
    organizationId: result.organization.id,
    userId: result.user.id,
    action: "user.registered",
    entityType: "User",
    entityId: result.user.id,
    ipAddress: ip,
  });

  return NextResponse.json(
    {
      user: { id: result.user.id, email: result.user.email, name: result.user.name },
      organization: { id: result.organization.id, slug: result.organization.slug },
    },
    { status: 201 },
  );
}
