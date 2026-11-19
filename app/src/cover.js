// Neon Night Cover Studio — the cover renderer (canvas 2D, no libraries).
//
// drawCover(canvas, state) paints one complete cover at the canvas's own
// size: photo panels graded with a gradient map and halftone ink, then the
// title band with a gradient display title grown to fill it, a neon script
// subtitle, a skyline, a tagline strip and poster badges. Everything is
// drawn, never composited from images, so the exported PNG is exactly what
// the preview shows.

import { gradeById, applyGradientMap, luminanceGrid } from './grades.js';
import { layoutGeometry } from './layouts.js';

// ---------------------------------------------------------------- fonts

let fontsReady = false;

/** Load the two display fonts so canvas lettering uses them, not a fallback. */
export async function ensureFonts() {
  if (fontsReady) return;
  try {
    await Promise.all([
      document.fonts.load('400 100px Anton'),
      document.fonts.load('400 60px Pacifico'),
    ]);
    await document.fonts.ready;
  } catch {
    // A fallback font still draws; the cover never blocks on fonts.
  }
  fontsReady = true;
}

// ---------------------------------------------------------------- seeded random

function seedFrom(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rngFrom(seed) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function setTracking(ctx, px) {
  if ('letterSpacing' in ctx) ctx.letterSpacing = `${px}px`;
}

// ---------------------------------------------------------------- photo panels

/**
 * The source rect of `img` for a panel: cover-fit, then zoomed and panned.
 * ox/oy run -1..1 as a share of the overflow, so the same crop frames the
 * same subject at any panel aspect ratio. Slice panels take one fifth of
 * the photo instead, so one photo becomes five different shots.
 */
function sourceRect(img, p, crop) {
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;
  if (p.sliceIndex != null) {
    const count = p.sliceCount || 5;
    const sliceW = iw / count;
    const zoom = 1.04;
    const sw = sliceW / zoom;
    const sh = ih / zoom;
    const ox = (p.sliceIndex - (count - 1) / 2) * 0.12;
    const sx = Math.max(0, Math.min(iw - sw, p.sliceIndex * sliceW + (sliceW - sw) / 2 + ox * sliceW * 0.2));
    const sy = (ih - sh) / 2;
    return { sx, sy, sw, sh };
  }
  const base = Math.max(p.w / iw, p.h / ih);
  const scale = base * (crop.zoom || 1);
  const dw = iw * scale;
  const dh = ih * scale;
  const ox = crop.ox || 0;
  const oy = crop.oy || 0;
  return {
    sx: Math.max(0, (iw - p.w / scale) / 2 - (ox * Math.max(0, dw - p.w)) / 2 / scale),
    sy: Math.max(0, (ih - p.h / scale) / 2 - (oy * Math.max(0, dh - p.h)) / 2 / scale),
    sw: p.w / scale,
    sh: p.h / scale,
  };
}

/** Halftone dots over a graded panel: dots grow where the photo is dark. */
function paintHalftone(off, imageData, ink) {
  const w = off.width;
  const h = off.height;
  const cell = 7;
  const cols = Math.ceil(w / cell);
  const rows = Math.ceil(h / cell);
  const grid = luminanceGrid(imageData, cols, rows);
  const ctx = off.getContext('2d');
  const path = new Path2D();
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const lum = grid[y * cols + x];
      const r = (1 - lum) * cell * 0.52 * (0.35 + ink);
      if (r < 0.4) continue;
      path.moveTo((x + 0.5) * cell + r, (y + 0.5) * cell);
      path.arc((x + 0.5) * cell, (y + 0.5) * cell, r, 0, Math.PI * 2);
    }
  }
  ctx.fillStyle = `rgba(8,3,22,${0.35 + ink * 0.5})`;
  ctx.fill(path);
}

/**
 * One photo panel: the photo graded through the gradient map, halftone ink
 * on top, then drawn (straight with a white frame, or tilted in a polaroid
 * print with a white foot and tape).
 */
function drawPhotoPanel(ctx, img, p, crop, grade, ink) {
  const scale = Math.min(1, 1024 / Math.max(p.w, p.h));
  const ow = Math.max(2, Math.round(p.w * scale));
  const oh = Math.max(2, Math.round(p.h * scale));
  const off = document.createElement('canvas');
  off.width = ow;
  off.height = oh;
  const octx = off.getContext('2d');
  const src = sourceRect(img, p, crop);
  octx.drawImage(img, src.sx, src.sy, src.sw, src.sh, 0, 0, ow, oh);
  const imageData = octx.getImageData(0, 0, ow, oh);
  applyGradientMap(imageData, grade);
  octx.putImageData(imageData, 0, 0);
  if (ink > 0.03) paintHalftone(off, imageData, ink);

  ctx.save();
  if (p.frame === 'polaroid') {
    // Tilted snapshot print: white border, a deeper foot, tape on top.
    const cx = p.x + p.w / 2;
    const cy = p.y + p.h / 2;
    ctx.translate(cx, cy);
    ctx.rotate(p.rotate || 0);
    ctx.shadowColor = 'rgba(0,0,0,0.55)';
    ctx.shadowBlur = Math.max(8, p.w * 0.04);
    ctx.shadowOffsetY = Math.max(4, p.w * 0.02);
    const foot = p.h * 0.16;
    ctx.fillStyle = '#fdf6e3';
    ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h + foot);
    ctx.drawImage(off, -p.w / 2 + p.w * 0.03, -p.h / 2 + p.h * 0.03, p.w * 0.94, p.h * 0.94);
    ctx.shadowColor = 'transparent';
    ctx.fillStyle = 'rgba(255,214,106,0.75)';
    ctx.fillRect(-p.w * 0.16, -p.h / 2 - p.h * 0.02, p.w * 0.32, p.h * 0.07);
    ctx.restore();
    return;
  }
  if (p.rotate) {
    ctx.translate(p.x + p.w / 2, p.y + p.h / 2);
    ctx.rotate(p.rotate);
    ctx.translate(-p.w / 2, -p.h / 2);
    ctx.drawImage(off, 0, 0, p.w, p.h);
    ctx.restore();
    return;
  }
  ctx.drawImage(off, p.x, p.y, p.w, p.h);
  const lw = Math.max(2, Math.round(Math.min(p.w, p.h) * 0.006));
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = lw;
  ctx.strokeRect(p.x + lw / 2, p.y + lw / 2, p.w - lw, p.h - lw);
  ctx.restore();
}

// ---------------------------------------------------------------- poster furniture

/** A yellow starburst badge ("EST. 2026") centred at (cx, cy). */
function drawStarburst(ctx, cx, cy, r) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.beginPath();
  const spikes = 12;
  for (let i = 0; i < spikes * 2; i++) {
    const rad = i % 2 === 0 ? r : r * 0.76;
    const a = (i / (spikes * 2)) * Math.PI * 2 - Math.PI / 2;
    const x = Math.cos(a) * rad;
    const y = Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = '#ffd76a';
  ctx.fill();
  ctx.lineWidth = Math.max(2, r * 0.06);
  ctx.strokeStyle = '#160a2e';
  ctx.stroke();
  ctx.fillStyle = '#160a2e';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const fs = Math.round(r * 0.24);
  ctx.font = `400 ${fs}px Anton, sans-serif`;
  ctx.fillText('EST.', 0, -fs * 0.55);
  ctx.fillText('2026', 0, fs * 0.55);
  ctx.restore();
}

/** A dark pill with five stars and the word HEAT, right-aligned at rightX. */
function drawStarsPill(ctx, rightX, y, scale) {
  const fs = Math.round(20 * scale);
  const pad = Math.round(11 * scale);
  const text = 'HEAT ★★★★★';
  ctx.save();
  ctx.font = `400 ${fs}px Anton, sans-serif`;
  const w = ctx.measureText(text).width + pad * 2;
  const h = fs + pad * 1.6;
  const x = rightX - w;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, h / 2);
  ctx.fillStyle = 'rgba(10,4,28,0.85)';
  ctx.fill();
  ctx.fillStyle = '#ffd76a';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x + pad, y + h / 2 + 1);
  ctx.restore();
}

/** A black skyline with lit windows and two palm silhouettes. */
function drawSkyline(ctx, x, y, w, h, seed) {
  const rnd = rngFrom(seedFrom(seed));
  ctx.save();
  ctx.fillStyle = '#06030f';
  let bx = x;
  while (bx < x + w) {
    const bw = w * (0.03 + rnd() * 0.05);
    const bh = h * (0.4 + rnd() * 0.55);
    ctx.fillRect(bx, y + h - bh, bw, bh);
    for (let wy = y + h - bh + 4; wy < y + h - 5; wy += 9) {
      for (let wx = bx + 4; wx < bx + bw - 4; wx += 8) {
        if (rnd() > 0.7) {
          ctx.fillStyle = 'rgba(255,214,106,0.95)';
          ctx.fillRect(wx, wy, 3, 4);
          ctx.fillStyle = '#06030f';
        }
      }
    }
    bx += bw + 2;
  }
  // Two palms: a curved trunk and five fronds each.
  for (const px of [x + w * 0.12, x + w * 0.86]) {
    const topY = y + h * 0.25;
    ctx.strokeStyle = '#06030f';
    ctx.lineWidth = Math.max(2, w * 0.004);
    ctx.beginPath();
    ctx.moveTo(px, y + h);
    ctx.quadraticCurveTo(px + w * 0.01, y + h * 0.55, px - w * 0.01, topY);
    ctx.stroke();
    for (let f = 0; f < 5; f++) {
      const a = Math.PI * (0.08 + f * 0.18);
      ctx.beginPath();
      ctx.moveTo(px - w * 0.01, topY);
      ctx.quadraticCurveTo(
        px + Math.cos(a) * w * 0.03,
        topY - Math.sin(a) * h * 0.35,
        px + Math.cos(a) * w * 0.055,
        topY + h * 0.12,
      );
      ctx.stroke();
    }
  }
  ctx.restore();
}

// ---------------------------------------------------------------- title band

/**
 * The big gradient display title. The size grows to fill `maxW` (up to
 * `maxSize`); when the words are too short to fill the width at that size,
 * letter-spacing spreads them out so the title still spans the band,
 * poster style. Returns the size used.
 */
function drawDisplayTitle(ctx, text, cx, baseline, maxW, maxSize, minSize, titleColors) {
  const upper = text.toUpperCase();
  ctx.font = '400 100px Anton, sans-serif';
  const probeW = ctx.measureText(upper).width / 100;
  let size = Math.min(maxSize, maxW / probeW);
  size = Math.max(minSize, size);
  let tracking = 0;
  const plainW = size * probeW;
  if (plainW < maxW && upper.length > 1) {
    tracking = Math.min((maxW - plainW) / (upper.length - 1), size * 0.16);
  }
  ctx.font = `400 ${size}px Anton, sans-serif`;
  const grad = ctx.createLinearGradient(0, baseline - size, 0, baseline + size * 0.12);
  grad.addColorStop(0, titleColors[0]);
  grad.addColorStop(1, titleColors[1]);
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.lineJoin = 'round';
  setTracking(ctx, Math.round(tracking));
  ctx.shadowColor = 'rgba(255,45,120,0.5)';
  ctx.shadowBlur = size * 0.08;
  ctx.shadowOffsetY = size * 0.02;
  ctx.strokeStyle = '#160a2e';
  ctx.lineWidth = size * 0.09;
  ctx.strokeText(upper, cx, baseline);
  ctx.fillStyle = grad;
  ctx.fillText(upper, cx, baseline);
  ctx.restore();
  setTracking(ctx, 0);
  return size;
}

function drawBand(ctx, band, state, grade, seed) {
  const { x, y, w, h } = band;
  const bg = ctx.createLinearGradient(0, y, 0, y + h);
  bg.addColorStop(0, '#150a30');
  bg.addColorStop(0.55, '#3d1160');
  bg.addColorStop(1, '#8f1d63');
  ctx.fillStyle = bg;
  ctx.fillRect(x, y, w, h);
  const skyH = h * 0.05;
  drawSkyline(ctx, x, y, w, skyH, `${seed}-sky`);
  const cx = x + w / 2;
  const kicker = (state.kicker || '').trim().toUpperCase();
  if (kicker) {
    const fs = Math.max(12, Math.round(h * 0.062));
    ctx.save();
    setTracking(ctx, Math.round(fs * 0.3));
    ctx.font = `400 ${fs}px Anton, sans-serif`;
    ctx.fillStyle = '#ffd76a';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(kicker, cx, y + h * 0.14);
    setTracking(ctx, 0);
    ctx.restore();
  }
  const title = (state.title || 'NEON NIGHT').trim();
  const titleSize = drawDisplayTitle(ctx, title, cx, y + h * 0.68, w * 0.94, h * 0.52, h * 0.17, grade.title);
  const sub = (state.subtitle || '').trim();
  if (sub) {
    let subFs = Math.round(h * 0.24);
    ctx.font = `${subFs}px Pacifico, cursive`;
    const subCx = cx + w * 0.15;
    const room = Math.min(subCx - (x + w * 0.03), (x + w * 0.97) - subCx) * 2;
    const subW = ctx.measureText(sub).width;
    if (subW > room) subFs = Math.max(22, Math.round(subFs * room / subW));
    ctx.save();
    ctx.translate(subCx, y + h * 0.78);
    ctx.rotate(-0.04);
    ctx.font = `${subFs}px Pacifico, cursive`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(255,140,220,0.9)';
    ctx.shadowBlur = titleSize * 0.22;
    ctx.fillStyle = grade.script;
    ctx.fillText(sub, 0, 0);
    ctx.restore();
  }
  // Tagline as a full-width strip at the foot of the band.
  const tag = (state.tagline || '').trim().toUpperCase();
  if (tag) {
    const stripH = Math.round(h * 0.15);
    const stripY = y + h - stripH;
    ctx.fillStyle = grade.stripBg;
    ctx.fillRect(x, stripY, w, stripH);
    const fs = Math.max(11, Math.round(stripH * 0.42));
    ctx.save();
    setTracking(ctx, Math.round(fs * 0.28));
    ctx.font = `400 ${fs}px Anton, sans-serif`;
    ctx.fillStyle = grade.stripText;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(tag, cx, stripY + stripH / 2 + 1);
    setTracking(ctx, 0);
    ctx.restore();
  }
}

// ---------------------------------------------------------------- entry point

/**
 * Paints one cover onto `canvas` (at the canvas's own pixel size).
 * `state`: { layout, grade, ink, title, subtitle, tagline, kicker,
 *   photos: [HTMLImageElement|null], crops: {panelIndex: {zoom, ox, oy}},
 *   showStarburst, showStars }.
 */
export function drawCover(canvas, state) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const grade = gradeById(state.grade);
  const ink = typeof state.ink === 'number' ? state.ink : 0.4;
  const geo = layoutGeometry(state.layout, w, h);
  const seed = `${state.title}|${state.layout}|${state.grade}`;
  ctx.fillStyle = '#0d0a24';
  ctx.fillRect(0, 0, w, h);
  geo.panels.forEach((p, i) => {
    // A panel shows its layout photo, unless the editor assigned another
    // photo to this panel (click a photo in the strip).
    const photoIndex = state.panelPhoto && state.panelPhoto[i] !== undefined
      ? state.panelPhoto[i]
      : p.photo;
    const img = state.photos ? state.photos[photoIndex] : null;
    const crop = (state.crops && state.crops[i]) || { zoom: 1, ox: 0, oy: 0 };
    if (img) {
      drawPhotoPanel(ctx, img, p, crop, grade, ink);
    } else {
      ctx.fillStyle = '#1c1440';
      ctx.fillRect(p.x, p.y, p.w, p.h);
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.font = `600 ${Math.max(12, Math.round(p.h * 0.05))}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('ADD A PHOTO', p.x + p.w / 2, p.y + p.h / 2);
    }
  });
  const vig = ctx.createRadialGradient(
    w / 2, h * 0.42, Math.min(w, h) * 0.35,
    w / 2, h / 2, Math.max(w, h) * 0.75,
  );
  vig.addColorStop(0, 'rgba(8,3,24,0)');
  vig.addColorStop(1, 'rgba(8,3,24,0.4)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, h);
  drawBand(ctx, geo.band, state, grade, seed);
  // Poster badges at the cover's top corners, over the first panels.
  if (state.showStarburst !== false) {
    const r = Math.max(26, Math.min(w, h) * 0.055);
    drawStarburst(ctx, r + 14, r + 14, r);
  }
  if (state.showStars !== false) {
    drawStarsPill(ctx, w - 14, 14, Math.max(0.9, Math.min(w, h) / 620));
  }
}
