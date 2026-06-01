import { ArrowRight } from 'lucide-react';
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
        width: 28,
        height: 28,
        borderRadius: 10,
        background: 'white',
        border: '1.5px solid #dce8f5',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        cursor: 'pointer',
        boxShadow: '0 2px 8px rgba(26,111,212,0.08)',
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
      <ArrowRight size={14} color={iconColor || '#1a6fd4'} />
    </button>
  );
}