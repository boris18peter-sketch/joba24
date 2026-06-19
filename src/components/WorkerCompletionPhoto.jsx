import { useState, useRef } from 'react';
import { Camera, X, Loader2, Play, Plus } from 'lucide-react';
import { base44 } from '@/api/base44Client';

/**
 * WorkerCompletionPhoto — multiple photos + optional video
 * Props:
 *   photos: string[]
 *   videoUrl: string
 *   onPhotosChange(newPhotos: string[])
 *   onVideoChange(url: string)
 */
export default function WorkerCompletionPhoto({ photos = [], videoUrl = '', onPhotosChange, onVideoChange }) {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef();

  const handleFiles = async (files) => {
    if (!files?.length) return;
    setUploading(true);
    const newPhotos = [...photos];
    let newVideo = videoUrl;

    for (const file of Array.from(files)) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      if (file.type.startsWith('video/')) {
        newVideo = file_url;
      } else {
        if (newPhotos.length < 6) newPhotos.push(file_url);
      }
    }

    onPhotosChange?.(newPhotos);
    onVideoChange?.(newVideo);
    setUploading(false);
  };

  const removePhoto = (idx) => {
    const next = photos.filter((_, i) => i !== idx);
    onPhotosChange?.(next);
  };

  const hasMedia = photos.length > 0 || videoUrl;

  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: '#065f46', marginBottom: 8 }}>
        📸 צרף תמונות / סרטון הוכחה (מומלץ)
      </div>

      {/* Gallery grid */}
      {hasMedia && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 8 }}>
          {photos.map((url, i) => (
            <div key={i} style={{ position: 'relative', aspectRatio: '1', borderRadius: 10, overflow: 'hidden', border: '2px solid #bbf7d0' }}>
              <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <button
                onClick={() => removePhoto(i)}
                style={{ position: 'absolute', top: 3, right: 3, width: 20, height: 20, borderRadius: '50%', background: 'rgba(0,0,0,0.6)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={11} color="white" />
              </button>
            </div>
          ))}
          {videoUrl && (
            <div style={{ position: 'relative', aspectRatio: '1', borderRadius: 10, overflow: 'hidden', background: '#000', border: '2px solid #bbf7d0' }}>
              <video src={videoUrl} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.8 }} />
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Play size={16} color="white" fill="white" />
              </div>
              <button
                onClick={() => onVideoChange?.('')}
                style={{ position: 'absolute', top: 3, right: 3, width: 20, height: 20, borderRadius: '50%', background: 'rgba(0,0,0,0.6)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={11} color="white" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Add button */}
      {(photos.length < 6 && !videoUrl) || photos.length < 6 ? (
        <button
          onClick={() => { fileRef.current.click(); }}
          disabled={uploading}
          style={{ width: '100%', height: 48, borderRadius: 14, border: '1.5px dashed #6ee7b7', background: '#f0fdf4', color: '#059669', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
        >
          {uploading ? <Loader2 size={16} className="animate-spin" /> : <><Plus size={16} /> הוסף תמונה / סרטון</>}
        </button>
      ) : null}

      <input
        ref={fileRef}
        type="file"
        accept="image/*,video/*"
        multiple
        style={{ display: 'none' }}
        onChange={e => handleFiles(e.target.files)}
      />
    </div>
  );
}