#!/usr/bin/env python3
"""
LIQUID CHROME Y2K — ONE-BUTTON PIPELINE
DigitalGlow Press / Orvionix

What this does, in plain words:
  It reads your 200 chrome prompts, asks the drawing robot to draw each one,
  erases every background to transparent, and saves finished PNG clipart in a
  folder called 'clipart'. You run it once and walk away.

==================  SETUP (one time, ~3 minutes)  ==================
  1. Keep this file in the SAME FOLDER as generate_chrome_prompts.py
  2. In a terminal:   pip install fal-client requests
  3. Get your robot key:
        - go to  https://fal.ai/dashboard/keys
        - sign in, click "Add key", copy the long code it gives you
  4. Set it as an environment variable before running (never paste it into
     this file — it would end up committed to git):
        export FAL_KEY="your-key-here"
  5. Run:   python make_chrome_clipart.py
===================================================================

Good to know:
  - Cost is about $0.025 per image on Flux dev, so all 200 ≈ $5.
  - You can stop anytime (Ctrl+C). Run it again and it PICKS UP WHERE IT LEFT OFF
    — it skips any PNG already made, so you never pay for the same image twice.
  - If a shape's edges look rough (the spiky ones), see the REMBG_MODEL note below.
"""

import os, pathlib, time

# ---- settings you can leave alone ----
RENDER_MODEL = "fal-ai/flux/dev"          # the drawing robot
REMBG_MODEL  = "fal-ai/imageutils/rembg"  # the background eraser
#   ^ For crisper edges on the spiky shapes (starburst/sparkle), swap the line above for:
#     REMBG_MODEL = "fal-ai/birefnet"          # higher-quality cutouts
IMAGE_SIZE   = "square_hd"                 # square, ~1024px — right shape for clipart
BACKGROUND   = "grey"                      # matches the generator; best for clean cutouts
PROMPT_STYLE = "flux"                      # phrasing tuned for the Flux robot
OUT_DIR      = "clipart"                   # finished PNGs land here
# --------------------------------------

import fal_client
import requests
import generate_chrome_prompts as gen     # the file from earlier — must sit next to this one


def download(url, path):
    r = requests.get(url, timeout=180)
    r.raise_for_status()
    pathlib.Path(path).write_bytes(r.content)


def main():
    if not os.environ.get("FAL_KEY"):
        print("STOP: set your Fal key first, e.g.  export FAL_KEY=\"your-key-here\"  then run again.")
        return

    out = pathlib.Path(OUT_DIR)
    out.mkdir(exist_ok=True)

    rows = list(gen.generate(model=PROMPT_STYLE, background=BACKGROUND))
    total = len(rows)
    print(f"Making {total} chrome clipart PNGs -> ./{OUT_DIR}/")
    print("Press Ctrl+C anytime to stop; run again to resume.\n")

    done = skipped = 0
    for n, row in enumerate(rows, 1):
        final_path = out / row["filename"]

        if final_path.exists():                 # resume: already made, don't redo / re-pay
            done += 1
            continue

        try:
            # 1) draw the shape on a grey studio background
            r1 = fal_client.subscribe(
                RENDER_MODEL,
                arguments={"prompt": row["prompt"], "image_size": IMAGE_SIZE},
            )
            img_url = r1["images"][0]["url"]

            # 2) erase the background -> transparent PNG
            r2 = fal_client.subscribe(REMBG_MODEL, arguments={"image_url": img_url})
            cut_url = r2["image"]["url"]

            # 3) save the finished clipart
            download(cut_url, final_path)
            done += 1
            print(f"[{n}/{total}] ok       {row['filename']}")

        except Exception as e:
            skipped += 1
            print(f"[{n}/{total}] skipped  {row['filename']}  ({e})")
            time.sleep(2)                       # brief pause, then keep going; rerun to retry skips

    print(f"\nFinished. {done}/{total} saved in ./{OUT_DIR}/", end="")
    print(f"  ({skipped} skipped — just run again to retry those)" if skipped else "")


if __name__ == "__main__":
    main()
