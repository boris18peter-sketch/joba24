import { Star, CheckCircle2, MessageCircle, X, ShieldCheck, Briefcase } from 'lucide-react';

/**
 * The applicants panel from the publisher's task screen, mirroring
 * `TaskApplicants` card for card: the same avatar ring, the same name + rating
 * + verification row, the same message bubble and the same decision bar —
 * "דחה" next to "אשר עובד", which is exactly the choice this screen teaches.
 *
 * Labels are the live ones from the app's own dictionary, so the buttons read
 * the way they will read when the visitor actually gets there.
 */
const APPLICANTS = [
  {
    id: 'a1',
    name: 'דניאל כהן',
    rating: 4.9,
    tasks: 34,
    verified: true,
    message: 'אני חשמלאי מוסמך, יכול להגיע מחר בבוקר.',
  },
  {
    id: 'a2',
    name: 'יוסי לוי',
    rating: 4.7,
    tasks: 12,
    verified: false,
    message: null,
  },
];

function ApplicantCard({ app }) {
  return (
    <div style={{
      background: 'var(--surface-2)',
      border: '1px solid var(--border-1)',
      borderRadius: 16,
      overflow: 'hidden',
      boxShadow: 'var(--shadow-xs)',
    }}>
      <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        {/* Avatar — the same circular ring the live list uses */}
        <div style={{
          width: 48, height: 48, borderRadius: '50%', flexShrink: 0,
          background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-primary-dark))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18, fontWeight: 900, color: '#ffffff',
          border: app.verified ? '2px solid var(--color-success)' : '2px solid transparent',
        }}>
          {app.name[0]}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-1)' }}>{app.name}</span>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 5, flexWrap: 'wrap' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, fontWeight: 700, color: 'var(--color-warning)' }}>
              <Star size={11} style={{ fill: 'var(--brand-accent)', color: 'var(--brand-accent)' }} />
              {app.rating.toFixed(1)}
            </span>
            {app.verified && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10, fontWeight: 800, color: 'var(--color-success)' }}>
                <ShieldCheck size={11} /> מאומת
              </span>
            )}
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10, fontWeight: 600, color: 'var(--text-3)' }}>
              <Briefcase size={10} /> {app.tasks} משימות
            </span>
          </div>
        </div>

        <div style={{
          width: 36, height: 36, borderRadius: 11, flexShrink: 0,
          background: 'var(--brand-primary-light)', border: '1px solid var(--border-2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <MessageCircle size={16} color="var(--brand-primary)" />
        </div>
      </div>

      {app.message && (
        <div style={{ padding: '0 14px 10px' }}>
          <div style={{ background: 'var(--surface-3)', borderRadius: 10, padding: '8px 12px', fontSize: 12, color: 'var(--text-2)', lineHeight: 1.5 }}>
            {app.message}
          </div>
        </div>
      )}

      {/* The decision: decline, or approve the person who will do the job */}
      <div style={{ borderTop: '1px solid var(--border-1)', padding: '8px 14px', display: 'flex', gap: 8 }}>
        <div style={{
          flex: 1, height: 40, borderRadius: 11,
          background: 'var(--surface-3)', border: '1px solid var(--border-1)',
          color: 'var(--text-2)', fontWeight: 700, fontSize: 13,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        }}>
          <X size={15} /> דחה
        </div>
        <div style={{
          flex: 1.5, height: 40, borderRadius: 11,
          background: 'linear-gradient(135deg, #059669, #047857)',
          color: '#ffffff', fontWeight: 800, fontSize: 13,
          boxShadow: '0 2px 10px rgba(5,150,105,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        }}>
          <CheckCircle2 size={15} /> אשר עובד
        </div>
      </div>
    </div>
  );
}

export default function ApplicantsScreen() {
  return (
    <>
      <div style={{ height: 52, flexShrink: 0, display: 'flex', alignItems: 'center', padding: '0 14px', background: 'var(--surface-2)', boxShadow: '0 1px 0 var(--border-1)' }}>
        <span style={{ fontSize: 16.5, fontWeight: 900, color: 'var(--text-1)' }}>הבקשות שקיבלת</span>
      </div>

      <div style={{ background: 'var(--surface-1)', padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)', letterSpacing: 0.3 }}>
          מועמדים ({APPLICANTS.length})
        </div>

        {APPLICANTS.map(app => <ApplicantCard key={app.id} app={app} />)}
      </div>
    </>
  );
}