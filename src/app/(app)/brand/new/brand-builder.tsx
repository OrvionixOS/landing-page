"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, PenLine, ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { AiBrandInputForm } from "./ai-brand-input-form";
import {
  EditableBrandForm,
  EMPTY_BRAND_DATA,
  type EditableBrandData,
} from "./editable-brand-form";

type Mode = "select" | "ai-input" | "edit";
type Origin = "EXISTING" | "AI_GENERATED";

export function BrandBuilder() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("select");
  const [origin, setOrigin] = useState<Origin>("EXISTING");
  const [data, setData] = useState<EditableBrandData>(EMPTY_BRAND_DATA);
  const [assumptions, setAssumptions] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleGenerated(suggestions: unknown) {
    const s = suggestions as EditableBrandData & { assumptions?: string[] };
    setData({
      name: s.name,
      tagline: s.tagline,
      positioning: s.positioning,
      voice: s.voice,
      targetCustomer: s.targetCustomer,
      visualDirection: s.visualDirection,
      palette: s.palette,
      typography: s.typography,
    });
    setAssumptions(s.assumptions ?? []);
    setOrigin("AI_GENERATED");
    setMode("edit");
  }

  function startManual() {
    setData(EMPTY_BRAND_DATA);
    setAssumptions([]);
    setOrigin("EXISTING");
    setMode("edit");
  }

  async function handleSave() {
    setError(null);
    setIsSaving(true);

    const response = await fetch("/api/brand-profiles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: data.name,
        tagline: data.tagline || undefined,
        positioning: data.positioning || undefined,
        voice: data.voice || undefined,
        targetCustomer: data.targetCustomer || undefined,
        visualDirection: data.visualDirection || undefined,
        palette: data.palette.length ? data.palette : undefined,
        typography: data.typography.heading || data.typography.body ? data.typography : undefined,
        origin,
        assumptions: assumptions.length ? assumptions : undefined,
      }),
    });

    setIsSaving(false);

    if (!response.ok) {
      const result = await response.json().catch(() => null);
      const issues = result?.issues ? Object.values(result.issues).flat().join(" ") : null;
      setError(issues || result?.error || "Could not save brand profile.");
      return;
    }

    const result = await response.json();
    router.push(`/brand/${result.brandProfile.id}`);
  }

  if (mode === "select") {
    return (
      <div className="grid grid-cols-2 gap-4">
        <Card className="cursor-pointer transition-shadow hover:shadow-md" onClick={() => setMode("ai-input")}>
          <CardHeader>
            <Sparkles className="mb-2 h-6 w-6 text-accent" aria-hidden="true" />
            <CardTitle>Build with AI</CardTitle>
            <CardDescription>
              Describe what you sell and let ListingStudio draft a complete, editable brand profile.
            </CardDescription>
          </CardHeader>
        </Card>
        <Card className="cursor-pointer transition-shadow hover:shadow-md" onClick={startManual}>
          <CardHeader>
            <PenLine className="mb-2 h-6 w-6 text-accent" aria-hidden="true" />
            <CardTitle>Enter manually</CardTitle>
            <CardDescription>
              Already have a brand voice and palette? Fill it in yourself.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (mode === "ai-input") {
    return (
      <Card>
        <CardHeader>
          <button
            type="button"
            onClick={() => setMode("select")}
            className="flex w-fit items-center gap-1 text-sm text-muted hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back
          </button>
          <CardTitle>Tell us about your shop</CardTitle>
          <CardDescription>The more specific you are, the better the result.</CardDescription>
        </CardHeader>
        <CardContent>
          <AiBrandInputForm onGenerated={handleGenerated} />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <button
          type="button"
          onClick={() => setMode("select")}
          className="flex w-fit items-center gap-1 text-sm text-muted hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Start over
        </button>
        <CardTitle>{origin === "AI_GENERATED" ? "Review your brand profile" : "Your brand profile"}</CardTitle>
        <CardDescription>Edit anything before saving — this becomes the source of truth for every listing.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        {error && <Alert variant="danger">{error}</Alert>}
        <EditableBrandForm data={data} onChange={setData} assumptions={assumptions} />
        <Button onClick={handleSave} isLoading={isSaving} disabled={!data.name.trim()}>
          Save brand profile
        </Button>
      </CardContent>
    </Card>
  );
}
