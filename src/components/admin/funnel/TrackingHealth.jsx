import { Activity, AlertTriangle, ShieldCheck } from 'lucide-react';

/**
 * TrackingHealth — is the funnel EMPTY, or is the funnel BROKEN?
 *
 * "Zero publications" is not a finding on its own: it is either a real result
 * (people arrived and gave up) or a broken instrument (nothing was ever
 * recorded). The two demand opposite responses, so the tab has to say which one
 * it is before any other number on it can be trusted.
 *
 * The strip answers it from evidence rather than from a guess:
 *   · rows ever recorded        → has the collector EVER worked?
 *   · rows on tracking v2       → is the CORRECTED tracking live?
 *   · rows with a landing URL   → is the campaign capture actually running?
 *   · last row timestamp        → is it still running now?
 */
export default function TrackingHealth({ events, everCount, lastEverAt, rangeLabel }) {
  const total = events.length;
  const v2 = events.filter(e => (e.tracking_version || 0) >= 2).length;
  const legacy = total - v2;
  const withLanding = events.filter(e => e.landing_url).length;
  const withClickId = events.filter(e => e.gclid || e.fbclid).length;

  const collectorWorks = everCount > 0;
  const correctedLive = v2 > 0;

  // Three honest states, in the order that matters to the person reading it.
  let tone = 'success';
  let title = 'המעקב פעיל';
  let body = `${v2} מתוך ${total} ניסיונות בטווח נרשמו במעקב המתוקן.`;

  if (!collectorWorks) {
    tone = 'danger';
    title = 'המעקב לא רשם אף שורה מעולם';
    body = 'אם יש תנועה ממודעות, זו תקלת מעקב ולא היעדר פעילות — כדאי לבדוק את הפונקציה.';
  } else if (!correctedLive) {
    tone = 'warning';
    title = `אין עדיין נתונים במעקב המתוקן ב${rangeLabel}`;
    body = `נרשמו ${everCount} ניסיונות בעבר, אבל כולם לפני התיקון. הנתונים המפורטים יופיעו מכאן והלאה.`;
  } else if (total === 0) {
    tone = 'warning';
    title = `אין פעילות בטווח ${rangeLabel}`;
    body = `המעקב עובד — נרשמו ${everCount} ניסיונות בסך הכל, האחרון ${lastEverAt || '—'}. פשוט לא נכנסו מבקרים בטווח הזה.`;
  }

  const palette = {
    success: { bg: 'var(--color-success-bg)', border: 'var(--color-success-border)', color: 'var(--color-success)', Icon: ShieldCheck },
    warning: { bg: 'var(--color-warning-bg)', border: 'var(--color-warning-border)', color: 'var(--color-warning)', Icon: Activity },
    danger: { bg: 'var(--color-danger-bg)', border: 'var(--color-danger-border)', color: 'var(--color-danger)', Icon: AlertTriangle },
  }[tone];

  const { Icon } = palette;

  const Facts = () => (
    <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 8 }}>
      {[
        { label: 'נרשמו במעקב המתוקן', value: v2 },
        { label: 'שורות ישנות (לפני התיקון)', value: legacy },
        { label: 'עם כתובת נחיתה', value: withLanding },
        { label: 'עם מזהה קליק (gclid)', value: withClickId },
      ].map(f => (
        <div key={f.label} style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
          <span style={{ fontSize: 13, fontWeight: 900, color: 'var(--text-1)' }}>{f.value}</span>
          <span style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600 }}>{f.label}</span>
        </div>
      ))}
    </div>
  );

  return (
    <div style={{
      background: palette.bg, border: `1px solid ${palette.border}`,
      borderRadius: 14, padding: '13px 16px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
        <Icon size={16} color={palette.color} style={{ flexShrink: 0 }} />
        <span style={{ fontSize: 13.5, fontWeight: 900, color: 'var(--text-1)' }}>{title}</span>
      </div>
      <div style={{ fontSize: 12.5, color: 'var(--text-2)', lineHeight: 1.6, marginTop: 4 }}>{body}</div>
      <Facts />
    </div>
  );
}