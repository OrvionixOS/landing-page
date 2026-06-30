import { AI_MODELS } from "./client";
import { generateStructured } from "./generate";
import {
  listingGenerationSchema,
  listingSectionSchemas,
  type ListingGeneration,
  type ListingSectionName,
} from "./schemas";
import {
  buildListingPrompt,
  buildSectionRegenerationPrompt,
  type BrandProfileContext,
  type ProductContext,
} from "./prompts/listing-generator";

export async function generateListing(params: {
  organizationId: string;
  userId?: string | null;
  brandProfileId: string;
  brand: BrandProfileContext;
  product: ProductContext;
}): Promise<ListingGeneration> {
  const { system, prompt } = buildListingPrompt({ brand: params.brand, product: params.product });

  return generateStructured({
    organizationId: params.organizationId,
    userId: params.userId,
    brandProfileId: params.brandProfileId,
    model: AI_MODELS.HIGH_VALUE,
    system,
    prompt,
    schema: listingGenerationSchema,
    toolName: "submit_listing",
    generationType: "LISTING_FULL",
    inputSummary: { brand: params.brand, product: params.product },
  });
}

export async function regenerateListingSection<S extends ListingSectionName>(params: {
  organizationId: string;
  userId?: string | null;
  listingId: string;
  brandProfileId: string;
  brand: BrandProfileContext;
  product: ProductContext;
  section: S;
  currentListing: Record<string, unknown>;
  instruction?: string;
}): Promise<Pick<ListingGeneration, S>> {
  const { system, prompt } = buildSectionRegenerationPrompt({
    brand: params.brand,
    product: params.product,
    section: params.section,
    currentListing: params.currentListing,
    instruction: params.instruction,
  });

  const schema = listingSectionSchemas[params.section];

  const result = await generateStructured({
    organizationId: params.organizationId,
    userId: params.userId,
    listingId: params.listingId,
    brandProfileId: params.brandProfileId,
    section: params.section,
    model: AI_MODELS.LIGHTWEIGHT,
    system,
    prompt,
    schema,
    toolName: "submit_listing_section",
    generationType: "LISTING_SECTION",
    inputSummary: { brand: params.brand, product: params.product, section: params.section },
  });

  return result as Pick<ListingGeneration, S>;
}
