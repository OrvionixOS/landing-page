import { z } from "zod";

export const brandBuilderInputSchema = z.object({
  shopName: z.string().trim().max(80).optional(),
  productDescription: z.string().trim().min(10, "Tell us a bit more about what you sell").max(2000),
  targetAudience: z.string().trim().max(500).optional(),
  styleAdjectives: z.array(z.string().trim().max(30)).max(8).optional(),
  existingNotes: z.string().trim().max(1000).optional(),
});
export type BrandBuilderInputPayload = z.infer<typeof brandBuilderInputSchema>;

const paletteColorSchema = z.object({
  name: z.string().trim().min(1).max(40),
  hex: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Must be a 6-digit hex color"),
  usage: z.string().trim().min(1).max(60),
});

const typographySchema = z.object({
  heading: z.string().trim().min(1).max(60),
  body: z.string().trim().min(1).max(60),
  accent: z.string().trim().max(60).optional(),
  rationale: z.string().trim().max(400).optional(),
});

export const brandProfileInputSchema = z.object({
  name: z.string().trim().min(1, "Brand name is required").max(80),
  tagline: z.string().trim().max(120).optional(),
  positioning: z.string().trim().max(600).optional(),
  voice: z.string().trim().max(600).optional(),
  targetCustomer: z.string().trim().max(600).optional(),
  visualDirection: z.string().trim().max(600).optional(),
  palette: z.array(paletteColorSchema).max(8).optional(),
  typography: typographySchema.optional(),
  origin: z.enum(["EXISTING", "AI_GENERATED"]).default("EXISTING"),
  assumptions: z.array(z.string().trim().max(300)).max(10).optional(),
});
export type BrandProfileInput = z.infer<typeof brandProfileInputSchema>;

export const brandProfileUpdateSchema = brandProfileInputSchema.partial().extend({
  status: z.enum(["ACTIVE", "ARCHIVED"]).optional(),
});
export type BrandProfileUpdateInput = z.infer<typeof brandProfileUpdateSchema>;
