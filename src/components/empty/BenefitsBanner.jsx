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
  },
];

export default function BenefitsBanner() {
  const { t, isRTL } = useLanguage();
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

  /* All three preloaded, so a change never reveals a half-loaded picture. */
  useEffect(() => {
    let alive = true;
    let left = SLIDES.length;
    SLIDES.forEach((s) => {
      const img = new Image();
      const done = () => { left -= 1; if (alive && left === 0) setReady(true); };
      img.onload = done;
      img.onerror = done;
      img.src = s.art;
    });
    return () => { alive = false; };
  }, []);

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
      {/* The one fixed line of the whole hero — it never transitions. */}
      <div className="j-ben-eyebrow">{t('ben_fixed_heading')}</div>

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
            <div className="j-ben-title">{t(`ben_s${slide.n}_title`)}</div>
            <div className="j-ben-body">{t(`ben_s${slide.n}_body`)}</div>
          </div>

          <div className="j-ben-art">
            <img src={slide.art} alt="" aria-hidden="true" draggable="false" />
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
        /* The dominant typographic element of the banner. */
        .j-ben-title {
          font-size: 23px;
          font-weight: 900;
          line-height: 1.14;
          letter-spacing: -0.7px;
          color: #0b1b3d;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .j-ben-body {
          margin-top: 5px;
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

        .j-ben-dots {
          position: absolute;
          inset-inline: 0;
          bottom: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
        }
        .j-ben-dot {
          position: relative;
          width: 5px;
          height: 5px;
          padding: 0;
          min-width: 0;
          min-height: 0;
          border: none;
          border-radius: 999px;
          cursor: pointer;
          background: rgba(26,111,212,0.22);
          transition: width 220ms ease, background 220ms ease;
        }
        .j-ben-dot::after { content: ''; position: absolute; inset: -10px; }
        .j-ben-dot-on { width: 14px; background: #1a6fd4; }

        @media (min-width: 720px) {
          .j-ben { height: 166px; padding: 14px 18px 24px; }
          .j-ben-eyebrow { font-size: 14.5px; }
          .j-ben-title { font-size: 27px; }
          .j-ben-body { font-size: 15px; }
          .j-ben-art { flex-basis: 40%; max-width: 220px; }
        }

        @media (prefers-color-scheme: dark) {
          .j-ben { border-color: rgba(255,255,255,0.07); }
          .j-ben-s1 { background: linear-gradient(105deg, #14243f 0%, #16273f 58%, #121e34 100%); }
          .j-ben-s2 { background: linear-gradient(105deg, #2a2416 0%, #262218 58%, #1d1b13 100%); }
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