# Neon Night Cover Studio

[![make.fun](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/Emjee22/gta6-cover-art-01-entry/rank.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/Emjee22/gta6-cover-art-01-entry/reward.svg)](https://make.fun/bounty/gta6-cover-art-01)

Neon Night Cover Studio turns one of your photos and a caption into a GTA 6-style multi-panel cover poster, right in the browser. Pick a photo, pick a layout, pick a grade, type a title, and export the finished cover as a PNG — no upload, no account, everything runs offline on your own machine.

## What it does

- **4 layouts**: a multi-panel collage, a polaroid scatter, a five-slice split of one photo, and a poster grid.
- **5 grades**: cold Vice Violet, warm Sunset Vice, halftone Poster Ink, Teal Dawn, and Mono Noir — each applied per pixel as a gradient map.
- **Big poster type**: a gradient title that grows to fit, a neon script subtitle, a kicker line, a tagline strip, a skyline silhouette, and starburst and rating badges.
- **5 sample photos** included, or bring your own with the photo picker.
- **PNG export in 3 sizes**: 1920x1080, 1080x1350, and 1080x1080, one click for all three.

## Run it

Open `app/index.html` in a desktop browser, or serve the `app/` folder with any static server. Everything is local: no network requests, no tracking.

## Build the dossier

```sh
MAKEFUN_OUTPUT_DIR=out node main.ts
```

This copies `app/` and `screenshots/` into `out/` and writes `out/dossier.json` using the competition kit's `vendor/makefun-app.ts`.

Built for the [Make GTA 6 Cover Art](https://make.fun/bounty/gta6-cover-art-01) bounty on [make.fun](https://make.fun).
