import { base44 } from '@/api/base44Client';

export default function Welcome() {
  return (
    <div style={{ 
      width: '100%', height: '100%', overflowY: 'auto', 
      background: 'linear-gradient(160deg, #0a1f5c 0%, #1352b8 55%, #1a6fd4 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '32px 24px 40px', boxSizing: 'border-box',
    }} dir="rtl">

      {/* Logo + Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
        <img
          src="https://media.base44.com/images/public/69e6bdb4986a04a256653a23/d5824a161_IMG_0357.jpg"
          alt="Joba24"
          style={{ width: 58, height: 58, objectFit: 'cover', borderRadius: 16, border: '2px solid rgba(255,255,255,0.3)' }}
        />
        <div>
          <div style={{ color: 'white', fontSize: 38, fontWeight: 900, letterSpacing: -1, lineHeight: 1 }}>
            Joba<span style={{ color: '#fbbf24' }}>24</span>
          </div>
          <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 13, marginTop: 3, fontWeight: 500 }}>
            פלטפורמת המשימות המהירה
          </div>
        </div>
      </div>

      {/* Headline */}
      <h1 style={{ color: 'white', fontSize: 24, fontWeight: 900, lineHeight: 1.35, margin: '0 0 8px', letterSpacing: -0.5, textAlign: 'center' }}>
        פרסם משימה, <span style={{ color: '#fbbf24' }}>מצא עובד תוך דקות</span>
      </h1>
      <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, margin: '0 0 28px', textAlign: 'center', lineHeight: 1.5 }}>
        לכל עבודה יש עובד. לכל עובד יש ג'ובה.
      </p>

      {/* Value cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, width: '100%', marginBottom: 20 }}>
        <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 16, padding: '14px 14px', border: '1px solid rgba(255,255,255,0.15)' }}>
          <div style={{ fontSize: 20, marginBottom: 5 }}>💼</div>
          <div style={{ color: 'white', fontWeight: 800, fontSize: 14, marginBottom: 3 }}>לעובדים</div>
          <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, lineHeight: 1.5 }}>אלפי משימות קרובות אליך. בצע וקבל תשלום מיידי.</div>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 16, padding: '14px 14px', border: '1px solid rgba(255,255,255,0.15)' }}>
          <div style={{ fontSize: 20, marginBottom: 5 }}>🏠</div>
          <div style={{ color: 'white', fontWeight: 800, fontSize: 14, marginBottom: 3 }}>למעסיקים</div>
          <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, lineHeight: 1.5 }}>פרסם בשניות, קבל עובד אמין. תשלום מאובטח.</div>
        </div>
      </div>

      {/* Trust stats */}
      <div style={{ display: 'flex', gap: 8, width: '100%', marginBottom: 28, justifyContent: 'center' }}>
        {[
          { num: '2,400+', label: 'ג\'ובות' },
          { num: '4.9★', label: 'דירוג' },
          { num: '100%', label: 'מאובטח' },
        ].map(({ num, label }) => (
          <div key={label} style={{ flex: 1, background: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: '10px 6px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.12)' }}>
            <div style={{ fontSize: 15, fontWeight: 900, color: '#fbbf24' }}>{num}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', marginTop: 2 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <button
        onClick={() => base44.auth.redirectToLogin(window.location.href)}
        style={{
          width: '100%', height: 56, borderRadius: 18,
          background: '#fbbf24',
          color: '#0a1f5c', fontWeight: 900, fontSize: 17,
          border: 'none', cursor: 'pointer',
          boxShadow: '0 8px 28px rgba(251,191,36,0.4)',
          letterSpacing: 0.3, marginBottom: 10,
        }}
      >
        🚀 התחבר / הצטרף עכשיו
      </button>
      <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: 12, margin: 0 }}>
        Google · Apple · אימייל — בחינם לחלוטין
      </p>
    </div>
  );
}