import { useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { Plus } from 'lucide-react';

// Floating task bubbles animation
const BUBBLES = [
  { emoji: '🔧', label: 'תיקון ברז', price: '₪80', delay: 0, x: '10%' },
  { emoji: '🧹', label: 'ניקיון', price: '₪120', delay: 0.6, x: '55%' },
  { emoji: '📦', label: 'העברת דירה', price: '₪300', delay: 1.2, x: '30%' },
  { emoji: '🌿', label: 'גינון', price: '₪150', delay: 0.3, x: '70%' },
  { emoji: '🎨', label: 'צביעה', price: '₪200', delay: 0.9, x: '15%' },
];

export default function PublishTaskOnboarding() {
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      dir="rtl"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 'calc(100dvh - 160px)',
        padding: '0 24px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <style>{`
        @keyframes floatBubble {
          0%   { transform: translateY(120px) scale(0.85); opacity: 0; }
          15%  { opacity: 1; }
          85%  { opacity: 1; }
          100% { transform: translateY(-80px) scale(1); opacity: 0; }
        }
        @keyframes onboardPop {
          0%   { transform: scale(0.88); opacity: 0; }
          60%  { transform: scale(1.04); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes onboardSlide {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Floating task bubbles */}
      {BUBBLES.map((b, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            bottom: 0,
            right: b.x,
            animation: `floatBubble 4.5s ease-in-out ${b.delay + 0.5}s infinite`,
            pointerEvents: 'none',
            zIndex: 0,
          }}
        >
          <div style={{
            background: 'var(--surface-2)',
            border: '1px solid var(--border-1)',
            borderRadius: 20,
            padding: '8px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
            whiteSpace: 'nowrap',
          }}>
            <span style={{ fontSize: 18 }}>{b.emoji}</span>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-1)' }}>{b.label}</div>
              <div style={{ fontSize: 11, color: '#1a6fd4', fontWeight: 700 }}>{b.price}</div>
            </div>
          </div>
        </div>
      ))}

      {/* Main content */}
      <div style={{
        position: 'relative',
        zIndex: 1,
        textAlign: 'center',
        animation: visible ? 'onboardPop 0.5s ease-out both' : 'none',
      }}>
        {/* Icon */}
        <div style={{
          width: 88,
          height: 88,
          borderRadius: 28,
          background: 'linear-gradient(135deg,#1a6fd4,#0a52b0)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 24px',
          boxShadow: '0 16px 40px rgba(26,111,212,0.35)',
        }}>
          <span style={{ fontSize: 44 }}>📋</span>
        </div>

        <h1 style={{
          fontSize: 26,
          fontWeight: 900,
          color: 'var(--text-1)',
          margin: '0 0 12px',
          lineHeight: 1.3,
          animation: visible ? 'onboardSlide 0.5s 0.1s ease-out both' : 'none',
        }}>
          פרסם משימה
        </h1>

        <p style={{
          fontSize: 15,
          color: 'var(--text-2)',
          margin: '0 0 36px',
          lineHeight: 1.6,
          maxWidth: 280,
          animation: visible ? 'onboardSlide 0.5s 0.2s ease-out both' : 'none',
        }}>
          קבל עזרה מאנשים בסביבתך תוך דקות.<br />
          פרסם עכשיו — זה פשוט ומהיר.
        </p>

        <button
          onClick={() => navigate('/create-task')}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            width: '100%',
            maxWidth: 280,
            height: 56,
            borderRadius: 18,
            background: 'linear-gradient(135deg,#1a6fd4,#0a52b0)',
            color: 'white',
            fontWeight: 900,
            fontSize: 17,
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 8px 28px rgba(26,111,212,0.4)',
            margin: '0 auto',
            animation: visible ? 'onboardSlide 0.5s 0.3s ease-out both' : 'none',
          }}
        >
          <Plus size={20} strokeWidth={3} />
          פרסם משימה
        </button>
      </div>
    </div>
  );
}