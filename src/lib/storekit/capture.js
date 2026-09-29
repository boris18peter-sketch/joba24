import { THEMES } from '@/lib/storekit/specs';

// html2canvas is loaded on demand (only when an export actually runs) instead of
// being imported at module scope. Importing it statically put the library in the
// Studio page's module graph, which forced Vite's dependency optimizer to
// re-bundle it the first time the page was opened — and that optimizer restart
// made the page's own dynamic import fail ("Failed to fetch dynamically imported
// module"). Loading it lazily keeps the page load independent of the optimizer
// and keeps ~200KB off the initial route.
let html2canvasPromise = null;
const loadHtml2canvas = () => {
  if (!html2canvasPromise) {
    html2canvasPromise = import('html2canvas').then(m => m.default || m);
  }
  return html2canvasPromise;
};

/**
 * Capture one store canvas at its exact export pixel size.
 *
 * The node is rendered at real size (the studio lifts it off-screen for the
 * capture), so the result is a true 1320×2868 / 1080×1920 / 2064×2752 PNG.
 * The capture is then drawn onto a canvas of exactly the spec dimensions, so
 * the exported file can never drift by a pixel.
 */
export async function captureCanvas(node, spec, themeKey) {
  const bg = (THEMES[themeKey] || THEMES.light).bg;
  if (document.fonts?.ready) {
    try { await document.fonts.ready; } catch { /* fonts already resolved */ }
  }

  const html2canvas = await loadHtml2canvas();

  const rendered = await html2canvas(node, {
    backgroundColor: bg,
    scale: 1,
    useCORS: true,
    allowTaint: false,
    logging: false,
    width: spec.w,
    height: spec.h,
  });

  const out = document.createElement('canvas');
  out.width = spec.w;
  out.height = spec.h;
  const ctx = out.getContext('2d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, spec.w, spec.h);
  ctx.drawImage(rendered, 0, 0, spec.w, spec.h);
  return out;
}

export function downloadCanvas(canvasEl, filename) {
  const url = canvasEl.toDataURL('image/png');
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export const nextFrame = () =>
  new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));