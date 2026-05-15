import { createPortal } from 'react-dom';
import { LogIn, X } from 'lucide-react';

export default function LoginPromptModal({ onLogin, onClose, type = 'apply' }) {
  const isPublish = type === 'publish';
  const title = isPublish ? 'פרסום משימה' : 'הגשת בקשה';
  const desc = isPublish 
    ? 'כדי לפרסם משימה חדשה, אתה צריך להתחבר או ליצור חשבון'
    : 'כדי להגיש בקשה לביצוע משימה, אתה צריך להתחבר או ליצור חשבון';
  const ctaText = isPublish ? '🚀 פרסם משימה' : '💼 הגש בקשה';

  return createPortal(
    <div style={{
      position: 'fixed', inset: 0, zIndex: 99999,
      background: 'rgba(5,15,40,0.65)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      backdropFilter: 'blur(6px)',
    }} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: '#fafbff',
        borderRadius: '28px 28px 0 0',
        width: '100%', maxWidth: 480,
        maxHeight: '94vh', overflowY: 'auto',
        boxShadow: '0 -16px 60px rgba(0,0,0,0.2)',
      }} dir="rtl">
        {/* Header */}
        <div style={{ padding: '24px 20px 0', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: 'linear-gradient(135deg,#1a6fd4,#0a52b0)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <LogIn size={24} color="white" strokeWidth={1.8} />
              </div>
              <div>
                <div style={{ fontSize: 19, fontWeight: 800, color: '#0f1e40', letterSpacing: -0.3 }}>התחבר לJoba24</div>
                <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 400, marginTop: 2 }}>
                  כדי {isPublish ? 'לפרסם משימות' : 'להגיש בקשות'}
                </div>
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{ width: 34, height: 34, borderRadius: 11, background: '#f0f2f7', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
            <X size={16} color="#9ca3af" />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '0 20px 24px' }}>
          {/* Info card */}
          <div style={{ background: '#eff6ff', border: '1.5px solid #bfdbfe', borderRadius: 14, padding: '16px 14px', marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#0f2b6b', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 18 }}>✨</span> {title}
            </div>
            <div style={{ fontSize: 13, color: '#1e40af', lineHeight: 1.6 }}>
              {desc}
            </div>
          </div>

          {/* Benefits */}
          <div style={{ background: '#f8faff', border: '1px solid #e5e9f5', borderRadius: 14, padding: '14px', marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 10 }}>
              באתר שלנו
            </div>
            {[
              { icon: '🔒', text: 'אמינות מלאה — כל המשתמשים מאומתים' },
              { icon: '💰', text: 'תשלום מאובטח — הכסף מוחזק בנאמנות' },
              { icon: '⭐', text: 'קהילה דורגת — עובדים ומעסיקים אמינים' },
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: i < 2 ? 10 : 0 }}>
                <span style={{ fontSize: 16 }}>{item.icon}</span>
                <span style={{ fontSize: 12, color: '#4b5563', fontWeight: 500, lineHeight: 1.5 }}>{item.text}</span>
              </div>
            ))}
          </div>

          {/* CTA */}
          <button
            onClick={onLogin}
            style={{
              width: '100%', height: 52, borderRadius: 14,
              background: 'linear-gradient(135deg,#1a6fd4,#0a52b0)',
              color: 'white', fontWeight: 900, fontSize: 15,
              border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              letterSpacing: 0.2,
              boxShadow: '0 4px 20px rgba(26,111,212,0.3)',
              marginBottom: 10,
            }}
          >
            <LogIn size={18} strokeWidth={1.8} /> התחבר / הצטרף עכשיו
          </button>

          {/* Footer */}
          <div style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center', lineHeight: 1.6 }}>
            Google · Apple · אימייל — בחינם לחלוטין
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}