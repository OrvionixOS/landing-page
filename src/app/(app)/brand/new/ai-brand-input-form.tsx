"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";

export interface AiBrandInput {
  shopName: string;
  productDescription: string;
  targetAudience: string;
  styleAdjectives: string;
  existingNotes: string;
}

interface AiBrandInputFormProps {
  onGenerated: (suggestions: unknown) => void;
}

export function AiBrandInputForm({ onGenerated }: AiBrandInputFormProps) {
  const [form, setForm] = useState<AiBrandInput>({
    shopName: "",
    productDescription: "",
    targetAudience: "",
    styleAdjectives: "",
    existingNotes: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof AiBrandInput>(key: K, value: AiBrandInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const response = await fetch("/api/ai/brand-suggestions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        shopName: form.shopName || undefined,
        productDescription: form.productDescription,
        targetAudience: form.targetAudience || undefined,
        styleAdjectives: form.styleAdjectives
          ? form.styleAdjectives.split(",").map((s) => s.trim()).filter(Boolean)
          : undefined,
        existingNotes: form.existingNotes || undefined,
      }),
    });

    setIsSubmitting(false);

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      setError(data?.error || "Generation failed. Please try again.");
      return;
    }

    const data = await response.json();
    onGenerated(data.suggestions);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {error && <Alert variant="danger">{error}</Alert>}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="shopName">Shop name (optional)</Label>
        <Input id="shopName" value={form.shopName} onChange={(e) => set("shopName", e.target.value)} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="productDescription">What do you make or sell?</Label>
        <Textarea
          id="productDescription"
          required
          minLength={10}
          rows={4}
          placeholder="e.g. Hand-thrown stoneware mugs and bowls, glazed in earthy, speckled finishes. Each piece is wheel-thrown in small batches."
          value={form.productDescription}
          onChange={(e) => set("productDescription", e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="targetAudience">Who&apos;s it for? (optional)</Label>
        <Input
          id="targetAudience"
          placeholder="e.g. People who love slow, intentional home design"
          value={form.targetAudience}
          onChange={(e) => set("targetAudience", e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="styleAdjectives">Style adjectives (optional, comma-separated)</Label>
        <Input
          id="styleAdjectives"
          placeholder="e.g. earthy, minimal, warm"
          value={form.styleAdjectives}
          onChange={(e) => set("styleAdjectives", e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="existingNotes">Anything else? (optional)</Label>
        <Textarea
          id="existingNotes"
          rows={2}
          value={form.existingNotes}
          onChange={(e) => set("existingNotes", e.target.value)}
        />
      </div>

      <Button type="submit" isLoading={isSubmitting} className="mt-2">
        Generate brand profile
      </Button>
    </form>
  );
}
