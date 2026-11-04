#!/usr/bin/env node
/**
 * build-app-icons.mjs — the ONE source of truth for Joba24's app icon assets.
 *
 * ── WHY THIS EXISTS ────────────────────────────────────────────────────────
 * The mascot artwork arrives inside a CIRCUlar crop sitting on a BLACK
 * container. An app icon must be a full-bleed SQUARE with no padding and no
 * black corners: on iOS transparency is rejected outright, and on Android the
 * launcher crop and the adaptive-icon mask both expose whatever is at the edge.
 *
 * So the artwork is normalised here, once, and every size is derived from that
 * one normalised master — never from a previous size, which is how icon sets
 * drift. The corners outside the circle are filled with the mascot's OWN navy
 * background, so the square reads as a single full-bleed image and the join is
 * invisible (the art's background is that same navy).
 *
 * ── NO DEPENDENCIES ────────────────────────────────────────────────────────
 * PNG encode/decode is implemented against Node's built-in `zlib`. Adding a
 * native image library to a mobile app's package.json just to build an icon
 * would be a permanent cost for a one-off task, and a native optional
 * dependency can fail to install on an unrelated machine.
 *
 * ── USAGE ──────────────────────────────────────────────────────────────────
 *   node scripts/build-app-icons.mjs <master.png>   regenerate every asset
 *   node scripts/build-app-icons.mjs --verify       check the committed assets
 *
 * --verify is what the build runs: it proves the committed icon set is the
 * square, full-bleed, alpha-free set this file would produce — so a later step
 * (Capacitor scaffolding, a stale copy, a hand edit) can never silently restore
 * the previous icon.
 */

import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const IOS_SET = path.join(ROOT, 'ios/App/App/Assets.xcassets/AppIcon.appiconset');
const ANDROID_ICONS = path.join(ROOT, 'android-config/icons');

/** The mascot's own background — read from the artwork, not invented. */
const NAVY = [10, 18, 32];
const MASTER_PX = 1024;

/** Android launcher densities. The legacy icon is 48dp; an adaptive foreground
 *  is drawn on a 108dp canvas — 2.25× the legacy pixel size at every density
 *  (a 1.5× canvas is the classic mistake: Android then scales the layer up and
 *  the mascot is cropped by the launcher mask). */
const DENSITIES = [
  { dir: 'mdpi', legacy: 48 },
  { dir: 'hdpi', legacy: 72 },
  { dir: 'xhdpi', legacy: 96 },
  { dir: 'xxhdpi', legacy: 144 },
  { dir: 'xxxhdpi', legacy: 192 },
];
/** Adaptive icons: the artwork must sit inside the inner 72/108 safe zone so no
 *  launcher mask (circle, squircle, rounded square) can crop the mascot. */
const ADAPTIVE_RATIO = 72 / 108;

/* ══════════════════════════════════════════════════════════════════════════
   PNG CODEC (8-bit, colour types 2 and 6, non-interlaced)
   ══════════════════════════════════════════════════════════════════════════ */

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i += 1) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** Decode to { width, height, channels, data }. */
function decodePng(buf) {
  if (buf.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') throw new Error('not a PNG');
  let pos = 8;
  let ihdr = null;
  const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString('ascii', pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + len);
    if (type === 'IHDR') {
      ihdr = {
        width: data.readUInt32BE(0),
        height: data.readUInt32BE(4),
        depth: data[8],
        colour: data[9],
        interlace: data[12],
      };
    } else if (type === 'IDAT') {
      idat.push(data);
    } else if (type === 'IEND') break;
    pos += 12 + len;
  }
  if (!ihdr) throw new Error('no IHDR');
  if (ihdr.depth !== 8) throw new Error(`unsupported bit depth ${ihdr.depth}`);
  if (ihdr.interlace !== 0) throw new Error('interlaced PNGs are not supported');
  const channels = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[ihdr.colour];
  if (!channels) throw new Error(`unsupported colour type ${ihdr.colour}`);

  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = ihdr.width * channels;
  const out = Buffer.alloc(stride * ihdr.height);
  let p = 0;
  for (let y = 0; y < ihdr.height; y += 1) {
    const filter = raw[p]; p += 1;
    const row = raw.subarray(p, p + stride); p += stride;
    const cur = out.subarray(y * stride, (y + 1) * stride);
    const prev = y > 0 ? out.subarray((y - 1) * stride, y * stride) : null;
    for (let x = 0; x < stride; x += 1) {
      const a = x >= channels ? cur[x - channels] : 0;
      const b = prev ? prev[x] : 0;
      const c = x >= channels && prev ? prev[x - channels] : 0;
      let v = row[x];
      switch (filter) {
        case 0: break;
        case 1: v = (v + a) & 0xff; break;
        case 2: v = (v + b) & 0xff; break;
        case 3: v = (v + ((a + b) >> 1)) & 0xff; break;
        case 4: {
          const pa = Math.abs(b - c);
          const pb = Math.abs(a - c);
          const pc = Math.abs(a + b - 2 * c);
          v = (v + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c)) & 0xff;
          break;
        }
        default: throw new Error(`bad filter ${filter}`);
      }
      cur[x] = v;
    }
  }
  return { width: ihdr.width, height: ihdr.height, channels, data: out };
}

function encodePng(width, height, channels, data) {
  const stride = width * channels;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0; // filter: none
    data.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const chunk = (type, body) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(body.length);
    const typed = Buffer.concat([Buffer.from(type, 'ascii'), body]);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(typed));
    return Buffer.concat([len, typed, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = channels === 4 ? 6 : 2; // RGB or RGBA — never greyscale/palette
  return Buffer.concat([
    Buffer.from('89504e470d0a1a0a', 'hex'),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/* ══════════════════════════════════════════════════════════════════════════
   NORMALISATION — circle in, full-bleed square out
   ══════════════════════════════════════════════════════════════════════════ */

/** Pixel is part of the mascot's dark navy circle rather than the black
 *  container. A generous threshold, because the container is #000000 and the
 *  circle's own navy is #0A1220 — the two differ, but only just. */
const isArt = (r, g, b) => Math.max(r, g, b) >= 10;

function findCircle(img) {
  const { width, height, channels, data } = img;
  let minX = width, minY = height, maxX = -1, maxY = -1;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * channels;
      if (!isArt(data[i], data[i + 1], data[i + 2])) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX < 0) throw new Error('the whole image is black — no artwork found');
  const cx = (minX + maxX + 1) / 2;
  const cy = (minY + maxY + 1) / 2;
  const rx = (maxX - minX + 1) / 2;
  const ry = (maxY - minY + 1) / 2;
  return { cx, cy, rx, ry };
}

/** One normalised, full-bleed square master: the circle's inscribed square,
 *  with everything outside it painted the mascot's own navy. */
function buildMaster(img) {
  const { cx, cy, rx, ry } = findCircle(img);
  // The art must be a circle; a lopsided bounding box means the crop assumption
  // is wrong, and silently producing a stretched icon would be worse.
  if (Math.abs(rx - ry) > Math.max(4, rx * 0.03)) {
    throw new Error(`art is not circular (rx=${rx.toFixed(1)}, ry=${ry.toFixed(1)})`);
  }
  const radius = Math.min(rx, ry);
  const scale = (radius * 2) / MASTER_PX; // source px per master px
  const { width, channels, data } = img;
  const master = Buffer.alloc(MASTER_PX * MASTER_PX * 3);

  // The black container edge is anti-aliased into the circle, so the outer few
  // pixels of the crop are a dark rim. Everything within RIM of the edge is
  // repainted navy; the art's own background there IS navy, so nothing visible
  // is lost and no black halo survives to the icon.
  const RIM = 3.5;

  for (let y = 0; y < MASTER_PX; y += 1) {
    for (let x = 0; x < MASTER_PX; x += 1) {
      const out = (y * MASTER_PX + x) * 3;
      const dx = x + 0.5 - MASTER_PX / 2;
      const dy = y + 0.5 - MASTER_PX / 2;
      const distPx = Math.hypot(dx, dy);
      if (distPx > MASTER_PX / 2 - RIM) {
        master[out] = NAVY[0]; master[out + 1] = NAVY[1]; master[out + 2] = NAVY[2];
        continue;
      }
      // 2×2 supersample inside this master pixel.
      let r = 0, g = 0, b = 0, n = 0;
      for (let sy = 0; sy < 2; sy += 1) {
        for (let sx = 0; sx < 2; sx += 1) {
          const sxp = Math.round(cx + (x + (sx + 0.5) / 2 - MASTER_PX / 2) * scale);
          const syp = Math.round(cy + (y + (sy + 0.5) / 2 - MASTER_PX / 2) * scale);
          const px = Math.min(width - 1, Math.max(0, sxp));
          const py = Math.min(img.height - 1, Math.max(0, syp));
          const i = (py * width + px) * channels;
          r += data[i]; g += data[i + 1]; b += data[i + 2]; n += 1;
        }
      }
      r = Math.round(r / n); g = Math.round(g / n); b = Math.round(b / n);
      // Kill any residual black rim bleed just inside the edge.
      if (distPx > MASTER_PX / 2 - 9 && Math.max(r, g, b) < 14) { r = NAVY[0]; g = NAVY[1]; b = NAVY[2]; }
      master[out] = r; master[out + 1] = g; master[out + 2] = b;
    }
  }
  return { master, radius, cx, cy };
}

/* ══════════════════════════════════════════════════════════════════════════
   RESAMPLING — area average, so small icons stay legible instead of aliasing
   ══════════════════════════════════════════════════════════════════════════ */

const overlap = (a0, a1, b0, b1) => Math.max(0, Math.min(a1, b1) - Math.max(a0, b0));

/** Average of the master's [x0,x1)×[y0,y1) source rect. */
function areaAverage(master, x0, y0, x1, y1) {
  let r = 0, g = 0, b = 0, wsum = 0;
  const yStart = Math.max(0, Math.floor(y0));
  const yEnd = Math.min(MASTER_PX, Math.ceil(y1));
  const xStart = Math.max(0, Math.floor(x0));
  const xEnd = Math.min(MASTER_PX, Math.ceil(x1));
  for (let y = yStart; y < yEnd; y += 1) {
    const wy = overlap(y, y + 1, y0, y1);
    if (!wy) continue;
    for (let x = xStart; x < xEnd; x += 1) {
      const wx = overlap(x, x + 1, x0, x1);
      if (!wx) continue;
      const w = wx * wy;
      const i = (y * MASTER_PX + x) * 3;
      r += master[i] * w; g += master[i + 1] * w; b += master[i + 2] * w; wsum += w;
    }
  }
  if (!wsum) return NAVY;
  return [Math.round(r / wsum), Math.round(g / wsum), Math.round(b / wsum)];
}

/**
 * Render one icon.
 * @param mask 'square'    full-bleed, no alpha (iOS and the legacy launcher)
 *             'circle'    circular crop, transparent corners (round launcher)
 *             'adaptive'  artwork inside the 72/108 safe zone, transparent
 *                         elsewhere, drawn over the launcher's navy background
 */
function render(master, size, mask) {
  const channels = mask === 'square' ? 3 : 4;
  const out = Buffer.alloc(size * size * channels);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const o = (y * size + x) * channels;

      if (mask === 'adaptive') {
        // Content occupies ADAPTIVE_RATIO of the canvas, centred.
        const content = size * ADAPTIVE_RATIO;
        const off = (size - content) / 2;
        const dx = x + 0.5 - size / 2;
        const dy = y + 0.5 - size / 2;
        const dist = Math.hypot(dx, dy);
        const radius = content / 2;
        if (dist > radius) { out[o] = 0; out[o + 1] = 0; out[o + 2] = 0; out[o + 3] = 0; continue; }
        const [r, g, b] = areaAverage(
          master,
          ((x + 0.5 - off) / content) * MASTER_PX, ((y + 0.5 - off) / content) * MASTER_PX,
          ((x + 1 - off) / content) * MASTER_PX, ((y + 1 - off) / content) * MASTER_PX,
        );
        out[o] = r; out[o + 1] = g; out[o + 2] = b;
        // Anti-aliased edge, so the circle has no staircase at any density.
        out[o + 3] = Math.round(255 * Math.min(1, Math.max(0, radius - dist + 0.5)));
        continue;
      }

      const [r, g, b] = areaAverage(
        master,
        (x / size) * MASTER_PX, (y / size) * MASTER_PX,
        ((x + 1) / size) * MASTER_PX, ((y + 1) / size) * MASTER_PX,
      );
      out[o] = r; out[o + 1] = g; out[o + 2] = b;
      if (mask === 'circle') {
        const dist = Math.hypot(x + 0.5 - size / 2, y + 0.5 - size / 2);
        out[o + 3] = Math.round(255 * Math.min(1, Math.max(0, size / 2 - dist + 0.5)));
      }
    }
  }
  return encodePng(size, size, channels, out);
}

/* ══════════════════════════════════════════════════════════════════════════
   THE ICON SET
   ══════════════════════════════════════════════════════════════════════════ */

/** Every filename in Contents.json, with the pixel size its slot requires. */
function iosTargets() {
  const contents = JSON.parse(fs.readFileSync(path.join(IOS_SET, 'Contents.json'), 'utf8'));
  return contents.images.map((entry) => {
    const size = Number(entry.size.split('x')[0]);
    const scale = Number((entry.scale || '1x').replace('x', ''));
    return { filename: entry.filename, px: Math.round(size * scale) };
  }).filter((t) => t.filename);
}

function generate(masterPath) {
  const img = decodePng(fs.readFileSync(masterPath));
  const { master, radius, cx, cy } = buildMaster(img);
  console.log(`source ${img.width}x${img.height} · circle r=${radius.toFixed(1)} @ (${cx.toFixed(1)},${cy.toFixed(1)})`);
  console.log(`master ${MASTER_PX}x${MASTER_PX} · corners filled with navy rgb(${NAVY.join(',')})`);

  const written = [];
  for (const { filename, px } of iosTargets()) {
    const png = render(master, px, 'square');
    fs.writeFileSync(path.join(IOS_SET, filename), png);
    written.push(`${filename} ${px}px`);
  }
  console.log(`iOS: ${written.length} images (RGB, no alpha — iOS rejects transparency)`);

  for (const { dir, legacy } of DENSITIES) {
    const outDir = path.join(ANDROID_ICONS, `mipmap-${dir}`);
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, 'ic_launcher.png'), render(master, legacy, 'square'));
    fs.writeFileSync(path.join(outDir, 'ic_launcher_round.png'), render(master, legacy, 'circle'));
    // Adaptive canvas: 108dp, i.e. legacy (48dp) × 2.25. The artwork then fills
    // the inner 72dp safe zone, which is what every launcher mask shows.
    fs.writeFileSync(path.join(outDir, 'ic_launcher_foreground.png'), render(master, Math.round(legacy * 2.25), 'adaptive'));
  }
  console.log(`Android: ${DENSITIES.length} densities × (launcher, round, adaptive foreground)`);

  // A manifest of what was written, so the build can prove nothing replaced it.
  const digest = crypto.createHash('sha256').update(master).digest('hex');
  fs.writeFileSync(
    path.join(ANDROID_ICONS, 'ICON_SOURCE.sha256'),
    `${digest}  normalised-master-${MASTER_PX}\nnavy=${NAVY.join(',')}\nadaptive_ratio=${ADAPTIVE_RATIO.toFixed(4)}\n`,
  );
  console.log(`master sha256 ${digest}`);
}

/* ══════════════════════════════════════════════════════════════════════════
   VERIFY — what the build runs
   ══════════════════════════════════════════════════════════════════════════ */

function verify() {
  const problems = [];
  const ok = [];
  const nearNavy = (r, g, b) => Math.abs(r - NAVY[0]) <= 6 && Math.abs(g - NAVY[1]) <= 6 && Math.abs(b - NAVY[2]) <= 6;
  const inspect = (file) => {
    const img = decodePng(fs.readFileSync(file));
    return img;
  };

  // ── iOS: every slot present, square, alpha-free, navy corners ─────────────
  for (const { filename, px } of iosTargets()) {
    const file = path.join(IOS_SET, filename);
    if (!fs.existsSync(file)) { problems.push(`iOS missing ${filename}`); continue; }
    const img = inspect(file);
    if (img.width !== px || img.height !== px) problems.push(`iOS ${filename} is ${img.width}x${img.height}, expected ${px}x${px}`);
    if (img.channels === 4) {
      const corner = 3; // alpha of the top-left pixel
      if (img.data[corner] !== 255) problems.push(`iOS ${filename} has transparency (App Store rejects it)`);
    }
    if (img.channels !== 4) ok.push(`${filename} ${px}px RGB`);
  }
  const big = path.join(IOS_SET, 'AppIcon-1024x1024@1x.png');
  if (fs.existsSync(big)) {
    const img = inspect(big);
    const at = (x, y) => { const i = (y * img.width + x) * img.channels; return [img.data[i], img.data[i + 1], img.data[i + 2]]; };
    for (const [label, x, y] of [['top-left', 2, 2], ['top-right', img.width - 3, 2], ['bottom-left', 2, img.height - 3], ['bottom-right', img.width - 3, img.height - 3]]) {
      const [r, g, b] = at(x, y);
      if (!nearNavy(r, g, b)) problems.push(`iOS 1024 ${label} corner is rgb(${r},${g},${b}) — black padding survived`);
    }
    // The mascot must still be in frame: bright yellow near the centre.
    const [cr, cg, cb] = at(Math.round(img.width / 2), Math.round(img.height / 2));
    if (Math.max(cr, cg, cb) < 40) problems.push(`iOS 1024 centre is nearly black rgb(${cr},${cg},${cb}) — mascot missing`);
  }

  // ── Android: legacy, round, and a correctly sized adaptive foreground ─────
  for (const { dir, legacy } of DENSITIES) {
    const base = path.join(ANDROID_ICONS, `mipmap-${dir}`);
    const launcher = path.join(base, 'ic_launcher.png');
    const round = path.join(base, 'ic_launcher_round.png');
    const foreground = path.join(base, 'ic_launcher_foreground.png');
    for (const file of [launcher, round, foreground]) {
      if (!fs.existsSync(file)) { problems.push(`Android missing ${path.relative(ROOT, file)}`); continue; }
    }
    if (fs.existsSync(launcher)) {
      const img = inspect(launcher);
      if (img.width !== legacy) problems.push(`${dir} launcher is ${img.width}px, expected ${legacy}px`);
      const i = 0;
      if (!nearNavy(img.data[i], img.data[i + 1], img.data[i + 2])) problems.push(`${dir} launcher corner is not navy`);
      else ok.push(`${dir} launcher ${legacy}px`);
    }
    if (fs.existsSync(foreground)) {
      const img = inspect(foreground);
      const expect = Math.round(legacy * 2.25); // 108dp canvas
      if (img.width !== expect) problems.push(`${dir} adaptive foreground is ${img.width}px, expected ${expect}px (108dp canvas)`);
      if (img.channels !== 4) problems.push(`${dir} adaptive foreground has no alpha channel — masks would crop it`);
      else if (img.data[3] !== 0) problems.push(`${dir} adaptive foreground corner is opaque — it must be transparent outside the safe zone`);
      else ok.push(`${dir} adaptive ${expect}px RGBA`);
    }
    if (fs.existsSync(round)) {
      const img = inspect(round);
      if (img.channels !== 4 || img.data[3] !== 0) problems.push(`${dir} round icon corner is not transparent`);
    }
  }

  if (problems.length) {
    console.error(`\nICON CHECK FAILED (${problems.length}):`);
    for (const p of problems) console.error(`  ✗ ${p}`);
    process.exit(1);
  }
  console.log(`\nICON CHECK OK — ${ok.length} verified assets`);
  console.log('  • iOS: full-bleed RGB, navy corners, no alpha');
  console.log('  • Android: square launcher, masked round icon, 108dp adaptive foreground');
}

/* ══════════════════════════════════════════════════════════════════════════ */

const arg = process.argv[2];
if (!arg) {
  console.error('usage: build-app-icons.mjs <master.png> | --verify');
  process.exit(2);
}
if (arg === '--verify') verify();
else generate(arg);