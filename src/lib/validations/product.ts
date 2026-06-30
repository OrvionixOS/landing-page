import { z } from "zod";

export const productFieldsSchema = z.object({
  name: z.string().trim().min(1, "Product name is required").max(140),
  category: z.string().trim().max(120).optional(),
  materials: z.string().trim().max(600).optional(),
  description: z.string().trim().max(2000).optional(),
  keyFeatures: z.array(z.string().trim().max(200)).max(10).optional(),
  priceRangeMin: z.number().positive().max(100000).optional(),
  priceRangeMax: z.number().positive().max(100000).optional(),
  attributes: z.record(z.string(), z.string().trim().max(200)).optional(),
});

export const productInputSchema = productFieldsSchema
  .extend({ brandProfileId: z.string().trim().min(1).optional() })
  .refine(
    (data) => data.priceRangeMin == null || data.priceRangeMax == null || data.priceRangeMax >= data.priceRangeMin,
    { message: "Maximum price must be greater than or equal to minimum price", path: ["priceRangeMax"] },
  );
export type ProductInput = z.infer<typeof productInputSchema>;
