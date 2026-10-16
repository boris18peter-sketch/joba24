/**
 * Real Joba24 captures inside the shared preview stage.
 *
 * `contain` — a capture is shown WHOLE, at its own aspect ratio: never cropped,
 * never stretched. That is the only treatment used here, so a capture that is a
 * focused slice of a form and a capture that is a whole phone screen are both
 * readable.
 *
 * One capture fills the stage; several share it — stacked on a phone, side by
 * side from 820px up where the row has the width for both.
 */
function normalize(shot) {
  return typeof shot === 'string' ? { src: shot } : shot;
}

export default function ScreenshotShowcase({ shots = [] }) {
  if (shots.length === 0) return null;

  return (
    <div className="j-shotstage">
      {shots.map((shot) => {
        const { src } = normalize(shot);
        return (
          <div key={src} className="j-shotslot">
            <img className="j-shot" src={src} alt="" />
          </div>
        );
      })}
    </div>
  );
}