import { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { createPortal } from 'react-dom';

export default function MediaLightbox({ isOpen, items = [], initialIndex = 0, onClose }) {
  const [index, setIndex] = useState(initialIndex);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') setIndex(i => (i - 1 + items.length) % items.length);
      if (e.key === 'ArrowRight') setIndex(i => (i + 1) % items.length);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, items.length, onClose]);

  if (!isOpen || !items.length) return null;

  const item = items[index];
  const isVideo = item.type === 'video';

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: 'rgba(0, 0, 0, 0.95)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backdropFilter: 'blur(10px)',
      }}
      onClick={onClose}
    >
      <button
        onClick={onClose}
        style={{
          position: 'absolute',
          top: 16,
          left: 16,
          width: 40,
          height: 40,
          borderRadius: 10,
          background: 'rgba(255, 255, 255, 0.1)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          color: 'white',
          zIndex: 10,
        }}
      >
        <X size={20} />
      </button>

      {/* Media */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          maxWidth: '95vw',
          maxHeight: '95vh',
          borderRadius: 16,
          overflow: 'hidden',
        }}
      >
        {isVideo ? (
          <video
            src={item.url}
            controls
            autoPlay
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              background: '#000',
            }}
          />
        ) : (
          <img
            src={item.url}
            alt=""
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              background: '#000',
            }}
          />
        )}
      </div>

      {/* Navigation */}
      {items.length > 1 && (
        <>
          <button
            onClick={e => {
              e.stopPropagation();
              setIndex(i => (i - 1 + items.length) % items.length);
            }}
            style={{
              position: 'absolute',
              left: 16,
              width: 40,
              height: 40,
              borderRadius: 10,
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'white',
            }}
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={e => {
              e.stopPropagation();
              setIndex(i => (i + 1) % items.length);
            }}
            style={{
              position: 'absolute',
              right: 16,
              width: 40,
              height: 40,
              borderRadius: 10,
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'white',
            }}
          >
            <ChevronRight size={20} />
          </button>

          {/* Counter */}
          <div
            style={{
              position: 'absolute',
              bottom: 16,
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'rgba(0, 0, 0, 0.6)',
              color: 'white',
              padding: '6px 12px',
              borderRadius: 20,
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            {index + 1} / {items.length}
          </div>
        </>
      )}
    </div>,
    document.body
  );
}