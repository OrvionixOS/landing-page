import { AI_MODELS } from "./client";
import { generateStructured } from "./generate";
import { brandSuggestionsSchema, type BrandSuggestions } from "./schemas";
import { buildBrandBuilderPrompt, type BrandBuilderInput } from "./prompts/brand-builder";

export async function generateBrandSuggestions(params: {
  organizationId: string;
  userId?: string | null;
  input: BrandBuilderInput;
}): Promise<BrandSuggestions> {
  const { system, prompt } = buildBrandBuilderPrompt(params.input);

  return generateStructured({
    organizationId: params.organizationId,
    userId: params.userId,
    model: AI_MODELS.HIGH_VALUE,
    system,
    prompt,
    schema: brandSuggestionsSchema,
    toolName: "submit_brand_profile",
    generationType: "BRAND_SUGGESTIONS",
    inputSummary: { ...params.input },
  });
}
