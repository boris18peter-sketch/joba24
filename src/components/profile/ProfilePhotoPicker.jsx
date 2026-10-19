import { useRef, useState } from 'react';
import { Camera, Loader2, Plus, Trash2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { useLanguage } from '@/lib/LanguageContext';

const MAX_PHOTOS = 6;

/**
 * ProfilePhotoPicker — the profile picture and its extra photos, in ONE compact
 * control, sitting right where the picture is.
 *
 * Two things were wrong with the old arrangement on the edit screen:
 *
 *   1. The camera badge was sized off a floor of its own, so on a small avatar
 *      it read as a second circle fighting the picture for attention instead of
 *      a small badge on its rim. It is now purely proportional to the circle.
 *
 *   2. The extra profile photos lived in their own card further down the page,
 *      directly above the separate "media gallery" — two photo uploaders with no
 *      visual tie to the picture they belong to. The add button now sits BESIDE
 *      the profile picture, so "these are the photos of this face" is obvious.
 *
 * The main photo is changed through the camera badge; the extra photos through
 * the button next to it. Both are stored publicly — they are the whole point of
 * the profile and other users see them.
 */
export default function ProfilePhotoPicker({
  user,
  size = 60,
  editable = true,
  onUpload,
  uploading = false,
  photos = [],
  onChange,
}) {
  const { t } = useLanguage();
  const mainRef = useRef(null);
  const extraRef = useRef(null);
  const [busy, setBusy] = useState(false);

  const mainPhoto = user?.profile_photo;
  const initials = (user?.full_name || '').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';
  const room = MAX_PHOTOS - photos.length;

  // Purely proportional — no floor of its own, so the badge can never outgrow
  // the circle it sits on. The glyph keeps a small floor so it stays readable.
  const badge = Math.max(17, Math.round(size * 0.28));
  const badgeIcon = Math.max(9, Math.round(badge * 0.52));

  const addPhotos = async (e) => {
    const files = Array.from(e.target.files || []);
    if (extraRef.current) extraRef.current.value = '';
    if (!files.length) return;
    if (room <= 0) { toast.error(t('pph_too_many', { n: MAX_PHOTOS })); return; }
    setBusy(true);
    try {
      const added = [];
      for (const file of files.slice(0, room)) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        added.push(file_url);
      }
      if (added.length) onChange([...photos, ...added]);
    } catch {
      toast.error(t('pph_upload_error'));
    }
    setBusy(false);
  };

  const circle = (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      <div style={{
        width: size, height: size, borderRadius: '50%', overflow: 'hidden',
        background: 'var(--surface-3)',
        border: '2px solid var(--border-1)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: Math.round(size * 0.36), fontWeight: 900, color: 'var(--text-2)',
      }}>
        {mainPhoto
          ? <img src={mainPhoto} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : initials}
      </div>

      {editable && (
        <button
          onClick={() => mainRef.current?.click()}
          aria-label={t('pph_title')}
          style={{
            position: 'absolute', bottom: -1, left: -1,
            width: badge, height: badge, borderRadius: '50%',
            background: 'var(--surface-2)',
            border: '1.5px solid var(--brand-primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', padding: 0,
            boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
          }}
        >
          {uploading
            ? <Loader2 size={badgeIcon} color="var(--brand-primary)" className="animate-spin" />
            : <Camera size={badgeIcon} color="var(--brand-primary)" />}
        </button>
      )}
    </div>
  );

  if (!editable) return circle;

  return (
    <div style={{ width: '100%', maxWidth: 400 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        {circle}

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--text-1)' }}>{t('pph_title')}</div>
          <div style={{ fontSize: 11.5, color: 'var(--text-3)', lineHeight: 1.5, marginTop: 3 }}>
            {t('pph_hint', { n: MAX_PHOTOS })}
          </div>

          {room > 0 && (
            <button
              onClick={() => extraRef.current?.click()}
              disabled={busy}
              style={{
                marginTop: 9, height: 34, paddingInline: 14, borderRadius: 10,
                background: 'var(--brand-primary-light)',
                border: '1px solid var(--border-2)',
                color: 'var(--brand-primary)',
                fontWeight: 800, fontSize: 12.5, cursor: busy ? 'not-allowed' : 'pointer',
                display: 'inline-flex', alignItems: 'center', gap: 6,
              }}
            >
              {busy ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
              {t('pph_add')}
            </button>
          )}
        </div>
      </div>

      {photos.length > 0 && (
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginTop: 12, paddingBottom: 2, scrollbarWidth: 'none' }}>
          {photos.map((url) => (
            <div key={url} style={{ position: 'relative', flexShrink: 0, width: 54, height: 54, borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border-1)' }}>
              <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <button
                onClick={() => onChange(photos.filter(p => p !== url))}
                aria-label="remove"
                style={{ position: 'absolute', top: 3, left: 3, width: 20, height: 20, borderRadius: 6, background: 'rgba(0,0,0,0.6)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}
              >
                <Trash2 size={11} color="white" />
              </button>
            </div>
          ))}
        </div>
      )}

      <input ref={mainRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={onUpload} />
      <input ref={extraRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={addPhotos} />
    </div>
  );
}