import { base44 } from '@/api/base44Client';

export default function Welcome() {
  return (
    <div className="min-h-screen flex flex-col" dir="rtl"
      style={{ background: 'linear-gradient(170deg, #0a1f5c 0%, #1352b8 55%, #2e7de0 100%)' }}>

      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pt-12 pb-6 text-center">

        {/* Logo */}
        <div style={{ position: 'relative', marginBottom: 20 }}>
          <div style={{
            width: 100, height: 100, borderRadius: 28,
            background: 'rgba(255,255,255,0.12)',
            border: '2px solid rgba(255,255,255,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(8px)',
            overflow: 'hidden',
          }}>
            <img
              src="https://media.base44.com/images/public/69e6bdb4986a04a256653a23/d5824a161_IMG_0357.jpg"
              alt="Joba24"
              style={{ width: 100, height: 100, objectFit: 'cover', borderRadius: 24 }}
            />
          </div>
        </div>

        {/* Brand */}
        <div style={{ color: 'white', fontSize: 38, fontWeight: 900, letterSpacing: -1, marginBottom: 4 }}>
          Joba<span style={{ color: '#fbbf24' }}>24</span>
        </div>
        <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: 500, marginBottom: 28 }}>
          הפלטפורמה למשימות מהירות
        </div>

        {/* Tagline */}
        <div style={{
          background: 'rgba(255,255,255,0.1)',
          border: '1px solid rgba(255,255,255,0.18)',
          borderRadius: 20, padding: '20px 24px',
          maxWidth: 340, width: '100%',
          backdropFilter: 'blur(6px)',
          marginBottom: 20,
        }}>
          <p style={{ color: 'white', fontSize: 18, fontWeight: 800, lineHeight: 1.4, margin: 0 }}>
            פרסם משימה, מצא עובד —<br />
            <span style={{ color: '#fbbf24' }}>תוך כמה דקות.</span>
          </p>
        </div>

        {/* 3 Features */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', maxWidth: 340 }}>
          {[
            { icon: '📋', text: 'פתח משימה בכל סוג — ניקיון, שינוע, תיקונים ועוד' },
            { icon: '👷', text: 'עובדים מוסמכים מגיעים אליך מהר' },
            { icon: '💸', text: 'תשלום מהיר ובטוח ישירות בפלטפורמה' },
          ].map(f => (
            <div key={f.text} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              background: 'rgba(255,255,255,0.08)',
              borderRadius: 14, padding: '11px 14px',
              border: '1px solid rgba(255,255,255,0.1)',
              textAlign: 'right',
            }}>
              <span style={{ fontSize: 22, flexShrink: 0 }}>{f.icon}</span>
              <span style={{ color: 'rgba(255,255,255,0.88)', fontSize: 13, fontWeight: 500, lineHeight: 1.4 }}>{f.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div style={{ padding: '0 24px 52px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button
          onClick={() => base44.auth.redirectToLogin(window.location.href)}
          style={{
            width: '100%', height: 56, borderRadius: 18,
            background: '#fbbf24', color: '#0a1f5c',
            fontWeight: 900, fontSize: 17, border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            boxShadow: '0 8px 28px rgba(251,191,36,0.4)',
            letterSpacing: 0.3,
          }}
        >
          🚀 הצטרף / התחבר עכשיו
        </button>
        <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: 12, margin: 0 }}>
          Google · Apple · אימייל
        </p>
      </div>
    </div>
  );
}