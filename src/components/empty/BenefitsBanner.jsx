import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLanguage } from '@/lib/LanguageContext';

/**
 * BenefitsBanner — the three Joba24 banners of the published-tasks empty state.
 * It is rendered ONLY there, and only while the publisher has no active tasks.
 *
 * ── THE APPROVED COPY, NOT A PARAPHRASE ─────────────────────────────────────
 * The headline and the line under it are taken verbatim from the approved
 * designs (ben_s1..3 in the dictionaries), including the two figures
 * "5,000+ בעלי מקצוע" and "10 דקות בממוצע". They are NOT re-worded here.
 *
 * ⚠ THOSE TWO FIGURES ARE NOT VERIFIED against the system's data yet — there is
 * no measured time-to-first-offer and no confirmed active-professional count.
 * They are rendered because they are the approved design copy, and this note is
 * the report that was asked for: verify them (or approve a replacement) before
 * the banners are treated as a factual claim.
 *
 * ── WHY THE ILLUSTRATIONS ARE SEPARATE FROM THE TEXT ────────────────────────
 * The supplied banner files are 2172 × ~240 (a ~9:1 strip) with the headline
 * already painted into the artwork. At the app's real content width (~408px on a
 * 440px viewport) that strip would be ~45px tall — the text inside it would be
 * unreadable, and reaching the 110–130px target would mean cropping or stretching
 * the artwork, which is excluded. So the illustration is placed here as art and
 * the copy is real UI text at a real size: no duplication, no cropping, no
 * distortion. To reach pixel-identity with the supplied designs, the three
 * illustrations are needed exported WITHOUT their text layer.
 *
 * ── CAROUSEL ────────────────────────────────────────────────────────────────
 *  • Fixed order 1 → 2 → 3 → 1, wrapping. Never shuffled, never repeated.
 *  • 5.5s of display counted from the END of the previous transition, and a
 *    transition can never start while the previous one is still running
 *    (`busyRef`), so a slide can never be skipped or doubled.
 *  • Exactly ONE slide exists in the DOM at any moment — the outgoing node is
 *    replaced by the incoming one, and the frame clips. Two texts can never be
 *    on screen together, and nothing invisible is left layered above the slide.
 *  • RTL: the swipe is mirrored together with the direction of travel, and the
 *    data order is never reversed — one mapping, so no double inversion and no
 *    flip on the 3 → 1 wrap.
 *  • One timer, re-created whenever anything changes; paused on touch, hover,
 *    hidden tab, off screen, and off entirely under reduced motion.
 */
const ROTATE_MS = 5500;
const ANIM_MS = 400;
const ENTER_PX = 22;
const DRAG_MAX = 30;

const SLIDES = [
  {
    n: 1,
    art: 'https://media.base44.com/images/public/69e6bdb4986a04a256653a23/a95eef4f8_generated_image.png',
  },
  {
    n: 2,
    art: 'https://media.base44.com/images/public/69e6bdb4986a04a256653a23/a1ae3e296_generated_image.png',
  },
  {
    n: 3,
    art: 'https://media.base44.com/images/public/69e6bdb4986a04a256653a23/2980b8aa8_generated_image.png',
  },
];

/**
 * A headline that begins with a figure must keep that figure in reading order.
 * In an RTL paragraph "5,000+" is a left-to-right run followed by a neutral "+",
 * which bidi otherwise moves to the wrong side of the number ("+5,000"). Isolating
 * the token keeps the approved wording exactly as designed.
 */
function Title({ text }) {
  const m = /^([\d][\d,.\s]*\+?)\s+(.+)$/.exec(text || '');
  if (!m) return text;
  return (
    <>
      <span dir="ltr" style={{ unicodeBidi: 'isolate' }}>{m[1].trim()}</span>
      {' '}
      {m[2]}
    </>
  );
}

export default function BenefitsBanner() {
  const { t, isRTL } = useLanguage();
  const [index, setIndex] = useState(0);
  const [dir, setDir] = useState(1);
  const [paused, setPaused] = useState(false);
  const [inView, setInView] = useState(true);
  const [visible, setVisible] = useState(true);
  const [reduced, setReduced] = useState(false);
  const [loaded, setLoaded] = useState(0);
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);

  const frameRef = useRef(null);
  const busyRef = useRef(false);
  const touchRef = useRef({ x: 0, y: 0, active: false, horiz: null });

  const ready = loaded >= SLIDES.length;

  /* ── Advance one slide. Locked for the length of the transition, so a swipe,
     a dot tap and the timer can never overlap each other. ── */
  const go = useCallback((delta) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setDir(delta > 0 ? 1 : -1);
    setIndex((i) => (i + delta + SLIDES.length) % SLIDES.length);
    setTimeout(() => { busyRef.current = false; }, ANIM_MS);
  }, []);

  /* ── Preload all three, so a change never reveals a half-loaded image. ── */
  useEffect(() => {
    let alive = true;
    SLIDES.forEach((s) => {
      const img = new Image();
      const done = () => { if (alive) setLoaded((n) => n + 1); };
      img.onload = done;
      img.onerror = done;
      img.src = s.art;
    });
    return () => { alive = false; };
  }, []);

  /* ── Motion preference ── */
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

  /* ── Visible tab ── */
  useEffect(() => {
    const sync = () => setVisible(!document.hidden);
    sync();
    document.addEventListener('visibilitychange', sync);
    return () => document.removeEventListener('visibilitychange', sync);
  }, []);

  /* ── On screen ── */
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

  /* ── ONE timer. Re-created on every change, so it always measures from the end
     of the last transition and no two timers can ever run side by side. ── */
  useEffect(() => {
    if (!ready || paused || reduced || !inView || !visible) return;
    const id = setTimeout(() => go(1), ANIM_MS + ROTATE_MS);
    return () => clearTimeout(id);
  }, [ready, paused, reduced, inView, visible, index, go]);

  /* ── Swipe. Horizontal only: a vertical gesture is left to the page, so this
     never blocks the screen's own scrolling. ── */
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
    setDragX(Math.max(-DRAG_MAX, Math.min(DRAG_MAX, dx * 0.55)));
  };
  const onTouchEnd = () => {
    const st = touchRef.current;
    st.active = false;
    setDragging(false);
    setDragX(0);
    if (st.horiz) {
      const dx = dragX;
      // Mirrored with the direction of travel: in RTL "next" is the opposite
      // physical swipe, and the slide enters from that same side.
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
      {/* ONE slide. The key replaces the node instead of layering a second one
          beside it, so no two texts can ever share the frame. */}
      <div
        key={index}
        className="j-ben-slide"
        style={{
          transform: `translateX(${dragX}px)`,
          transition: dragging ? 'none' : 'transform 240ms cubic-bezier(0.32,0.72,0,1)',
          '--j-ben-from': `${enterFrom}px`,
        }}
      >
        <div className="j-ben-text">
          <span className="j-ben-head">
            <span className="j-ben-title"><Title text={t(`ben_s${slide.n}_title`)} /></span>
            <span className="j-ben-underline" aria-hidden="true" />
          </span>
          <span className="j-ben-body"><Title text={t(`ben_s${slide.n}_body`)} /></span>
        </div>
        <div className="j-ben-art">
          <img src={slide.art} alt="" aria-hidden="true" draggable="false" />
        </div>
      </div>

      <div className="j-ben-dots">{dots}</div>

      <style>{`
        .j-ben {
          position: relative;
          height: 118px;
          overflow: hidden;
          border-radius: 20px;
          border: 1px solid rgba(26,111,212,0.10);
          isolation: isolate;
          -webkit-tap-highlight-color: transparent;
          touch-action: pan-y;
        }
        .j-ben-s1 { background: linear-gradient(100deg, #e7f1fd 0%, #f2f8ff 62%, #f9fcff 100%); }
        .j-ben-s2 { background: linear-gradient(100deg, #fff7dc 0%, #fffae8 62%, #fffdf4 100%); }
        .j-ben-s3 { background: linear-gradient(100deg, #e6e6f8 0%, #f0f0fc 62%, #f8f8ff 100%); }

        /* The frame clips and the slide fills it, so a change can never show a
           half-slide and the height can never jump. */
        .j-ben-slide {
          position: absolute;
          inset: 0;
          padding: 12px 14px 26px;
          display: flex;
          flex-direction: row;
          align-items: center;
          gap: 4px;
          will-change: transform, opacity;
          /* backwards, never both: a forwards fill would keep the animation's
             final transform applied and swallow the finger's drag offset. */
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
          text-align: start;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          justify-content: center;
        }
        .j-ben-head { display: inline-flex; flex-direction: column; align-items: flex-start; }
        .j-ben-title {
          font-size: 19px;
          font-weight: 900;
          line-height: 1.16;
          letter-spacing: -0.5px;
          color: #0c1a3f;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        /* The design's yellow brush underline, drawn as UI so it always sits
           exactly under the headline and never scales with an image. */
        .j-ben-underline {
          display: block;
          width: 100%;
          height: 5px;
          margin-top: 5px;
          border-radius: 999px;
          background: #ffd93d;
          transform: rotate(-0.9deg);
          transform-origin: start center;
        }
        .j-ben-body {
          margin-top: 8px;
          font-size: 12.5px;
          font-weight: 600;
          line-height: 1.3;
          letter-spacing: -0.1px;
          color: #2b3f6b;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .j-ben-art {
          flex: 0 0 42%;
          max-width: 168px;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          pointer-events: none;
        }
        .j-ben-art img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          -webkit-user-select: none;
          user-select: none;
          /* Melts the illustration's own backdrop into the card, so it reads as
             one piece of art rather than a pasted rectangle. */
          -webkit-mask-image: radial-gradient(ellipse 76% 76% at 50% 52%, #000 54%, transparent 100%);
          mask-image: radial-gradient(ellipse 76% 76% at 50% 52%, #000 54%, transparent 100%);
        }

        .j-ben-dots {
          position: absolute;
          inset-inline: 0;
          bottom: 9px;
          z-index: 2;
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
        /* Tap target without painting a bigger dot. */
        .j-ben-dot::after { content: ''; position: absolute; inset: -9px; }
        .j-ben-dot-on { width: 14px; background: #1a6fd4; }

        @media (min-width: 720px) {
          .j-ben { height: 128px; }
          .j-ben-title { font-size: 22px; }
          .j-ben-body { font-size: 13.5px; }
          .j-ben-art { flex-basis: 36%; max-width: 200px; }
        }

        /* ── Dark mode: the tints invert so the card belongs to the dark page,
           while the illustration keeps its own light rendering, softened. ── */
        @media (prefers-color-scheme: dark) {
          .j-ben { border-color: rgba(255,255,255,0.07); }
          .j-ben-s1 { background: linear-gradient(100deg, #14243f 0%, #16263f 62%, #131f36 100%); }
          .j-ben-s2 { background: linear-gradient(100deg, #2a2416 0%, #262217 62%, #1e1c14 100%); }
          .j-ben-s3 { background: linear-gradient(100deg, #1e1f3d 0%, #202140 62%, #191a33 100%); }
          .j-ben-title { color: #f8fafc; }
          .j-ben-body { color: #b6c6dd; }
          .j-ben-art img { opacity: 0.95; }
          .j-ben-dot { background: rgba(255,255,255,0.24); }
          .j-ben-dot-on { background: #7db0f0; }
        }
      `}</style>
    </div>
  );
}