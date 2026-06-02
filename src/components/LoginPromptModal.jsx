import { createPortal } from 'react-dom';
import { X, Lock, Sparkles, Zap, Mail } from 'lucide-react';
import { base44 } from '@/api/base44Client';

function ProviderButton({ icon, label, onClick, bg, color, border }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', height: 52, borderRadius: 16,
        background: bg || 'white',
        color: color || '#1a1a1a',
        fontWeight: 700, fontSize: 15,
        border: `1.5px solid ${border || '#e8edf5'}`,
        cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        transition: 'opacity 0.15s',
      }}
      onPointerDown={e => { e.currentTarget.style.opacity = '0.8'; }}
      onPointerUp={e => { e.currentTarget.style.opacity = '1'; }}
      onPointerLeave={e => { e.currentTarget.style.opacity = '1'; }}
    >
      {icon}
      {label}
    </button>
  );
}

export default function LoginPromptModal({ onLogin, onClose, type = 'apply' }) {
  const redirectUrl = window.location.href;

  const handleGoogle = () => base44.auth.loginWithProvider('google', redirectUrl);
  const handleApple = () => base44.auth.loginWithProvider('apple', redirectUrl);
  const handleFacebook = () => base44.auth.loginWithProvider('facebook', redirectUrl);
  const handleEmail = () => base44.auth.redirectToLogin(redirectUrl);
  const isPublish = type === 'publish';

  const modal = (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 999999,
        background: 'rgba(5,15,40,0.72)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        backdropFilter: 'blur(8px)',
        touchAction: 'none',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      onPointerDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
    >
      <div
        style={{
          background: 'linear-gradient(180deg, #fafbff 0%, #f4f7fb 100%)',
          borderRadius: '32px 32px 0 0',
          width: '100%', maxWidth: 480,
          maxHeight: '95vh', overflowY: 'auto',
          boxShadow: '0 -24px 120px rgba(0,0,0,0.3)',
          paddingBottom: 'max(28px, env(safe-area-inset-bottom))',
        }}
        dir="rtl"
      >
        {/* Drag handle */}
        <div style={{ width: 40, height: 4, borderRadius: 99, background: '#dde4ef', margin: '14px auto 0' }} />

        {/* Header */}
        <div style={{ padding: '20px 20px 0', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 52, height: 52, borderRadius: 18,
              background: 'linear-gradient(135deg,#059669,#047857)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              boxShadow: '0 8px 28px rgba(5,150,105,0.4)',
            }}>
              <Sparkles size={24} color="white" strokeWidth={1.8} />
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 900, color: '#0f1e40', letterSpacing: -0.8 }}>
                בואו נתחיל 🚀
              </div>
              <div style={{ fontSize: 13, color: '#64748b', marginTop: 3, fontWeight: 500 }}>
                {isPublish ? 'לפרסום משימות דחופות' : 'לקבלת עבודה בקרוב'}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 34, height: 34, borderRadius: 11, background: '#f3f4f6',
              border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', flexShrink: 0,
            }}
          >
            <X size={16} color="#9ca3af" />
          </button>
        </div>

        <div style={{ padding: '20px 20px 0' }}>

          {/* Headline + benefits box */}
          <div style={{
            background: 'linear-gradient(135deg, #eff6ff 0%, #f0fdf4 100%)',
            borderRadius: 22, padding: '20px 18px', marginBottom: 18,
            border: '1.5px solid #c7e9c0',
            boxShadow: '0 4px 20px rgba(5,150,105,0.08)',
          }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#0f2b6b', marginBottom: 14, lineHeight: 1.6 }}>
              הצטרפו לקהילה של אלפי אנשים שמפרסמים ומבצעים משימות זמינות
            </div>

            <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
              <div style={{
                width: 22, height: 22, borderRadius: 11, background: '#059669', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{ color: 'white', fontSize: 13, fontWeight: 800, lineHeight: 1 }}>✓</span>
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#0f1e40', marginBottom: 2 }}>צריך עזרה בהקדם?</div>
                <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.5 }}>פרסם משימה תוך 30 שניות וקבל בקשות מעובדים</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{
                width: 22, height: 22, borderRadius: 11, background: '#059669', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{ color: 'white', fontSize: 13, fontWeight: 800, lineHeight: 1 }}>✓</span>
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#0f1e40', marginBottom: 2 }}>רוצה להרוויח כסף?</div>
                <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.5 }}>בחר משימות בסביבתך וקבל תשלום תוך כמה שעות</div>
              </div>
            </div>
          </div>

          {/* Trust badges */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 20 }}>
            {[
              { Icon: Lock, label: 'בטוח 100%', sub: 'מאומת' },
              { Icon: Zap, label: 'מהיר', sub: 'תוך דקות' },
              { Icon: Sparkles, label: 'קל', sub: 'בלי ביורוקרטיה' },
            ].map(({ Icon, label, sub }) => (
              <div key={label} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                background: 'white', borderRadius: 16, padding: '14px 10px',
                border: '1.5px solid #e8edf5',
              }}>
                <Icon size={18} color="#059669" strokeWidth={1.8} />
                <div style={{ fontSize: 11, fontWeight: 800, color: '#0f1e40', textAlign: 'center' }}>{label}</div>
                <div style={{ fontSize: 10, color: '#64748b', textAlign: 'center' }}>{sub}</div>
              </div>
            ))}
          </div>

          {/* Login buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
            {/* Google */}
            <ProviderButton
              onClick={handleGoogle}
              border="#dadce0"
              icon={
                <svg width="20" height="20" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.36-8.16 2.36-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                </svg>
              }
              label="המשך עם Google"
            />

            {/* Apple */}
            <ProviderButton
              onClick={handleApple}
              bg="#000"
              color="white"
              border="#000"
              icon={
                <svg width="18" height="18" viewBox="0 0 814 1000" fill="white">
                  <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76.5 0-103.7 40.8-165.9 40.8s-105-57.8-155.5-127.4C46 376.7 0 228.3 0 106.7 0 41.6 35.4 6.1 82.7 6.1c47.4 0 92.1 36.4 115.1 64.6 22.7 27.9 57.8 82 90.5 82s62.4-8.1 103.9-49.4C425.1 68.6 462.8 0 525.8 0c47.3 0 100.1 29.2 138.3 105.7 7.4 14.9 3.2 29.1-8.1 35.7z"/>
                </svg>
              }
              label="המשך עם Apple"
            />

            {/* Facebook */}
            <ProviderButton
              onClick={handleFacebook}
              bg="#1877F2"
              color="white"
              border="#1877F2"
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              }
              label="המשך עם Facebook"
            />

            {/* Email divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ flex: 1, height: 1, background: '#e8edf5' }} />
              <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>או</span>
              <div style={{ flex: 1, height: 1, background: '#e8edf5' }} />
            </div>

            {/* Email */}
            <ProviderButton
              onClick={handleEmail}
              icon={<Mail size={18} color="#1a6fd4" strokeWidth={2} />}
              label="המשך עם אימייל"
              border="#bfdbfe"
              color="#1a6fd4"
            />
          </div>

          <div style={{ fontSize: 11, color: '#94a3b8', textAlign: 'center', lineHeight: 1.8, fontWeight: 500, marginBottom: 4 }}>
            🔐 בחינם לחלוטין — ללא חיוב
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}