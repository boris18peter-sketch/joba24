import { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { createPortal } from 'react-dom';

export default function MediaLightbox({ isOpen, items = [], initialIndex = 0, onClose }) {
  const [index, setIndex] = useState(initialIndex);
  // A full-size photo can take a moment over mobile data — show progress instead
  // of a black screen so the wait is legible rather than looking broken.
  const [loaded, setLoaded] = useState(false);

  // Sync to the requested initial index whenever the lightbox (re)opens on a different item
  useEffect(() => {
    if (isOpen) setIndex(initialIndex);
  }, [isOpen, initialIndex]);

  useEffect(() => { setLoaded(false); }, [index, isOpen]);

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
        // Above the Task Detail sheet (1,000,000) and every popup (2,000,000).
        // The viewer is opened FROM the sheet, so any lower layer renders
        // BEHIND it — which is exactly why the media appeared not to open.
        zIndex: 3000000,
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
          top: 'max(54px, env(safe-area-inset-top))',
          left: 16,
          width: 40,
          height: 40,
          borderRadius: 10,
          background: 'rgba(15, 23, 42, 0.55)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255, 255, 255, 0.18)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          color: 'white',
          filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.4))',
          zIndex: 10,
        }}
      >
        <X size={20} />
      </button>

      <style>{`@keyframes lightboxSpin { to { transform: rotate(360deg); } }`}</style>

      {/* Media */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          maxWidth: '95vw',
          maxHeight: '95vh',
          minWidth: '70vw',
          minHeight: '35vh',
          borderRadius: 16,
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {!loaded && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex',
            alignItems: 'center', justifyContent: 'center', pointerEvents: 'none',
          }}>
            <div style={{
              width: 34, height: 34, borderRadius: '50%',
              border: '3px solid rgba(255,255,255,0.25)', borderTopColor: 'white',
              animation: 'lightboxSpin 0.8s linear infinite',
            }} />
          </div>
        )}
        {isVideo ? (
          <video
            src={item.url}
            controls
            autoPlay
            preload="auto"
            onLoadedData={() => setLoaded(true)}
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
            decoding="async"
            onLoad={() => setLoaded(true)}
            onError={() => setLoaded(true)}
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
              background: 'rgba(15, 23, 42, 0.55)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255, 255, 255, 0.18)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'white',
              filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.4))',
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
              background: 'rgba(15, 23, 42, 0.55)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255, 255, 255, 0.18)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'white',
              filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.4))',
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