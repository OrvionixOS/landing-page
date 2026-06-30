"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { EditableBrandForm, type EditableBrandData } from "../new/editable-brand-form";

export function BrandDetail({
  brandId,
  initialData,
}: {
  brandId: string;
  initialData: EditableBrandData;
}) {
  const router = useRouter();
  const [data, setData] = useState<EditableBrandData>(initialData);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setError(null);
    setSaved(false);
    setIsSaving(true);

    const response = await fetch(`/api/brand-profiles/${brandId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: data.name,
        tagline: data.tagline || undefined,
        positioning: data.positioning || undefined,
        voice: data.voice || undefined,
        targetCustomer: data.targetCustomer || undefined,
        visualDirection: data.visualDirection || undefined,
        palette: data.palette,
        typography: data.typography,
      }),
    });

    setIsSaving(false);

    if (!response.ok) {
      const result = await response.json().catch(() => null);
      setError(result?.error || "Could not save changes.");
      return;
    }

    setSaved(true);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{initialData.name}</h1>
        <p className="mt-1 text-sm text-muted">Edit your brand profile.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Brand details</CardTitle>
          <CardDescription>Used as grounding context for every AI-generated listing.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          {error && <Alert variant="danger">{error}</Alert>}
          {saved && <Alert variant="success">Saved.</Alert>}
          <EditableBrandForm data={data} onChange={setData} />
          <Button onClick={handleSave} isLoading={isSaving} disabled={!data.name.trim()}>
            Save changes
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
