// Neon Night Cover Studio — the cover renderer (canvas 2D, no libraries).
//
// drawCover(canvas, state) paints one complete cover at the canvas's own
// size: photo panels with the chosen grade, a title band (or a title cell for
// the grid layout) with a gradient display title, a neon script subtitle, a
// skyline, and poster badges. Everything is drawn, never composited from
// images, so the exported PNG is exactly what the preview shows.

import { gradeById } from './grades.js';
import { layoutGeometry } from './layouts.js';

// ---------------------------------------------------------------- small helpers

/** A deterministic 32-bit hash of a string, for stable pseudo-random art. */
function hashSeed(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** A small seeded PRNG (mulberry32). */
function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Shrink a font until `text` fits `maxW`; returns the size used. */
function fitFont(ctx, text, family, weight, maxW, start, min) {
  let size = start;
  ctx.font = `${weight} ${size}px ${family}`;
  while (size > min && ctx.measureText(text).width > maxW) {
    size -= 2;
    ctx.font = `${weight} ${size}px ${family}`;
  }
  return size;
}

/** Letter-spacing when the browser offers it (Chrome does). */
function setSpacing(ctx, px) {
  if ('letterSpacing' in ctx) ctx.letterSpacing = `${px}px`;
}

// ---------------------------------------------------------------- halftone

let halftoneTile = null;
/** A small tile with one dark dot, for the Poster Ink grade. */
function halftonePattern(ctx) {
  if (!halftoneTile) {
    const tile = document.createElement('canvas');
    tile.width = 10;
    tile.height = 10;
    const t = tile.getContext('2d');
    t.fillStyle = 'rgba(10,4,24,0.9)';
    t.beginPath();
    t.arc(5, 5, 2.1, 0, Math.PI * 2);
    t.fill();
    halftoneTile = tile;
  }
  return ctx.createPattern(halftoneTile, 'repeat');
}

// ---------------------------------------------------------------- photo panels

/** One photo panel: cover-fit photo, grade overlays, halftone, white frame. */
function drawPhotoPanel(ctx, img, r, crop, grade) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(r.x, r.y, r.w, r.h);
  ctx.clip();
  // Cover-fit with a pan: ox/oy run -1..1, where 1 pins the photo's top
  // (or left) edge to the panel's, -1 pins the bottom (or right) edge, and
  // 0 centres it. Because the pan is a share of the overflow, the same
  // crop frames the same subject at any panel aspect ratio.
  const base = Math.max(r.w / img.naturalWidth, r.h / img.naturalHeight);
  const scale = base * (crop.zoom || 1);
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  const dx = r.x + (r.w - dw) / 2 + (crop.ox || 0) * Math.max(0, dw - r.w) / 2;
  const dy = r.y + (r.h - dh) / 2 + (crop.oy || 0) * Math.max(0, dh - r.h) / 2;
  ctx.filter = grade.filter || 'none';
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.filter = 'none';
  for (const step of grade.steps) {
    if (step.gradient) {
      const g = ctx.createLinearGradient(0, r.y, 0, r.y + r.h);
      g.addColorStop(0, step.gradient[0]);
      g.addColorStop(1, step.gradient[1]);
      ctx.globalCompositeOperation = step.op;
      ctx.globalAlpha = step.alpha;
      ctx.fillStyle = g;
      ctx.fillRect(r.x, r.y, r.w, r.h);
    } else {
      ctx.globalCompositeOperation = step.op;
      ctx.globalAlpha = step.alpha;
      ctx.fillStyle = step.fill;
      ctx.fillRect(r.x, r.y, r.w, r.h);
    }
  }
  if (grade.halftone) {
    ctx.globalCompositeOperation = 'overlay';
    ctx.globalAlpha = grade.halftone;
    ctx.fillStyle = halftonePattern(ctx);
    ctx.fillRect(r.x, r.y, r.w, r.h);
  }
  ctx.restore();
  const lw = Math.max(2, Math.round(Math.min(r.w, r.h) * 0.005));
  ctx.strokeStyle = 'rgba(255,255,255,0.92)';
  ctx.lineWidth = lw;
  ctx.strokeRect(r.x + lw / 2, r.y + lw / 2, r.w - lw, r.h - lw);
}

// ---------------------------------------------------------------- poster furniture

/** A yellow starburst badge ("EST. 2026") at (cx, cy). */
function drawStarburst(ctx, cx, cy, r, line1, line2) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.beginPath();
  const spikes = 12;
  for (let i = 0; i < spikes * 2; i++) {
    const rad = i % 2 === 0 ? r : r * 0.78;
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
  const fs = Math.round(r * 0.26);
  ctx.font = `bold ${fs}px Anton, sans-serif`;
  ctx.fillText(line1, 0, -fs * 0.55);
  ctx.fillText(line2, 0, fs * 0.55);
  ctx.restore();
}

/** A dark pill with "HEAT" and five stars. */
function drawStarsPill(ctx, x, y, scale) {
  const fs = Math.round(20 * scale);
  const pad = Math.round(10 * scale);
  const text = 'HEAT ★★★★★';
  ctx.save();
  ctx.font = `bold ${fs}px Anton, sans-serif`;
  const w = ctx.measureText(text).width + pad * 2;
  const h = fs + pad * 1.6;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, h / 2);
  ctx.fillStyle = 'rgba(10,4,28,0.82)';
  ctx.fill();
  ctx.fillStyle = '#ffd76a';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x + pad, y + h / 2 + 1);
  ctx.restore();
}

/** A barcode with a number, drawn from a seed so it never changes. */
function drawBarcode(ctx, x, y, w, h, seed) {
  const rnd = mulberry32(hashSeed(seed));
  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x, y, w, h);
  let bx = x + w * 0.06;
  ctx.fillStyle = '#111111';
  while (bx < x + w * 0.94) {
    const bw = 1 + rnd() * 4;
    if (rnd() > 0.35) ctx.fillRect(bx, y + h * 0.08, bw, h * 0.62);
    bx += bw + 1 + rnd() * 4;
  }
  ctx.fillStyle = '#111111';
  ctx.font = `${Math.max(9, Math.round(h * 0.14))}px monospace`;
  ctx.textAlign = 'center';
  ctx.fillText('8 901234 567890', x + w / 2, y + h * 0.9);
  ctx.restore();
}

/** A black skyline with lit windows along the bottom of a rect. */
function drawSkyline(ctx, x, y, w, h, seed) {
  const rnd = mulberry32(hashSeed(seed));
  ctx.save();
  ctx.fillStyle = '#070412';
  let bx = x;
  while (bx < x + w) {
    const bw = w * (0.03 + rnd() * 0.05);
    const bh = h * (0.35 + rnd() * 0.6);
    ctx.fillRect(bx, y + h - bh, bw, bh);
    if (rnd() > 0.5) ctx.fillRect(bx + bw * 0.4, y + h - bh - h * 0.12, 2, h * 0.12); // antenna
    for (let wy = y + h - bh + 4; wy < y + h - 4; wy += 9) {
      for (let wx = bx + 4; wx < bx + bw - 4; wx += 8) {
        if (rnd() > 0.72) {
          ctx.fillStyle = 'rgba(255,214,106,0.9)';
          ctx.fillRect(wx, wy, 3, 4);
          ctx.fillStyle = '#070412';
        }
      }
    }
    bx += bw + 2;
  }
  ctx.restore();
}

// ---------------------------------------------------------------- title

/** The big gradient display title, with a dark outline and a neon glow. */
function drawDisplayTitle(ctx, text, cx, baseline, maxW, maxSize, minSize) {
  const size = fitFont(ctx, text.toUpperCase(), 'Anton, sans-serif', '400', maxW, maxSize, minSize);
  const grad = ctx.createLinearGradient(0, baseline - size, 0, baseline + size * 0.12);
  grad.addColorStop(0, '#fff6bf');
  grad.addColorStop(0.45, '#ffb347');
  grad.addColorStop(1, '#ff2d78');
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.lineJoin = 'round';
  ctx.shadowColor = 'rgba(255,45,120,0.55)';
  ctx.shadowBlur = size * 0.10;
  ctx.shadowOffsetY = size * 0.02;
  ctx.strokeStyle = '#160a2e';
  ctx.lineWidth = size * 0.09;
  ctx.strokeText(text.toUpperCase(), cx, baseline);
  ctx.fillStyle = grad;
  ctx.fillText(text.toUpperCase(), cx, baseline);
  ctx.restore();
  return size;
}

// ---------------------------------------------------------------- the band and the title cell

function drawBand(ctx, band, state, seed) {
  const { x, y, w, h } = band;
  const bg = ctx.createLinearGradient(0, y, 0, y + h);
  bg.addColorStop(0, '#160a33');
  bg.addColorStop(0.55, '#3d1160');
  bg.addColorStop(1, '#a11768');
  ctx.fillStyle = bg;
  ctx.fillRect(x, y, w, h);
  const skyH = h * 0.12;
  drawSkyline(ctx, x, y + h - skyH, w, skyH, `${seed}-sky`);
  const cx = x + w / 2;
  // Kicker.
  const kicker = (state.kicker || '').trim().toUpperCase();
  if (kicker) {
    const fs = Math.max(12, Math.round(h * 0.085));
    ctx.save();
    setSpacing(ctx, Math.round(fs * 0.28));
    ctx.font = `bold ${fs}px Anton, sans-serif`;
    ctx.fillStyle = '#ffd76a';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(kicker, cx, y + h * 0.07);
    setSpacing(ctx, 0);
    ctx.restore();
  }
  // Title.
  const title = (state.title || 'NEON NIGHT').trim();
  const titleSize = drawDisplayTitle(ctx, title, cx, y + h * 0.48, w * 0.94, h * 0.40, h * 0.16);
  // Script subtitle, tucked under the title.
  const sub = (state.subtitle || '').trim();
  if (sub) {
    ctx.save();
    ctx.translate(cx, y + h * 0.64);
    ctx.rotate(-0.035);
    ctx.font = `${Math.round(h * 0.14)}px Pacifico, cursive`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(255,140,220,0.9)';
    ctx.shadowBlur = titleSize * 0.25;
    ctx.fillStyle = '#ff8ad8';
    ctx.fillText(sub, 0, 0);
    ctx.restore();
  }
  // Tagline, just above the skyline strip.
  const tag = (state.tagline || '').trim().toUpperCase();
  if (tag) {
    const fs = Math.max(11, Math.round(h * 0.055));
    ctx.save();
    setSpacing(ctx, Math.round(fs * 0.22));
    ctx.font = `bold ${fs}px Anton, sans-serif`;
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(tag, cx, y + h * 0.83);
    setSpacing(ctx, 0);
    ctx.restore();
  }
  // Barcode, only when the band is wide enough to hold it clear of the tagline.
  if (state.showBarcode && w >= 1400) {
    drawBarcode(ctx, x + w - 150, y + h - skyH - 52, 130, 44, `${seed}-bar`);
  }
}

function drawTitleCell(ctx, cell, state) {
  const { x, y, w, h } = cell;
  const bg = ctx.createLinearGradient(x, y, x + w, y + h);
  bg.addColorStop(0, '#3d1160');
  bg.addColorStop(1, '#ff2d78');
  ctx.fillStyle = bg;
  ctx.fillRect(x, y, w, h);
  const lw = Math.max(2, Math.round(Math.min(w, h) * 0.01));
  ctx.strokeStyle = 'rgba(255,255,255,0.92)';
  ctx.lineWidth = lw;
  ctx.strokeRect(x + lw / 2, y + lw / 2, w - lw, h - lw);
  const words = (state.title || 'NEON NIGHT').trim().toUpperCase().split(/\s+/);
  const lines = words.length > 1 ? [words.slice(0, Math.ceil(words.length / 2)).join(' '), words.slice(Math.ceil(words.length / 2)).join(' ')] : words;
  const cx = x + w / 2;
  let baseline = y + h * (lines.length > 1 ? 0.4 : 0.46);
  for (const line of lines) {
    const size = drawDisplayTitle(ctx, line, cx, baseline, w * 0.88, h * 0.3, h * 0.1);
    baseline += size * 1.05;
  }
  const sub = (state.subtitle || '').trim();
  if (sub) {
    ctx.save();
    ctx.font = `${Math.round(h * 0.1)}px Pacifico, cursive`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(255,140,220,0.9)';
    ctx.shadowBlur = 12;
    ctx.fillStyle = '#ffe3f4';
    ctx.fillText(sub, cx, y + h * 0.82);
    ctx.restore();
  }
}

// ---------------------------------------------------------------- entry point

/**
 * Paints one cover onto `canvas` (at the canvas's own pixel size).
 * `state`: { layout, grade, title, subtitle, tagline, kicker,
 *   photos: {A,B,C: HTMLImageElement|null}, crops: {panelIndex: {zoom, ox, oy}},
 *   showStarburst, showStars, showBarcode }.
 */
export function drawCover(canvas, state) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const grade = gradeById(state.grade);
  const geo = layoutGeometry(state.layout, w, h);
  const seed = `${state.title}|${state.layout}|${state.grade}`;
  ctx.fillStyle = '#0d0a24';
  ctx.fillRect(0, 0, w, h);
  geo.panels.forEach((panel, i) => {
    const img = state.photos ? state.photos[panel.photo] : null;
    const crop = (state.crops && state.crops[i]) || { zoom: 1, ox: 0, oy: 0 };
    if (img) {
      drawPhotoPanel(ctx, img, panel, crop, grade);
    } else {
      ctx.fillStyle = '#1c1440';
      ctx.fillRect(panel.x, panel.y, panel.w, panel.h);
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.font = `600 ${Math.max(12, Math.round(panel.h * 0.05))}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('ADD A PHOTO', panel.x + panel.w / 2, panel.y + panel.h / 2);
    }
  });
  // Vignette over the panels.
  const vig = ctx.createRadialGradient(w / 2, h * 0.42, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75);
  vig.addColorStop(0, 'rgba(8,3,24,0)');
  vig.addColorStop(1, 'rgba(8,3,24,0.42)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, h);
  if (geo.band) drawBand(ctx, geo.band, state, seed);
  if (geo.titleCell) drawTitleCell(ctx, geo.titleCell, state);
  // Poster badges on the first panel.
  const first = geo.panels[0];
  if (first) {
    if (state.showStarburst !== false && first.w >= 260) {
      const r = Math.max(26, Math.min(first.w, first.h) * 0.11);
      drawStarburst(ctx, first.x + first.w - r - 12, first.y + r + 12, r, 'EST.', '2026');
    }
    if (state.showStars !== false && first.w >= 300) {
      drawStarsPill(ctx, first.x + 14, first.y + 14, Math.max(0.7, Math.min(first.w, first.h) / 500));
    }
  }
}
