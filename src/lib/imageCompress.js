/**
 * imageCompress — shrink a photo in the browser BEFORE it is uploaded.
 *
 * ── WHY THIS EXISTS ─────────────────────────────────────────────────────────
 * A phone camera writes a 3–12 MB JPEG. Uploading that over a cellular
 * connection is what made a chat photo "take forever": the wait was almost
 * entirely the request body, not the server. The card, the bubble and the
 * thumbnail all render at a few hundred pixels, so almost every byte of the
 * original was pure waiting.
 *
 * Re-encoding to a long edge of 1600px at quality 0.82 keeps far more detail
 * than any surface in this app can show, and typically cuts the file by 80–95%.
 * The upload therefore finishes in a fraction of the time, and the image that
 * arrives is visually identical everywhere it is displayed.
 *
 * ── WHAT IT NEVER TOUCHES ───────────────────────────────────────────────────
 * • Anything that is not a still image (video, PDF, audio) passes straight
 *   through — re-encoding those is either impossible here or would change what
 *   the user sent.
 * • An animated GIF passes through: a canvas draw keeps one frame.
 * • A result that is somehow LARGER than the original is discarded, so this can
 *   never make an upload slower than it was.
 * • Any failure (no canvas, a decode error, a codec the device lacks) returns
 *   the ORIGINAL file. Compression is an optimisation, never a gate: an upload
 *   must always be able to proceed.
 */
export const COMPRESS_MAX_EDGE = 1600;
export const COMPRESS_QUALITY = 0.82;
/** Below this, re-encoding saves nothing worth the decode. */
const SKIP_UNDER_BYTES = 260 * 1024;

function isCompressible(file) {
  if (!file || typeof file !== 'object') return false;
  const type = String(file.type || '');
  if (!type.startsWith('image/')) return false;
  if (type === 'image/gif' || type === 'image/svg+xml') return false;
  return true;
}

export async function compressImage(file, options = {}) {
  if (!isCompressible(file)) return file;
  if (typeof document === 'undefined' || typeof createImageBitmap !== 'function') return file;

  const maxEdge = options.maxEdge || COMPRESS_MAX_EDGE;
  const quality = options.quality || COMPRESS_QUALITY;

  let bitmap = null;
  try {
    bitmap = await createImageBitmap(file);
    const longest = Math.max(bitmap.width, bitmap.height);
    const scale = Math.min(1, maxEdge / longest);

    // Already small in both senses: nothing to gain, so do not touch it.
    if (scale === 1 && file.size < SKIP_UNDER_BYTES) {
      bitmap.close?.();
      return file;
    }

    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));

    const context = canvas.getContext('2d');
    if (!context) {
      bitmap.close?.();
      return file;
    }
    // A transparent PNG would otherwise get a black background once encoded as
    // JPEG, so the canvas is primed white first.
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise((resolve) => {
      try {
        canvas.toBlob(resolve, 'image/jpeg', quality);
      } catch {
        resolve(null);
      }
    });
    bitmap.close?.();

    if (!blob || blob.size >= file.size) return file;

    const name = String(file.name || 'photo').replace(/\.[^.]+$/, '') || 'photo';
    return new File([blob], `${name}.jpg`, { type: 'image/jpeg', lastModified: Date.now() });
  } catch {
    try { bitmap?.close?.(); } catch { /* already released */ }
    return file;
  }
}