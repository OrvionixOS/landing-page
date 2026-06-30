import { z } from "zod";

const paletteColorSchema = z.object({
  name: z.string().max(40),
  hex: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Must be a 6-digit hex color"),
  usage: z.string().max(60),
});

const typographySchema = z.object({
  heading: z.string().max(60),
  body: z.string().max(60),
  accent: z.string().max(60).optional(),
  rationale: z.string().max(400),
});

export const brandSuggestionsSchema = z.object({
  name: z.string().max(80),
  tagline: z.string().max(120),
  positioning: z.string().max(600),
  voice: z.string().max(600),
  targetCustomer: z.string().max(600),
  visualDirection: z.string().max(600),
  palette: z.array(paletteColorSchema).min(3).max(6),
  typography: typographySchema,
  assumptions: z.array(z.string().max(300)).max(10),
});
export type BrandSuggestions = z.infer<typeof brandSuggestionsSchema>;

const imageShotSchema = z.object({
  shot: z.string().max(120),
  purpose: z.string().max(200),
});

const pricingGuidanceSchema = z.object({
  suggestedPrice: z.number().positive(),
  minPrice: z.number().positive(),
  maxPrice: z.number().positive(),
  rationale: z.string().max(400),
});

export const listingGenerationSchema = z.object({
  seoTitle: z.string().min(10).max(140),
  tags: z.array(z.string().max(20)).length(13),
  taxonomyPath: z.string().max(200),
  attributes: z.record(z.string(), z.string().max(120)),
  description: z.string().min(50).max(5000),
  imageShotList: z.array(imageShotSchema).min(4).max(10),
  videoConcept: z.string().max(600),
  heroImageDirection: z.string().max(600),
  pricingGuidance: pricingGuidanceSchema,
  pinterestCopy: z.string().max(500),
  instagramCopy: z.string().max(500),
  assumptions: z.array(z.string().max(300)).max(10),
});
export type ListingGeneration = z.infer<typeof listingGenerationSchema>;

/** Sub-schemas for single-section regeneration — one entry per regenerable Listing field. */
export const listingSectionSchemas = {
  seoTitle: z.object({ seoTitle: listingGenerationSchema.shape.seoTitle }),
  tags: z.object({ tags: listingGenerationSchema.shape.tags }),
  description: z.object({ description: listingGenerationSchema.shape.description }),
  imageShotList: z.object({ imageShotList: listingGenerationSchema.shape.imageShotList }),
  videoConcept: z.object({ videoConcept: listingGenerationSchema.shape.videoConcept }),
  heroImageDirection: z.object({ heroImageDirection: listingGenerationSchema.shape.heroImageDirection }),
  pricingGuidance: z.object({ pricingGuidance: listingGenerationSchema.shape.pricingGuidance }),
  pinterestCopy: z.object({ pinterestCopy: listingGenerationSchema.shape.pinterestCopy }),
  instagramCopy: z.object({ instagramCopy: listingGenerationSchema.shape.instagramCopy }),
} as const;

export type ListingSectionName = keyof typeof listingSectionSchemas;
export const LISTING_SECTION_NAMES = Object.keys(listingSectionSchemas) as ListingSectionName[];
