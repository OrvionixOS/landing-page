"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";

interface BrandOption {
  id: string;
  name: string;
}

interface ProductOption {
  id: string;
  name: string;
  category: string | null;
}

interface AttributeRow {
  key: string;
  value: string;
}

interface ListingBuilderProps {
  brandProfiles: BrandOption[];
  products: ProductOption[];
}

export function ListingBuilder({ brandProfiles, products }: ListingBuilderProps) {
  const router = useRouter();
  const [brandProfileId, setBrandProfileId] = useState(brandProfiles[0]?.id ?? "");
  const [productMode, setProductMode] = useState<"new" | "existing">(products.length ? "existing" : "new");
  const [productId, setProductId] = useState(products[0]?.id ?? "");

  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [materials, setMaterials] = useState("");
  const [description, setDescription] = useState("");
  const [keyFeaturesText, setKeyFeaturesText] = useState("");
  const [priceRangeMin, setPriceRangeMin] = useState("");
  const [priceRangeMax, setPriceRangeMax] = useState("");
  const [attributeRows, setAttributeRows] = useState<AttributeRow[]>([]);

  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addAttributeRow() {
    setAttributeRows((prev) => [...prev, { key: "", value: "" }]);
  }

  function updateAttributeRow(index: number, patch: Partial<AttributeRow>) {
    setAttributeRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function removeAttributeRow(index: number) {
    setAttributeRows((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setIsGenerating(true);

    const attributes = attributeRows.reduce<Record<string, string>>((acc, row) => {
      if (row.key.trim()) acc[row.key.trim()] = row.value.trim();
      return acc;
    }, {});

    const body =
      productMode === "existing"
        ? { brandProfileId, productId }
        : {
            brandProfileId,
            product: {
              name,
              category: category || undefined,
              materials: materials || undefined,
              description: description || undefined,
              keyFeatures: keyFeaturesText
                ? keyFeaturesText.split(",").map((s) => s.trim()).filter(Boolean)
                : undefined,
              priceRangeMin: priceRangeMin ? Number(priceRangeMin) : undefined,
              priceRangeMax: priceRangeMax ? Number(priceRangeMax) : undefined,
              attributes: Object.keys(attributes).length ? attributes : undefined,
            },
          };

    const response = await fetch("/api/listings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    setIsGenerating(false);

    if (!response.ok) {
      const result = await response.json().catch(() => null);
      const issues = result?.issues ? Object.values(result.issues).flat().join(" ") : null;
      setError(issues || result?.error || "Could not generate listing.");
      return;
    }

    const result = await response.json();
    router.push(`/listings/${result.listing.id}`);
  }

  const canSubmit =
    Boolean(brandProfileId) && (productMode === "existing" ? Boolean(productId) : name.trim().length > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Listing details</CardTitle>
        <CardDescription>
          Tell ListingStudio about the product — the more specific, the better the result.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          {error && <Alert variant="danger">{error}</Alert>}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="brandProfileId">Brand profile</Label>
            <select
              id="brandProfileId"
              value={brandProfileId}
              onChange={(e) => setBrandProfileId(e.target.value)}
              className="flex h-10 w-full rounded-md border border-border bg-surface px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:border-accent"
              required
            >
              {brandProfiles.map((brand) => (
                <option key={brand.id} value={brand.id}>
                  {brand.name}
                </option>
              ))}
            </select>
          </div>

          {products.length > 0 && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setProductMode("existing")}
                className={`flex-1 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                  productMode === "existing"
                    ? "border-accent bg-accent-soft text-accent"
                    : "border-border text-muted hover:bg-muted-surface"
                }`}
              >
                Use existing product
              </button>
              <button
                type="button"
                onClick={() => setProductMode("new")}
                className={`flex-1 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                  productMode === "new"
                    ? "border-accent bg-accent-soft text-accent"
                    : "border-border text-muted hover:bg-muted-surface"
                }`}
              >
                New product
              </button>
            </div>
          )}

          {productMode === "existing" ? (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="productId">Product</Label>
              <select
                id="productId"
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                className="flex h-10 w-full rounded-md border border-border bg-surface px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:border-accent"
                required
              >
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                    {product.category ? ` — ${product.category}` : ""}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="productName">Product name</Label>
                <Input
                  id="productName"
                  required
                  placeholder="e.g. Hand-thrown speckled stoneware mug"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="productCategory">Category (optional)</Label>
                  <Input
                    id="productCategory"
                    placeholder="e.g. Mugs"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="productMaterials">Materials (optional)</Label>
                  <Input
                    id="productMaterials"
                    placeholder="e.g. Stoneware clay, food-safe glaze"
                    value={materials}
                    onChange={(e) => setMaterials(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="productDescription">Description (optional)</Label>
                <Textarea
                  id="productDescription"
                  rows={3}
                  placeholder="Anything else worth knowing — dimensions, process, what makes it special."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="productKeyFeatures">Key features (optional, comma-separated)</Label>
                <Input
                  id="productKeyFeatures"
                  placeholder="e.g. dishwasher safe, holds 12oz, microwave safe"
                  value={keyFeaturesText}
                  onChange={(e) => setKeyFeaturesText(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="priceMin">Target price min (optional)</Label>
                  <Input
                    id="priceMin"
                    type="number"
                    min={0}
                    step="0.01"
                    value={priceRangeMin}
                    onChange={(e) => setPriceRangeMin(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="priceMax">Target price max (optional)</Label>
                  <Input
                    id="priceMax"
                    type="number"
                    min={0}
                    step="0.01"
                    value={priceRangeMax}
                    onChange={(e) => setPriceRangeMax(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <Label>Other attributes (optional)</Label>
                  <Button type="button" variant="ghost" size="sm" onClick={addAttributeRow}>
                    <Plus className="h-3.5 w-3.5" /> Add attribute
                  </Button>
                </div>
                <div className="flex flex-col gap-2">
                  {attributeRows.map((row, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Input
                        placeholder="e.g. color"
                        value={row.key}
                        onChange={(e) => updateAttributeRow(i, { key: e.target.value })}
                        className="w-40"
                      />
                      <Input
                        placeholder="e.g. sage green"
                        value={row.value}
                        onChange={(e) => updateAttributeRow(i, { value: e.target.value })}
                      />
                      <Button type="button" variant="ghost" size="sm" onClick={() => removeAttributeRow(i)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          <Button type="submit" isLoading={isGenerating} disabled={!canSubmit} className="mt-2">
            <Sparkles className="h-4 w-4" />
            {isGenerating ? "Generating your listing…" : "Generate listing"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
