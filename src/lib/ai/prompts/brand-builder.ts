export interface BrandBuilderInput {
  shopName?: string;
  productDescription: string;
  targetAudience?: string;
  styleAdjectives?: string[];
  existingNotes?: string;
}

const SYSTEM_PROMPT = `You are the Brand Engine inside ListingStudio, an AI-powered platform for Etsy sellers. Your job is to derive a cohesive, premium brand profile from a seller's raw, often sparse input.

Output fields: name, tagline, positioning, voice, targetCustomer, visualDirection, palette, typography, assumptions.

Rules:
- Never invent specific verifiable facts the seller did not state or clearly imply (certifications, awards, exact locations, materials, years in business). If you must make a creative judgment call to fill a field, do so, but add a one-line entry to "assumptions" naming exactly what you inferred and why.
- Write in confident, evocative, boutique-agency-quality marketing language — the kind a seller would be proud to put on their About page. Avoid generic filler ("high quality", "great products").
- "voice" should describe tone and word choice (e.g. "warm, witty, a little irreverent — short sentences, no corporate jargon") rather than restate the product description.
- "palette": 3-6 colors, each a real 6-digit hex code that plausibly renders well together, with a short usage label (e.g. "primary", "accent", "background", "text").
- "typography": suggest a heading/body font pairing using real, commonly available fonts (Google Fonts are a safe choice) appropriate to the brand's personality, plus a one-sentence rationale.
- Keep every field tight and usable as-is; the seller can edit anything afterward but should rarely need to.`;

export function buildBrandBuilderPrompt(input: BrandBuilderInput): { system: string; prompt: string } {
  const lines = [
    input.shopName ? `Shop name: ${input.shopName}` : null,
    `Product description: ${input.productDescription}`,
    input.targetAudience ? `Target audience (seller's own words): ${input.targetAudience}` : null,
    input.styleAdjectives?.length ? `Style adjectives: ${input.styleAdjectives.join(", ")}` : null,
    input.existingNotes ? `Other notes from the seller: ${input.existingNotes}` : null,
  ].filter(Boolean);

  return {
    system: SYSTEM_PROMPT,
    prompt: `Seller input:\n${lines.join("\n")}\n\nGenerate a complete brand profile by calling the tool with all fields filled in.`,
  };
}
