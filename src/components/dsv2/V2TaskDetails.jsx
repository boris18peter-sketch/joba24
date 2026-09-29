import { ChevronRight, MapPin, ShieldCheck, Star } from 'lucide-react';

function DetailRow({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
      <span className="v2-meta">{label}</span>
      <span className="v2-meta-2" style={{ textAlign: 'end' }}>{value}</span>
    </div>
  );
}

/**
 * Design System V2 — Task details.
 *
 * A calm vertical read: what it is → how much → where/when → description →
 * one action. Each fact appears exactly once. Secondary blocks (location,
 * details, publisher) come after the action, not before it.
 */
export default function V2TaskDetails() {
  return (
    <div dir="rtl" style={{ background: 'var(--v2-bg)', minHeight: '100%' }}>
      <div style={{ height: 56, display: 'flex', alignItems: 'center', padding: '0 12px' }}>
        <button className="v2-icon-btn" aria-label="חזרה">
          <ChevronRight size={22} color="var(--v2-ink)" strokeWidth={2} />
        </button>
      </div>

      <div style={{ padding: '0 20px 36px' }}>
        <h1 className="v2-title" style={{ fontSize: 24 }}>הורדת מקרר מהדירה</h1>
        <p className="v2-meta" style={{ marginTop: 8 }}>עזרה פיזית · תל אביב</p>

        <div style={{ marginTop: 26 }}>
          <div style={{ fontSize: 34, fontWeight: 900, letterSpacing: '-1.2px', lineHeight: 1, color: 'var(--v2-ink)' }}>₪500</div>
          <p className="v2-meta" style={{ marginTop: 6 }}>מזומן</p>
        </div>

        <div style={{ marginTop: 22, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <p className="v2-meta-2">תל אביב · 1.8 ק״מ · פורסם לפני 47 דק׳</p>
          <p className="v2-meta-2">גמיש</p>
        </div>

        <p className="v2-body" style={{ marginTop: 26 }}>
          צריך להוריד מקרר מהדירה מקומה 3 (יש מעלית). המקרר עובד וצריך להגיע שלם.
        </p>

        <button className="v2-btn v2-btn-primary v2-btn-block" style={{ marginTop: 28 }}>הגש בקשה</button>
        <p className="v2-meta" style={{ textAlign: 'center', marginTop: 10 }}>
          הגשה עולה 25 ג׳ובות · מוחזר אם לא נבחרת
        </p>

        <hr className="v2-hr" style={{ margin: '34px 0' }} />

        <h2 className="v2-h2">מיקום</h2>
        <div style={{
          marginTop: 14, height: 132, borderRadius: 16,
          background: 'linear-gradient(135deg,#eef3fb,#e3ecf8)',
          border: '1px solid var(--v2-line)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          <MapPin size={17} color="var(--v2-blue)" strokeWidth={2} />
          <span className="v2-meta-2">דיזנגוף 120, תל אביב</span>
        </div>

        <h2 className="v2-h2" style={{ marginTop: 30 }}>פרטי המשימה</h2>
        <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <DetailRow label="תשלום" value="מזומן" />
          <DetailRow label="כוח אדם" value="2 אנשים" />
          <DetailRow label="נדרש" value="ניסיון בהרמה" />
        </div>

        <h2 className="v2-h2" style={{ marginTop: 30 }}>פורסם על ידי</h2>
        <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#e3ecf8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: 'var(--v2-blue)', flexShrink: 0 }}>
            דל
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--v2-ink)' }}>דנה ל׳</span>
              <ShieldCheck size={15} color="var(--v2-green)" strokeWidth={2.2} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 3 }}>
              <Star size={12} color="var(--v2-ink-3)" fill="var(--v2-ink-3)" />
              <span className="v2-meta">4.9 · 12 משימות</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}