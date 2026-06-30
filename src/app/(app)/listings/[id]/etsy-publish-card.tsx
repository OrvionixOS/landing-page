"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";
import { ETSY_WHO_MADE_OPTIONS, ETSY_WHEN_MADE_OPTIONS, type ListingPublishInput } from "@/lib/validations/etsy";

const selectClassName =
  "flex h-10 w-full rounded-md border border-border bg-surface px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-50";

const WHO_MADE_LABELS: Record<(typeof ETSY_WHO_MADE_OPTIONS)[number], string> = {
  i_did: "I made it",
  someone_else: "Another company or person",
  collective: "A member of my collective",
};

const WHEN_MADE_LABELS: Record<(typeof ETSY_WHEN_MADE_OPTIONS)[number], string> = {
  made_to_order: "Made to order",
  "2020_2026": "2020–2026",
  "2010_2019": "2010–2019",
  "2006_2009": "2006–2009",
  before_2006: "Before 2006",
  "2000_2005": "2000–2005",
  "1990s": "1990s",
  "1980s": "1980s",
  "1970s": "1970s",
  "1960s": "1960s",
  "1950s": "1950s",
  "1940s": "1940s",
  "1930s": "1930s",
  "1920s": "1920s",
  "1910s": "1910s",
  "1900s": "1900s",
  "1800s": "1800s",
  "1700s": "1700s",
  before_1700: "Before 1700",
};

interface ShippingProfile {
  shipping_profile_id: number;
  title: string;
}

interface ReturnPolicy {
  return_policy_id: number;
  accepts_returns: boolean;
  accepts_exchanges: boolean;
  return_deadline: number | null;
}

interface TaxonomyNode {
  id: number;
  name: string;
  level: number;
}

export interface EtsyPublishCardProps {
  listingId: string;
  etsyConnected: boolean;
  published: { etsyListingId: string; publishedAt: string } | null;
  images: { id: string; url: string }[];
  suggestedPrice: number;
}

export function EtsyPublishCard({
  listingId,
  etsyConnected,
  published,
  images,
  suggestedPrice,
}: EtsyPublishCardProps) {
  if (!etsyConnected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Publish to Etsy</CardTitle>
          <CardDescription>Connect your Etsy shop to publish this listing as a draft.</CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/settings" className="text-sm font-medium text-accent hover:underline">
            Go to Settings →
          </Link>
        </CardContent>
      </Card>
    );
  }

  return published ? (
    <PublishedCard listingId={listingId} published={published} images={images} />
  ) : (
    <PublishForm listingId={listingId} suggestedPrice={suggestedPrice} />
  );
}

function PublishedCard({
  listingId,
  published,
  images,
}: {
  listingId: string;
  published: { etsyListingId: string; publishedAt: string };
  images: { id: string; url: string }[];
}) {
  const [localImages, setLocalImages] = useState(images);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleUpload(file: File) {
    setError(null);
    setIsUploading(true);

    const form = new FormData();
    form.append("image", file);

    const response = await fetch(`/api/listings/${listingId}/images`, {
      method: "POST",
      body: form,
    });

    setIsUploading(false);

    if (!response.ok) {
      const result = await response.json().catch(() => null);
      setError(result?.error || "Could not upload image.");
      return;
    }

    const result = await response.json();
    setLocalImages((prev) => [...prev, { id: result.image.id, url: result.image.url }]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Published to Etsy</CardTitle>
        <CardDescription>
          Draft created on {new Date(published.publishedAt).toLocaleDateString()}. Finish review and
          activate it from your Etsy shop manager.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <a
          href={`https://www.etsy.com/your/shops/me/tools/listings/${published.etsyListingId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium text-accent hover:underline"
        >
          View draft on Etsy →
        </a>

        {error && <Alert variant="danger">{error}</Alert>}

        {localImages.length > 0 && (
          <div className="flex flex-wrap gap-3">
            {localImages.map((image) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={image.id}
                src={image.url}
                alt=""
                className="h-20 w-20 rounded-md border border-border object-cover"
              />
            ))}
          </div>
        )}

        {localImages.length < 10 && (
          <div className="flex items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleUpload(file);
              }}
              className="text-sm text-muted"
            />
            {isUploading && <span className="text-sm text-muted">Uploading…</span>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PublishForm({ listingId, suggestedPrice }: { listingId: string; suggestedPrice: number }) {
  const router = useRouter();

  const [price, setPrice] = useState(suggestedPrice > 0 ? suggestedPrice : 0);
  const [quantity, setQuantity] = useState(1);
  const [whoMade, setWhoMade] = useState<(typeof ETSY_WHO_MADE_OPTIONS)[number]>("i_did");
  const [whenMade, setWhenMade] = useState<(typeof ETSY_WHEN_MADE_OPTIONS)[number]>("made_to_order");
  const [isSupply, setIsSupply] = useState(false);

  const [taxonomyQuery, setTaxonomyQuery] = useState("");
  const [taxonomyOptions, setTaxonomyOptions] = useState<TaxonomyNode[]>([]);
  const [taxonomySelection, setTaxonomySelection] = useState<TaxonomyNode | null>(null);
  const [isSearchingTaxonomy, setIsSearchingTaxonomy] = useState(false);

  const [shippingProfiles, setShippingProfiles] = useState<ShippingProfile[]>([]);
  const [shippingProfileId, setShippingProfileId] = useState("");
  const [returnPolicies, setReturnPolicies] = useState<ReturnPolicy[]>([]);
  const [returnPolicyId, setReturnPolicyId] = useState("");

  const [loadError, setLoadError] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);

  useEffect(() => {
    async function loadShopOptions() {
      const [shippingRes, returnRes] = await Promise.all([
        fetch("/api/etsy/shipping-profiles"),
        fetch("/api/etsy/return-policies"),
      ]);

      if (!shippingRes.ok || !returnRes.ok) {
        setLoadError("Could not load shipping and return options from your Etsy shop.");
        return;
      }

      const shippingData = await shippingRes.json();
      const returnData = await returnRes.json();
      setShippingProfiles(shippingData.profiles);
      setReturnPolicies(returnData.policies);
      if (shippingData.profiles[0]) {
        setShippingProfileId(String(shippingData.profiles[0].shipping_profile_id));
      }
      if (returnData.policies[0]) {
        setReturnPolicyId(String(returnData.policies[0].return_policy_id));
      }
    }
    loadShopOptions();
  }, []);

  useEffect(() => {
    if (taxonomySelection) return;
    const handle = setTimeout(async () => {
      setIsSearchingTaxonomy(true);
      const response = await fetch(`/api/etsy/taxonomy?q=${encodeURIComponent(taxonomyQuery)}`);
      setIsSearchingTaxonomy(false);
      if (!response.ok) return;
      const data = await response.json();
      setTaxonomyOptions(data.nodes);
    }, 300);
    return () => clearTimeout(handle);
  }, [taxonomyQuery, taxonomySelection]);

  const canPublish =
    price > 0 && quantity > 0 && taxonomySelection !== null && shippingProfileId !== "" && returnPolicyId !== "";

  async function handlePublish() {
    if (!canPublish || !taxonomySelection) return;
    setPublishError(null);
    setIsPublishing(true);

    const payload: ListingPublishInput = {
      price,
      quantity,
      whoMade,
      whenMade,
      isSupply,
      taxonomyId: taxonomySelection.id,
      shippingProfileId,
      returnPolicyId,
    };

    const response = await fetch(`/api/listings/${listingId}/publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setIsPublishing(false);

    if (!response.ok) {
      const result = await response.json().catch(() => null);
      setPublishError(result?.error || "Could not publish to Etsy.");
      return;
    }

    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Publish to Etsy</CardTitle>
        <CardDescription>
          Creates a draft listing in your Etsy shop — it stays unpublished there until you review and
          activate it yourself.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {loadError && <Alert variant="danger">{loadError}</Alert>}
        {publishError && <Alert variant="danger">{publishError}</Alert>}

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="publish-price">Price (USD)</Label>
            <Input
              id="publish-price"
              type="number"
              min={0}
              step="0.01"
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="publish-quantity">Quantity</Label>
            <Input
              id="publish-quantity"
              type="number"
              min={1}
              max={999}
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="publish-who-made">Who made it?</Label>
            <select
              id="publish-who-made"
              value={whoMade}
              onChange={(e) => setWhoMade(e.target.value as typeof whoMade)}
              className={selectClassName}
            >
              {ETSY_WHO_MADE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {WHO_MADE_LABELS[option]}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="publish-when-made">When was it made?</Label>
            <select
              id="publish-when-made"
              value={whenMade}
              onChange={(e) => setWhenMade(e.target.value as typeof whenMade)}
              className={selectClassName}
            >
              {ETSY_WHEN_MADE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {WHEN_MADE_LABELS[option]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm text-foreground">
          <input type="checkbox" checked={isSupply} onChange={(e) => setIsSupply(e.target.checked)} />
          This is a craft supply or tool, not a finished product
        </label>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="publish-taxonomy">Etsy category</Label>
          <Input
            id="publish-taxonomy"
            placeholder="Search Etsy categories…"
            value={taxonomySelection ? taxonomySelection.name : taxonomyQuery}
            onChange={(e) => {
              setTaxonomySelection(null);
              setTaxonomyQuery(e.target.value);
            }}
          />
          {isSearchingTaxonomy && <p className="text-xs text-muted">Searching…</p>}
          {!taxonomySelection && taxonomyOptions.length > 0 && (
            <div className="max-h-40 overflow-y-auto rounded-md border border-border">
              {taxonomyOptions.map((node) => (
                <button
                  type="button"
                  key={node.id}
                  onClick={() => {
                    setTaxonomySelection(node);
                    setTaxonomyOptions([]);
                  }}
                  className="block w-full px-3 py-2 text-left text-sm hover:bg-muted-surface"
                >
                  {node.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="publish-shipping">Shipping profile</Label>
            <select
              id="publish-shipping"
              value={shippingProfileId}
              onChange={(e) => setShippingProfileId(e.target.value)}
              className={selectClassName}
              disabled={shippingProfiles.length === 0}
            >
              {shippingProfiles.length === 0 && <option value="">No shipping profiles found</option>}
              {shippingProfiles.map((profile) => (
                <option key={profile.shipping_profile_id} value={String(profile.shipping_profile_id)}>
                  {profile.title}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="publish-return">Return policy</Label>
            <select
              id="publish-return"
              value={returnPolicyId}
              onChange={(e) => setReturnPolicyId(e.target.value)}
              className={selectClassName}
              disabled={returnPolicies.length === 0}
            >
              {returnPolicies.length === 0 && <option value="">No return policies found</option>}
              {returnPolicies.map((policy) => (
                <option key={policy.return_policy_id} value={String(policy.return_policy_id)}>
                  {policy.accepts_returns
                    ? `Accepts returns (${policy.return_deadline ?? "?"} days)`
                    : "No returns accepted"}
                </option>
              ))}
            </select>
          </div>
        </div>

        <Button onClick={handlePublish} isLoading={isPublishing} disabled={!canPublish} className="self-start">
          Publish draft to Etsy
        </Button>
      </CardContent>
    </Card>
  );
}
