import { useState, useRef } from 'react';
import { Camera, Upload, X, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';

/**
 * Lets the worker upload/take a photo as proof of completion.
 * Props:
 *   onPhotoUploaded(url) — called when photo is ready
 *   photoUrl — current value
 */
export default function WorkerCompletionPhoto({ onPhotoUploaded, photoUrl }) {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef();

  const handleFile = async (file) => {
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    onPhotoUploaded(file_url);
    setUploading(false);
  };

  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: '#065f46', marginBottom: 8 }}>
        📸 צרף תמונת הוכחה לסיום (מומלץ)
      </div>

      {photoUrl ? (
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <img src={photoUrl} alt="completion" style={{ width: '100%', height: 160, objectFit: 'cover', borderRadius: 14, border: '2px solid #bbf7d0' }} />
          <button
            onClick={() => onPhotoUploaded(null)}
            style={{ position: 'absolute', top: 6, left: 6, width: 28, height: 28, borderRadius: '50%', background: 'rgba(0,0,0,0.55)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <X size={14} color="white" />
          </button>
          <div style={{ position: 'absolute', bottom: 6, right: 6, background: '#10b981', borderRadius: 8, padding: '3px 8px', fontSize: 11, fontWeight: 700, color: 'white' }}>
            ✓ תמונה צורפה
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => { fileRef.current.accept = 'image/*'; fileRef.current.capture = 'environment'; fileRef.current.click(); }}
            disabled={uploading}
            style={{ flex: 1, height: 48, borderRadius: 14, border: '1.5px dashed #6ee7b7', background: '#f0fdf4', color: '#059669', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
          >
            {uploading ? <Loader2 size={16} className="animate-spin" /> : <><Camera size={16} />צלם</>}
          </button>
          <button
            onClick={() => { fileRef.current.capture = ''; fileRef.current.accept = 'image/*'; fileRef.current.click(); }}
            disabled={uploading}
            style={{ flex: 1, height: 48, borderRadius: 14, border: '1.5px dashed #6ee7b7', background: '#f0fdf4', color: '#059669', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
          >
            <Upload size={16} />העלה
          </button>
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={e => handleFile(e.target.files[0])}
      />
    </div>
  );
}