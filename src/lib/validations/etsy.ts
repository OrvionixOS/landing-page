import { z } from "zod";

export const ETSY_WHO_MADE_OPTIONS = ["i_did", "someone_else", "collective"] as const;

// Etsy's `when_made` enum buckets
// (https://developers.etsy.com/documentation/reference/#operation/createDraftListing).
export const ETSY_WHEN_MADE_OPTIONS = [
  "made_to_order",
  "2020_2026",
  "2010_2019",
  "2006_2009",
  "before_2006",
  "2000_2005",
  "1990s",
  "1980s",
  "1970s",
  "1960s",
  "1950s",
  "1940s",
  "1930s",
  "1920s",
  "1910s",
  "1900s",
  "1800s",
  "1700s",
  "before_1700",
] as const;

export const listingPublishSchema = z.object({
  price: z.number().positive(),
  quantity: z.number().int().positive().max(999),
  whoMade: z.enum(ETSY_WHO_MADE_OPTIONS),
  whenMade: z.enum(ETSY_WHEN_MADE_OPTIONS),
  isSupply: z.boolean(),
  taxonomyId: z.number().int().positive(),
  shippingProfileId: z.string().trim().min(1),
  returnPolicyId: z.string().trim().min(1),
});
export type ListingPublishInput = z.infer<typeof listingPublishSchema>;
