// Neon Night Cover Studio — cover layouts.
//
// A layout is pure geometry: given a canvas size it returns the photo
// panels in pixels and the title band at the foot. Every layout works at
// any aspect ratio, so the same geometry drives the 1920x1080, 1080x1350
// and 1080x1080 exports. Panels name their photo by index into the
// photo pool (0..4 for the five samples); the renderer cycles the pool
// when a layout has more panels than photos.
//
//   collage  — dense multi-panel poster: one hero plus six small panels.
//   polaroid — five tilted snapshot prints scattered over the photo area.
//   slices   — one photo cut into five vertical slices ("five shots").
//   grid     — a 3 x 3 poster grid filling the photo area.

export const LAYOUTS = [
  { id: 'collage', label: 'Collage', hint: 'Hero + six panels, dense poster' },
  { id: 'polaroid', label: 'Polaroid', hint: 'Five tilted snapshots' },
  { id: 'slices', label: 'Five Shots', hint: 'One photo, five slices' },
  { id: 'grid', label: 'Poster Grid', hint: '3 x 3, photos cycle' },
];

export function layoutById(id) {
  return LAYOUTS.find((l) => l.id === id) || LAYOUTS[0];
}

function panel(x, y, w, h, photo, extra = {}) {
  return { x, y, w, h, photo, ...extra };
}

function aspect(w, h) {
  if (w > h * 1.15) return 'wide';
  if (h > w * 1.15) return 'tall';
  return 'square';
}

// The photo area sits above the title band; the band is taller on wide
// covers (more room for the big title) and a touch shorter on tall ones.
function photoArea(w, h) {
  const bandH = Math.round(h * (w > h ? 0.34 : 0.3));
  return { x: 0, y: 0, w, h: h - bandH, band: { x: 0, y: h - bandH, w, h: bandH } };
}

function collagePanels(area, g) {
  const { x, y, w, h } = area;
  const photos = [0, 1, 2, 3, 4, 0, 1];
  if (w >= h) {
    // Wide: hero left, six small panels in two columns x three rows right.
    const heroW = Math.round((w - g * 3) * 0.44);
    const sideW = w - heroW - g * 3;
    const sideH = Math.round((h - g * 4) / 3);
    const sideX = x + heroW + g * 2;
    const panels = [panel(x + g, y + g, heroW, h - g * 2, photos[0])];
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 2; c++) {
        panels.push(panel(
          sideX + c * (sideW / 2 + g / 2),
          y + g + r * (sideH + g),
          sideW / 2 - g / 2,
          sideH,
          photos[1 + r * 2 + c],
        ));
      }
    }
    return panels;
  }
  // Tall / square: hero on top, six small panels in three columns x two rows.
  const heroH = Math.round((h - g * 3) * 0.5);
  const cellW = (w - g * 4) / 3;
  const cellH = (h - heroH - g * 3) / 2;
  const panels = [panel(x + g, y + g, w - g * 2, heroH, photos[0])];
  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < 3; c++) {
      panels.push(panel(
        x + g + c * (cellW + g),
        y + heroH + g * 2 + r * (cellH + g),
        cellW,
        cellH,
        photos[1 + r * 3 + c],
      ));
    }
  }
  return panels;
}

// Five tilted snapshot prints. Each entry is {fx, fy, fw, rot}: fractions
// of the photo area, so the scatter scales to any size. Height follows the
// print's own ratio (photo 1:1 plus a white foot).
const POLAROID_SPOTS = {
  // Wide: five prints in a staggered row (the photo area is short and wide).
  wide: [
    { fx: 0.02, fy: 0.06, fw: 0.19, rot: -0.08 },
    { fx: 0.21, fy: 0.20, fw: 0.19, rot: 0.06 },
    { fx: 0.40, fy: 0.04, fw: 0.19, rot: -0.05 },
    { fx: 0.59, fy: 0.22, fw: 0.19, rot: 0.07 },
    { fx: 0.78, fy: 0.08, fw: 0.19, rot: -0.06 },
  ],
  // Tall: two big prints on top, three smaller ones below.
  tall: [
    { fx: 0.04, fy: 0.01, fw: 0.42, rot: -0.08 },
    { fx: 0.54, fy: 0.02, fw: 0.42, rot: 0.06 },
    { fx: 0.02, fy: 0.38, fw: 0.32, rot: 0.05 },
    { fx: 0.34, fy: 0.40, fw: 0.32, rot: -0.06 },
    { fx: 0.66, fy: 0.37, fw: 0.32, rot: 0.07 },
  ],
  square: [
    { fx: 0.05, fy: 0.02, fw: 0.40, rot: -0.08 },
    { fx: 0.55, fy: 0.03, fw: 0.40, rot: 0.06 },
    { fx: 0.03, fy: 0.34, fw: 0.29, rot: 0.06 },
    { fx: 0.36, fy: 0.36, fw: 0.29, rot: -0.05 },
    { fx: 0.68, fy: 0.33, fw: 0.29, rot: 0.07 },
  ],
};

function polaroidPanels(area, g) {
  const kind = aspect(area.w, area.h);
  return POLAROID_SPOTS[kind].map((spot, i) => {
    const pw = Math.round(area.w * spot.fw);
    const ph = Math.round(pw * 1.18);
    return panel(
      area.x + Math.round(area.w * spot.fx),
      area.y + Math.round(area.h * spot.fy),
      pw,
      ph,
      i,
      { rotate: spot.rot, frame: 'polaroid' },
    );
  });
}

function slicesPanels(area, g) {
  const count = 5;
  const sw = (area.w - g * (count + 1)) / count;
  const panels = [];
  for (let i = 0; i < count; i++) {
    panels.push(panel(
      area.x + g + i * (sw + g),
      area.y + g,
      sw,
      area.h - g * 2,
      0,
      { sliceIndex: i, sliceCount: count },
    ));
  }
  return panels;
}

function gridPanels(area, g) {
  const cw = (area.w - g * 4) / 3;
  const ch = (area.h - g * 4) / 3;
  const panels = [];
  for (let i = 0; i < 9; i++) {
    const col = i % 3;
    const row = Math.floor(i / 3);
    panels.push(panel(
      area.x + g + col * (cw + g),
      area.y + g + row * (ch + g),
      cw,
      ch,
      i % 5,
    ));
  }
  return panels;
}

/**
 * Geometry for `layoutId` at size (w, h). Returns { panels, band }:
 * panels are {x, y, w, h, photo, rotate?, frame?, sliceIndex?} in pixels,
 * band is the title band rect at the foot.
 */
export function layoutGeometry(layoutId, w, h) {
  const g = Math.max(3, Math.round(Math.min(w, h) * 0.006));
  const area = photoArea(w, h);
  let panels;
  if (layoutId === 'polaroid') panels = polaroidPanels(area, g);
  else if (layoutId === 'slices') panels = slicesPanels(area, g);
  else if (layoutId === 'grid') panels = gridPanels(area, g);
  else panels = collagePanels(area, g);
  return { panels, band: area.band };
}
