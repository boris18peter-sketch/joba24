import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';

export default function Welcome() {
  return (
    <div className="min-h-screen flex flex-col" dir="rtl"
      style={{ background: 'linear-gradient(160deg, #0f2b6b 0%, #1a6fd4 60%, #3b8fe8 100%)' }}>

      {/* Logo / Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pt-16 pb-8 text-center">
        <div style={{
          width: 88, height: 88, borderRadius: 24,
          background: 'rgba(255,255,255,0.15)',
          border: '2px solid rgba(255,255,255,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 44, marginBottom: 24,
          backdropFilter: 'blur(8px)',
        }}>
          ⚡
        </div>

        <h1 style={{ color: 'white', fontSize: 32, fontWeight: 900, marginBottom: 10, lineHeight: 1.2 }}>
          ברוך הבא ל-TaskGo
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 15, lineHeight: 1.6, maxWidth: 300 }}>
          פלטפורמה למציאת עבודה מהירה ומשימות מקומיות. פרסם משימה, מצא עובד, וקבל עזרה תוך דקות.
        </p>

        {/* Features */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 32, width: '100%', maxWidth: 320 }}>
          {[
            { icon: '🔍', title: 'מצא עבודה קרובה אליך', desc: 'עיין במשימות לפי מיקום וקטגוריה' },
            { icon: '⚡', title: 'התחל לעבוד מיד', desc: 'קח משימות מיידיות בלחיצה אחת' },
            { icon: '💸', title: 'קבל תשלום מהיר', desc: 'ארנק מובנה עם העברה אוטומטית' },
          ].map(f => (
            <div key={f.title} style={{
              display: 'flex', alignItems: 'center', gap: 14,
              background: 'rgba(255,255,255,0.1)',
              borderRadius: 16, padding: '12px 16px',
              border: '1px solid rgba(255,255,255,0.15)',
              backdropFilter: 'blur(4px)',
              textAlign: 'right',
            }}>
              <div style={{ fontSize: 24, flexShrink: 0 }}>{f.icon}</div>
              <div>
                <div style={{ color: 'white', fontWeight: 700, fontSize: 14 }}>{f.title}</div>
                <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12, marginTop: 1 }}>{f.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA Buttons */}
      <div style={{ padding: '0 24px 48px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <button
          onClick={() => base44.auth.redirectToLogin(window.location.href)}
          style={{
            width: '100%', height: 54, borderRadius: 16,
            background: 'white', color: '#0f2b6b',
            fontWeight: 800, fontSize: 16, border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
          }}
        >
          <span style={{ fontSize: 20 }}>🚀</span>
          התחל / התחבר
        </button>
        <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 4 }}>
          Google · Apple · אימייל — בחר את השיטה שמתאימה לך
        </p>
      </div>
    </div>
  );
}