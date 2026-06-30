import { z } from "zod";
import type Anthropic from "@anthropic-ai/sdk";

import { prisma } from "@/lib/prisma";
import type { GenerationType, Prisma } from "@prisma/client";
import { getAnthropicClient, estimateCostUsdMicros } from "./client";

const MAX_ATTEMPTS = 2;
const DEFAULT_MAX_TOKENS = 4096;

interface GenerateStructuredInput<T extends z.ZodTypeAny> {
  organizationId: string;
  userId?: string | null;
  model: string;
  system: string;
  prompt: string;
  schema: T;
  toolName: string;
  generationType: GenerationType;
  inputSummary: Record<string, unknown>;
  maxTokens?: number;
  listingId?: string;
  brandProfileId?: string;
  section?: string;
}

/**
 * Calls Claude with a single forced tool whose input_schema is derived from
 * the given Zod schema, so the model can only respond with structured JSON
 * shaped like that schema. Validates the result again with Zod (the model
 * can still violate semantic constraints a JSON Schema can't express, e.g.
 * exact array length in some edge cases) and retries once with corrective
 * feedback before giving up. Every attempt — success or failure — is
 * recorded to GenerationHistory for cost and quality observability.
 */
export async function generateStructured<T extends z.ZodTypeAny>(
  input: GenerateStructuredInput<T>,
): Promise<z.infer<T>> {
  const client = getAnthropicClient();
  const jsonSchema = z.toJSONSchema(input.schema, { target: "draft-7" }) as Record<string, unknown>;
  delete jsonSchema.$schema;

  const tool: Anthropic.Tool = {
    name: input.toolName,
    description: "Submit the structured result.",
    input_schema: jsonSchema as Anthropic.Tool["input_schema"],
  };

  let lastError = "";
  let lastUsage: { tokensInput: number; tokensOutput: number } | null = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const userPrompt =
      attempt === 1
        ? input.prompt
        : `${input.prompt}\n\nYour previous response was invalid: ${lastError}\nCall the tool again with corrected arguments that satisfy every constraint.`;

    let response: Anthropic.Message;
    try {
      response = await client.messages.create({
        model: input.model,
        max_tokens: input.maxTokens ?? DEFAULT_MAX_TOKENS,
        system: input.system,
        messages: [{ role: "user", content: userPrompt }],
        tools: [tool],
        tool_choice: { type: "tool", name: input.toolName },
      });
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      if (attempt === MAX_ATTEMPTS) {
        await recordGeneration(input, { succeeded: false, errorMessage: lastError, usage: lastUsage });
        throw new Error(`AI request failed: ${lastError}`);
      }
      continue;
    }

    lastUsage = { tokensInput: response.usage.input_tokens, tokensOutput: response.usage.output_tokens };

    const toolUse = response.content.find(
      (block): block is Anthropic.ToolUseBlock => block.type === "tool_use",
    );
    if (!toolUse) {
      lastError = "Model did not call the tool";
      continue;
    }

    const parsed = input.schema.safeParse(toolUse.input);
    if (!parsed.success) {
      lastError = parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ");
      continue;
    }

    await recordGeneration(input, { succeeded: true, output: parsed.data, usage: lastUsage });
    return parsed.data;
  }

  throw new Error(`AI generation failed after ${MAX_ATTEMPTS} attempts: ${lastError}`);
}

async function recordGeneration<T extends z.ZodTypeAny>(
  input: GenerateStructuredInput<T>,
  result: {
    succeeded: boolean;
    output?: unknown;
    errorMessage?: string;
    usage: { tokensInput: number; tokensOutput: number } | null;
  },
): Promise<void> {
  try {
    await prisma.generationHistory.create({
      data: {
        organizationId: input.organizationId,
        createdById: input.userId ?? undefined,
        listingId: input.listingId,
        brandProfileId: input.brandProfileId,
        type: input.generationType,
        model: input.model,
        section: input.section,
        inputSummary: input.inputSummary as Prisma.InputJsonValue,
        outputSummary: (result.output as Prisma.InputJsonValue) ?? {},
        tokensInput: result.usage?.tokensInput,
        tokensOutput: result.usage?.tokensOutput,
        costUsdMicros: result.usage
          ? estimateCostUsdMicros(input.model, result.usage.tokensInput, result.usage.tokensOutput)
          : null,
        succeeded: result.succeeded,
        errorMessage: result.errorMessage,
      },
    });
  } catch (error) {
    console.error("[ai] failed to write generation history", { type: input.generationType, error });
  }
}
