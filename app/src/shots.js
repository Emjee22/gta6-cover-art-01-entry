// Neon Night Cover Studio — fixed scenes for screenshots.
//
// `?shot=editor` shows the editor with the sample photos loaded;
// `?shot=cover` shows only the cover, at the size `?w=` x `?h=` asks for
// (default 1920x1080). The other query keys pick the scene: `photos`
// (comma-separated sample names, default all five), `title`, `subtitle`,
// `tagline`, `kicker`, `grade`, `ink`, `layout`, `size`. window.__shotReady
// is set once the scene is painted, so a screenshot harness knows when to
// capture.

export async function runShot(params, state, api) {
  const shot = params.get('shot');
  if (shot === 'cover') document.body.classList.add('shot-cover');
  const pick = (key, fallback) => params.get(key) ?? fallback;
  state.title = pick('title', state.title);
  state.subtitle = pick('subtitle', state.subtitle);
  state.tagline = pick('tagline', state.tagline);
  state.kicker = pick('kicker', state.kicker);
  state.grade = pick('grade', state.grade);
  const ink = Number(params.get('ink') ?? NaN);
  if (!Number.isNaN(ink)) state.ink = Math.max(0, Math.min(1, ink));
  const layout = pick('layout', state.layout);
  const sizeId = pick('size', null);
  const w = Number(params.get('w') ?? 0);
  const h = Number(params.get('h') ?? 0);
  if (w > 0 && h > 0) {
    state.size = { id: `${w}x${h}`, label: `${w} x ${h}`, w, h };
  } else if (sizeId) {
    const [sw, sh] = sizeId.split('x').map(Number);
    if (sw > 0 && sh > 0) state.size = { id: sizeId, label: sizeId, w: sw, h: sh };
  }
  // Photos for this scene, in pool order (default: all five samples).
  const names = (params.get('photos') || 'boulevard,pier,car,palms,neon')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const loaded = [];
  for (const name of names) {
    try {
      loaded.push(await api.loadImage(`samples/${name}.jpg`));
    } catch {
      // A missing sample leaves a hole; the cover still draws the rest.
    }
  }
  state.photos = loaded;
  state.panelPhoto = {};
  api.applyLayout(layout);
  const titleInput = document.getElementById('title');
  if (titleInput) titleInput.value = state.title;
  const subInput = document.getElementById('subtitle');
  if (subInput) subInput.value = state.subtitle;
  await api.redraw();
  requestAnimationFrame(() => requestAnimationFrame(() => {
    window.__shotReady = true;
  }));
}
