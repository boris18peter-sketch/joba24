import { useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, Trash2, Loader2, Video, X } from 'lucide-react';
import { toast } from 'sonner';

export default function ProfileMediaGallery({ media = [], isEditing, onChange }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [lightbox, setLightbox] = useState(null);

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    try {
      const uploaded = [];
      for (const file of files) {
        if (file.size > 50 * 1024 * 1024) {
          toast.error(`${file.name} גדול מדי (מקסימום 50MB)`);
          continue;
        }
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        uploaded.push({ type: file.type.startsWith('video/') ? 'video' : 'image', url: file_url });
      }
      if (uploaded.length) onChange([...(media || []), ...uploaded]);
    } catch {
      toast.error('שגיאה בהעלאת מדיה');
    }
    setUploading(false);
    if (inputRef.current) inputRef.current.value = '';
  };

  const removeItem = (url) => onChange((media || []).filter(m => m.url !== url));
  const allMedia = media || [];

  if (!isEditing && allMedia.length === 0) return null;

  return (
    <>
      <div className="profile-media-scroll" style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none' }}>
        <style>{`.profile-media-scroll::-webkit-scrollbar{display:none}`}</style>
        {allMedia.map(item => (
          <div key={item.url} style={{ position: 'relative', flexShrink: 0, width: 130, height: 130, borderRadius: 14, overflow: 'hidden', border: '1px solid var(--border-1)', background: '#000' }}>
            {item.type === 'video' ? (
              <video src={item.url} onClick={() => !isEditing && setLightbox(item)} style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: isEditing ? 'default' : 'pointer' }} />
            ) : (
              <img src={item.url} alt="" onClick={() => !isEditing && setLightbox(item)} style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: isEditing ? 'default' : 'pointer' }} />
            )}
            {isEditing && (
              <button onClick={() => removeItem(item.url)} style={{ position: 'absolute', top: 6, left: 6, width: 26, height: 26, borderRadius: 8, background: 'rgba(0,0,0,0.6)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <Trash2 size={13} color="white" />
              </button>
            )}
            {item.type === 'video' && !isEditing && (
              <div style={{ position: 'absolute', bottom: 6, right: 6, width: 24, height: 24, borderRadius: 8, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                <Video size={12} color="white" />
              </div>
            )}
          </div>
        ))}
        {isEditing && (
          <button onClick={() => inputRef.current?.click()} disabled={uploading}
            style={{ flexShrink: 0, width: 130, height: 130, borderRadius: 14, border: '2px dashed var(--border-2)', background: 'var(--surface-3)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, cursor: 'pointer', color: '#1a6fd4' }}>
            {uploading ? <Loader2 size={20} className="animate-spin" /> : <><Plus size={22} /><span style={{ fontSize: 12, fontWeight: 700 }}>הוסף מדיה</span></>}
          </button>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/*,video/*" multiple style={{ display: 'none' }} onChange={handleUpload} />
      {lightbox && (
        <div onClick={() => setLightbox(null)} style={{ position: 'fixed', inset: 0, zIndex: 999999, background: 'rgba(0,0,0,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <button onClick={(e) => { e.stopPropagation(); setLightbox(null); }} style={{ position: 'absolute', top: 16, left: 16, width: 38, height: 38, borderRadius: 12, background: 'rgba(255,255,255,0.15)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <X size={20} color="white" />
          </button>
          {lightbox.type === 'video' ? (
            <video src={lightbox.url} controls autoPlay onClick={e => e.stopPropagation()} style={{ maxWidth: '95%', maxHeight: '90vh' }} />
          ) : (
            <img src={lightbox.url} alt="" onClick={e => e.stopPropagation()} style={{ maxWidth: '95%', maxHeight: '90vh', objectFit: 'contain' }} />
          )}
        </div>
      )}
    </>
  );
}