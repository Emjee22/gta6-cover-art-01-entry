// Neon Night Cover Studio — the editor.
//
// Wires the page: photo slots, layout and grade pickers, the words, the
// live preview (click a panel to pick it, drag to pan its photo, scroll to
// zoom, reset to reframe) and the PNG export in three sizes. A `?shot=`
// query hands the page to shots.js instead, for fixed screenshot scenes.

import { drawCover } from './cover.js';
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
];

const SURPRISE_TITLES = ['NEON NIGHT', 'VICE LIGHTS', 'PALM STATIC', 'MIDNIGHT DRIVE', 'CHROME PALMS', 'OCEAN STATIC', 'LAST SUNSET', 'LEONIDA HEAT'];
const SURPRISE_SUBS = ['city of neon dreams', 'one more ride', 'chasing the last light', 'every street is a stage', 'born to run the night', 'where the palms glow'];

const canvas = document.getElementById('preview');
const statusEl = document.getElementById('status');
const selectedEl = document.getElementById('selectedPanel');

const state = {
  layout: 'big-left',
  grade: 'neon-night',
  title: 'NEON NIGHT',
  subtitle: 'city of neon dreams',
  tagline: 'EVERY LIGHT HIDES A STORY',
  kicker: 'WELCOME TO LEONIDA',
  photos: { A: null, B: null, C: null },
  crops: {},
  showStarburst: true,
  showStars: true,
  showBarcode: true,
  size: SIZES[0],
};

let selectedPanel = 0;
let fontsReady = false;

/**
 * Default crops per layout, tuned to the two sample photos so faces stay in
 * frame: the samples are portrait/square while the panels are wide, so the
 * default pan (oy) lifts the face into view instead of centring the photo.
 * Index = panel index of the layout's geometry.
 */
const SLOT_CROPS = {
  'big-left': [
    { zoom: 1, ox: 0, oy: 0.65 }, // hero A — face up into the frame
    { zoom: 1.15, ox: 0, oy: 0.9 }, // top B — hat and face
    { zoom: 1.4, ox: 0.26, oy: -0.3 }, // bottom A — hand on the car door
  ],
  grid: [
    { zoom: 1.15, ox: 0, oy: 0.58 },
    { zoom: 1.15, ox: 0, oy: 0.57 },
    { zoom: 1.15, ox: 0.05, oy: 0.58 },
    { zoom: 1.3, ox: -0.05, oy: 0.58 },
    { zoom: 1.25, ox: 0, oy: 0.57 },
    { zoom: 1.35, ox: 0.05, oy: 0.58 },
    { zoom: 1.2, ox: 0, oy: 0.58 },
    { zoom: 1.3, ox: -0.08, oy: 0.57 },
  ],
  filmstrip: [
    { zoom: 1, ox: 0, oy: 1 }, // hero: the sky, palms and sun at the photo's top
    { zoom: 1, ox: 0, oy: 0.22 }, // sea and horizon
    { zoom: 1.3, ox: 0.15, oy: -0.33 }, // the red car door and mirror
    { zoom: 1.3, ox: 0, oy: 0.58 }, // lifeguard tower and beach
  ],
  split: [
    { zoom: 1, ox: 0, oy: 0.74 },
    { zoom: 1, ox: 0, oy: 0.74 },
  ],
};

export function defaultCrops(layoutId, count) {
  const table = SLOT_CROPS[layoutId] ?? SLOT_CROPS['big-left'];
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

async function ensureFonts() {
  if (fontsReady) return;
  try {
    await Promise.all([document.fonts.load('400 100px Anton'), document.fonts.load('100px Pacifico')]);
    await document.fonts.ready;
  } catch {
    // Fall back to system fonts; the cover still draws.
  }
  fontsReady = true;
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
  state.crops = defaultCrops(layoutId, panelCountFor(layoutId));
  selectedPanel = 0;
  syncPickers();
  redraw();
}

function panelCountFor(layoutId) {
  // Keep in sync with layouts.js: grid has 8 panels, filmstrip 4, split 2.
  return layoutId === 'grid' ? 8 : layoutId === 'filmstrip' ? 4 : layoutId === 'split' ? 2 : 3;
}

function syncPickers() {
  document.querySelectorAll('#layouts button').forEach((b) => b.classList.toggle('active', b.dataset.layout === state.layout));
  document.querySelectorAll('#grades button').forEach((b) => b.classList.toggle('active', b.dataset.grade === state.grade));
  document.querySelectorAll('input[name="size"]').forEach((r) => {
    r.checked = r.value === state.size.id;
  });
  selectedEl.textContent = `Panel ${selectedPanel + 1} selected — drag to pan, scroll to zoom.`;
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
    b.innerHTML = `<i style="background:${grade.swatch}"></i><strong>${grade.label}</strong>`;
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

function buildPhotoSlots() {
  document.querySelectorAll('.slot').forEach((slotEl) => {
    const slot = slotEl.dataset.slot;
    const thumb = slotEl.querySelector('.thumb');
    const file = slotEl.querySelector('input[type="file"]');
    slotEl.querySelectorAll('[data-sample]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        try {
          state.photos[slot] = await loadImage(`samples/${btn.dataset.sample}.jpg`);
          thumb.src = `samples/${btn.dataset.sample}.jpg`;
          thumb.hidden = false;
          slotEl.querySelectorAll('[data-sample]').forEach((x) => x.classList.toggle('active', x === btn));
          setStatus(`${slotEl.querySelector('h3').textContent} photo: ${btn.dataset.sample}.`);
          redraw();
        } catch {
          setStatus(`Could not load the ${btn.dataset.sample} sample.`);
        }
      });
    });
    file.addEventListener('change', async () => {
      const f = file.files[0];
      if (!f) return;
      const url = URL.createObjectURL(f);
      try {
        state.photos[slot] = await loadImage(url);
        thumb.src = url;
        thumb.hidden = false;
        slotEl.querySelectorAll('[data-sample]').forEach((x) => x.classList.remove('active'));
        setStatus(`${slotEl.querySelector('h3').textContent} photo: your upload.`);
        redraw();
      } catch {
        setStatus('That file could not be read as an image.');
      }
    });
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
  for (const [id, key] of [['showStarburst', 'showStarburst'], ['showStars', 'showStars'], ['showBarcode', 'showBarcode']]) {
    const box = document.getElementById(id);
    box.checked = state[key];
    box.addEventListener('change', () => {
      state[key] = box.checked;
      redraw();
    });
  }
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
    state.crops = defaultCrops(state.layout, panelCountFor(state.layout));
    document.getElementById('title').value = state.title;
    document.getElementById('subtitle').value = state.subtitle;
    selectedPanel = 0;
    syncPickers();
    redraw();
    setStatus('Surprise! New layout, grade and words — export it if you like it.');
  });
  document.getElementById('resetCrop').addEventListener('click', () => {
    state.crops = defaultCrops(state.layout, panelCountFor(state.layout));
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
  // Recompute the geometry at the preview size and find the panel hit.
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
    const img = state.photos[panel.photo];
    if (!img) return;
    // A drag moves the photo by the same share of its overflow that the
    // pointer moved across the panel, so the pan feels 1:1 at any zoom.
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
    redraw();
  }, { passive: false });
}

// ---------------------------------------------------------------- boot

async function boot() {
  buildPickers();
  buildPhotoSlots();
  bindWords();
  bindExport();
  bindPreview();
  state.crops = defaultCrops(state.layout, panelCountFor(state.layout));
  try {
    state.photos.A = await loadImage('samples/boulevard.jpg');
    state.photos.B = await loadImage('samples/pier.jpg');
    state.photos.C = await loadImage('samples/boulevard.jpg');
    document.querySelector('.slot[data-slot="A"] .thumb').src = 'samples/boulevard.jpg';
    document.querySelector('.slot[data-slot="A"] .thumb').hidden = false;
    document.querySelector('.slot[data-slot="B"] .thumb').src = 'samples/pier.jpg';
    document.querySelector('.slot[data-slot="B"] .thumb').hidden = false;
    document.querySelector('.slot[data-slot="C"] .thumb').src = 'samples/boulevard.jpg';
    document.querySelector('.slot[data-slot="C"] .thumb').hidden = false;
  } catch {
    setStatus('Sample photos could not be loaded — upload your own.');
  }
  syncPickers();
  const params = new URLSearchParams(location.search);
  if (params.get('shot')) {
    await runShot(params, state, { loadImage, redraw, applyLayout, setStatus });
  } else {
    await redraw();
    setStatus('Pick photos, a layout and a grade — then export your cover.');
  }
}

boot();
