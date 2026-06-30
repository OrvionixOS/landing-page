import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | null = null;

/**
 * Lazily-constructed singleton. Throwing here (rather than at module load)
 * means routes that don't touch AI still work in environments where
 * ANTHROPIC_API_KEY isn't set yet (e.g. local dev before Phase 1 AI wiring).
 */
export function getAnthropicClient(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY environment variable is not set");
    }
    client = new Anthropic({ apiKey });
  }
  return client;
}

export const AI_MODELS = {
  /** Brand profiles, full listing generation — quality matters more than latency or cost. */
  HIGH_VALUE: "claude-sonnet-4-6",
  /** Single-section regeneration, short copy variants — favors latency and cost. */
  LIGHTWEIGHT: "claude-haiku-4-5-20251001",
} as const;

export type AiModel = (typeof AI_MODELS)[keyof typeof AI_MODELS];

/**
 * Approximate USD price per million tokens, used only for cost observability
 * in GenerationHistory. Confirm against https://www.anthropic.com/pricing
 * periodically — these are not used for billing.
 */
const MODEL_PRICING_PER_MILLION_USD: Record<string, { input: number; output: number }> = {
  [AI_MODELS.HIGH_VALUE]: { input: 3, output: 15 },
  [AI_MODELS.LIGHTWEIGHT]: { input: 0.8, output: 4 },
};

export function estimateCostUsdMicros(
  model: string,
  tokensInput: number,
  tokensOutput: number,
): number | null {
  const pricing = MODEL_PRICING_PER_MILLION_USD[model];
  if (!pricing) return null;
  const usd = (tokensInput / 1_000_000) * pricing.input + (tokensOutput / 1_000_000) * pricing.output;
  return Math.round(usd * 1_000_000);
}
