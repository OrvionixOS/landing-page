import { NextRequest, NextResponse } from "next/server";

import { requireTenant, isTenantContext } from "@/lib/tenant";
import { brandBuilderInputSchema } from "@/lib/validations/brand";
import { generateBrandSuggestions } from "@/lib/ai/brand-engine";
import { rateLimit } from "@/lib/security/rate-limit";

export async function POST(request: NextRequest) {
  const ctx = await requireTenant();
  if (!isTenantContext(ctx)) return ctx;

  const limit = rateLimit(`ai:brand-suggestions:${ctx.organizationId}`, 10, 60 * 60 * 1000);
  if (!limit.success) {
    return NextResponse.json(
      { error: "You've hit the AI generation limit for this hour. Please try again later." },
      { status: 429 },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = brandBuilderInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  try {
    const suggestions = await generateBrandSuggestions({
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      input: parsed.data,
    });
    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error("[ai/brand-suggestions] generation failed", error);
    return NextResponse.json(
      { error: "Brand generation failed. Please try again." },
      { status: 502 },
    );
  }
}
