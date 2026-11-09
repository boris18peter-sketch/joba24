import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * The App Clip's blank video card.
 *
 * The released clip opened with the player swapped out for the sparkle
 * placeholder. Nothing was wrong with the film: `ClipRootView.checkFilm()` sent a
 * `HEAD` request to the app's file endpoint and replaced the player whenever the
 * answer was not 200 — and that endpoint answers `HEAD` with a 404 on roughly
 * half of all requests, while serving the same file with 200/206 for every real
 * `GET`. The check, not the film, decided the card was broken.
 *
 * These pin the fix so it cannot regress: the asset is addressed directly, no
 * request is made before the player, only a genuine failure may show the
 * fallback, and a slow network is never mistaken for a missing film.
 */

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(here, '..');

const read = (path) => readFileSync(join(ROOT, path), 'utf8');

const ROOT_VIEW = read('ios/App/JobaClip/ClipRootView.swift');
const PLAYER = read('ios/App/JobaClip/ClipVideoPlayer.swift');

/** The film URL exactly as the clip declares it. */
const filmURL = () => {
  const match = ROOT_VIEW.match(/clipFilmURL\s*=\s*URL\(string:\s*"([^"]+)"\)/);
  return match ? match[1] : null;
};

/** The body of one `tokens.append(...)` observer, found by its notification name. */
const observerBlock = (source, notification) => {
  const start = source.indexOf(notification);
  if (start === -1) return '';
  const next = source.indexOf('tokens.append', start);
  return source.slice(start, next === -1 ? source.length : next);
};

/* ══════════════════════════════════════════════════════════════════════════
   1. The asset is addressed directly
   ══════════════════════════════════════════════════════════════════════════ */
describe('the clip film URL', () => {
  it('points at the media host, not the redirecting file endpoint', () => {
    const url = new URL(filmURL());
    // base44.app/api/.../files/mp/public/... answers 302 on every request (and
    // 404 to HEAD about half the time). The media host serves the bytes itself.
    expect(url.host).toBe('media.base44.com');
    expect(url.hostname).not.toBe('base44.app');
    expect(url.pathname.startsWith('/videos/public/')).toBe(true);
  });

  it('is https and a playable mp4 container', () => {
    const url = new URL(filmURL());
    expect(url.protocol).toBe('https:');
    expect(url.pathname.endsWith('.mp4')).toBe(true);
  });

  it('still names the film the clip was built around', () => {
    // Guards against a "simplification" that silently swaps in another asset.
    expect(filmURL().endsWith('/53c314145_joba24-app-clip.mp4')).toBe(true);
  });
});

/* ══════════════════════════════════════════════════════════════════════════
   2. Nothing asks about the film before the player does
   ══════════════════════════════════════════════════════════════════════════ */
describe('the HEAD pre-flight', () => {
  it('is gone from the clip view', () => {
    expect(ROOT_VIEW).not.toMatch(/httpMethod\s*=\s*"HEAD"/);
    expect(ROOT_VIEW).not.toMatch(/URLSession/);
    expect(ROOT_VIEW).not.toMatch(/func\s+checkFilm/);
  });

  it('no longer gates the player behind a reachability check', () => {
    expect(ROOT_VIEW).not.toMatch(/onAppear\(perform:\s*checkFilm\)/);
    // The player itself is mounted, unconditionally, in the non-failed branch.
    expect(ROOT_VIEW).toMatch(/ClipVideoPlayer\(url:\s*clipFilmURL\)/);
  });

  it('leaves no dead request code in the player either', () => {
    expect(PLAYER).not.toMatch(/URLSession/);
    expect(PLAYER).not.toMatch(/httpMethod/);
  });
});

/* ══════════════════════════════════════════════════════════════════════════
   3. The fallback is reachable ONLY through a genuine failure
   ══════════════════════════════════════════════════════════════════════════ */
describe('failure reporting', () => {
  it('the player exposes a failure callback and calls it on .failed only', () => {
    expect(PLAYER).toMatch(/let onFailure:\s*\(\)\s*->\s*Void/);
    expect(PLAYER).toMatch(/case\s+\.failed:\s*\n\s*self\?\.reportFailure\(\)/);
    // .readyToPlay must start playback, never report a failure.
    const ready = PLAYER.slice(PLAYER.indexOf('case .readyToPlay'), PLAYER.indexOf('case .failed'));
    expect(ready).toMatch(/player\.play\(\)/);
    expect(ready).not.toMatch(/reportFailure/);
  });

  it('reports a failure at most once', () => {
    const report = PLAYER.slice(
      PLAYER.indexOf('private func reportFailure'),
      PLAYER.indexOf('private func reportFailure') + 420);
    expect(report).toMatch(/guard\s+!reportedFailure\s+else\s*\{\s*return\s*\}/);
    expect(report).toMatch(/reportedFailure\s*=\s*true/);
  });

  it('a mid-stream failure is reported too', () => {
    const block = observerBlock(PLAYER, 'AVPlayerItemFailedToPlayToEndTime');
    expect(block).toMatch(/reportFailure\(\)/);
  });

  it('the clip view turns that callback into the existing sparkle fallback', () => {
    const wiring = ROOT_VIEW.slice(
      ROOT_VIEW.indexOf('ClipVideoPlayer(url:'),
      ROOT_VIEW.indexOf('.clipShape', ROOT_VIEW.indexOf('ClipVideoPlayer(url:')));
    expect(wiring).toMatch(/videoFailed\s*=\s*true/);
    // And the fallback is still the one the design already had.
    expect(ROOT_VIEW).toMatch(/if videoFailed\s*\{[\s\S]{0,400}systemName:\s*"sparkles"/);
    expect(ROOT_VIEW).toMatch(/foregroundColor\(brandGold\.opacity\(0\.7\)\)/);
  });
});

/* ══════════════════════════════════════════════════════════════════════════
   4. Buffering is not failure, and no timeout may reject a slow network
   ══════════════════════════════════════════════════════════════════════════ */
describe('buffering and slow networks', () => {
  it('a stall resumes playback instead of showing the fallback', () => {
    const block = observerBlock(PLAYER, 'AVPlayerItemPlaybackStalled');
    expect(block).toMatch(/player\.play\(\)/);
    expect(block).not.toMatch(/reportFailure/);
  });

  it('declares no timeout of its own', () => {
    // A custom deadline is exactly what rejected a slow connection before.
    expect(PLAYER).not.toMatch(/\bTimer\b/);
    expect(PLAYER).not.toMatch(/asyncAfter/);
    expect(PLAYER).not.toMatch(/dispatch_after/);
    expect(PLAYER).not.toMatch(/timeoutInterval/);
  });

  it('lets AVPlayer decide when enough is buffered', () => {
    expect(PLAYER).toMatch(/automaticallyWaitsToMinimizeStalling\s*=\s*true/);
  });
});

/* ══════════════════════════════════════════════════════════════════════════
   5. It autoplays, loops, and survives repeated launches
   ══════════════════════════════════════════════════════════════════════════ */
describe('autoplay and looping', () => {
  it('starts on load, before the item is ready', () => {
    const load = PLAYER.slice(PLAYER.indexOf('func load(_ url: URL)'), PLAYER.indexOf('func stop()'));
    expect(load).toMatch(/player\.replaceCurrentItem\(with:\s*item\)/);
    expect(load).toMatch(/player\.play\(\)/);
  });

  it('starts again the moment the item becomes ready', () => {
    expect(PLAYER).toMatch(/case\s+\.readyToPlay:\s*\n\s*DispatchQueue\.main\.async\s*\{\s*self\?\.player\.play\(\)\s*\}/);
  });

  it('loops instead of freezing on the last frame', () => {
    const block = observerBlock(PLAYER, 'AVPlayerItemDidPlayToEndTime');
    expect(block).toMatch(/seek\(to:\s*\.zero\)/);
    expect(block).toMatch(/player\.play\(\)/);
  });

  it('resumes when the clip returns from the background', () => {
    const block = observerBlock(PLAYER, 'willEnterForegroundNotification');
    expect(block).toMatch(/player\.play\(\)/);
    expect(block).toMatch(/readyToPlay/);
  });

  it('tears the player and its observations down when the card goes away', () => {
    // Repeated launches and the fallback swap must not leave observers behind.
    expect(PLAYER).toMatch(/uiView\.stop\(\)/);
    expect(PLAYER).toMatch(/func stop\(\)\s*\{[\s\S]{0,400}removeObserver[\s\S]{0,200}replaceCurrentItem\(with:\s*nil\)/);
  });
});

/* ══════════════════════════════════════════════════════════════════════════
   6. The design, the Hebrew copy and the CTA are untouched
   ══════════════════════════════════════════════════════════════════════════ */
describe('the clip screen itself', () => {
  it('keeps the headline and the supporting line', () => {
    expect(ROOT_VIEW).toContain('מוצאים בעל מקצוע תוך דקות');
    expect(ROOT_VIEW).toContain('מפרסמים משימה, מקבלים פניות, ומשלמים רק כשהעבודה נעשית.');
  });

  it('keeps the App Store CTA and its free-app note', () => {
    expect(ROOT_VIEW).toContain('המשך באפליקציה');
    expect(ROOT_VIEW).toContain('האפליקציה חינמית');
    expect(ROOT_VIEW).toMatch(/SKOverlay\.AppClipConfiguration\(position:\s*\.bottom\)/);
  });

  it('keeps the film card exactly as designed', () => {
    expect(ROOT_VIEW).toMatch(/RoundedRectangle\(cornerRadius:\s*26,\s*style:\s*\.continuous\)/);
    expect(ROOT_VIEW).toMatch(/\.fill\(Color\.white\.opacity\(0\.06\)\)/);
    expect(ROOT_VIEW).toMatch(/stroke\(Color\.white\.opacity\(0\.10\),\s*lineWidth:\s*1\)/);
    expect(PLAYER).toMatch(/videoGravity\s*=\s*\.resizeAspect/);
  });

  it('keeps the film silent', () => {
    expect(PLAYER).toMatch(/player\.isMuted\s*=\s*true/);
  });
});