import { LogIn, X, Lock, Sparkles, Zap } from 'lucide-react';

export default function LoginPromptModal({ onLogin, onClose, type = 'apply' }) {
  const isPublish = type === 'publish';

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100001,
      background: 'rgba(5,15,40,0.72)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      backdropFilter: 'blur(8px)',
      touchAction: 'none',
    }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      onPointerDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
    >
      <div style={{
        background: 'linear-gradient(180deg, #fafbff 0%, #f4f7fb 100%)',
        borderRadius: '32px 32px 0 0',
        width: '100%', maxWidth: 480,
        maxHeight: '95vh', overflowY: 'auto',
        boxShadow: '0 -24px 120px rgba(0,0,0,0.3)',
        paddingBottom: 'max(28px, env(safe-area-inset-bottom))',
      }} dir="rtl">

        {/* Drag handle */}
        <div style={{ width: 40, height: 4, borderRadius: 99, background: '#dde4ef', margin: '14px auto 0' }} />

        {/* Header */}
        <div style={{ padding: '20px 20px 0', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {/* Logo */}
            <div style={{
              width: 52, height: 52, borderRadius: 18,
              background: 'linear-gradient(135deg,#059669,#047857)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              boxShadow: '0 8px 28px rgba(5,150,105,0.4)',
            }}>
              <Sparkles size={24} color="white" strokeWidth={1.8} />
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 950, color: '#0f1e40', letterSpacing: -0.8 }}>
                בואו נתחילו 🚀
              </div>
              <div style={{ fontSize: 13, color: '#64748b', marginTop: 3, fontWeight: 500 }}>
                {isPublish ? 'לפרסום משימות דחופות' : 'לקבלת עבודה בקרוב'}
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{
            width: 34, height: 34, borderRadius: 11, background: '#f3f4f6',
            border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', flexShrink: 0,
          }}>
            <X size={16} color="#9ca3af" />
          </button>
        </div>

        <div style={{ padding: '20px 20px 0' }}>

          {/* Main headline + benefits */}
          <div style={{
            background: 'linear-gradient(135deg, #eff6ff 0%, #f0fdf4 100%)',
            borderRadius: 22, padding: '20px 18px', marginBottom: 18,
            border: '1.5px solid #c7e9c0',
            boxShadow: '0 4px 20px rgba(5,150,105,0.08)',
          }}>
            <div style={{ fontSize: 15, fontWeight: 850, color: '#0f2b6b', marginBottom: 14, lineHeight: 1.6 }}>
              הצטרפו לקהילה של אלפי אנשים שנהנים מעבודה גמישה וזמינה בשנייה
            </div>

            {/* Benefit 1 */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
              <div style={{ width: 20, height: 20, borderRadius: 10, background: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ color: 'white', fontSize: 12, fontWeight: 800 }}>✓</span>
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#0f1e40', marginBottom: 1 }}>צריך עזרה בהקדם?</div>
                <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.5 }}>פרסם משימה תוך 30 שניות וקבל בקשות מעובדים מיומנים</div>
              </div>
            </div>

            {/* Benefit 2 */}
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ width: 20, height: 20, borderRadius: 10, background: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ color: 'white', fontSize: 12, fontWeight: 800 }}>✓</span>
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#0f1e40', marginBottom: 1 }}>רוצה להרוויח כסף?</div>
                <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.5 }}>בחר משימות בסביבתך וקבל תשלום תוך כמה שעות</div>
              </div>
            </div>
          </div>

          {/* Trust badges */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 20,
          }}>
            {[
              { icon: Lock, label: 'בטוח 100%', text: 'מאומת' },
              { icon: Zap, label: 'מהיר', text: 'תוך דקות' },
              { icon: Sparkles, label: 'קל', text: 'בלי ביורוקרטיה' },
            ].map(({ icon: Icon, label, text }) => (
              <div key={label} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                background: 'white', borderRadius: 16, padding: '14px 10px',
                border: '1.5px solid #e8edf5',
                transition: 'all 0.3s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#f0fdf4';
                e.currentTarget.style.borderColor = '#c7e9c0';
                e.currentTarget.style.boxShadow = '0 4px 16px rgba(5,150,105,0.12)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'white';
                e.currentTarget.style.borderColor = '#e8edf5';
                e.currentTarget.style.boxShadow = 'none';
              }}>
                <Icon size={18} color="#059669" strokeWidth={1.8} />
                <div style={{ fontSize: 11, fontWeight: 800, color: '#0f1e40', textAlign: 'center' }}>{label}</div>
                <div style={{ fontSize: 10, color: '#64748b', textAlign: 'center' }}>{text}</div>
              </div>
            ))}
          </div>

          {/* CTA Button */}
          <button
            onClick={onLogin}
            style={{
              width: '100%', height: 56, borderRadius: 18,
              background: 'linear-gradient(135deg,#059669,#047857)',
              color: 'white', fontWeight: 950, fontSize: 16,
              border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              boxShadow: '0 8px 28px rgba(5,150,105,0.4)',
              marginBottom: 14, letterSpacing: 0.3,
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 12px 36px rgba(5,150,105,0.5)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 8px 28px rgba(5,150,105,0.4)';
            }}
          >
            <LogIn size={20} strokeWidth={1.8} /> התחבר / הצטרף עכשיו
          </button>

          {/* Social login hint */}
          <div style={{ fontSize: 12, color: '#94a3b8', textAlign: 'center', lineHeight: 1.8, fontWeight: 500 }}>
            🔐 Google, Apple, אימייל — בחינם לחלוטין
          </div>
        </div>
      </div>
    </div>
  );
}