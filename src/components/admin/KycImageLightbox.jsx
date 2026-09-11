import { createPortal } from 'react-dom';
import { X, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';
import { useState } from 'react';

/**
 * Full-screen image lightbox for reviewing KYC / ID photos.
 * Supports zoom and rotate for examining ID documents closely.
 */
export default function KycImageLightbox({ imageUrl, userName, onClose }) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  if (!imageUrl) return null;

  return createPortal(
    <div
      dir="rtl"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 999999,
        background: 'rgba(0,0,0,0.92)',
        display: 'flex', flexDirection: 'column',
        backdropFilter: 'blur(4px)',
      }}
    >
      {/* Top bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 16px', paddingTop: 'max(12px, env(safe-area-inset-top))',
        background: 'rgba(0,0,0,0.5)',
      }}>
        <div style={{ color: 'white', fontSize: 14, fontWeight: 700 }}>
          {userName || 'תעודת זהות'}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setZoom(z => Math.max(1, z - 0.5))}
            style={iconBtnStyle}
          >
            <ZoomOut size={18} color="white" />
          </button>
          <span style={{ color: 'white', fontSize: 12, fontWeight: 700, alignSelf: 'center', minWidth: 40, textAlign: 'center' }}>
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom(z => Math.min(4, z + 0.5))}
            style={iconBtnStyle}
          >
            <ZoomIn size={18} color="white" />
          </button>
          <button
            onClick={() => setRotation(r => r + 90)}
            style={iconBtnStyle}
          >
            <RotateCw size={18} color="white" />
          </button>
          <button onClick={onClose} style={iconBtnStyle}>
            <X size={20} color="white" />
          </button>
        </div>
      </div>

      {/* Image */}
      <div
        style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'auto', padding: 20,
        }}
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <img
          src={imageUrl}
          alt="תעודת זהות"
          style={{
            maxWidth: '95%',
            maxHeight: '95%',
            objectFit: 'contain',
            transform: `scale(${zoom}) rotate(${rotation}deg)`,
            transition: 'transform 0.2s ease',
            borderRadius: 8,
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          }}
        />
      </div>
    </div>,
    document.body
  );
}

const iconBtnStyle = {
  width: 40, height: 40, borderRadius: 10,
  background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  cursor: 'pointer', flexShrink: 0,
};