import { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Video, X, Loader2, Play } from 'lucide-react';

export default function VideoUploader({ videoUrl, onChange }) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef();

  const handleFile = async (file) => {
    if (!file) return;
    if (!file.type.startsWith('video/')) {
      alert('יש להעלות קובץ וידאו בלבד');
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      alert('הסרטון חייב להיות קטן מ-50MB');
      return;
    }
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    onChange(file_url);
    setUploading(false);
  };

  const remove = () => onChange('');

  return (
    <div>
      {videoUrl ? (
        <div style={{ position: 'relative', borderRadius: 14, overflow: 'hidden', background: '#000', border: '1px solid #dce8f5' }}>
          <video
            src={videoUrl}
            controls
            style={{ width: '100%', maxHeight: 200, display: 'block', objectFit: 'cover' }}
          />
          <button
            onClick={remove}
            style={{ position: 'absolute', top: 8, left: 8, width: 28, height: 28, borderRadius: '50%', background: 'rgba(0,0,0,0.7)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <X size={14} color="white" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          style={{
            width: '100%', padding: '20px 16px', borderRadius: 14,
            border: '2px dashed #c7d9f5', background: '#f4f7fb',
            cursor: uploading ? 'not-allowed' : 'pointer',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
            color: '#94a3b8',
          }}
        >
          {uploading ? (
            <>
              <Loader2 size={24} className="animate-spin" style={{ color: '#1a6fd4' }} />
              <span style={{ fontSize: 13, color: '#1a6fd4', fontWeight: 600 }}>מעלה סרטון...</span>
            </>
          ) : (
            <>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Video size={22} color="#1a6fd4" />
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#0f2b6b' }}>הוסף סרטון</div>
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>MP4, MOV עד 50MB</div>
              </div>
            </>
          )}
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="video/*"
        style={{ display: 'none' }}
        onChange={e => handleFile(e.target.files?.[0])}
      />
    </div>
  );
}