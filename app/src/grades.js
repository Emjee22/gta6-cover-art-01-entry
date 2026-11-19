// Neon Night Cover Studio — colour grades.
//
// Each grade is a gradient map: a photo's luminance is remapped through the
// stops below, so any photo takes on the grade's poster colours. "Poster
// Ink" is the fifth grade: a duotone ink print with posterised steps, and the
// ink slider adds halftone dots over every panel. Title and script colours
// travel with the grade so the lettering always matches the photo grade.

export const GRADES = [
  {
    id: 'violet',
    name: 'Vice Violet',
    stops: [
      [0.0, '#0d0722'],
      [0.22, '#2a1160'],
      [0.45, '#7a2a9e'],
      [0.68, '#d63384'],
      [0.86, '#ff7a59'],
      [1.0, '#ffd166'],
    ],
    title: ['#ffe66d', '#ff5e8a'],
    script: '#7df9ff',
    stripBg: '#1b0b33',
    stripText: '#ffe66d',
  },
  {
    id: 'sunset',
    name: 'Sunset Vice',
    stops: [
      [0.0, '#160a24'],
      [0.22, '#4a1042'],
      [0.45, '#a4133c'],
      [0.68, '#ff4d6d'],
      [0.86, '#ff8e53'],
      [1.0, '#ffd166'],
    ],
    title: ['#ffd166', '#ff4d6d'],
    script: '#ffffff',
    stripBg: '#2b0a1e',
    stripText: '#ffd166',
  },
  {
    id: 'ink',
    name: 'Poster Ink',
    stops: [
      [0.0, '#14102e'],
      [0.3, '#3d2b63'],
      [0.55, '#8a5a9e'],
      [0.78, '#e07a9e'],
      [1.0, '#f7e9c9'],
    ],
    posterize: 5,
    title: ['#f7e9c9', '#ff8e53'],
    script: '#ffd166',
    stripBg: '#14102e',
    stripText: '#f7e9c9',
  },
  {
    id: 'teal',
    name: 'Teal Dawn',
    stops: [
      [0.0, '#04182e'],
      [0.25, '#0b3d5c'],
      [0.5, '#0e7c86'],
      [0.72, '#2ec4b6'],
      [0.88, '#a7f3d0'],
      [1.0, '#fef9c3'],
    ],
    title: ['#fef9c3', '#2ec4b6'],
    script: '#ff8fa3',
    stripBg: '#04182e',
    stripText: '#a7f3d0',
  },
  {
    id: 'noir',
    name: 'Mono Noir',
    stops: [
      [0.0, '#000000'],
      [0.3, '#2b2b2b'],
      [0.55, '#6b6b6b'],
      [0.8, '#bdbdbd'],
      [1.0, '#ffffff'],
    ],
    title: ['#ffffff', '#d4d4d4'],
    script: '#ffd166',
    stripBg: '#000000',
    stripText: '#ffffff',
  },
];

export function gradeById(id) {
  return GRADES.find((g) => g.id === id) || GRADES[0];
}

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function mixRgb(a, b, t) {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}

// Remap one luminance value (0..1) through a grade's stops.
export function mapLuminance(grade, lum) {
  const stops = grade.stops;
  if (lum <= stops[0][0]) return hexToRgb(stops[0][1]);
  for (let i = 1; i < stops.length; i++) {
    if (lum <= stops[i][0]) {
      const [t0, c0] = stops[i - 1];
      const [t1, c1] = stops[i];
      return mixRgb(hexToRgb(c0), hexToRgb(c1), (lum - t0) / (t1 - t0));
    }
  }
  return hexToRgb(stops[stops.length - 1][1]);
}

// Apply a grade to an ImageData in place. With posterize, the luminance is
// snapped to a few steps first, for the flat ink-print look.
export function applyGradientMap(imageData, grade) {
  const data = imageData.data;
  const steps = grade.posterize || 0;
  for (let i = 0; i < data.length; i += 4) {
    let lum = (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) / 255;
    if (steps > 1) lum = Math.round(lum * (steps - 1)) / (steps - 1);
    const [r, g, b] = mapLuminance(grade, lum);
    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
  }
  return imageData;
}

// A small luminance map (one value per cell) used by the halftone pass, so
// the dots can grow where the photo is dark without reading pixels twice.
export function luminanceGrid(imageData, cols, rows) {
  const { width, height, data } = imageData;
  const grid = new Float32Array(cols * rows);
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const px = Math.min(width - 1, Math.floor(((x + 0.5) / cols) * width));
      const py = Math.min(height - 1, Math.floor(((y + 0.5) / rows) * height));
      const i = (py * width + px) * 4;
      grid[y * cols + x] = (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) / 255;
    }
  }
  return grid;
}
