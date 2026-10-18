import { useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/lib/LanguageContext';

const MAX_PHOTOS = 6;

/**
 * ProfilePhotosEditor — add or remove the extra profile photos.
 *
 * These sit alongside the main profile photo and are what the avatar lightbox
 * swipes through. Images only, capped, and stored publicly because the whole
 * point is that other users can see them on the public profile.
 */
export default function ProfilePhotosEditor({ photos = [], onChange }) {
  const { t } = useLanguage();
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (inputRef.current) inputRef.current.value = '';
    if (!files.length) return;

    const room = MAX_PHOTOS - photos.length;
    if (room <= 0) { toast.error(t('pph_too_many', { n: MAX_PHOTOS })); return; }

    setUploading(true);
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
    setUploading(false);
  };

  const remove = (url) => onChange(photos.filter(p => p !== url));

  return (
    <>
      <div className="pph-scroll" style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none' }}>
        <style>{`.pph-scroll::-webkit-scrollbar{display:none}`}</style>

        {photos.length < MAX_PHOTOS && (
          <button
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            style={{ flexShrink: 0, width: 104, height: 104, borderRadius: 14, border: '2px dashed var(--border-2)', background: 'var(--surface-3)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, cursor: 'pointer', color: 'var(--brand-primary)' }}
          >
            {uploading ? <Loader2 size={20} className="animate-spin" /> : <><Plus size={22} /><span style={{ fontSize: 12, fontWeight: 700 }}>{t('pph_add')}</span></>}
          </button>
        )}

        {photos.map((url) => (
          <div key={url} style={{ position: 'relative', flexShrink: 0, width: 104, height: 104, borderRadius: 14, overflow: 'hidden', border: '1px solid var(--border-1)' }}>
            <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            <button
              onClick={() => remove(url)}
              style={{ position: 'absolute', top: 6, left: 6, width: 26, height: 26, borderRadius: 8, background: 'rgba(0,0,0,0.6)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            >
              <Trash2 size={13} color="white" />
            </button>
          </div>
        ))}
      </div>

      <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 10, lineHeight: 1.5 }}>
        {t('pph_hint', { n: MAX_PHOTOS })}
      </div>

      <input ref={inputRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleUpload} />
    </>
  );
}