import { LogIn, X, ShieldCheck, Star, Users } from 'lucide-react';

export default function LoginPromptModal({ onLogin, onClose, type = 'apply' }) {
  const isPublish = type === 'publish';

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 99999,
      background: 'rgba(5,15,40,0.72)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      backdropFilter: 'blur(8px)',
    }} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: 'white',
        borderRadius: '32px 32px 0 0',
        width: '100%', maxWidth: 480,
        maxHeight: '95vh', overflowY: 'auto',
        boxShadow: '0 -24px 80px rgba(0,0,0,0.25)',
        paddingBottom: 'max(28px, env(safe-area-inset-bottom))',
      }} dir="rtl">

        {/* Drag handle */}
        <div style={{ width: 40, height: 4, borderRadius: 99, background: '#dde4ef', margin: '14px auto 0' }} />

        {/* Header */}
        <div style={{ padding: '20px 20px 0', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {/* Logo */}
            <div style={{
              width: 52, height: 52, borderRadius: 16,
              background: 'linear-gradient(135deg,#1a6fd4,#0a52b0)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              boxShadow: '0 4px 16px rgba(26,111,212,0.35)',
            }}>
              <LogIn size={24} color="white" strokeWidth={1.8} />
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 900, color: '#0f1e40', letterSpacing: -0.5 }}>
                התחבר ל־Joba24
              </div>
              <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                {isPublish ? 'כדי לפרסם משימות' : 'כדי להגיש בקשות'}
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

          {/* Main headline */}
          <div style={{
            background: 'linear-gradient(135deg, #f0f7ff, #e8f0fe)',
            borderRadius: 20, padding: '18px 16px', marginBottom: 16,
            border: '1px solid #c7d9f8',
          }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#0f2b6b', marginBottom: 12, lineHeight: 1.5 }}>
              הצטרף לאנשים שכבר מפרסמים ולוקחים משימות בכל רגע.
            </div>

            {/* Bullet 1 */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
              <span style={{ fontSize: 16, flexShrink: 0 }}>✅</span>
              <div style={{ fontSize: 13, color: '#1e40af', lineHeight: 1.6 }}>
                <strong>צריך עזרה?</strong> פרסם משימה, קבל בקשות לביצוע, אשר בקשה ומישהו יבוא אליך תוך דקות.
              </div>
            </div>

            {/* Bullet 2 */}
            <div style={{ display: 'flex', gap: 10 }}>
              <span style={{ fontSize: 16, flexShrink: 0 }}>✅</span>
              <div style={{ fontSize: 13, color: '#1e40af', lineHeight: 1.6 }}>
                <strong>רוצה להרוויח?</strong> הגש בקשות למשימות באזור שלך, בצע אותן ותרוויח.
              </div>
            </div>
          </div>

          {/* Trust badges */}
          <div style={{
            display: 'flex', gap: 8, marginBottom: 20, justifyContent: 'center',
          }}>
            {[
              { icon: <ShieldCheck size={13} strokeWidth={2} />, text: 'משתמשים מאומתים' },
              { icon: <Star size={13} strokeWidth={2} />, text: 'דירוגים' },
              { icon: <Users size={13} strokeWidth={2} />, text: 'חוויה בטוחה' },
            ].map(({ icon, text }) => (
              <div key={text} style={{
                flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
                background: '#f8faff', borderRadius: 14, padding: '10px 6px',
                border: '1px solid #e5eaf5',
              }}>
                <div style={{ color: '#1a6fd4' }}>{icon}</div>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#374151', textAlign: 'center', lineHeight: 1.3 }}>{text}</div>
              </div>
            ))}
          </div>

          {/* CTA Button */}
          <button
            onClick={onLogin}
            style={{
              width: '100%', height: 56, borderRadius: 16,
              background: 'linear-gradient(135deg,#1a6fd4,#0a52b0)',
              color: 'white', fontWeight: 900, fontSize: 16,
              border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              boxShadow: '0 6px 24px rgba(26,111,212,0.38)',
              marginBottom: 12, letterSpacing: 0.2,
            }}
          >
            <LogIn size={20} strokeWidth={1.8} /> התחבר / הצטרף עכשיו
          </button>

          {/* Social login hint */}
          <div style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center', lineHeight: 1.7 }}>
            Google · Apple · אימייל — בחינם לחלוטין
          </div>
        </div>
      </div>
    </div>
  );
}