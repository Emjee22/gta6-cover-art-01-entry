// Neon Night Cover Studio — the editor.
//
// Wires the page: five photo slots (samples + uploads), layout and grade
// pickers, the words, the live preview (click a panel to pick it, drag to
// pan its photo, scroll or slide to zoom, reset to reframe) and the PNG
// export in three sizes. A `?shot=` query hands the page to shots.js
// instead, for fixed screenshot scenes.

import { drawCover, ensureFonts } from './cover.js';
import { runShot } from './shots.js';
import { GRADES } from './grades.js';
import { LAYOUTS, layoutGeometry } from './layouts.js';

const SIZES = [
  { id: '1920x1080', label: '1920 x 1080', w: 1920, h: 1080 },
  { id: '1080x1350', label: '1080 x 1350', w: 1080, h: 1350 },
  { id: '1080x1080', label: '1080 x 1080', w: 1080, h: 1080 },
];

const SAMPLES = [
  { id: 'boulevard', label: 'Boulevard' },
  { id: 'pier', label: 'Pier' },
  { id: 'car', label: 'Sunset Car' },
  { id: 'palms', label: 'Boardwalk' },
  { id: 'neon', label: 'Neon Street' },
];

const SURPRISE_TITLES = [
  'NEON NIGHT', 'VICE LIGHTS', 'PALM STATIC', 'MIDNIGHT DRIVE',
  'CHROME PALMS', 'OCEAN STATIC', 'LAST SUNSET', 'LEONIDA HEAT',
  'SUNSET DRIVE', 'MIDNIGHT TIDE', 'GOLDEN STATIC', 'HARBOR LIGHTS',
];
const SURPRISE_SUBS = [
  'city of neon dreams', 'one more ride', 'chasing the last light',
  'every street is a stage', 'born to run the night',
  'where the palms glow', 'five shots, one night', 'the tide never waits',
];

const canvas = document.getElementById('preview');
const statusEl = document.getElementById('status');
const selectedEl = document.getElementById('selectedPanel');
const zoomEl = document.getElementById('zoom');

const state = {
  layout: 'collage',
  grade: 'violet',
  ink: 0.4,
  title: 'NEON NIGHT',
  subtitle: 'city of neon dreams',
  tagline: 'EVERY LIGHT HIDES A STORY',
  kicker: 'WELCOME TO LEONIDA',
  photos: [null, null, null, null, null],
  panelPhoto: {},
  crops: {},
  showStarburst: true,
  showStars: true,
  size: SIZES[0],
};

let selectedPanel = 0;

/**
 * Default crops per layout, so faces stay in frame: the portrait samples
 * are taller than the wide panels, so the default pan (oy) lifts the face
 * into view instead of centring the photo. Index = panel index.
 */
const DEFAULT_CROPS = {
  collage: [
    { zoom: 1, ox: 0, oy: 0.6 },
    { zoom: 1.1, ox: 0, oy: 0.7 },
    { zoom: 1.1, ox: 0, oy: 0.5 },
    { zoom: 1.2, ox: 0.1, oy: 0.4 },
    { zoom: 1.15, ox: 0, oy: 0.6 },
    { zoom: 1.1, ox: 0, oy: 0.55 },
    { zoom: 1.2, ox: -0.1, oy: 0.5 },
  ],
  polaroid: [
    { zoom: 1.1, ox: 0, oy: 0.55 },
    { zoom: 1.1, ox: 0, oy: 0.5 },
    { zoom: 1.15, ox: 0, oy: 0.6 },
    { zoom: 1.1, ox: 0, oy: 0.45 },
    { zoom: 1.15, ox: 0, oy: 0.55 },
  ],
  slices: [
    { zoom: 1, ox: 0, oy: 0 },
    { zoom: 1, ox: 0, oy: 0 },
    { zoom: 1, ox: 0, oy: 0 },
    { zoom: 1, ox: 0, oy: 0 },
    { zoom: 1, ox: 0, oy: 0 },
  ],
  grid: [
    { zoom: 1.15, ox: 0, oy: 0.55 },
    { zoom: 1.15, ox: 0, oy: 0.5 },
    { zoom: 1.2, ox: 0.05, oy: 0.55 },
    { zoom: 1.25, ox: 0, oy: 0.5 },
    { zoom: 1.15, ox: 0, oy: 0.6 },
    { zoom: 1.3, ox: 0, oy: 0.55 },
    { zoom: 1.2, ox: 0, oy: 0.5 },
    { zoom: 1.25, ox: -0.05, oy: 0.55 },
    { zoom: 1.2, ox: 0, oy: 0.6 },
  ],
};

function freshCrops(layoutId) {
  const table = DEFAULT_CROPS[layoutId] || DEFAULT_CROPS.collage;
  const crops = {};
  table.forEach((c, i) => {
    crops[i] = { ...c };
  });
  return crops;
}

function setStatus(text) {
  statusEl.textContent = text;
}

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`cannot load ${url}`));
    img.src = url;
  });
}

/** Renders the current state onto the preview canvas (at export size). */
export async function redraw() {
  await ensureFonts();
  canvas.width = state.size.w;
  canvas.height = state.size.h;
  drawCover(canvas, state);
}

function applyLayout(layoutId) {
  state.layout = layoutId;
  state.crops = freshCrops(layoutId);
  state.panelPhoto = {};
  selectedPanel = 0;
  syncPickers();
  redraw();
}

function syncPickers() {
  document.querySelectorAll('#layouts button').forEach((b) => {
    b.classList.toggle('active', b.dataset.layout === state.layout);
  });
  document.querySelectorAll('#grades button').forEach((b) => {
    b.classList.toggle('active', b.dataset.grade === state.grade);
  });
  document.querySelectorAll('input[name="size"]').forEach((r) => {
    r.checked = r.value === state.size.id;
  });
  const crop = state.crops[selectedPanel] || { zoom: 1 };
  zoomEl.value = String(crop.zoom || 1);
  selectedEl.textContent = `Panel ${selectedPanel + 1} selected — click a photo below to put it here, drag to pan, scroll to zoom.`;
}

function buildPickers() {
  const layoutBox = document.getElementById('layouts');
  for (const layout of LAYOUTS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.layout = layout.id;
    b.title = layout.hint;
    b.innerHTML = `<strong>${layout.label}</strong><span>${layout.hint}</span>`;
    b.addEventListener('click', () => applyLayout(layout.id));
    layoutBox.appendChild(b);
  }
  const gradeBox = document.getElementById('grades');
  for (const grade of GRADES) {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.grade = grade.id;
    const stops = grade.stops.map(([t, c]) => `${c} ${Math.round(t * 100)}%`).join(', ');
    b.innerHTML = `<i style="background:linear-gradient(135deg,${stops})"></i><strong>${grade.name}</strong>`;
    b.addEventListener('click', () => {
      state.grade = grade.id;
      syncPickers();
      redraw();
    });
    gradeBox.appendChild(b);
  }
  const sizeBox = document.getElementById('sizes');
  for (const size of SIZES) {
    const label = document.createElement('label');
    label.innerHTML = `<input type="radio" name="size" value="${size.id}"> ${size.label}`;
    label.querySelector('input').addEventListener('change', () => {
      state.size = size;
      redraw();
    });
    sizeBox.appendChild(label);
  }
}

function buildPhotoStrip() {
  const strip = document.getElementById('photostrip');
  SAMPLES.forEach((sample, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'photo-thumb';
    b.dataset.photo = String(i);
    b.title = `${sample.label} — click to put it in the selected panel`;
    b.innerHTML = `<img alt="${sample.label}" hidden><span>${sample.label}</span>`;
    b.addEventListener('click', () => {
      if (!state.photos[i]) {
        setStatus(`${sample.label} is not loaded yet — press Load samples.`);
        return;
      }
      state.panelPhoto[selectedPanel] = i;
      setStatus(`Panel ${selectedPanel + 1} now shows ${sample.label}.`);
      redraw();
    });
    strip.appendChild(b);
  });
}

async function loadSamples() {
  let loaded = 0;
  for (let i = 0; i < SAMPLES.length; i++) {
    try {
      state.photos[i] = await loadImage(`samples/${SAMPLES[i].id}.jpg`);
      const thumb = document.querySelector(`.photo-thumb[data-photo="${i}"] img`);
      if (thumb) {
        thumb.src = `samples/${SAMPLES[i].id}.jpg`;
        thumb.hidden = false;
      }
      loaded += 1;
    } catch {
      // A missing sample leaves its slot empty; uploads still work.
    }
  }
  state.panelPhoto = {};
  state.crops = freshCrops(state.layout);
  return loaded;
}

function bindPhotos() {
  document.getElementById('loadSamples').addEventListener('click', async () => {
    const n = await loadSamples();
    setStatus(`${n} sample photos loaded.`);
    redraw();
  });
  document.getElementById('autoFill').addEventListener('click', () => {
    state.panelPhoto = {};
    state.crops = freshCrops(state.layout);
    selectedPanel = 0;
    syncPickers();
    redraw();
    setStatus('Panels auto-filled from all five photos.');
  });
  document.getElementById('upload').addEventListener('change', async (e) => {
    const files = [...(e.target.files || [])];
    let slot = 0;
    for (const file of files) {
      if (slot >= SAMPLES.length) break;
      const url = URL.createObjectURL(file);
      try {
        state.photos[slot] = await loadImage(url);
        const thumb = document.querySelector(`.photo-thumb[data-photo="${slot}"] img`);
        if (thumb) {
          thumb.src = url;
          thumb.hidden = false;
        }
        slot += 1;
      } catch {
        setStatus('One file could not be read as an image.');
      }
    }
    if (slot > 0) {
      state.panelPhoto = {};
      setStatus(`${slot} of your photos loaded into the first slots.`);
      redraw();
    }
  });
}

function bindWords() {
  const map = { title: 'title', subtitle: 'subtitle', tagline: 'tagline', kicker: 'kicker' };
  for (const [id, key] of Object.entries(map)) {
    const input = document.getElementById(id);
    input.value = state[key];
    input.addEventListener('input', () => {
      state[key] = input.value;
      redraw();
    });
  }
  for (const [id, key] of [['showStarburst', 'showStarburst'], ['showStars', 'showStars']]) {
    const box = document.getElementById(id);
    box.checked = state[key];
    box.addEventListener('change', () => {
      state[key] = box.checked;
      redraw();
    });
  }
  const ink = document.getElementById('ink');
  ink.value = String(Math.round(state.ink * 100));
  ink.addEventListener('input', () => {
    state.ink = Number(ink.value) / 100;
    redraw();
  });
  zoomEl.addEventListener('input', () => {
    const crop = state.crops[selectedPanel] || (state.crops[selectedPanel] = { zoom: 1, ox: 0, oy: 0 });
    crop.zoom = Number(zoomEl.value);
    redraw();
  });
}

/** Renders the state at (w, h) on a fresh canvas and downloads it as PNG. */
export async function exportPng(size) {
  await ensureFonts();
  const off = document.createElement('canvas');
  off.width = size.w;
  off.height = size.h;
  drawCover(off, state);
  const blob = await new Promise((resolve) => off.toBlob(resolve, 'image/png'));
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `neon-night-${size.w}x${size.h}.png`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  return a.download;
}

function bindExport() {
  document.getElementById('exportOne').addEventListener('click', async () => {
    const name = await exportPng(state.size);
    setStatus(`Saved ${name}.`);
  });
  document.getElementById('exportAll').addEventListener('click', async () => {
    const names = [];
    for (const size of SIZES) {
      names.push(await exportPng(size));
      await new Promise((r) => setTimeout(r, 350));
    }
    setStatus(`Saved ${names.join(', ')}.`);
  });
  document.getElementById('surprise').addEventListener('click', () => {
    const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
    state.layout = pick(LAYOUTS.filter((l) => l.id !== state.layout)).id;
    state.grade = pick(GRADES).id;
    state.title = pick(SURPRISE_TITLES);
    state.subtitle = pick(SURPRISE_SUBS);
    state.ink = 0.2 + Math.random() * 0.5;
    state.crops = freshCrops(state.layout);
    state.panelPhoto = {};
    document.getElementById('title').value = state.title;
    document.getElementById('subtitle').value = state.subtitle;
    document.getElementById('ink').value = String(Math.round(state.ink * 100));
    selectedPanel = 0;
    syncPickers();
    redraw();
    setStatus('Surprise! New layout, grade and words — export it if you like it.');
  });
  document.getElementById('resetCrop').addEventListener('click', () => {
    state.crops = freshCrops(state.layout);
    state.panelPhoto = {};
    redraw();
    setStatus('Crops reset.');
  });
}

// ---------------------------------------------------------------- preview interaction

function canvasPoint(e) {
  const r = canvas.getBoundingClientRect();
  return {
    x: ((e.clientX - r.left) / r.width) * canvas.width,
    y: ((e.clientY - r.top) / r.height) * canvas.height,
  };
}

function panelAt(x, y) {
  const geo = layoutGeometry(state.layout, canvas.width, canvas.height);
  return geo.panels.findIndex((p) => x >= p.x && x < p.x + p.w && y >= p.y && y < p.y + p.h);
}

function bindPreview() {
  let dragging = false;
  let last = null;
  canvas.addEventListener('pointerdown', (e) => {
    const p = canvasPoint(e);
    const hit = panelAt(p.x, p.y);
    if (hit >= 0) {
      selectedPanel = hit;
      syncPickers();
    }
    dragging = true;
    last = p;
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!dragging || !last) return;
    const p = canvasPoint(e);
    const geo = layoutGeometry(state.layout, canvas.width, canvas.height);
    const panel = geo.panels[selectedPanel];
    if (!panel) return;
    const crop = state.crops[selectedPanel] || (state.crops[selectedPanel] = { zoom: 1, ox: 0, oy: 0 });
    const photoIndex = state.panelPhoto[selectedPanel] ?? panel.photo;
    const img = state.photos[photoIndex];
    if (!img) return;
    const base = Math.max(panel.w / img.naturalWidth, panel.h / img.naturalHeight);
    const scale = base * (crop.zoom || 1);
    const overX = Math.max(1, img.naturalWidth * scale - panel.w) / 2;
    const overY = Math.max(1, img.naturalHeight * scale - panel.h) / 2;
    crop.ox = Math.max(-1, Math.min(1, crop.ox + (p.x - last.x) / overX));
    crop.oy = Math.max(-1, Math.min(1, crop.oy + (p.y - last.y) / overY));
    last = p;
    redraw();
  });
  canvas.addEventListener('pointerup', () => {
    dragging = false;
    last = null;
  });
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const crop = state.crops[selectedPanel] || (state.crops[selectedPanel] = { zoom: 1, ox: 0, oy: 0 });
    crop.zoom = Math.max(1, Math.min(3, crop.zoom * (e.deltaY < 0 ? 1.12 : 1 / 1.12)));
    zoomEl.value = String(crop.zoom);
    redraw();
  }, { passive: false });
}

// ---------------------------------------------------------------- boot

async function boot() {
  buildPickers();
  buildPhotoStrip();
  bindPhotos();
  bindWords();
  bindExport();
  bindPreview();
  state.crops = freshCrops(state.layout);
  const loaded = await loadSamples();
  if (loaded === 0) setStatus('Sample photos could not be loaded — upload your own.');
  syncPickers();
  const params = new URLSearchParams(location.search);
  if (params.get('shot')) {
    await runShot(params, state, { loadImage, redraw, applyLayout, setStatus, loadSamples });
  } else {
    await redraw();
    if (loaded > 0) setStatus('Pick photos, a layout and a grade — then export your cover.');
  }
}

boot();
