import { useState } from 'react';
import SlideFrame from '@/components/onboarding/SlideFrame';

/**
 * Real Joba24 captures, presented at the largest size the slide can give them.
 *
 * A capture is either a plain URL (shown whole, at its own aspect ratio) or an
 * object `{ src, ratio, focus }` — a FOCUSED view: the panel takes `ratio`, the
 * picture covers it, and `focus` picks which band survives. That is how a tall
 * full-screen capture is shown as the one section the step is actually about,
 * instead of a whole phone screen shrunk until nothing in it can be read. The
 * crop is vertical only, so nothing is ever cut off across the width.
 *
 * One capture: the panel hugs the picture's own ratio, so there is no empty
 * margin inside a box bigger than the picture; it is capped only when the slide
 * runs out of height, and `contain` then fits it without cropping or stretching.
 *
 * Several captures: stacked in a scrollable column on a phone, side by side from
 * 820px up where the row has the width for both.
 */
function normalize(shot) {
  return typeof shot === 'string' ? { src: shot } : shot;
}

function Shot({ shot }) {
  const { src, ratio, focus } = normalize(shot);

  if (ratio) {
    return (
      <img
        src={src}
        alt=""
        style={{
          width: '100%',
          aspectRatio: String(ratio),
          objectFit: 'cover',
          objectPosition: focus || 'center',
          display: 'block',
        }}
      />
    );
  }

  return <img src={src} alt="" style={{ width: '100%', height: 'auto', display: 'block' }} />;
}

function SingleCapture({ shot }) {
  const { src, ratio: fixed } = normalize(shot);
  const [natural, setNatural] = useState(0);
  const ratio = fixed || natural;

  return (
    <SlideFrame fill={false} style={ratio ? { aspectRatio: String(ratio) } : { minHeight: 180 }}>
      <img
        src={src}
        alt=""
        onLoad={(e) => {
          const el = e.target;
          if (el.naturalWidth && el.naturalHeight) setNatural(el.naturalWidth / el.naturalHeight);
        }}
        style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
      />
    </SlideFrame>
  );
}

export default function ScreenshotShowcase({ shots = [] }) {
  if (shots.length === 0) return null;
  if (shots.length === 1) return <SingleCapture shot={shots[0]} />;

  return (
    <SlideFrame fill={false}>
      <style>{`
        .j-shots {
          flex: 1; min-height: 0;
          display: flex; flex-direction: column; gap: 14px;
          padding: 14px;
          overflow-y: auto; overflow-x: hidden;
          overscroll-behavior: contain;
          -webkit-overflow-scrolling: touch;
        }
        .j-shots > img { flex-shrink: 0; }
        @media (min-width: 820px) {
          .j-shots { flex-direction: row; align-items: center; gap: 22px; padding: 20px; overflow: visible; }
          .j-shots > img { flex: 1 1 0; min-width: 0; }
        }
      `}</style>
      <div className="j-shots">
        {shots.map((shot) => (
          <Shot key={normalize(shot).src} shot={shot} />
        ))}
      </div>
    </SlideFrame>
  );
}