// Neon Night Cover Studio — colour grades.
//
// A grade is a recipe of overlays painted over each photo panel after the photo
// itself is drawn. Every step is a plain canvas fill with a composite operation,
// so the whole look stays fast at 1920x1080 and needs no library. `filter` is
// applied to the photo draw itself (Chrome canvas 2D supports it) when a grade
// wants a harder poster look.

export const GRADES = [
  {
    id: 'neon-night',
    label: 'Neon Night',
    swatch: 'linear-gradient(135deg,#12083a 0%,#5b1a8a 45%,#ff2d78 100%)',
    // Deep indigo shadows, hot magenta highlights, a teal lift in the mids.
    // The 'color' wash re-hues daylight photos toward dusk first; the rest
    // deepens it. Deliberately strong: a faint grade reads as no grade.
    filter: 'saturate(1.25) contrast(1.08)',
    steps: [
      { op: 'color', alpha: 0.42, fill: 'rgba(150,60,200,1)' },
      { op: 'overlay', alpha: 0.36, fill: 'rgba(255,45,150,1)' },
      { op: 'soft-light', alpha: 0.28, fill: 'rgba(0,220,200,1)' },
      { op: 'source-over', alpha: 1, gradient: ['rgba(10,4,32,0)', 'rgba(10,4,32,0.62)'] },
    ],
  },
  {
    id: 'sunset-vice',
    label: 'Sunset Vice',
    swatch: 'linear-gradient(135deg,#ff7a2f 0%,#ff2d78 55%,#7a1fa2 100%)',
    filter: 'saturate(1.35) contrast(1.05)',
    steps: [
      { op: 'color', alpha: 0.38, fill: 'rgba(255,120,40,1)' },
      { op: 'overlay', alpha: 0.3, fill: 'rgba(255,120,40,1)' },
      { op: 'soft-light', alpha: 0.2, fill: 'rgba(255,210,90,1)' },
      { op: 'source-over', alpha: 1, gradient: ['rgba(120,10,60,0)', 'rgba(160,15,80,0.55)'] },
    ],
  },
  {
    id: 'poster-ink',
    label: 'Poster Ink',
    swatch: 'linear-gradient(135deg,#1a1a2e 0%,#ff2d78 50%,#ffd76a 100%)',
    // High-contrast poster print: crushed blacks, halftone dots on top.
    filter: 'contrast(1.35) saturate(1.5)',
    halftone: 0.34,
    steps: [
      { op: 'overlay', alpha: 0.28, fill: 'rgba(255,40,120,1)' },
      { op: 'source-over', alpha: 1, gradient: ['rgba(8,4,24,0)', 'rgba(8,4,24,0.5)'] },
    ],
  },
  {
    id: 'teal-dawn',
    label: 'Teal Dawn',
    swatch: 'linear-gradient(135deg,#062a3a 0%,#0e7d8a 55%,#ffd76a 100%)',
    filter: 'saturate(1.2) contrast(1.05)',
    steps: [
      { op: 'overlay', alpha: 0.22, fill: 'rgba(0,180,200,1)' },
      { op: 'soft-light', alpha: 0.16, fill: 'rgba(255,240,180,1)' },
      { op: 'source-over', alpha: 1, gradient: ['rgba(6,30,60,0)', 'rgba(6,30,60,0.45)'] },
    ],
  },
  {
    id: 'mono-noir',
    label: 'Mono Noir',
    swatch: 'linear-gradient(135deg,#000 0%,#555 55%,#fff 100%)',
    filter: 'grayscale(1) contrast(1.35) brightness(1.05)',
    steps: [
      { op: 'overlay', alpha: 0.10, fill: 'rgba(255,255,255,1)' },
      { op: 'source-over', alpha: 1, gradient: ['rgba(0,0,0,0)', 'rgba(0,0,0,0.5)'] },
    ],
  },
];

export function gradeById(id) {
  return GRADES.find((g) => g.id === id) ?? GRADES[0];
}
