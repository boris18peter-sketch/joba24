import { useRef, useState } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import MediaLightbox from '@/components/MediaLightbox';

/**
 * ProfileAvatar — the profile picture, in one place.
 *
 * Tapping it opens the photo full size (the primary photo plus any extra profile
 * photos, swipeable). When `editable`, a small camera button replaces the main
 * photo instead — so enlarging and replacing are two separate, unambiguous
 * actions rather than one tap that does something the visitor did not expect.
 */
export default function ProfileAvatar({
  user,
  size = 80,
  editable = false,
  onUpload,
  uploading = false,
  background = 'rgba(255,255,255,0.15)',
  borderColor = 'rgba(255,255,255,0.3)',
  textColor = 'white',
  textSize = 28,
  accent = 'var(--brand-primary)',
}) {
  const inputRef = useRef(null);
  const [lightbox, setLightbox] = useState(null);

  const photos = [user?.profile_photo, ...(user?.profile_photos || [])].filter(Boolean);
  const initials = (user?.full_name || '').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';

  // A small, proportional mark on the rim of the picture — not a button sitting
  // on top of it. The global `button` rule in index.css enforces a 44px minimum
  // tap target, so the size below only takes effect TOGETHER WITH the
  // `j-icon-btn` class on the button (which clears that minimum and restores the
  // full tap area invisibly through ::after). Without the class the circle
  // rendered at 44px and covered most of the photo.
  const badgeSize = Math.max(12, Math.round(size * 0.18));
  const badgeIcon = Math.max(8, Math.round(badgeSize * 0.7));

  return (
    <>
      <div style={{ position: 'relative' }}>
        <div
          onClick={() => {
            if (photos.length) setLightbox(0);
            else if (editable) inputRef.current?.click();
          }}
          style={{
            width: size, height: size, borderRadius: '50%',
            background,
            border: `3px solid ${borderColor}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: textSize, fontWeight: 900, color: textColor,
            overflow: 'hidden',
            cursor: photos.length || editable ? 'pointer' : 'default',
            boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
          }}
        >
          {photos[0]
            ? <img src={photos[0]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : initials}
        </div>

        {photos.length > 1 && (
          <div style={{ position: 'absolute', bottom: 0, left: 0, background: 'rgba(0,0,0,0.55)', color: 'white', fontSize: 10, fontWeight: 800, borderRadius: 99, padding: '1px 7px' }}>
            {photos.length}
          </div>
        )}

        {editable && (
          <button
            className="j-icon-btn"
            onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
            aria-label="Change photo"
            style={{ position: 'absolute', bottom: -3, right: -3, width: badgeSize, height: badgeSize, borderRadius: '50%', background: '#fff', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0, boxShadow: '0 0 0 1px rgba(0,0,0,0.07), 0 1px 3px rgba(0,0,0,0.2)' }}
          >
            {uploading
              ? <Loader2 size={badgeIcon} color={accent} className="animate-spin" />
              : <Camera size={badgeIcon} color={accent} />}
          </button>
        )}
      </div>

      {editable && (
        <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={onUpload} />
      )}

      <MediaLightbox
        isOpen={lightbox !== null}
        items={photos.map(url => ({ type: 'image', url }))}
        initialIndex={lightbox ?? 0}
        onClose={() => setLightbox(null)}
      />
    </>
  );
}