import { useRef, useState } from 'react';
import { Loader2, X, Play, Camera, ImagePlus, Video } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import MediaLightbox from '@/components/MediaLightbox';
import { compressImage } from '@/lib/imageCompress';

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
  // Which attached item the viewer is showing (null = closed).
  const [viewerIndex, setViewerIndex] = useState(null);
  const galleryRef = useRef(null);
  const cameraRef = useRef(null);
  const videoRef = useRef(null);

  // ── WHY THE UPLOAD IS PARALLEL AND COMPRESSED ───────────────────────────────
  // It used to re-encode nothing and send ONE file at a time, waiting for each
  // to finish before starting the next. A phone photo is 3–12 MB, so two photos
  // meant two full uploads back to back — the "upload takes forever" wait was
  // almost entirely bytes in the request body.
  //
  // Two changes, no change in what ends up attached:
  //   · photos are downscaled to 1600px in the browser first (the same helper
  //     the chat already uses), which typically cuts the body by 80–95% and is
  //     visually identical everywhere a task photo is shown;
  //   · the files are prepared and uploaded in PARALLEL, so two photos cost the
  //     time of the larger one instead of the sum of both.
  // A failure still resets the spinner — it is shown in the toolbar, never lost.
  const handleFiles = async (files) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      const prepared = await Promise.all(Array.from(files).map((file) => (
        String(file.type || '').startsWith('image/') ? compressImage(file) : file
      )));
      const uploaded = await Promise.all(prepared.map(async (file) => {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        return { file_url, isVideo: String(file.type || '').startsWith('video/') };
      }));

      const newImages = [...images];
      let newVideo = videoUrl;
      for (const { file_url, isVideo } of uploaded) {
        if (isVideo) newVideo = file_url;
        else if (newImages.length < MAX_IMAGES) newImages.push(file_url);
      }
      onImagesChange(newImages);
      onVideoChange(newVideo);
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (idx) => onImagesChange(images.filter((_, i) => i !== idx));
  const hasMedia = images.length > 0 || !!videoUrl;

  // One list for the viewer: the photos in their order, then the video.
  const viewerItems = [
    ...images.map((url) => ({ url, type: 'image' })),
    ...(videoUrl ? [{ url: videoUrl, type: 'video' }] : []),
  ];

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
    minHeight: 'unset', minWidth: 'unset', zIndex: 1,
  };

  // The whole thumbnail is the button that opens the viewer.
  const thumbOpen = {
    position: 'absolute', inset: 0, padding: 0, border: 'none',
    background: 'transparent', cursor: 'zoom-in',
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
              <button
                type="button"
                onClick={() => setViewerIndex(i)}
                style={thumbOpen}
                aria-label="צפייה בתמונה"
              >
                <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </button>
              <button type="button" onClick={() => removeImage(i)} style={removeBtn} aria-label="הסרה">
                <X size={11} color="white" />
              </button>
            </div>
          ))}
          {videoUrl && (
            <div style={{ ...thumb, background: '#000' }}>
              <button
                type="button"
                onClick={() => setViewerIndex(images.length)}
                style={thumbOpen}
                aria-label="צפייה בווידאו"
              >
                <video src={videoUrl} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.85 }} muted playsInline />
                <Play size={14} color="white" fill="white" style={{ position: 'absolute' }} />
              </button>
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

      {/* Tapping an attached photo or video opens it full screen — the publisher
          can check what they actually attached instead of guessing from a 46px
          thumbnail, and swipe between the items. */}
      <MediaLightbox
        isOpen={viewerIndex !== null}
        items={viewerItems}
        initialIndex={viewerIndex || 0}
        onClose={() => setViewerIndex(null)}
      />
    </div>
  );
}