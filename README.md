# Neon Night Cover Studio

[![gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/Emjee22/gta6-cover-art-01-entry/rank.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/Emjee22/gta6-cover-art-01-entry/reward.svg)](https://make.fun/bounty/gta6-cover-art-01)

Turn your photos into multi-panel GTA-style poster cover art — right in the
browser, fully offline, nothing uploaded.

## What it does

- **Multi-panel covers**: pick 1–3 photos and the studio lays them out as a
  poster collage — hero portrait, stacked panels, a 3×3 grid with a title
  cell, a filmstrip, or a two-panel split.
- **5 colour grades**: Neon Night (deep indigo + hot magenta), Sunset Vice,
  Poster Ink (halftone print), Teal Dawn, Mono Noir.
- **Big poster lettering**: a huge gradient display title, a neon script
  subtitle, a kicker, a tagline, and poster furniture — a starburst
  "EST. 2026" badge, a HEAT ★★★★★ pill, a skyline and a barcode.
- **Crop by hand**: click a panel to select it, drag to pan its photo,
  scroll to zoom, reset when you want the framing back.
- **One-click PNG export** in all three sizes the bounty asks for:
  1920×1080, 1080×1350 and 1080×1080 — "Export all 3 sizes" saves them
  together. What the preview shows is exactly what the PNG will be.
- **Surprise me**: one click randomises the layout, grade and words.

## Try it

```sh
node serve.ts
# open http://localhost:8080
```

No build step, no network: `app/index.html` plus its own scripts, styles,
fonts (Anton and Pacifico, SIL Open Font License, under `app/fonts/`) and
two image-model sample photos (`app/samples/`, made for make.fun and free
to use). Upload your own photos to make a cover that is yours.

## Hand in

`main.ts` (Node 22, standard library only) copies `app/` and `screenshots/`
to `/output` and writes `/output/dossier.json` with the vendored make.fun
library:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

Built for the [gta6-cover-art-01 bounty](https://make.fun/bounty/gta6-cover-art-01)
on make.fun.
