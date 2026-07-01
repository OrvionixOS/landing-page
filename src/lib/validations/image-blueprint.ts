import { z } from "zod";

export const SLOT_INTENT = ["CTR", "TRUST", "CLARITY", "VALUE", "CONTEXT", "CONVERSION"] as const;
export const PSYCHOLOGICAL_STAGE = [
  "ATTENTION",
  "INTERPRETATION",
  "VALIDATION",
  "SCALE",
  "VALUE_JUSTIFICATION",
  "TRUST_RESOLUTION",
] as const;
export const PRODUCT_CATEGORY = [
  "physical_product",
  "digital_product",
  "print_on_demand",
  "gift_personalized",
  "saas_tool",
] as const;

export const imageBlueprintSchema = z.object({
  category: z.enum(PRODUCT_CATEGORY),
  confidence: z.number().min(0).max(1),
  psychological_profile: z.object({
    dominant_buying_stage: z.enum(PSYCHOLOGICAL_STAGE),
    risk_level: z.enum(["low", "medium", "high"]),
  }),
  slots: z
    .array(
      z.object({
        slot: z.number().int().min(1).max(7),
        intent: z.enum(SLOT_INTENT),
        psychological_stage: z.enum(PSYCHOLOGICAL_STAGE),
        goal: z.string().min(1),
        image_spec: z.object({
          lighting: z.enum(["studio", "natural", "softbox"]),
          camera: z.enum(["macro", "wide", "top-down", "eye-level"]),
          environment: z.enum(["white_background", "lifestyle", "workspace", "home_setting"]),
          composition: z.enum(["centered", "rule_of_thirds", "product_focused"]),
        }),
        prompt: z.string().min(1),
      }),
    )
    .length(7),
  conversion_scores: z.object({
    ctr_score: z.number().int().min(0).max(100),
    trust_score: z.number().int().min(0).max(100),
    clarity_score: z.number().int().min(0).max(100),
    conversion_score: z.number().int().min(0).max(100),
  }),
  optimization_notes: z.array(z.string()).min(1).max(6),
});

export type ImageBlueprint = z.infer<typeof imageBlueprintSchema>;
export type ImageSlot = ImageBlueprint["slots"][number];
