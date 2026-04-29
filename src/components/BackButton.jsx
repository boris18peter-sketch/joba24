import { ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

/**
 * Unified back button — use everywhere for consistent design.
 * Props:
 *   to: optional explicit path (default: navigate(-1))
 *   style: optional override styles
 */
export default function BackButton({ to, style }) {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => to ? navigate(to) : navigate(-1)}
      style={{
        width: 40,
        height: 40,
        borderRadius: 14,
        background: 'white',
        border: '1.5px solid #dce8f5',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        cursor: 'pointer',
        boxShadow: '0 2px 8px rgba(26,111,212,0.08)',
        transition: 'all 0.15s',
        ...style,
      }}
      onMouseDown={e => e.currentTarget.style.transform = 'scale(0.93)'}
      onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
      onTouchStart={e => e.currentTarget.style.transform = 'scale(0.93)'}
      onTouchEnd={e => e.currentTarget.style.transform = 'scale(1)'}
    >
      <ArrowRight size={18} color="#1a6fd4" />
    </button>
  );
}