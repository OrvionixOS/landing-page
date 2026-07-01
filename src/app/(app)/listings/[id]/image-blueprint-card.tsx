"use client";

import { useState } from "react";
import { Sparkles, Copy, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import type { ImageBlueprint, ImageSlot } from "@/lib/validations/image-blueprint";

// ─── Intent colours ────────────────────────────────────────────────────────
const INTENT_STYLES: Record<string, string> = {
  CTR: "bg-blue-100 text-blue-800",
  TRUST: "bg-green-100 text-green-800",
  CLARITY: "bg-yellow-100 text-yellow-800",
  VALUE: "bg-purple-100 text-purple-800",
  CONTEXT: "bg-orange-100 text-orange-800",
  CONVERSION: "bg-red-100 text-red-800",
};

const STAGE_STYLES: Record<string, string> = {
  ATTENTION: "bg-blue-50 text-blue-700",
  INTERPRETATION: "bg-orange-50 text-orange-700",
  VALIDATION: "bg-green-50 text-green-700",
  SCALE: "bg-yellow-50 text-yellow-700",
  VALUE_JUSTIFICATION: "bg-purple-50 text-purple-700",
  TRUST_RESOLUTION: "bg-teal-50 text-teal-700",
};

const CATEGORY_LABELS: Record<string, string> = {
  physical_product: "Physical Product",
  digital_product: "Digital Product",
  print_on_demand: "Print on Demand",
  gift_personalized: "Personalized Gift",
  saas_tool: "SaaS Tool",
};

const RISK_STYLES: Record<string, string> = {
  low: "bg-green-100 text-green-800",
  medium: "bg-yellow-100 text-yellow-800",
  high: "bg-red-100 text-red-800",
};

function Badge({ label, className }: { label: string; className: string }) {
  return (
    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-semibold ${className}`}>
      {label}
    </span>
  );
}

function ScoreBar({ label, score }: { label: string; score: number }) {
  const color =
    score >= 75 ? "bg-green-500" : score >= 50 ? "bg-yellow-400" : "bg-red-400";
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted">{label}</span>
        <span className="font-semibold text-foreground">{score}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted-surface">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}

function CopyPromptButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }
  return (
    <button
      type="button"
      onClick={handleCopy}
      className="flex shrink-0 items-center gap-1 text-xs text-muted hover:text-foreground"
    >
      {copied ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />}
      {copied ? "Copied" : "Copy prompt"}
    </button>
  );
}

function SlotCard({ slot }: { slot: ImageSlot }) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted-surface text-xs font-bold text-foreground">
            {slot.slot}
          </span>
          <Badge label={slot.intent} className={INTENT_STYLES[slot.intent] ?? ""} />
          <Badge
            label={slot.psychological_stage.replace(/_/g, " ")}
            className={STAGE_STYLES[slot.psychological_stage] ?? ""}
          />
        </div>
        <CopyPromptButton text={slot.prompt} />
      </div>

      <p className="text-sm font-medium text-foreground">{slot.goal}</p>

      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted">
        <span>
          <span className="font-medium text-foreground">Lighting:</span> {slot.image_spec.lighting}
        </span>
        <span>
          <span className="font-medium text-foreground">Camera:</span> {slot.image_spec.camera}
        </span>
        <span>
          <span className="font-medium text-foreground">Environment:</span>{" "}
          {slot.image_spec.environment.replace(/_/g, " ")}
        </span>
        <span>
          <span className="font-medium text-foreground">Composition:</span>{" "}
          {slot.image_spec.composition.replace(/_/g, " ")}
        </span>
      </div>

      <p className="rounded-md bg-muted-surface px-3 py-2 text-xs font-mono text-foreground">
        {slot.prompt}
      </p>
    </div>
  );
}

interface ImageBlueprintCardProps {
  listingId: string;
  initialBlueprint: ImageBlueprint | null;
  hasContent: boolean;
}

export function ImageBlueprintCard({ listingId, initialBlueprint, hasContent }: ImageBlueprintCardProps) {
  const [blueprint, setBlueprint] = useState<ImageBlueprint | null>(initialBlueprint);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    setError(null);
    setIsGenerating(true);

    const response = await fetch(`/api/listings/${listingId}/image-blueprint`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    setIsGenerating(false);

    if (!response.ok) {
      const result = await response.json().catch(() => null);
      setError(result?.error || "Could not generate image blueprint.");
      return;
    }

    const result = await response.json();
    setBlueprint(result.blueprint);
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <div>
            <CardTitle>Image Blueprint</CardTitle>
            <CardDescription>
              7-slot conversion architecture based on Etsy buyer psychology — defines what images
              must exist for maximum click-through and purchase confidence.
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleGenerate}
            isLoading={isGenerating}
            disabled={!hasContent}
            className="shrink-0"
          >
            <Sparkles className="h-3.5 w-3.5" />
            {blueprint ? "Regenerate" : "Generate Blueprint"}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        {!hasContent && (
          <Alert variant="info">
            Generate the listing title and description first, then run the Image Blueprint.
          </Alert>
        )}

        {error && <Alert variant="danger">{error}</Alert>}

        {blueprint && (
          <>
            {/* Header meta */}
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                label={CATEGORY_LABELS[blueprint.category] ?? blueprint.category}
                className="bg-accent/10 text-accent"
              />
              <Badge
                label={`Risk: ${blueprint.psychological_profile.risk_level}`}
                className={RISK_STYLES[blueprint.psychological_profile.risk_level] ?? ""}
              />
              <Badge
                label={`Dominant stage: ${blueprint.psychological_profile.dominant_buying_stage.replace(/_/g, " ")}`}
                className={STAGE_STYLES[blueprint.psychological_profile.dominant_buying_stage] ?? ""}
              />
              <span className="ml-auto text-xs text-muted">
                {Math.round(blueprint.confidence * 100)}% confidence
              </span>
            </div>

            {/* Conversion scores */}
            <div className="grid grid-cols-2 gap-3 rounded-lg border border-border bg-muted-surface p-4 sm:grid-cols-4">
              <ScoreBar label="CTR" score={blueprint.conversion_scores.ctr_score} />
              <ScoreBar label="Trust" score={blueprint.conversion_scores.trust_score} />
              <ScoreBar label="Clarity" score={blueprint.conversion_scores.clarity_score} />
              <ScoreBar label="Conversion" score={blueprint.conversion_scores.conversion_score} />
            </div>

            {/* 7 slot cards */}
            <div className="flex flex-col gap-3">
              {blueprint.slots.map((slot) => (
                <SlotCard key={slot.slot} slot={slot} />
              ))}
            </div>

            {/* Optimization notes */}
            {blueprint.optimization_notes.length > 0 && (
              <div className="rounded-lg border border-border bg-muted-surface p-4">
                <p className="mb-2 text-sm font-semibold text-foreground">Optimization notes</p>
                <ul className="list-disc space-y-1 pl-4 text-sm text-muted">
                  {blueprint.optimization_notes.map((note, i) => (
                    <li key={i}>{note}</li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
