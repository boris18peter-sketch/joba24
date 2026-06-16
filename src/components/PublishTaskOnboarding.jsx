import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { useLanguage } from '@/lib/LanguageContext';

const BUBBLES = [
  { emoji: '🔧', label: 'תיקון ברז',     price: '₪80',  delay: 0,    x: '2%'  },
  { emoji: '🧹', label: 'ניקיון',         price: '₪120', delay: 0.5,  x: '20%' },
  { emoji: '📦', label: 'העברת דירה',    price: '₪300', delay: 1.1,  x: '45%' },
  { emoji: '🌿', label: 'גינון',          price: '₪150', delay: 0.3,  x: '65%' },
  { emoji: '🎨', label: 'צביעה',          price: '₪200', delay: 0.8,  x: '12%' },
  { emoji: '⚡',  label: 'חשמל',           price: '₪180', delay: 1.4,  x: '78%' },
  { emoji: '❄️', label: 'מיזוג אוויר',   price: '₪250', delay: 0.2,  x: '35%' },
  { emoji: '🚚', label: 'משלוח',          price: '₪90',  delay: 1.7,  x: '55%' },
  { emoji: '🔐', label: 'מנעולן',         price: '₪150', delay: 0.7,  x: '8%'  },
  { emoji: '🛍️', label: 'קניות',         price: '₪70',  delay: 1.3,  x: '72%' },
  { emoji: '👶', label: 'בייביסיטר',     price: '₪60',  delay: 0.9,  x: '25%' },
  { emoji: '📚', label: 'הוראה',          price: '₪110', delay: 1.6,  x: '50%' },
  { emoji: '💻', label: 'IT',             price: '₪200', delay: 0.4,  x: '85%' },
  { emoji: '🚗', label: 'נסיעה',          price: '₪100', delay: 2.0,  x: '15%' },
  { emoji: '🏠', label: 'עבודות בית',     price: '₪160', delay: 1.2,  x: '40%' },
  { emoji: '🪚', label: 'נגרות',          price: '₪220', delay: 0.6,  x: '60%' },
  { emoji: '🔩', label: 'הרכבה',          price: '₪130', delay: 1.8,  x: '30%' },
  { emoji: '📸', label: 'צילום',          price: '₪350', delay: 0.15, x: '75%' },
  { emoji: '🐕', label: 'טיפול בכלב',    price: '₪80',  delay: 0.1,  x: '48%' },
  { emoji: '🍳', label: 'בישול',          price: '₪150', delay: 1.5,  x: '22%' },
  { emoji: '🌊', label: 'בריכה',          price: '₪180', delay: 1.0,  x: '88%' },
  { emoji: '🎭', label: 'אנימציה',        price: '₪280', delay: 2.2,  x: '5%'  },
];

export default function PublishTaskOnboarding() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 60);
    return () => clearTimeout(t);
  }, []);

  return (
    <div dir="rtl" style={{ padding: '16px 20px 0', display: 'flex', flexDirection: 'column' }}>
      <style>{`
        @keyframes floatBubble {
          0%   { transform: translateY(0) scale(0.88); opacity: 0; }
          12%  { opacity: 1; }
          88%  { opacity: 1; }
          100% { transform: translateY(-220px) scale(1); opacity: 0; }
        }
        @keyframes onboardSlide {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Text + Button */}
      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <h1 style={{
          fontSize: 24,
          fontWeight: 900,
          color: 'var(--text-1)',
          margin: '0 0 6px',
          lineHeight: 1.3,
          animation: visible ? 'onboardSlide 0.4s ease-out both' : 'none',
        }}>
          {t('publish_task_onboard_title')}
        </h1>
        <p style={{
          fontSize: 14,
          color: 'var(--text-2)',
          margin: '0 0 16px',
          lineHeight: 1.5,
          animation: visible ? 'onboardSlide 0.4s 0.08s ease-out both' : 'none',
        }}>
          {t('publish_task_onboard_sub')}
        </p>
        <button
          onClick={() => navigate('/create-task')}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            width: '100%',
            height: 52,
            borderRadius: 16,
            background: 'linear-gradient(135deg,#1a6fd4,#0a52b0)',
            color: 'white',
            fontWeight: 900,
            fontSize: 16,
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 8px 24px rgba(26,111,212,0.38)',
            animation: visible ? 'onboardSlide 0.4s 0.16s ease-out both' : 'none',
          }}
        >
          <Plus size={20} strokeWidth={3} />
          {t('post_task_btn')}
        </button>
      </div>

      {/* Bubble zone — fixed height, bubbles float up from bottom */}
      <div style={{ position: 'relative', height: 240, overflow: 'hidden' }}>
        {BUBBLES.map((b, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              bottom: 0,
              left: b.x,
              animation: `floatBubble 4.5s ease-in-out ${b.delay + 0.2}s infinite`,
              pointerEvents: 'none',
            }}
          >
            <div style={{
              background: 'var(--surface-2)',
              border: '1px solid var(--border-1)',
              borderRadius: 16,
              padding: '6px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              boxShadow: '0 3px 12px rgba(0,0,0,0.07)',
              whiteSpace: 'nowrap',
            }}>
              <span style={{ fontSize: 16 }}>{b.emoji}</span>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-1)' }}>{b.label}</div>
                <div style={{ fontSize: 10, color: '#1a6fd4', fontWeight: 700 }}>{b.price}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}