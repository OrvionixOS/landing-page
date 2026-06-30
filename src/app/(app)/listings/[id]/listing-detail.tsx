"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";
import { formatDate } from "@/lib/utils";
import { EtsyPublishCard } from "./etsy-publish-card";

export interface ImageShot {
  shot: string;
  purpose: string;
}

export interface PricingGuidance {
  suggestedPrice: number;
  minPrice: number;
  maxPrice: number;
  rationale: string;
}

export type ListingStatus = "DRAFT" | "READY" | "PUBLISHED" | "ARCHIVED";

export interface EditableListingData {
  seoTitle: string;
  tags: string[];
  taxonomyPath: string;
  attributes: Record<string, string>;
  description: string;
  imageShotList: ImageShot[];
  videoConcept: string;
  heroImageDirection: string;
  pricingGuidance: PricingGuidance;
  pinterestCopy: string;
  instagramCopy: string;
  status: ListingStatus;
}

type RegenerableSection =
  | "seoTitle"
  | "tags"
  | "description"
  | "imageShotList"
  | "videoConcept"
  | "heroImageDirection"
  | "pricingGuidance"
  | "pinterestCopy"
  | "instagramCopy";

const STATUS_OPTIONS: ListingStatus[] = ["DRAFT", "READY", "ARCHIVED"];

interface SectionHeaderProps {
  label: string;
  instruction: string;
  onInstructionChange: (value: string) => void;
  isRegenerating: boolean;
  onRegenerate: () => void;
}

function SectionHeader({ label, instruction, onInstructionChange, isRegenerating, onRegenerate }: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-3">
      <Label>{label}</Label>
      <div className="flex items-center gap-2">
        <Input
          placeholder="Instruction (optional)"
          value={instruction}
          onChange={(e) => onInstructionChange(e.target.value)}
          className="h-8 w-56 text-xs"
        />
        <Button type="button" variant="secondary" size="sm" isLoading={isRegenerating} onClick={onRegenerate}>
          <Sparkles className="h-3.5 w-3.5" /> Regenerate
        </Button>
      </div>
    </div>
  );
}

interface ListingDetailProps {
  listingId: string;
  initialData: EditableListingData;
  assumptions: string[];
  meta: { brandName: string; productName: string; createdAt: string };
  etsyConnected: boolean;
  published: { etsyListingId: string; publishedAt: string } | null;
  images: { id: string; url: string }[];
  suggestedPrice: number;
}

export function ListingDetail({
  listingId,
  initialData,
  assumptions,
  meta,
  etsyConnected,
  published,
  images,
  suggestedPrice,
}: ListingDetailProps) {
  const router = useRouter();
  const [data, setData] = useState<EditableListingData>(initialData);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [regenerating, setRegenerating] = useState<RegenerableSection | null>(null);
  const [regenError, setRegenError] = useState<string | null>(null);
  const [instructions, setInstructions] = useState<Partial<Record<RegenerableSection, string>>>({});

  function set<K extends keyof EditableListingData>(key: K, value: EditableListingData[K]) {
    setData((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    setSaveError(null);
    setSaved(false);
    setIsSaving(true);

    const response = await fetch(`/api/listings/${listingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    setIsSaving(false);

    if (!response.ok) {
      const result = await response.json().catch(() => null);
      const issues = result?.issues ? Object.values(result.issues).flat().join(" ") : null;
      setSaveError(issues || result?.error || "Could not save changes.");
      return;
    }

    setSaved(true);
    router.refresh();
  }

  async function handleRegenerate(section: RegenerableSection) {
    setRegenError(null);
    setRegenerating(section);

    const response = await fetch(`/api/listings/${listingId}/regenerate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ section, instruction: instructions[section] || undefined }),
    });

    setRegenerating(null);

    if (!response.ok) {
      const result = await response.json().catch(() => null);
      setRegenError(result?.error || "Regeneration failed. Please try again.");
      return;
    }

    const result = await response.json();
    set(section, result.value);
  }

  function updateTag(index: number, value: string) {
    set(
      "tags",
      data.tags.map((tag, i) => (i === index ? value : tag)),
    );
  }

  function updateAttribute(key: string, value: string) {
    set("attributes", { ...data.attributes, [key]: value });
  }

  function addAttribute() {
    let i = 1;
    let key = "attribute";
    while (key in data.attributes) {
      key = `attribute-${i++}`;
    }
    set("attributes", { ...data.attributes, [key]: "" });
  }

  function renameAttribute(oldKey: string, newKey: string) {
    if (!newKey || newKey === oldKey) return;
    const next: Record<string, string> = {};
    for (const [k, v] of Object.entries(data.attributes)) {
      next[k === oldKey ? newKey : k] = v;
    }
    set("attributes", next);
  }

  function removeAttribute(key: string) {
    const next = { ...data.attributes };
    delete next[key];
    set("attributes", next);
  }

  function updateShot(index: number, patch: Partial<ImageShot>) {
    set(
      "imageShotList",
      data.imageShotList.map((shot, i) => (i === index ? { ...shot, ...patch } : shot)),
    );
  }

  function addShot() {
    if (data.imageShotList.length >= 10) return;
    set("imageShotList", [...data.imageShotList, { shot: "", purpose: "" }]);
  }

  function removeShot(index: number) {
    if (data.imageShotList.length <= 4) return;
    set("imageShotList", data.imageShotList.filter((_, i) => i !== index));
  }

  function sectionHeaderProps(label: string, section: RegenerableSection): SectionHeaderProps {
    return {
      label,
      instruction: instructions[section] ?? "",
      onInstructionChange: (value) => setInstructions((prev) => ({ ...prev, [section]: value })),
      isRegenerating: regenerating === section,
      onRegenerate: () => handleRegenerate(section),
    };
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {data.seoTitle || meta.productName}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {meta.brandName} · {meta.productName} · {formatDate(meta.createdAt)}
          </p>
        </div>
        <select
          value={data.status}
          onChange={(e) => set("status", e.target.value as ListingStatus)}
          className="flex h-9 shrink-0 rounded-md border border-border bg-surface px-3 text-sm font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          {STATUS_OPTIONS.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </div>

      {assumptions.length > 0 && (
        <Alert variant="info">
          <p className="mb-1 font-medium">The AI flagged a few assumptions — review before publishing:</p>
          <ul className="list-disc space-y-0.5 pl-4">
            {assumptions.map((assumption, i) => (
              <li key={i}>{assumption}</li>
            ))}
          </ul>
        </Alert>
      )}

      {regenError && <Alert variant="danger">{regenError}</Alert>}

      <Card>
        <CardHeader>
          <SectionHeader {...sectionHeaderProps("SEO title", "seoTitle")} />
          <CardDescription>{data.seoTitle.length}/140 characters</CardDescription>
        </CardHeader>
        <CardContent>
          <Input value={data.seoTitle} onChange={(e) => set("seoTitle", e.target.value)} maxLength={140} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <SectionHeader {...sectionHeaderProps("Tags (13)", "tags")} />
        </CardHeader>
        <CardContent className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {data.tags.map((tag, i) => (
            <Input key={i} value={tag} onChange={(e) => updateTag(i, e.target.value)} maxLength={20} />
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Taxonomy path</CardTitle>
        </CardHeader>
        <CardContent>
          <Input value={data.taxonomyPath} onChange={(e) => set("taxonomyPath", e.target.value)} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Attributes</CardTitle>
            <Button type="button" variant="ghost" size="sm" onClick={addAttribute}>
              <Plus className="h-3.5 w-3.5" /> Add attribute
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {Object.entries(data.attributes).map(([key, value]) => (
            <div key={key} className="flex items-center gap-2">
              <Input
                defaultValue={key}
                onBlur={(e) => renameAttribute(key, e.target.value.trim())}
                placeholder="Attribute"
                className="w-40"
              />
              <Input
                value={value}
                onChange={(e) => updateAttribute(key, e.target.value)}
                placeholder="Value"
              />
              <Button type="button" variant="ghost" size="sm" onClick={() => removeAttribute(key)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
          {Object.keys(data.attributes).length === 0 && (
            <p className="text-sm text-muted">No attributes yet.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <SectionHeader {...sectionHeaderProps("Description", "description")} />
        </CardHeader>
        <CardContent>
          <Textarea
            rows={8}
            value={data.description}
            onChange={(e) => set("description", e.target.value)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <SectionHeader {...sectionHeaderProps("Image shot list", "imageShotList")} />
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {data.imageShotList.map((shot, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                placeholder="Shot"
                value={shot.shot}
                onChange={(e) => updateShot(i, { shot: e.target.value })}
                className="w-1/3"
              />
              <Input
                placeholder="Purpose"
                value={shot.purpose}
                onChange={(e) => updateShot(i, { purpose: e.target.value })}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeShot(i)}
                disabled={data.imageShotList.length <= 4}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={addShot}
            disabled={data.imageShotList.length >= 10}
            className="self-start"
          >
            <Plus className="h-3.5 w-3.5" /> Add shot
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <SectionHeader {...sectionHeaderProps("Video concept", "videoConcept")} />
        </CardHeader>
        <CardContent>
          <Textarea rows={2} value={data.videoConcept} onChange={(e) => set("videoConcept", e.target.value)} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <SectionHeader {...sectionHeaderProps("Hero image direction", "heroImageDirection")} />
        </CardHeader>
        <CardContent>
          <Textarea
            rows={2}
            value={data.heroImageDirection}
            onChange={(e) => set("heroImageDirection", e.target.value)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <SectionHeader {...sectionHeaderProps("Pricing guidance", "pricingGuidance")} />
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="suggestedPrice" className="text-xs font-normal text-muted">
                Suggested price
              </Label>
              <Input
                id="suggestedPrice"
                type="number"
                min={0}
                step="0.01"
                value={data.pricingGuidance.suggestedPrice}
                onChange={(e) =>
                  set("pricingGuidance", { ...data.pricingGuidance, suggestedPrice: Number(e.target.value) })
                }
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="minPrice" className="text-xs font-normal text-muted">
                Min price
              </Label>
              <Input
                id="minPrice"
                type="number"
                min={0}
                step="0.01"
                value={data.pricingGuidance.minPrice}
                onChange={(e) =>
                  set("pricingGuidance", { ...data.pricingGuidance, minPrice: Number(e.target.value) })
                }
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="maxPrice" className="text-xs font-normal text-muted">
                Max price
              </Label>
              <Input
                id="maxPrice"
                type="number"
                min={0}
                step="0.01"
                value={data.pricingGuidance.maxPrice}
                onChange={(e) =>
                  set("pricingGuidance", { ...data.pricingGuidance, maxPrice: Number(e.target.value) })
                }
              />
            </div>
          </div>
          <Textarea
            rows={2}
            placeholder="Rationale"
            value={data.pricingGuidance.rationale}
            onChange={(e) => set("pricingGuidance", { ...data.pricingGuidance, rationale: e.target.value })}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <SectionHeader {...sectionHeaderProps("Pinterest caption", "pinterestCopy")} />
        </CardHeader>
        <CardContent>
          <Textarea rows={3} value={data.pinterestCopy} onChange={(e) => set("pinterestCopy", e.target.value)} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <SectionHeader {...sectionHeaderProps("Instagram caption", "instagramCopy")} />
        </CardHeader>
        <CardContent>
          <Textarea rows={3} value={data.instagramCopy} onChange={(e) => set("instagramCopy", e.target.value)} />
        </CardContent>
      </Card>

      <EtsyPublishCard
        listingId={listingId}
        etsyConnected={etsyConnected}
        published={published}
        images={images}
        suggestedPrice={suggestedPrice}
      />

      <div className="sticky bottom-0 flex flex-col gap-3 border-t border-border bg-background py-4">
        {saveError && <Alert variant="danger">{saveError}</Alert>}
        {saved && <Alert variant="success">Saved.</Alert>}
        <Button onClick={handleSave} isLoading={isSaving} className="self-start">
          Save changes
        </Button>
      </div>
    </div>
  );
}
