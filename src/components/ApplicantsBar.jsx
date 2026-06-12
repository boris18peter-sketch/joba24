import { Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ApplicantsBar({ pendingCount, onNavigate }) {
  if (!pendingCount || pendingCount === 0) return null;

  const handleClick = () => {
    if (onNavigate) onNavigate();
  };

  return (
    <div style={{ padding: '12px 16px 8px', background: 'linear-gradient(135deg, #1a6fd4 0%, #0a52b0 100%)' }}>
      <button
        onClick={handleClick}
        style={{
          width: '100%',
          height: 46,
          borderRadius: 14,
          background: '#fbbf24',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          fontWeight: 900,
          fontSize: 15,
          color: '#1a3a6b',
          boxShadow: '0 4px 12px rgba(251,191,36,0.35)',
          transition: 'all 0.15s cubic-bezier(0.16,1,0.3,1)',
          WebkitTapHighlightColor: 'transparent',
          touchAction: 'manipulation',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.02)';
          e.currentTarget.style.boxShadow = '0 6px 20px rgba(251,191,36,0.5)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(251,191,36,0.35)';
        }}
        onTouchStart={(e) => {
          e.currentTarget.style.transform = 'scale(0.98)';
        }}
        onTouchEnd={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
        }}
      >
        <Users size={18} />
        <span>{pendingCount} בקשה{pendingCount > 1 ? 'ות' : ''} — לחץ לצפייה</span>
        <span style={{ marginLeft: 'auto', fontSize: 20, lineHeight: 1 }}>●</span>
      </button>
    </div>
  );
}