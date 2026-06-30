import { z } from "zod";

import { productFieldsSchema } from "@/lib/validations/product";

export const listingCreateSchema = z
  .object({
    brandProfileId: z.string().trim().min(1, "Select a brand profile"),
    productId: z.string().trim().min(1).optional(),
    product: productFieldsSchema.optional(),
  })
  .refine((data) => Boolean(data.productId) !== Boolean(data.product), {
    message: "Provide either an existing product or new product details, not both",
    path: ["productId"],
  });
export type ListingCreateInput = z.infer<typeof listingCreateSchema>;

const imageShotSchema = z.object({
  shot: z.string().trim().max(120),
  purpose: z.string().trim().max(200),
});

const pricingGuidanceFieldSchema = z.object({
  suggestedPrice: z.number().positive(),
  minPrice: z.number().positive(),
  maxPrice: z.number().positive(),
  rationale: z.string().trim().max(400),
});

export const listingUpdateSchema = z.object({
  seoTitle: z.string().trim().min(10).max(140).optional(),
  tags: z.array(z.string().trim().max(20)).length(13).optional(),
  taxonomyPath: z.string().trim().max(200).optional(),
  attributes: z.record(z.string(), z.string().max(120)).optional(),
  description: z.string().trim().min(50).max(5000).optional(),
  imageShotList: z.array(imageShotSchema).min(4).max(10).optional(),
  videoConcept: z.string().trim().max(600).optional(),
  heroImageDirection: z.string().trim().max(600).optional(),
  pricingGuidance: pricingGuidanceFieldSchema.optional(),
  pinterestCopy: z.string().trim().max(500).optional(),
  instagramCopy: z.string().trim().max(500).optional(),
  status: z.enum(["DRAFT", "READY", "ARCHIVED"]).optional(),
});
export type ListingUpdateInput = z.infer<typeof listingUpdateSchema>;

export const regenerateSectionSchema = z.object({
  section: z.enum([
    "seoTitle",
    "tags",
    "description",
    "imageShotList",
    "videoConcept",
    "heroImageDirection",
    "pricingGuidance",
    "pinterestCopy",
    "instagramCopy",
  ]),
  instruction: z.string().trim().max(500).optional(),
});
export type RegenerateSectionInput = z.infer<typeof regenerateSectionSchema>;
