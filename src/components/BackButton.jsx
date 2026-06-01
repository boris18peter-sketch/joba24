import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

/**
 * Unified back button — use everywhere for consistent design.
 * Props:
 *   to: optional explicit path (default: navigate(-1))
 *   style: optional override styles
 */
export default function BackButton({ to, style, iconColor }) {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => to ? navigate(to) : navigate(-1)}
      style={{
        height: 34,
        paddingInline: '10px 12px',
        borderRadius: 12,
        background: 'white',
        border: '1.5px solid #dce8f5',
        display: 'flex',
        alignItems: 'center',
        gap: 5,
        flexShrink: 0,
        cursor: 'pointer',
        boxShadow: '0 2px 8px rgba(26,111,212,0.10)',
        transition: 'transform 0.15s',
        position: 'relative',
        zIndex: 10,
        WebkitTapHighlightColor: 'transparent',
        touchAction: 'manipulation',
        ...style,
      }}
      onPointerDown={e => { e.currentTarget.style.transform = 'scale(0.93)'; }}
      onPointerUp={e => { e.currentTarget.style.transform = 'scale(1)'; }}
      onPointerLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
    >
      <ArrowLeft size={14} color={iconColor || '#1a6fd4'} />
      <span style={{ fontSize: 13, fontWeight: 700, color: iconColor || '#1a6fd4' }}>חזור</span>
    </button>
  );
}