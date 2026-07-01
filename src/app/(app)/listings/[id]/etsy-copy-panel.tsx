"use client";

import { useState } from "react";
import { Check, Copy, ExternalLink } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface EtsyCopyPanelProps {
  seoTitle: string;
  description: string;
  tags: string[];
  suggestedPrice: number;
  taxonomyPath: string;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for browsers that block clipboard without user gesture
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium text-muted transition-colors hover:bg-muted-surface hover:text-foreground"
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-success" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function CopyField({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-foreground">{label}</span>
        <CopyButton text={value} />
      </div>
      <div
        className={`max-h-40 overflow-y-auto rounded-md border border-border bg-muted-surface px-3 py-2 text-sm text-foreground ${mono ? "font-mono" : ""}`}
      >
        {value || <span className="text-muted italic">Not generated yet</span>}
      </div>
    </div>
  );
}

export function EtsyCopyPanel({ seoTitle, description, tags, suggestedPrice, taxonomyPath }: EtsyCopyPanelProps) {
  const tagsForEtsy = tags.filter(Boolean).join(", ");
  const priceText = suggestedPrice > 0 ? String(suggestedPrice.toFixed(2)) : "";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Publish to Etsy</CardTitle>
        <CardDescription>
          Copy each field below into Etsy&apos;s listing form.{" "}
          <a
            href="https://www.etsy.com/sell"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-medium text-accent hover:underline"
          >
            Open Etsy <ExternalLink className="h-3 w-3" />
          </a>
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <CopyField label="Title" value={seoTitle} />
        <CopyField label="Description" value={description} />
        <CopyField label="Tags (comma-separated)" value={tagsForEtsy} />
        {priceText && <CopyField label="Price (USD)" value={priceText} />}
        {taxonomyPath && <CopyField label="Category path" value={taxonomyPath} />}
      </CardContent>
    </Card>
  );
}
