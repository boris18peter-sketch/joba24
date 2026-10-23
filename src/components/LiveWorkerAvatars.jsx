import { useMemo } from 'react';
import { useBrandCategories } from '@/lib/brand/brandCategories';
import { categoryMatches } from '@/lib/brand/categoryTree';
import { useWorkerPool } from '@/hooks/useWorkerPool';

/**
 * LiveWorkerAvatars — the overlapping stack of REAL professionals who work in
 * the category the publisher has just chosen.
 *
 * ── WHY REAL FACES ──────────────────────────────────────────────────────────
 * The stack used to be four drawn glyphs: honest, but silent. A publisher
 * deciding whether to post is asking one question — "will anyone actually
 * answer this?" — and the most direct answer is the people themselves. These
 * are profile photos of registered users whose own profile says they work in
 * this category, so the reassurance is a fact rather than a mood.
 *
 * ── AND WHY IT CAN DISAPPEAR ────────────────────────────────────────────────
 * If nobody matching has a photo, this renders NOTHING. A placeholder face or
 * an invented count would be exactly the false impression it is meant to
 * remove, so the row simply falls back to the honest number it already shows.
 *
 * ── ONE REQUEST, SHARED ─────────────────────────────────────────────────────
 * The worker pool is read under the same query key the availability scanners
 * use, so this costs no extra request and can never disagree with them about
 * who is in the pool.
 */
const SIZE = 24;
const OVERLAP = -8;
// A light ring, never a solid colour: the bar behind this is a translucent
// tint over the header's gradient, so no single colour would ever match it.
// The ring is what makes the overlap read as separate faces.
const RING = '2px solid rgba(255,255,255,0.85)';
const MAX = 4;

export default function LiveWorkerAvatars({ category }) {
  const { globalMap } = useBrandCategories();

  // Read through the public pool, never the User entity: this row has to be
  // there for a visitor who is not signed in.
  const { data: pool = [] } = useWorkerPool();

  const workers = useMemo(() => {
    if (!category) return [];
    // Matched in BOTH directions, so the stack is right whichever way the
    // profiles were filled in: a professional who put the whole trade on their
    // profile ("התקנות והרכבות") counts for the single service the publisher
    // picked, and one who listed only a service counts when the publisher
    // picked the trade. The pool is already ordered most-recently-active first,
    // so the faces shown are the ones most likely to answer today.
    const matches = (key) =>
      categoryMatches(category, key, globalMap) || categoryMatches(key, category, globalMap);
    return pool.filter((u) => u.profile_photo && (u.preferred_categories || []).some(matches));
  }, [pool, category, globalMap]);

  if (!workers.length) return null;

  return (
    <div
      dir="ltr"
      aria-hidden="true"
      style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}
    >
      {workers.slice(0, MAX).map((u, i) => (
        <div
          key={u.id}
          style={{
            width: SIZE, height: SIZE, borderRadius: '50%',
            marginInlineStart: i === 0 ? 0 : OVERLAP,
            border: RING,
            overflow: 'hidden',
            background: 'var(--surface-3)',
            flexShrink: 0,
            // Later faces sit ON TOP of earlier ones, so each tucks under the
            // right edge of the one before it — the standard avatar stack.
            zIndex: i + 1,
            boxShadow: '0 1px 4px rgba(0,0,0,0.18)',
          }}
        >
          <img
            src={u.profile_photo}
            alt=""
            loading="lazy"
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        </div>
      ))}

      {/* The trailing "+" — shown ONLY when the stack is genuinely full, i.e.
          when there really are more. The honest count is printed right beside
          this row, so a second number here would only contradict it. */}
      {workers.length > MAX && (
        <div
          style={{
            width: SIZE, height: SIZE, borderRadius: '50%',
            marginInlineStart: OVERLAP,
            background: 'rgba(255,255,255,0.18)',
            border: RING,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
            color: 'var(--brand-hero-text, #ffffff)',
            fontSize: 12, fontWeight: 900, lineHeight: 1,
            zIndex: MAX + 1,
          }}
        >
          +
        </div>
      )}
    </div>
  );
}