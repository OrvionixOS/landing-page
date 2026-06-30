"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";

export interface PaletteColor {
  name: string;
  hex: string;
  usage: string;
}

export interface Typography {
  heading: string;
  body: string;
  accent?: string;
  rationale?: string;
}

export interface EditableBrandData {
  name: string;
  tagline: string;
  positioning: string;
  voice: string;
  targetCustomer: string;
  visualDirection: string;
  palette: PaletteColor[];
  typography: Typography;
}

export const EMPTY_BRAND_DATA: EditableBrandData = {
  name: "",
  tagline: "",
  positioning: "",
  voice: "",
  targetCustomer: "",
  visualDirection: "",
  palette: [],
  typography: { heading: "", body: "", accent: "", rationale: "" },
};

interface EditableBrandFormProps {
  data: EditableBrandData;
  onChange: (data: EditableBrandData) => void;
  assumptions?: string[];
}

export function EditableBrandForm({ data, onChange, assumptions }: EditableBrandFormProps) {
  function set<K extends keyof EditableBrandData>(key: K, value: EditableBrandData[K]) {
    onChange({ ...data, [key]: value });
  }

  function updateColor(index: number, patch: Partial<PaletteColor>) {
    const next = data.palette.map((color, i) => (i === index ? { ...color, ...patch } : color));
    set("palette", next);
  }

  function addColor() {
    set("palette", [...data.palette, { name: "", hex: "#000000", usage: "" }]);
  }

  function removeColor(index: number) {
    set("palette", data.palette.filter((_, i) => i !== index));
  }

  return (
    <div className="flex flex-col gap-6">
      {assumptions && assumptions.length > 0 && (
        <Alert variant="info">
          <p className="mb-1 font-medium">The AI flagged a few assumptions — review before saving:</p>
          <ul className="list-disc space-y-0.5 pl-4">
            {assumptions.map((assumption, i) => (
              <li key={i}>{assumption}</li>
            ))}
          </ul>
        </Alert>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="brand-name">Brand name</Label>
        <Input id="brand-name" value={data.name} onChange={(e) => set("name", e.target.value)} required />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="brand-tagline">Tagline</Label>
        <Input id="brand-tagline" value={data.tagline} onChange={(e) => set("tagline", e.target.value)} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="brand-positioning">Positioning</Label>
        <Textarea
          id="brand-positioning"
          value={data.positioning}
          onChange={(e) => set("positioning", e.target.value)}
          rows={3}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="brand-voice">Voice</Label>
        <Textarea id="brand-voice" value={data.voice} onChange={(e) => set("voice", e.target.value)} rows={3} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="brand-target">Target customer</Label>
        <Textarea
          id="brand-target"
          value={data.targetCustomer}
          onChange={(e) => set("targetCustomer", e.target.value)}
          rows={3}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="brand-visual">Visual direction</Label>
        <Textarea
          id="brand-visual"
          value={data.visualDirection}
          onChange={(e) => set("visualDirection", e.target.value)}
          rows={3}
        />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <Label>Color palette</Label>
          <Button type="button" variant="ghost" size="sm" onClick={addColor}>
            <Plus className="h-3.5 w-3.5" /> Add color
          </Button>
        </div>
        <div className="flex flex-col gap-2">
          {data.palette.map((color, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="color"
                value={color.hex}
                onChange={(e) => updateColor(i, { hex: e.target.value })}
                className="h-10 w-10 shrink-0 cursor-pointer rounded border border-border"
                aria-label="Color swatch"
              />
              <Input
                placeholder="Name"
                value={color.name}
                onChange={(e) => updateColor(i, { name: e.target.value })}
                className="w-32"
              />
              <Input
                placeholder="Usage (e.g. primary)"
                value={color.usage}
                onChange={(e) => updateColor(i, { usage: e.target.value })}
              />
              <Button type="button" variant="ghost" size="sm" onClick={() => removeColor(i)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <Label>Typography</Label>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="font-heading" className="text-xs font-normal text-muted">
              Heading font
            </Label>
            <Input
              id="font-heading"
              value={data.typography.heading}
              onChange={(e) => set("typography", { ...data.typography, heading: e.target.value })}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="font-body" className="text-xs font-normal text-muted">
              Body font
            </Label>
            <Input
              id="font-body"
              value={data.typography.body}
              onChange={(e) => set("typography", { ...data.typography, body: e.target.value })}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export function useEditableBrandForm(initial: EditableBrandData = EMPTY_BRAND_DATA) {
  return useState<EditableBrandData>(initial);
}
