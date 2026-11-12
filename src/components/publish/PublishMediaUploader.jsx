import { useRef, useState } from 'react';
import { Loader2, X, Play, Camera, ImagePlus, Video } from 'lucide-react';
import { base44 } from '@/api/base44Client';

/**
 * PublishMediaUploader — photos and one video, as a toolbar INSIDE the
 * description box.
 *
 * ── WHY IT IS A TOOLBAR NOW ─────────────────────────────────────────────────
 * It used to be two large dashed tiles under the text, on a block of its own
 * with a "מדיה" heading and a divider. That cost a full screen-height of
 * scrolling to say one thing — "a photo is part of describing the job" — and it
 * read as a separate step bolted onto the description. It is now the row of
 * controls attached to the text box itself: two small pills and the thumbnails
 * they produce, in the same frame as the words. Nothing about the upload,
 * limits or the camera changed.
 *
 * ── WHY THERE ARE STILL TWO BUTTONS ─────────────────────────────────────────
 * A single <input accept="image/*,video/*"> with no `capture` attribute only
 * ever opens the GALLERY on Android — "I can only choose an existing photo, I
 * cannot take one". Capacitor launches the camera intent when, and only when,
 * the input carries `capture`. So the camera is its own input with
 * `capture="environment"` (the rear camera, the one that photographs a job) and
 * the gallery keeps the plain input.
 */
const MAX_IMAGES = 4;

export default function PublishMediaUploader({ images = [], videoUrl = '', onImagesChange, onVideoChange }) {
  const [uploading, setUploading] = useState(false);
  const galleryRef = useRef(null);
  const cameraRef = useRef(null);
  const videoRef = useRef(null);

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
      } else if (newImages.length < MAX_IMAGES) {
        newImages.push(file_url);
      }
    }
    onImagesChange(newImages);
    onVideoChange(newVideo);
    setUploading(false);
  };

  const removeImage = (idx) => onImagesChange(images.filter((_, i) => i !== idx));
  const hasMedia = images.length > 0 || !!videoUrl;

  const pill = {
    display: 'inline-flex', alignItems: 'center', gap: 5,
    height: 34, padding: '0 11px', borderRadius: 999,
    background: 'var(--surface-2)',
    border: '1px solid var(--border-1)',
    color: 'var(--brand-primary)',
    fontSize: 12, fontWeight: 800, cursor: 'pointer',
    minHeight: 'unset', minWidth: 'unset',
    WebkitTapHighlightColor: 'transparent',
  };

  const thumb = {
    position: 'relative', width: 46, height: 46, borderRadius: 11, overflow: 'hidden',
    border: '1px solid var(--border-2)', flexShrink: 0,
  };

  const removeBtn = {
    position: 'absolute', top: 2, insetInlineEnd: 2, width: 18, height: 18, borderRadius: '50%',
    background: 'rgba(0,0,0,0.6)', border: 'none', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    minHeight: 'unset', minWidth: 'unset',
  };

  return (
    <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border-1)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        <button type="button" onClick={() => cameraRef.current?.click()} disabled={uploading} style={pill}>
          <Camera size={14} strokeWidth={2.2} />
          צילום
        </button>
        <button type="button" onClick={() => videoRef.current?.click()} disabled={uploading} style={pill}>
          <Video size={14} strokeWidth={2.2} />
          וידאו
        </button>
        <button type="button" onClick={() => galleryRef.current?.click()} disabled={uploading} style={pill}>
          <ImagePlus size={14} strokeWidth={2.2} />
          העלאה
        </button>

        {uploading && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 700, color: 'var(--text-3)' }}>
            <Loader2 size={13} className="animate-spin" />
            מעלה...
          </span>
        )}

        <span style={{ flex: 1 }} />

        {!uploading && (
          <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-3)' }}>
            {images.length}/{MAX_IMAGES}
          </span>
        )}
      </div>

      {/* The media the publisher actually attached — same row, under the text */}
      {hasMedia && (
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', marginTop: 8, paddingBottom: 2 }}>
          {images.map((url, i) => (
            <div key={url + i} style={thumb}>
              <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <button type="button" onClick={() => removeImage(i)} style={removeBtn} aria-label="הסרה">
                <X size={11} color="white" />
              </button>
            </div>
          ))}
          {videoUrl && (
            <div style={{ ...thumb, background: '#000' }}>
              <video src={videoUrl} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.85 }} muted playsInline />
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                <Play size={14} color="white" fill="white" />
              </div>
              <button type="button" onClick={() => onVideoChange('')} style={removeBtn} aria-label="הסרה">
                <X size={11} color="white" />
              </button>
            </div>
          )}
        </div>
      )}

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
      {/* Video capture — `capture` with a video type is what opens the camera in
          RECORDING mode; the gallery input can only ever offer existing files. */}
      <input
        ref={videoRef}
        type="file"
        accept="video/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={e => { handleFiles(e.target.files); e.target.value = ''; }}
      />
    </div>
  );
}