// Neon Night Cover Studio — cover layouts.
//
// A layout is pure geometry: given a canvas size it returns the photo panels
// (as fractions of width/height, gutters already cut out) and either a full
// width title band at the foot or, for the grid, a title cell in the middle.
// Panel photos are assigned by slot letter: A is the hero photo, B and C the
// supporting ones. Every layout works at any aspect ratio, so the same
// geometry drives the 1920x1080, 1080x1350 and 1080x1080 exports.

export const LAYOUTS = [
  { id: 'big-left', label: 'Big Left', hint: 'Hero left, two stacked right' },
  { id: 'grid', label: 'Poster Grid', hint: '3 x 3, title in the middle' },
  { id: 'filmstrip', label: 'Filmstrip', hint: 'Hero band over three strips' },
  { id: 'split', label: 'Split', hint: 'Two tall panels side by side' },
];

function rect(x, y, w, h, photo) {
  return { x, y, w, h, photo };
}

/**
 * Geometry for `layoutId` at size (w, h). Returns { panels, band, titleCell }:
 * panels are {x, y, w, h, photo} in pixels, band is the title band rect or
 * null, titleCell is the grid's middle cell rect or null.
 */
export function layoutGeometry(layoutId, w, h) {
  const g = Math.max(3, Math.round(Math.min(w, h) * 0.006)); // gutter
  if (layoutId === 'grid') {
    const cw = (w - g * 4) / 3;
    const ch = (h - g * 4) / 3;
    const slots = ['A', 'B', 'C', 'A', null, 'B', 'C', 'A', 'B'];
    const panels = [];
    let titleCell = null;
    for (let i = 0; i < 9; i++) {
      const col = i % 3;
      const row = Math.floor(i / 3);
      const x = g + col * (cw + g);
      const y = g + row * (ch + g);
      if (slots[i] === null) {
        titleCell = { x, y, w: cw, h: ch };
      } else {
        panels.push(rect(x, y, cw, ch, slots[i]));
      }
    }
    return { panels, band: null, titleCell };
  }

  if (layoutId === 'filmstrip') {
    const bandH = h * 0.30;
    const stripH = (h - bandH - g * 3) * 0.3;
    const heroH = h - bandH - stripH - g * 3;
    const sw = (w - g * 4) / 3;
    return {
      panels: [
        rect(g, g, w - g * 2, heroH, 'A'),
        rect(g, g * 2 + heroH, sw, stripH, 'B'),
        rect(g * 2 + sw, g * 2 + heroH, sw, stripH, 'C'),
        rect(g * 3 + sw * 2, g * 2 + heroH, sw, stripH, 'A'),
      ],
      band: { x: 0, y: h - bandH, w, h: bandH },
      titleCell: null,
    };
  }

  if (layoutId === 'split') {
    const bandH = h * 0.30;
    const ph = h - bandH - g * 2;
    const pw = (w - g * 3) / 2;
    return {
      panels: [
        rect(g, g, pw, ph, 'A'),
        rect(g * 2 + pw, g, pw, ph, 'B'),
      ],
      band: { x: 0, y: h - bandH, w, h: bandH },
      titleCell: null,
    };
  }

  // big-left (default): hero portrait on the left, two stacked on the right.
  const bandH = h * 0.30;
  const ph = h - bandH - g * 2;
  const heroW = (w - g * 3) * 0.56;
  const sideW = w - heroW - g * 3;
  const sideH = (ph - g) / 2;
  return {
    panels: [
      rect(g, g, heroW, ph, 'A'),
      rect(g * 2 + heroW, g, sideW, sideH, 'B'),
      rect(g * 2 + heroW, g * 2 + sideH, sideW, sideH, 'A'),
    ],
    band: { x: 0, y: h - bandH, w, h: bandH },
    titleCell: null,
  };
}

export function layoutById(id) {
  return LAYOUTS.find((l) => l.id === id) ?? LAYOUTS[0];
}
