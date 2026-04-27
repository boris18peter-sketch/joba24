import { base44 } from '@/api/base44Client';

export default function Welcome() {
  return (
    <div className="min-h-screen flex flex-col" dir="rtl"
      style={{ background: '#f4f7fb' }}>

      {/* Top Blue Hero */}
      <div style={{
        background: 'linear-gradient(160deg, #0a1f5c 0%, #1352b8 60%, #1a6fd4 100%)',
        padding: '72px 28px 52px',
        textAlign: 'right',
      }}>
        {/* Logo + Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 }}>
          <img
            src="https://media.base44.com/images/public/69e6bdb4986a04a256653a23/d5824a161_IMG_0357.jpg"
            alt="Joba24"
            style={{ width: 62, height: 62, objectFit: 'cover', borderRadius: 18, border: '2px solid rgba(255,255,255,0.25)' }}
          />
          <div>
            <div style={{ color: 'white', fontSize: 36, fontWeight: 900, letterSpacing: -1, lineHeight: 1 }}>
              Joba<span style={{ color: '#fbbf24' }}>24</span>
            </div>
            <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 13, marginTop: 4, fontWeight: 500 }}>
              פלטפורמת המשימות המהירה בישראל
            </div>
          </div>
        </div>

        {/* Headline */}
        <h1 style={{ color: 'white', fontSize: 26, fontWeight: 900, lineHeight: 1.35, margin: '0 0 12px', letterSpacing: -0.5 }}>
          פרסם משימה<br />
          <span style={{ color: '#fbbf24' }}>מצא עובד תוך דקות.</span>
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 15, margin: 0, lineHeight: 1.6 }}>
          לכל עבודה יש עובד. לכל עובד יש ג'ובה.
        </p>
      </div>

      {/* Value Blocks */}
      <div style={{ padding: '28px 20px', flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* For job seekers */}
        <div style={{ background: 'white', borderRadius: 20, padding: '20px 18px', border: '1px solid #dce8f5', boxShadow: '0 2px 12px rgba(26,111,212,0.07)' }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#1a6fd4', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>לעובדים</div>
          <div style={{ fontSize: 17, fontWeight: 900, color: '#0f2b6b', marginBottom: 6 }}>הרוויח כסף כבר היום</div>
          <p style={{ fontSize: 13, color: '#555', lineHeight: 1.65, margin: 0 }}>
            אלפי משימות פתוחות בכל הארץ — ניקיון, שינוע, תיקונים, שיעורים פרטיים ועוד.
            בחר ג'ובה קרובה אליך, בצע אותה ותקבל תשלום מיידי.
          </p>
        </div>

        {/* For employers */}
        <div style={{ background: 'white', borderRadius: 20, padding: '20px 18px', border: '1px solid #dce8f5', boxShadow: '0 2px 12px rgba(26,111,212,0.07)' }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#1a6fd4', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>למעסיקים</div>
          <div style={{ fontSize: 17, fontWeight: 900, color: '#0f2b6b', marginBottom: 6 }}>קבל עזרה מהירה ואמינה</div>
          <p style={{ fontSize: 13, color: '#555', lineHeight: 1.65, margin: 0 }}>
            פרסם משימה בשניות — קבע מחיר, מיקום וזמן ביצוע.
            עובדים מוסמכים יגיעו אליך מהר. תשלום מאובטח דרך הפלטפורמה.
          </p>
        </div>

        {/* Trust bar */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          {[
            { num: '2,400+', label: 'ג\'ובות בוצעו' },
            { num: '4.9★', label: 'דירוג ממוצע' },
            { num: '100%', label: 'תשלום מאובטח' },
          ].map(({ num, label }) => (
            <div key={label} style={{ background: 'white', borderRadius: 16, padding: '14px 10px', textAlign: 'center', border: '1px solid #dce8f5' }}>
              <div style={{ fontSize: 16, fontWeight: 900, color: '#0f2b6b' }}>{num}</div>
              <div style={{ fontSize: 11, color: '#888', marginTop: 3 }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div style={{ padding: '0 20px 52px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button
          onClick={() => base44.auth.redirectToLogin(window.location.href)}
          style={{
            width: '100%', height: 56, borderRadius: 18,
            background: 'linear-gradient(135deg, #1a6fd4, #0a52b0)',
            color: 'white', fontWeight: 900, fontSize: 17,
            border: 'none', cursor: 'pointer',
            boxShadow: '0 8px 28px rgba(26,111,212,0.4)',
            letterSpacing: 0.3,
          }}
        >
          התחבר / הצטרף עכשיו
        </button>
        <p style={{ textAlign: 'center', color: '#aaa', fontSize: 12, margin: 0 }}>
          Google · Apple · אימייל — בחינם לחלוטין
        </p>
      </div>
    </div>
  );
}