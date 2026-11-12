import { useRef, useState } from 'react';
import { Plus, Loader2, X, Play, Camera } from 'lucide-react';
import { base44 } from '@/api/base44Client';

/**
 * PublishMediaUploader — photos and one video, on the description step.
 *
 * ── WHY THERE ARE TWO BUTTONS ───────────────────────────────────────────────
 * There was one: a single <input accept="image/*,video/*"> with no `capture`
 * attribute. On Android the WebView only hands a file input the GALLERY, so a
 * publisher standing in front of the broken thing he needs fixed could only pick
 * a photo he had already taken — "on Android I can only choose an existing photo,
 * I cannot take one". It is not a device-version limitation: Capacitor's own file
 * chooser launches the camera intent when, and only when, the input carries
 * `capture`, and the manifest patch already grants both the CAMERA permission and
 * the intent visibility that makes `resolveActivity` succeed.
 *
 * So the camera is its own input with `capture="environment"` — the rear camera,
 * which is the one that photographs a job — and its own button. Gallery keeps the
 * plain input, so both routes are one press away and neither hides the other.
 */
export default function PublishMediaUploader({ images = [], videoUrl = '', onImagesChange, onVideoChange, t }) {
  const [uploading, setUploading] = useState(false);
  const galleryRef = useRef(null);
  const cameraRef = useRef(null);

  const handleFiles = async (files) => {
    if (!files?.length) return;
    setUploading(true);
    const newImages = [...images];
    let newVideo = videoUrl;
    for (const file of Array.from(files)) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      if (file.type.startsWith('video/')) {
        newVideo = file_url;
        onVideoChange(file_url);
      } else {
        if (newImages.length < 4) newImages.push(file_url);
      }
    }
    onImagesChange(newImages);
    onVideoChange(newVideo);
    setUploading(false);
  };

  const removeImage = (idx) => onImagesChange(images.filter((_, i) => i !== idx));
  const hasMedia = images.length > 0 || videoUrl;

  const tileStyle = {
    position: 'relative', aspectRatio: '1', borderRadius: 12, overflow: 'hidden',
    border: '1.5px solid #dce8f5',
  };
  const removeStyle = {
    position: 'absolute', top: 4, insetInlineEnd: 4, width: 22, height: 22, borderRadius: '50%',
    background: 'rgba(0,0,0,0.55)', border: 'none', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    minHeight: 'unset', minWidth: 'unset',
  };

  return (
    <div>
      {hasMedia && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 10 }}>
          {images.map((url, i) => (
            <div key={i} style={tileStyle}>
              <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <button onClick={() => removeImage(i)} style={removeStyle} aria-label="הסרה">
                <X size={12} color="white" />
              </button>
            </div>
          ))}
          {videoUrl && (
            <div style={{ ...tileStyle, background: '#000' }}>
              <video src={videoUrl} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.8 }} />
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                <Play size={18} color="white" fill="white" />
              </div>
              <button onClick={() => onVideoChange('')} style={removeStyle} aria-label="הסרה">
                <X size={12} color="white" />
              </button>
            </div>
          )}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {/* Gallery — photos and a video that already exist on the phone */}
        <button
          type="button"
          onClick={() => galleryRef.current?.click()}
          disabled={uploading}
          style={{
            borderRadius: 16, border: '2px dashed var(--border-2)', background: '#f0f7ff',
            cursor: uploading ? 'not-allowed' : 'pointer', padding: '18px 6px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 7,
          }}
        >
          {uploading
            ? <Loader2 size={22} className="animate-spin" color="var(--brand-primary)" />
            : <Plus size={22} color="var(--brand-primary)" strokeWidth={2.5} />}
          <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--brand-primary)', textAlign: 'center', lineHeight: 1.3 }}>
            {t('add_photos_video')}
          </span>
        </button>

        {/* Camera — `capture` is what makes Android open the camera at all */}
        <button
          type="button"
          onClick={() => cameraRef.current?.click()}
          disabled={uploading}
          style={{
            borderRadius: 16, border: '2px dashed var(--border-2)', background: '#f0f7ff',
            cursor: uploading ? 'not-allowed' : 'pointer', padding: '18px 6px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 7,
          }}
        >
          <Camera size={22} color="var(--brand-primary)" strokeWidth={2.2} />
          <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--brand-primary)', textAlign: 'center', lineHeight: 1.3 }}>
            צילום תמונה
          </span>
        </button>
      </div>

      <input
        ref={galleryRef}
        type="file"
        accept="image/*,video/*"
        multiple
        style={{ display: 'none' }}
        onChange={e => { handleFiles(e.target.files); e.target.value = ''; }}
      />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={e => { handleFiles(e.target.files); e.target.value = ''; }}
      />
    </div>
  );
}