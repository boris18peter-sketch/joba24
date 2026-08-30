import { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Camera, Image as ImageIcon, X, Loader2 } from 'lucide-react';

// Two explicit entry points — a dedicated "צלם" (camera) button using the
// `capture` attribute (opens the device camera directly on both iOS and
// Android) and a "גלריה" button for picking existing photos.
//
// Why two buttons: a bare <input accept="image/*"> on some Android WebViews
// only shows gallery apps and omits the camera option. The `capture` attribute
// guarantees a camera entry on Android, and on iOS it opens the camera
// directly. The camera permission (NSCameraUsageDescription) is declared in
// Info.plist so iOS no longer crashes when the camera is invoked.
export default function ImageUploader({ images = [], onChange, max = 4 }) {
  const [uploading, setUploading] = useState(false);
  const galleryRef = useRef();
  const cameraRef = useRef();

  const handleFiles = async (files) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      const uploaded = [];
      for (const file of Array.from(files).slice(0, max - images.length)) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        uploaded.push(file_url);
      }
      onChange([...images, ...uploaded]);
    } finally {
      setUploading(false);
      // reset so the same file can be selected/shot again
      if (cameraRef.current) cameraRef.current.value = '';
      if (galleryRef.current) galleryRef.current.value = '';
    }
  };

  const remove = (url) => onChange(images.filter(i => i !== url));

  return (
    <div className="space-y-2">
      <div className="flex gap-2 flex-wrap">
        {images.map(url => (
          <div key={url} className="relative w-20 h-20 rounded-xl overflow-hidden border border-gray-200">
            <img src={url} alt="" className="w-full h-full object-cover" />
            <button
              onClick={() => remove(url)}
              className="absolute top-1 left-1 w-5 h-5 bg-black/70 rounded-full flex items-center justify-center"
            >
              <X className="w-3 h-3 text-white" />
            </button>
          </div>
        ))}
        {images.length < max && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => cameraRef.current?.click()}
              disabled={uploading}
              className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center gap-1 text-gray-500 hover:border-gray-400 hover:text-gray-600 transition-colors bg-gray-50 disabled:opacity-60"
            >
              {uploading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Camera className="w-5 h-5" />
                  <span className="text-[10px] font-medium">צלם</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => galleryRef.current?.click()}
              disabled={uploading}
              className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center gap-1 text-gray-500 hover:border-gray-400 hover:text-gray-600 transition-colors bg-gray-50 disabled:opacity-60"
            >
              {uploading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <ImageIcon className="w-5 h-5" />
                  <span className="text-[10px] font-medium">גלריה</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
      {/* Camera — opens the device camera directly (capture attribute) */}
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={e => handleFiles(e.target.files)}
      />
      {/* Gallery — pick one or more existing photos */}
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={e => handleFiles(e.target.files)}
      />
    </div>
  );
}