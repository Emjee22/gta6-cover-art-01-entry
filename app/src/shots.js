// Neon Night Cover Studio — fixed scenes for screenshots.
//
// `?shot=editor` shows the editor with a sample photo loaded; `?shot=cover`
// shows only the cover, at the size `?w=` x `?h=` asks for (default
// 1920x1080). The other query keys pick the scene: `photo` (boulevard or
// pier), `title`, `subtitle`, `tagline`, `kicker`, `grade`, `layout`.
// window.__shotReady is set once the scene is painted, so a screenshot
// harness knows when to capture.

export async function runShot(params, state, api) {
  const shot = params.get('shot');
  if (shot === 'cover') document.body.classList.add('shot-cover');
  const pick = (key, fallback) => params.get(key) ?? fallback;
  state.title = pick('title', state.title);
  state.subtitle = pick('subtitle', state.subtitle);
  state.tagline = pick('tagline', state.tagline);
  state.kicker = pick('kicker', state.kicker);
  state.grade = pick('grade', state.grade);
  const layout = pick('layout', state.layout);
  const sizeId = pick('size', null);
  const w = Number(params.get('w') ?? 0);
  const h = Number(params.get('h') ?? 0);
  if (w > 0 && h > 0) state.size = { id: `${w}x${h}`, label: `${w} x ${h}`, w, h };
  else if (sizeId) {
    const [sw, sh] = sizeId.split('x').map(Number);
    if (sw > 0 && sh > 0) state.size = { id: sizeId, label: sizeId, w: sw, h: sh };
  }
  api.applyLayout(layout);
  const sample = pick('photo', 'boulevard');
  try {
    const img = await api.loadImage(`samples/${sample}.jpg`);
    state.photos.A = img;
    state.photos.B = await api.loadImage(`samples/${sample === 'boulevard' ? 'pier' : 'boulevard'}.jpg`);
    state.photos.C = img;
  } catch {
    api.setStatus('Sample photo could not be loaded for this shot.');
  }
  const titleInput = document.getElementById('title');
  if (titleInput) titleInput.value = state.title;
  const subInput = document.getElementById('subtitle');
  if (subInput) subInput.value = state.subtitle;
  await api.redraw();
  requestAnimationFrame(() => requestAnimationFrame(() => {
    window.__shotReady = true;
  }));
}
