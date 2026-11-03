import { useEffect, useRef, useState } from 'react';
import { useLanguage } from '@/lib/LanguageContext';

/**
 * BenefitsBanner — the marketing banner at the top of the published-tasks empty
 * state. It appears ONLY there.
 *
 * ── ONE SLIDE IN THE DOM, ALWAYS ────────────────────────────────────────────
 * The previous version stacked all three slides and cross-faded them, so during
 * a change two sets of text occupied the same box and visibly overlapped. Now
 * exactly ONE slide is mounted, keyed by its index: the outgoing text is removed
 * in the same commit the incoming one is added, so two titles can never be on
 * screen at the same time. Only the incoming slide animates (a short fade with a
 * few pixels of travel), inside a frame that clips with `overflow: hidden`.
 *
 * ── WHAT IT CLAIMS ──────────────────────────────────────────────────────────
 * The brief's numbered versions ("5,000+ professionals", "10 minutes on average")
 * are NOT used: neither figure is verified anywhere in the product (there is no
 * active-professional count and no measured offer time). The copy stays
 * non-numeric instead. The AI slide keeps its wording because that capability
 * does exist — it prices a task from its description in the publish form.
 *
 * ── MOTION ──────────────────────────────────────────────────────────────────
 *  • one interval, re-created only when the pause state changes (no build-up);
 *  • paused while touched, while hovered, while off screen (IntersectionObserver)
 *    and while the page is hidden (visibilitychange);
 *  • not started at all under prefers-reduced-motion — the dots still switch.
 */
const ROTATE_MS = 6000;
const HEIGHT = 118;

const SLIDES = [
  {
    key: 1,
    art: 'https://media.base44.com/images/public/69e6bdb4986a04a256653a23/755f4faec_generated_image.png',
  },
  {
    key: 2,
    art: 'https://media.base44.com/images/public/69e6bdb4986a04a256653a23/b024b51ba_generated_image.png',
  },
  {
    key: 3,
    art: 'https://media.base44.com/images/public/69e6bdb4986a04a256653a23/f3a695b10_generated_image.png',
  },
];

export default function BenefitsBanner() {
  const { t, isRTL } = useLanguage();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [inView, setInView] = useState(true);
  const [reduced, setReduced] = useState(false);
  const frameRef = useRef(null);
  const touchRef = useRef({ x: 0, y: 0 });
  const movedRef = useRef(false);

  // Device motion preference — read once, then kept in step.
  useEffect(() => {
    const mq = typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia('(prefers-reduced-motion: reduce)')
      : null;
    if (!mq) return;
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener ? mq.addEventListener('change', sync) : mq.addListener(sync);
    return () => {
      mq.removeEventListener ? mq.removeEventListener('change', sync) : mq.removeListener(sync);
    };
  }, []);

  // Off screen → no rotation. Keeps the banner from changing while the visitor
  // is reading something else, and costs nothing while it is not visible.
  useEffect(() => {
    const el = frameRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      (entries) => setInView(entries.some((e) => e.isIntersecting)),
      { threshold: 0.2 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // One interval. Cleared on every dependency change, so no two timers can run
  // side by side and advance the slide twice.
  useEffect(() => {
    if (paused || reduced || !inView) return;
    const id = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      setIndex((i) => (i + 1) % SLIDES.length);
    }, ROTATE_MS);
    return () => clearInterval(id);
  }, [paused, reduced, inView]);

  const onTouchStart = (e) => {
    const p = e.touches[0];
    touchRef.current = { x: p.clientX, y: p.clientY };
    movedRef.current = false;
    setPaused(true);
  };
  const onTouchMove = (e) => {
    const p = e.touches[0];
    if (Math.abs(p.clientX - touchRef.current.x) + Math.abs(p.clientY - touchRef.current.y) > 8) {
      movedRef.current = true;
    }
  };
  const onTouchEnd = (e) => {
    const p = e.changedTouches[0];
    const dx = p.clientX - touchRef.current.x;
    const dy = p.clientY - touchRef.current.y;
    // A horizontal swipe only — a vertical one is the page scrolling.
    if (Math.abs(dx) > 34 && Math.abs(dx) > Math.abs(dy)) {
      setIndex((i) => (dx < 0 ? (i + 1) % SLIDES.length : (i - 1 + SLIDES.length) % SLIDES.length));
    }
    setPaused(false);
  };

  const slide = SLIDES[index];

  return (
    <div
      ref={frameRef}
      className={`j-ben j-ben-s${slide.key}${reduced ? ' j-ben-still' : ''}`}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      dir={isRTL ? 'rtl' : 'ltr'}
      role="group"
      aria-roledescription="carousel"
    >
      {/* Exactly one slide is mounted. The key is the index, so a change replaces
          the node instead of layering a second one beside it. */}
      <div key={index} className="j-ben-slide">
        <div className="j-ben-text">
          <div className="j-ben-title">{t(`ben_s${slide.key}_title`)}</div>
          <div className="j-ben-body">{t(`ben_s${slide.key}_body`)}</div>
        </div>
        <div className="j-ben-art">
          <img src={slide.art} alt="" aria-hidden="true" draggable="false" loading="lazy" />
        </div>
      </div>

      <div className="j-ben-dots">
        {SLIDES.map((s, i) => (
          <button
            key={s.key}
            type="button"
            onClick={() => setIndex(i)}
            aria-label={`${i + 1} / ${SLIDES.length}`}
            aria-current={i === index ? 'true' : undefined}
            className={i === index ? 'j-ben-dot j-ben-dot-on' : 'j-ben-dot'}
          />
        ))}
      </div>

      <style>{`
        .j-ben {
          position: relative;
          height: ${HEIGHT}px;
          overflow: hidden;
          border-radius: 20px;
          border: 1px solid rgba(26,111,212,0.10);
          isolation: isolate;
          -webkit-tap-highlight-color: transparent;
        }
        /* One soft tint per message, fading to the surface at the text edge so
           the card still belongs to the page. */
        .j-ben-s1 { background: linear-gradient(105deg, #e4eeff 0%, #f0f6ff 58%, #f7fbff 100%); }
        .j-ben-s2 { background: linear-gradient(105deg, #fdf0cf 0%, #fff8e6 58%, #fffdf6 100%); }
        .j-ben-s3 { background: linear-gradient(105deg, #e6e8ff 0%, #f1f2ff 58%, #f8f9ff 100%); }

        .j-ben-slide {
          position: absolute;
          inset: 0;
          /* Room at the bottom for the dots, so text never sits under them. */
          padding: 12px 16px 24px;
          display: flex;
          flex-direction: row;
          align-items: center;
          gap: 6px;
          animation: jBenIn 380ms cubic-bezier(0.32, 0.72, 0, 1) both;
        }
        @keyframes jBenIn {
          from { opacity: 0; transform: translateY(7px); }
          to   { opacity: 1; transform: none; }
        }
        .j-ben-still .j-ben-slide { animation: none; }
        .j-ben-still .j-ben-dot { transition: none; }

        .j-ben-text {
          flex: 1 1 0;
          min-width: 0;
          text-align: start;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }
        .j-ben-title {
          font-size: 20px;
          font-weight: 900;
          line-height: 1.16;
          letter-spacing: -0.55px;
          color: #0d1e40;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .j-ben-body {
          margin-top: 5px;
          font-size: 12.5px;
          font-weight: 600;
          line-height: 1.32;
          letter-spacing: -0.1px;
          color: #4b6083;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        /* The illustration keeps its own light backdrop; the radial mask melts
           that backdrop into the card so it reads as one piece of art rather
           than a pasted square. */
        .j-ben-art {
          flex: 0 0 41%;
          max-width: 158px;
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
          width: 5px;
          height: 5px;
          padding: 0;
          min-width: unset;
          min-height: unset;
          border: none;
          border-radius: 999px;
          cursor: pointer;
          background: rgba(13,30,64,0.20);
          transition: width 240ms ease, background 240ms ease;
        }
        /* The tap target is enlarged without painting a bigger dot. */
        .j-ben-dot::after { content: ''; position: absolute; inset: -9px; }
        .j-ben-dot { position: relative; }
        .j-ben-dot-on { width: 14px; background: #1a6fd4; }

        @media (min-width: 720px) {
          .j-ben { height: 128px; }
          .j-ben-title { font-size: 23px; }
          .j-ben-body { font-size: 13.5px; }
          .j-ben-art { flex-basis: 36%; max-width: 190px; }
        }

        /* ── Dark mode ──────────────────────────────────────────────────────
           The tints are inverted rather than kept light, so the card sits on the
           dark page instead of glowing out of it. The illustrations keep their
           light backdrop (they are rendered art), softened so they do not blaze. */
        @media (prefers-color-scheme: dark) {
          .j-ben { border-color: rgba(255,255,255,0.07); }
          .j-ben-s1 { background: linear-gradient(105deg, #14243f 0%, #16263f 60%, #131f36 100%); }
          .j-ben-s2 { background: linear-gradient(105deg, #2a2416 0%, #262217 60%, #1e1c14 100%); }
          .j-ben-s3 { background: linear-gradient(105deg, #1e1f3d 0%, #202140 60%, #191a33 100%); }
          .j-ben-title { color: #f8fafc; }
          .j-ben-body { color: #b6c6dd; }
          .j-ben-art img { opacity: 0.94; }
          .j-ben-dot { background: rgba(255,255,255,0.24); }
          .j-ben-dot-on { background: #7db0f0; }
        }
      `}</style>
    </div>
  );
}