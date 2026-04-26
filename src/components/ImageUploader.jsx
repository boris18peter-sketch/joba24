import { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Camera, X, Loader2 } from 'lucide-react';

export default function ImageUploader({ images = [], onChange }) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef();

  const handleFiles = async (files) => {
    if (!files?.length) return;
    setUploading(true);
    const uploaded = [];
    for (const file of Array.from(files).slice(0, 4 - images.length)) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      uploaded.push(file_url);
    }
    onChange([...images, ...uploaded]);
    setUploading(false);
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
        {images.length < 4 && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center gap-1 text-gray-400 hover:border-gray-400 hover:text-gray-500 transition-colors bg-gray-50"
          >
            {uploading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Camera className="w-5 h-5" />
                <span className="text-[10px] font-medium">הוסף תמונה</span>
              </>
            )}
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={e => handleFiles(e.target.files)}
      />
    </div>
  );
}