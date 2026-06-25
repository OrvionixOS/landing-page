#!/usr/bin/env python3
"""
Liquid Chrome Y2K — Abstract Clipart Prompt Generator
DigitalGlow Press / Orvionix

Built on the DigitalGlow 8-part formula:
[MATERIAL] + [GEOMETRY] + [REFLECTION] + [LIGHTING] + [MOTION] + [FINISH] + [USE CASE] + [QUALITY]

Key design choice: this is CLIPART (isolated objects on transparent), not
seamless texture. So the secondary axes (reflection / lighting / motion /
finish) ROTATE underneath every shape+palette pairing. No two prompts are
"the same object in a different color" — which is exactly what the
DigitalGlow diversity rule forbids.

Outputs: a CSV (open in a sheet to cull) and a JSONL (loop in your Fal
pipeline). No external dependencies. Wire your existing fal_client call
into render_stub() at the bottom.
"""

import csv, json, argparse, itertools

# ----------------------------------------------------------------------------
# VOCAB BANKS  (phrasing pulled from your prompt-formulas.md + rendering-guidelines.md)
# ----------------------------------------------------------------------------

# Primary diversity driver: the Y2K chrome icon set. 20 shapes.
FORMS = {
    "blob":          "a smooth amorphous liquid metal blob with soft rounded organic edges",
    "heart":         "a puffy rounded 3D heart",
    "star":          "a rounded five-point star",
    "sparkle":       "a four-point sparkle with elongated tapering points",
    "flame":         "a stylized rising flame shape",
    "butterfly":     "a symmetrical butterfly silhouette",
    "ring":          "a smooth flowing torus ring",
    "droplet":       "a single suspended teardrop bead",
    "spiral":        "a coiling spiral swirl",
    "lightning":     "a bold lightning bolt",
    "asterisk":      "a six-spoke asterisk burst",
    "bubble_cluster":"a cluster of merging liquid-metal spheres",
    "squiggle":      "a wavy looping ribbon squiggle",
    "flower":        "a simple five-petal daisy",
    "gem":           "a faceted crystalline gem",
    "arrow":         "a chunky rounded directional arrow",
    "infinity":      "a smooth infinity loop",
    "wave":          "a curling cresting wave swirl",
    "cross":         "a rounded plus / cross shape",
    "starburst":     "a radiating starburst of thin tapering metallic spikes",
}

# Palette = chrome tint. Never the ONLY thing that changes between two prompts.
PALETTES = {
    "silver":      "polished neutral silver chrome with cool mirror reflections",
    "holographic": "holographic iridescent chrome shifting between pink, cyan and violet",
    "rose_gold":   "warm rose gold chrome with soft blush-pink reflections",
    "gold":        "molten liquid gold chrome with rich warm reflections",
    "aqua":        "cool aqua chrome with turquoise and teal reflections",
    "violet":      "deep violet purple chrome with jewel-tone reflections",
    "rainbow":     "rainbow oil-slick chrome with full-spectrum iridescent reflections",
    "gunmetal":    "dark gunmetal chrome with smoky charcoal tones and bright highlights",
    "sunset":      "sunset-gradient chrome blending orange, pink and purple reflections",
    "emerald":     "emerald green chrome with deep jewel-green reflections",
}

# Secondary axes — these rotate so every render is genuinely distinct.
MATERIALS  = ["liquid chrome", "liquid mercury", "molten metallic resin", "mirror chrome", "polished metallic glass"]
REFLECTION = ["sharp mirror reflections", "soft satin reflections", "fragmented faceted reflections",
              "gently distorted warped reflections", "rippling fluid reflections"]
LIGHTING   = ["beauty campaign lighting", "jewelry photography lighting", "editorial spotlighting",
              "cinematic studio lighting", "luxury packaging lighting"]
MOTION     = ["frozen mid-flow", "suspended and weightless", "rippling", "caught mid-splash", "slowly dripping"]
FINISH     = ["mirror-polished", "satin metallic", "glossy lacquered", "wet liquid-metal"]

QUALITY = ("elegant surface depth, ultra detailed material realism, cinematic reflections, "
           "high-end 3D product render, clean and luxurious")

# Hero overrides (cover / Pinterest stopping power) — more drama, per your hero-asset formula.
HERO_LIGHTING = "dramatic cinematic studio lighting with strong rim light"
HERO_MOTION   = "dynamic exploding splash motion"

BACKGROUNDS = {
    # Default for cutout safety. Mirror chrome reflects white and blows out its own edges,
    # which wrecks background removal. A flat neutral grey gives rembg clean edges to find.
    "grey":  "a flat seamless soft neutral-grey studio background",
    # Brighter, more Y2K reflections — but expect messier edges; clean up after removal.
    "white": "a pure white seamless background",
    # Gold/iridescent often pop hardest on black; knock out the black instead of white.
    "black": "a solid black seamless background",
}

# ----------------------------------------------------------------------------
# PROMPT BUILDER
# ----------------------------------------------------------------------------

def _pick(seq, i, stride):
    """Deterministic rotation: different strides make axes cycle at different rates -> max variety."""
    return seq[(i * stride) % len(seq)]

def build_prompt(form_key, palette_key, i, model="nano_banana", background="grey", hero=False):
    form = FORMS[form_key]
    palette = PALETTES[palette_key]
    material   = _pick(MATERIALS, i, 1)
    reflection = _pick(REFLECTION, i, 1)
    lighting   = HERO_LIGHTING if hero else _pick(LIGHTING, i, 2)
    motion     = HERO_MOTION   if hero else _pick(MOTION, i, 3)
    finish     = _pick(FINISH, i, 2)
    bg = BACKGROUNDS[background]

    # NATURAL LANGUAGE — Nano Banana (Gemini) & ChatGPT image prefer full sentences.
    if model in ("nano_banana", "chatgpt"):
        return (
            f"{form}, rendered in {material}. The surface is {palette}, {finish} with {reflection}, "
            f"{motion}. {lighting.capitalize()}. {QUALITY}. "
            f"A single isolated element, centered, on {bg}. "
            f"No drop shadow, no border, no text, no extra objects."
        )

    # KEYWORD STACK — Flux.
    if model == "flux":
        return (
            f"{form}, {material}, {palette}, {finish}, {reflection}, {motion}, {lighting}, "
            f"single isolated centered element, {bg}, no shadow, no border, no text, {QUALITY}"
        )

    # KEYWORD STACK + params — Midjourney. (Use one --sref across the batch for set cohesion.)
    if model == "midjourney":
        return (
            f"{form}, {material}, {palette}, {finish}, {reflection}, {motion}, {lighting}, "
            f"single isolated centered element, {bg}, no shadow no border no text, {QUALITY} "
            f"--ar 1:1 --style raw"
        )

    raise ValueError(f"unknown model: {model}")

# ----------------------------------------------------------------------------
# COLLECTION GENERATOR
# ----------------------------------------------------------------------------

def generate(model="nano_banana", background="grey", seeds_per=1, hero_forms=None):
    """Yield one dict per prompt. seeds_per>1 emits multiple variants per shape+palette combo."""
    hero_forms = set(hero_forms or [])
    i = 0
    for form_key, palette_key in itertools.product(FORMS, PALETTES):
        for s in range(seeds_per):
            hero = form_key in hero_forms and s == 0
            yield {
                "id": f"chrome_{form_key}_{palette_key}_{s+1:02d}",
                "form": form_key,
                "palette": palette_key,
                "hero": hero,
                "filename": f"chrome_{palette_key}_{form_key}_{s+1:02d}.png",
                "prompt": build_prompt(form_key, palette_key, i, model, background, hero),
            }
            i += 1

def write_outputs(rows, prefix):
    rows = list(rows)
    with open(f"{prefix}.csv", "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=["id", "form", "palette", "hero", "filename", "prompt"])
        w.writeheader()
        w.writerows(rows)
    with open(f"{prefix}.jsonl", "w") as f:
        for r in rows:
            f.write(json.dumps(r) + "\n")
    return len(rows)

# ----------------------------------------------------------------------------
# FAL INTEGRATION STUB  — drop your existing pipeline call here.
# ----------------------------------------------------------------------------

def render_stub(row):
    """
    Your Fal call goes here. Example shape (uncomment + adapt to your actual setup):

        import fal_client
        result = fal_client.subscribe(
            "fal-ai/flux/dev",                      # or your chosen model endpoint
            arguments={"prompt": row["prompt"], "image_size": "square_hd"},
        )
        download(result["images"][0]["url"], row["filename"])

    Then run rembg on row["filename"] to cut the background to transparent.
    """
    raise NotImplementedError("Wire your fal_client call into render_stub().")

# ----------------------------------------------------------------------------

if __name__ == "__main__":
    p = argparse.ArgumentParser(description="Generate Liquid Chrome Y2K clipart prompts.")
    p.add_argument("--model", default="nano_banana",
                   choices=["nano_banana", "chatgpt", "flux", "midjourney"])
    p.add_argument("--background", default="grey", choices=["grey", "white", "black"])
    p.add_argument("--seeds-per", type=int, default=1, help="variants per shape+palette combo")
    p.add_argument("--out-prefix", default="chrome_prompts")
    # A sensible default hero set — most thumbnail-stopping shapes:
    p.add_argument("--hero-forms", nargs="*",
                   default=["blob", "heart", "butterfly", "flame", "starburst"])
    args = p.parse_args()

    rows = generate(args.model, args.background, args.seeds_per, args.hero_forms)
    n = write_outputs(rows, args.out_prefix)
    print(f"Wrote {n} prompts -> {args.out_prefix}.csv  +  {args.out_prefix}.jsonl")
    print(f"model={args.model}  background={args.background}  seeds_per={args.seeds_per}")
