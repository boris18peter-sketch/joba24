import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLanguage } from '@/lib/LanguageContext';

/**
 * BenefitsBanner — the hero of the "משימות שפרסמתי" empty state.
 *
 * ── ONE HERO, NO REPEATED TITLE ────────────────────────────────────────────
 * The screen used to carry an external headline ("צריך עזרה במשהו?") plus its
 * explanation, and then the same message again inside the banner. The external
 * block is gone and the message lives here: a small FIXED eyebrow that never
 * moves, and beneath it the changing marketing headline with its one line of
 * support. The headline is the dominant element; the illustration sits beside it
 * and is never enlarged at the cost of the text.
 *
 * ── THE ILLUSTRATIONS ARE REAL TRANSPARENT PNGs ────────────────────────────
 * The three sets were cut from the supplied artwork on its own alpha channel
 * (three separate colour groups, clean gaps between them) — no background
 * removal, no invented character, no square frame, no inner panel, and no text
 * baked into a picture: every word here is live UI text.
 *
 * ── CAROUSEL ───────────────────────────────────────────────────────────────
 * Fixed order 1 → 2 → 3 → 1. 5.5s counted from the END of the last transition,
 * a 400ms transition, and a lock so two transitions can never overlap. Exactly
 * one slide is mounted at a time and the stage clips, so no two texts can ever
 * be on screen together — including across the 3 → 1 wrap. RTL is mirrored once
 * (never twice) and the data order is never reversed.
 */
const ROTATE_MS = 5500;
const ANIM_MS = 400;
const ENTER_PX = 24;
const DRAG_MAX = 28;

const SLIDES = [
  {
    n: 1,
    art: 'https://base44.app/api/apps/69e6bdb4986a04a256653a23/files/mp/public/69e6bdb4986a04a256653a23/cc1300344_hero-pros.png',
  },
  {
    n: 2,
    art: 'https://base44.app/api/apps/69e6bdb4986a04a256653a23/files/mp/public/69e6bdb4986a04a256653a23/f4f613a94_hero-speed.png',
  },
  {
    n: 3,
    art: 'https://base44.app/api/apps/69e6bdb4986a04a256653a23/files/mp/public/69e6bdb4986a04a256653a23/9bb7b2713_hero-ai.png',
    // The AI slide alone carries its own eyebrow. The request named ONE banner:
    // the other two keep the general question, so the price line lives here and
    // nowhere else.
    headingKey: 'ben_ai_heading',
  },
];

/* ── THE ILLUSTRATION HAS TO BE THERE WHEN THE BANNER IS ───────────────────
   The first picture used to start downloading only when this banner mounted —
   after the session check, the public-settings fetch and the task list — so the
   illustration arrived seconds late, into a banner that was already on screen
   showing an empty space where a character should be.

   It now starts the moment this module is evaluated, i.e. with the app's own
   JavaScript rather than after its data, and index.html carries a matching
   <link rel="preload"> that starts it during the HTML parse — before any of this
   code has even been parsed. The other two slides are fetched once the banner
   is on screen (never at boot, so they cannot compete with the app's start-up
   requests), and the CDN serves all three `immutable` for a month, so this
   ordering only matters on the very first launch. */
const FIRST_ART = SLIDES[0].art;

function warmArt(src, priority) {
  if (typeof window === 'undefined' || !src) return null;
  const img = new window.Image();
  img.decoding = 'async';
  try { img.fetchPriority = priority; } catch { /* older engine: no hint */ }
  img.src = src;
  return img;
}

const FIRST_ART_IMG = warmArt(FIRST_ART, 'high');

export default function BenefitsBanner() {
  const { t, isRTL, lang } = useLanguage();
  const [index, setIndex] = useState(0);
  const [dir, setDir] = useState(1);
  const [paused, setPaused] = useState(false);
  const [inView, setInView] = useState(true);
  const [visible, setVisible] = useState(true);
  const [reduced, setReduced] = useState(false);
  const [ready, setReady] = useState(false);
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);

  const frameRef = useRef(null);
  const titleRef = useRef(null);
  const busyRef = useRef(false);
  const touchRef = useRef({ x: 0, y: 0, active: false, horiz: null });

  /* One slide forward or back, locked for the length of the transition. */
  const go = useCallback((delta) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setDir(delta > 0 ? 1 : -1);
    setIndex((i) => (i + delta + SLIDES.length) % SLIDES.length);
    setTimeout(() => { busyRef.current = false; }, ANIM_MS);
  }, []);

  /* All three in hand before the carousel starts, so a change never reveals a
     half-loaded picture. The first one is already in flight (or done) from the
     warm-up above — only the two the visitor cannot see yet are fetched here. */
  useEffect(() => {
    let alive = true;
    let left = SLIDES.length;
    const done = () => { left -= 1; if (alive && left === 0) setReady(true); };

    const settle = (img) => {
      if (!img) { done(); return; }
      if (img.complete && img.naturalWidth > 0) { done(); return; }
      img.addEventListener('load', done, { once: true });
      img.addEventListener('error', done, { once: true });
    };

    settle(FIRST_ART_IMG);
    SLIDES.slice(1).forEach((s) => settle(warmArt(s.art, 'low')));

    return () => { alive = false; };
  }, []);

  /* ── ONE LINE, ALWAYS ──────────────────────────────────────────────────────
     Every headline in this carousel has to read as ONE line, like the ones beside
     it: one that broke onto a second row pushed its support line down and made
     that slide look like a different card than the others. The headline therefore
     never wraps — it steps down in half-pixel steps until it fits the width the
     illustration leaves it, and never further than 13px, so it always stays the
     dominant element of the banner whatever the language or the screen. */
  useEffect(() => {
    const el = titleRef.current;
    if (!el) return;
    const fit = () => {
      el.style.fontSize = '';
      const base = parseFloat(window.getComputedStyle(el).fontSize) || 22;
      let size = base;
      while (el.scrollWidth > el.clientWidth + 1 && size > 13) {
        size -= 0.5;
        el.style.fontSize = `${size}px`;
      }
    };
    fit();
    window.addEventListener('resize', fit);
    // The webfont can land after the first measurement and change every width.
    if (document.fonts?.ready) document.fonts.ready.then(fit).catch(() => {});
    return () => window.removeEventListener('resize', fit);
  }, [index, lang]);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener ? mq.addEventListener('change', sync) : mq.addListener(sync);
    return () => {
      mq.removeEventListener ? mq.removeEventListener('change', sync) : mq.removeListener(sync);
    };
  }, []);

  useEffect(() => {
    const sync = () => setVisible(!document.hidden);
    sync();
    document.addEventListener('visibilitychange', sync);
    return () => document.removeEventListener('visibilitychange', sync);
  }, []);

  useEffect(() => {
    const el = frameRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      (entries) => setInView(entries.some((e) => e.isIntersecting)),
      { threshold: 0.25 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  /* ONE timer, re-created on every change: it always measures from the end of the
     previous transition, and no two timers can ever run side by side. */
  useEffect(() => {
    if (!ready || paused || reduced || !inView || !visible) return;
    const id = setTimeout(() => go(1), ANIM_MS + ROTATE_MS);
    return () => clearTimeout(id);
  }, [ready, paused, reduced, inView, visible, index, go]);

  /* Horizontal gestures only — a vertical one belongs to the page's scrolling. */
  const onTouchStart = (e) => {
    const p = e.touches[0];
    touchRef.current = { x: p.clientX, y: p.clientY, active: true, horiz: null };
    setDragging(true);
    setPaused(true);
  };
  const onTouchMove = (e) => {
    const st = touchRef.current;
    if (!st.active) return;
    const p = e.touches[0];
    const dx = p.clientX - st.x;
    const dy = p.clientY - st.y;
    if (st.horiz === null && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
      st.horiz = Math.abs(dx) > Math.abs(dy) * 1.2;
    }
    if (!st.horiz) return;
    setDragX(Math.max(-DRAG_MAX, Math.min(DRAG_MAX, dx * 0.5)));
  };
  const onTouchEnd = () => {
    const st = touchRef.current;
    st.active = false;
    setDragging(false);
    setDragX(0);
    if (st.horiz) {
      const dx = dragX;
      const next = isRTL ? dx > 16 : dx < -16;
      const prev = isRTL ? dx < -16 : dx > 16;
      if (next) go(1);
      else if (prev) go(-1);
    }
    setPaused(false);
  };

  const slide = SLIDES[index];
  const enterFrom = (isRTL ? -1 : 1) * dir * ENTER_PX;

  const dots = useMemo(() => SLIDES.map((s, i) => (
    <button
      key={s.n}
      type="button"
      onClick={() => { if (i !== index) go(i > index ? 1 : -1); }}
      aria-label={`${i + 1} / ${SLIDES.length}`}
      aria-current={i === index ? 'true' : undefined}
      className={i === index ? 'j-ben-dot j-ben-dot-on' : 'j-ben-dot'}
    />
  )), [index, go]);

  return (
    <div
      ref={frameRef}
      className={`j-ben j-ben-s${slide.n}${reduced ? ' j-ben-still' : ''}`}
      dir={isRTL ? 'rtl' : 'ltr'}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchEnd}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      role="group"
      aria-roledescription="carousel"
    >
      {/* The small line above the headline. General question on the two general
          slides; the AI slide brings its own (see SLIDES). It sits outside the
          slide stage, so it swaps with the slide instead of travelling. */}
      <div className="j-ben-eyebrow">{t(slide.headingKey || 'ben_fixed_heading')}</div>

      <div className="j-ben-stage">
        <div
          key={index}
          className="j-ben-slide"
          style={{
            transform: `translateX(${dragX}px)`,
            transition: dragging ? 'none' : 'transform 220ms cubic-bezier(0.32,0.72,0,1)',
            '--j-ben-from': `${enterFrom}px`,
          }}
        >
          <div className="j-ben-text">
            <div className="j-ben-title" ref={titleRef}>{t(`ben_s${slide.n}_title`)}</div>
            <div className="j-ben-body">{t(`ben_s${slide.n}_body`)}</div>
          </div>

          <div className="j-ben-art">
            {/* Intrinsic size + the priority hint: the browser can lay the box
                out from these numbers before the pixels land, and it knows
                these pictures are the point of the card rather than something
                to defer. */}
            <img
              src={slide.art}
              alt=""
              aria-hidden="true"
              draggable="false"
              width={430}
              height={296}
              decoding="async"
              fetchpriority="high"
            />
          </div>
        </div>
      </div>

      <div className="j-ben-dots">{dots}</div>

      <style>{`
        .j-ben {
          position: relative;
          height: 152px;
          overflow: hidden;
          border-radius: var(--r-xl);
          border: 1px solid rgba(26,111,212,0.10);
          isolation: isolate;
          display: flex;
          flex-direction: column;
          padding: 12px 14px 22px;
          box-sizing: border-box;
          -webkit-tap-highlight-color: transparent;
          touch-action: pan-y;
        }
        .j-ben-s1 { background: linear-gradient(105deg, #e8f2fd 0%, #f1f8ff 58%, #f8fcff 100%); }
        .j-ben-s2 { background: linear-gradient(105deg, #fff6d9 0%, #fffaeb 58%, #fffdf5 100%); }
        .j-ben-s3 { background: linear-gradient(105deg, #e8ecfb 0%, #f1f3fd 58%, #f9faff 100%); }

        .j-ben-eyebrow {
          flex: 0 0 auto;
          font-size: 13.5px;
          font-weight: 800;
          line-height: 1.2;
          letter-spacing: -0.1px;
          color: #41598a;
          margin-bottom: 2px;
        }

        /* The stage clips: a slide can never show a half of itself, and the
           height can never move. */
        .j-ben-stage { position: relative; flex: 1 1 auto; min-height: 0; overflow: hidden; }

        .j-ben-slide {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: row;
          align-items: center;
          gap: 6px;
          will-change: transform, opacity;
          /* backwards, never both: a forwards fill would keep the animation's
             final transform and swallow the finger's drag offset. */
          animation: jBenIn ${ANIM_MS}ms cubic-bezier(0.32, 0.72, 0, 1) backwards;
        }
        @keyframes jBenIn {
          from { opacity: 0; transform: translateX(var(--j-ben-from, 0px)); }
          to   { opacity: 1; transform: translateX(0); }
        }
        .j-ben-still .j-ben-slide { animation-duration: 1ms; }

        .j-ben-text {
          flex: 1 1 0;
          min-width: 0;
          align-self: center;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          text-align: start;
        }
        /* The dominant typographic element of the banner — and always ONE line.
           The font size is fitted to the space by the component, so the line can
           never wrap and no two slides can start their text at different heights. */
        .j-ben-title {
          font-size: 22px;
          font-weight: 900;
          line-height: 1.16;
          letter-spacing: -0.6px;
          color: #0b1b3d;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          /* A full-width box, so the component can MEASURE the line against the
             column: auto width would shrink to the text and every long headline
             would look like it fits. */
          width: 100%;
          max-width: 100%;
        }
        .j-ben-body {
          margin-top: 8px;
          font-size: 13.5px;
          font-weight: 600;
          line-height: 1.25;
          color: #33486f;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        /* The illustration: an isolated transparent PNG, no frame and no panel,
           sized to the slide's own height so it reads as part of the design. */
        .j-ben-art {
          flex: 0 0 45%;
          max-width: 180px;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-inline-end: -4px;
          pointer-events: none;
        }
        .j-ben-art img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          filter: drop-shadow(0 6px 12px rgba(15,40,107,0.16));
          -webkit-user-select: none;
          user-select: none;
        }

        /* Three dots, centred: the active one is a blue pill, the others are
           small light circles — the pagination language of the reference. */
        .j-ben-dots {
          position: absolute;
          inset-inline: 0;
          bottom: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
        }
        .j-ben-dot {
          position: relative;
          width: 6px;
          height: 6px;
          padding: 0;
          min-width: 0;
          min-height: 0;
          border: none;
          border-radius: 999px;
          cursor: pointer;
          background: rgba(26,111,212,0.28);
          transition: width 220ms ease, background 220ms ease;
        }
        .j-ben-dot::after { content: ''; position: absolute; inset: -10px; }
        .j-ben-dot-on { width: 20px; background: #1a6fd4; }

        /* ── NARROW SCREENS: the picture steps aside, never the words ──────────
           On a small phone the column was too tight — the illustration held 45%
           of the width, the headline hit its floor and the body ran out of rows,
           so copy was clipped instead of read. The picture now takes a small
           fixed share, the banner is a touch taller and the body may use a third
           line: the illustration is the part that gives, the text is never cut. */
        @media (max-width: 430px) {
          .j-ben { height: 174px; padding: 11px 12px 22px; }
          .j-ben-eyebrow { font-size: 12.5px; }
          .j-ben-title { font-size: 19.5px; }
          .j-ben-body { font-size: 12.5px; margin-top: 6px; -webkit-line-clamp: 3; }
          .j-ben-art { flex: 0 0 32%; max-width: 112px; }
        }

        @media (min-width: 720px) {
          .j-ben { height: 166px; padding: 14px 18px 24px; }
          .j-ben-eyebrow { font-size: 14.5px; }
          .j-ben-title { font-size: 26px; }
          .j-ben-body { font-size: 15px; }
          .j-ben-art { flex-basis: 40%; max-width: 220px; }
        }

        @media (prefers-color-scheme: dark) {
          .j-ben { border-color: rgba(255,255,255,0.07); }
          /* Both banners wear the SAME blue at night. The speed slide used to keep
             its daylight amber, darkened into a brown-charcoal, which read as a
             different, muddier card than the one beside it — and as a grey block
             against the app's dark blue surface. In dark mode the family colour
             carries the slide, exactly as it does on the first one. */
          .j-ben-s1 { background: linear-gradient(105deg, #14243f 0%, #16273f 58%, #121e34 100%); }
          .j-ben-s2 { background: linear-gradient(105deg, #14243f 0%, #16273f 58%, #121e34 100%); }
          .j-ben-s3 { background: linear-gradient(105deg, #1d1f3c 0%, #202244 58%, #181a33 100%); }
          .j-ben-eyebrow { color: #9fb6d8; }
          .j-ben-title { color: #f8fafc; }
          .j-ben-body { color: #b9c8de; }
          .j-ben-art img { filter: drop-shadow(0 6px 14px rgba(0,0,0,0.45)); }
          .j-ben-dot { background: rgba(255,255,255,0.24); }
          .j-ben-dot-on { background: #7db0f0; }
        }
      `}</style>
    </div>
  );
}