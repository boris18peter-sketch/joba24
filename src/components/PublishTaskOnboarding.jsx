import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';

const BUBBLES = [
  { emoji: '🔧', label: 'תיקון ברז', price: '₪80',   delay: 0,   x: '8%'  },
  { emoji: '🧹', label: 'ניקיון',     price: '₪120',  delay: 0.5, x: '52%' },
  { emoji: '📦', label: 'העברת דירה', price: '₪300',  delay: 1.1, x: '28%' },
  { emoji: '🌿', label: 'גינון',      price: '₪150',  delay: 0.3, x: '68%' },
  { emoji: '🎨', label: 'צביעה',      price: '₪200',  delay: 0.8, x: '14%' },
  { emoji: '⚡',  label: 'חשמל',       price: '₪180',  delay: 1.4, x: '78%' },
  { emoji: '❄️', label: 'מיזוג אוויר', price: '₪250', delay: 0.2, x: '40%' },
  { emoji: '🚚', label: 'משלוח',      price: '₪90',   delay: 1.7, x: '60%' },
];

export default function PublishTaskOnboarding() {
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 60);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      dir="rtl"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '20px 24px 0',
        position: 'relative',
        overflow: 'hidden',
        minHeight: 'calc(100dvh - 110px)',
      }}
    >
      <style>{`
        @keyframes floatBubble {
          0%   { transform: translateY(100px) scale(0.88); opacity: 0; }
          12%  { opacity: 1; }
          88%  { opacity: 1; }
          100% { transform: translateY(-60px) scale(1); opacity: 0; }
        }
        @keyframes onboardPop {
          0%   { transform: scale(0.88); opacity: 0; }
          60%  { transform: scale(1.03); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes onboardSlide {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Main content — at the top */}
      <div style={{
        position: 'relative',
        zIndex: 1,
        textAlign: 'center',
        width: '100%',
        animation: visible ? 'onboardPop 0.45s ease-out both' : 'none',
      }}>
        <h1 style={{
          fontSize: 26,
          fontWeight: 900,
          color: 'var(--text-1)',
          margin: '0 0 8px',
          lineHeight: 1.3,
          animation: visible ? 'onboardSlide 0.45s 0.05s ease-out both' : 'none',
        }}>
          פרסם משימה
        </h1>

        <p style={{
          fontSize: 15,
          color: 'var(--text-2)',
          margin: '0 0 20px',
          lineHeight: 1.55,
          animation: visible ? 'onboardSlide 0.45s 0.12s ease-out both' : 'none',
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
            height: 54,
            borderRadius: 16,
            background: 'linear-gradient(135deg,#1a6fd4,#0a52b0)',
            color: 'white',
            fontWeight: 900,
            fontSize: 17,
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 8px 24px rgba(26,111,212,0.38)',
            animation: visible ? 'onboardSlide 0.45s 0.2s ease-out both' : 'none',
          }}
        >
          <Plus size={20} strokeWidth={3} />
          פרסם משימה
        </button>
      </div>

      {/* Floating task bubbles — rise from below */}
      {BUBBLES.map((b, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            bottom: 0,
            right: b.x,
            animation: `floatBubble 4.2s ease-in-out ${b.delay + 0.4}s infinite`,
            pointerEvents: 'none',
            zIndex: 0,
          }}
        >
          <div style={{
            background: 'var(--surface-2)',
            border: '1px solid var(--border-1)',
            borderRadius: 18,
            padding: '7px 13px',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            boxShadow: '0 4px 14px rgba(0,0,0,0.08)',
            whiteSpace: 'nowrap',
          }}>
            <span style={{ fontSize: 17 }}>{b.emoji}</span>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-1)' }}>{b.label}</div>
              <div style={{ fontSize: 11, color: '#1a6fd4', fontWeight: 700 }}>{b.price}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}