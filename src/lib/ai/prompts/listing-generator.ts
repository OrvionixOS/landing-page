import type { ListingSectionName } from "../schemas";

export interface BrandProfileContext {
  name: string;
  tagline?: string | null;
  positioning?: string | null;
  voice?: string | null;
  targetCustomer?: string | null;
  visualDirection?: string | null;
}

export interface ProductContext {
  name: string;
  category?: string | null;
  materials?: string | null;
  description?: string | null;
  keyFeatures?: string[] | null;
  priceRangeMin?: number | null;
  priceRangeMax?: number | null;
  attributes?: Record<string, unknown> | null;
}

const SYSTEM_PROMPT = `You are the Listing Generator inside ListingStudio, an AI-powered platform for Etsy sellers. You write complete, ready-to-publish Etsy listings that are grounded in the seller's saved Brand Profile — every piece of copy must sound like it came from that specific brand, not a generic template.

Output fields: seoTitle, tags, taxonomyPath, attributes, description, imageShotList, videoConcept, heroImageDirection, pricingGuidance, pinterestCopy, instagramCopy, assumptions.

Etsy SEO rules:
- seoTitle: <=140 characters, front-load the highest-intent keywords, read naturally (not keyword-stuffed), reflect the brand's voice.
- tags: exactly 13 tags, each <=20 characters, all lowercase, multi-word long-tail phrases preferred over single generic words, no duplicates, no tag repeated from the title verbatim unless it's a genuinely distinct search term.
- taxonomyPath: your best-guess Etsy category path (e.g. "Home & Living > Kitchen & Dining > Drinkware > Mugs"); this is a suggestion, not a live taxonomy lookup.
- attributes: key/value pairs an Etsy buyer would filter by (color, material, size, style, occasion) — only include what's grounded in the product info given.
- description: scannable, brand-voiced, leads with the buyer benefit, includes materials/dimensions/care info if given, ends with a clear call to action. Do not invent shipping times, return policy specifics, or certifications not provided.
- imageShotList: 4-8 shots a seller should photograph, each with a one-line purpose (e.g. "styled on a breakfast table" → "shows scale and everyday use").
- videoConcept: one short concept for a 5-15 second Etsy listing video.
- heroImageDirection: art direction for the single most important thumbnail image.
- pricingGuidance: a suggested price plus a sensible min/max range and a one-sentence rationale, grounded in the product's price range if given; otherwise reason from materials/positioning and flag it as an assumption.
- pinterestCopy / instagramCopy: short, platform-appropriate social captions in the brand voice, each ready to post as-is.

Grounding rule: never invent specific facts (materials, dimensions, certifications, origin, turnaround time) beyond what's given. Where you must infer something to complete a field, do so reasonably but add a one-line entry to "assumptions" explaining exactly what you inferred.`;

function formatBrand(brand: BrandProfileContext): string {
  return [
    `Brand name: ${brand.name}`,
    brand.tagline ? `Tagline: ${brand.tagline}` : null,
    brand.positioning ? `Positioning: ${brand.positioning}` : null,
    brand.voice ? `Voice: ${brand.voice}` : null,
    brand.targetCustomer ? `Target customer: ${brand.targetCustomer}` : null,
    brand.visualDirection ? `Visual direction: ${brand.visualDirection}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

function formatProduct(product: ProductContext): string {
  return [
    `Product name: ${product.name}`,
    product.category ? `Category: ${product.category}` : null,
    product.materials ? `Materials: ${product.materials}` : null,
    product.description ? `Description: ${product.description}` : null,
    product.keyFeatures?.length ? `Key features: ${product.keyFeatures.join("; ")}` : null,
    product.priceRangeMin != null && product.priceRangeMax != null
      ? `Target price range: $${product.priceRangeMin} - $${product.priceRangeMax}`
      : null,
    product.attributes && Object.keys(product.attributes).length
      ? `Seller-supplied attributes: ${JSON.stringify(product.attributes)}`
      : null,
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildListingPrompt(input: {
  brand: BrandProfileContext;
  product: ProductContext;
}): { system: string; prompt: string } {
  return {
    system: SYSTEM_PROMPT,
    prompt: `Brand Profile:\n${formatBrand(input.brand)}\n\nProduct:\n${formatProduct(input.product)}\n\nGenerate a complete Etsy listing by calling the tool with all fields filled in.`,
  };
}

export function buildSectionRegenerationPrompt(input: {
  brand: BrandProfileContext;
  product: ProductContext;
  section: ListingSectionName;
  currentListing: Record<string, unknown>;
  instruction?: string;
}): { system: string; prompt: string } {
  return {
    system: SYSTEM_PROMPT,
    prompt: `Brand Profile:\n${formatBrand(input.brand)}\n\nProduct:\n${formatProduct(input.product)}\n\nCurrent listing (for context — do not change fields other than the one requested):\n${JSON.stringify(input.currentListing, null, 2)}\n\nRegenerate only the "${input.section}" field.${
      input.instruction ? ` Seller's instruction for this regeneration: ${input.instruction}` : ""
    }\n\nCall the tool with only the "${input.section}" field.`,
  };
}
