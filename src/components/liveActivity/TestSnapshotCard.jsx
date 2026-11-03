import { Smartphone, CircleAlert, CircleCheck } from 'lucide-react';

const ROLE_LABEL = { publisher: 'מפרסם', worker: 'עובד' };

/** Contract phase → a short tag. Admin wording only; the status text itself
 *  always comes from the snapshot. */
const PHASE_LABEL = {
  open: 'פרסום פתוח',
  scheduled: 'מועד מתוכנן',
  awaiting_start: 'טרם התחיל',
  on_the_way: 'בדרך',
  arrived: 'בעבודה',
  done: 'ממתין לאישור',
};

/** ActivityKit's own lifecycle value, as reported by the native plugin. */
const NATIVE_STATE = {
  active: { label: 'פעילה', color: 'var(--color-success)', bg: 'var(--color-success-bg)', border: 'var(--color-success-border)' },
  stale: { label: 'ישנה', color: 'var(--color-warning)', bg: 'var(--color-warning-bg)', border: 'var(--color-warning-border)' },
  ended: { label: 'הסתיימה', color: 'var(--text-2)', bg: 'var(--surface-3)', border: 'var(--border-1)' },
  dismissed: { label: 'פינתה את המסך', color: 'var(--text-2)', bg: 'var(--surface-3)', border: 'var(--border-1)' },
  unknown: { label: 'לא ידוע', color: 'var(--text-3)', bg: 'var(--surface-3)', border: 'var(--border-1)' },
};

const chip = (tone) => ({
  display: 'inline-flex', alignItems: 'center', gap: 4,
  fontSize: 11, fontWeight: 800, padding: '3px 9px', borderRadius: 99,
  color: tone?.color || 'var(--text-2)',
  background: tone?.bg || 'var(--surface-3)',
  border: `1px solid ${tone?.border || 'var(--border-1)'}`,
});

/**
 * What the Lock Screen would show right now, next to what the device reports.
 * The native list is the source of truth for "is an activity running" — the
 * stage selected above is only the next thing that WOULD be sent.
 */
export default function TestSnapshotCard({ snapshot, availability, activities, role, revision }) {
  const running = Array.isArray(activities) ? activities : [];
  const progress = snapshot?.progress;
  const hasStep = !!progress && progress.step >= 0 && progress.steps.length > 0;
  const stepLabel = hasStep ? progress.steps[progress.step]?.label : '';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="j-card" style={{ padding: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <Smartphone size={15} color="var(--text-3)" />
          <span style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--text-2)' }}>מצב הפעילות במכשיר</span>
          <span style={{ marginInlineStart: 'auto' }}>
            {availability?.available ? (
              <span style={chip({ color: 'var(--color-success)', bg: 'var(--color-success-bg)', border: 'var(--color-success-border)' })}>
                <CircleCheck size={12} /> זמין
              </span>
            ) : (
              <span style={chip({ color: 'var(--color-danger)', bg: 'var(--color-danger-bg)', border: 'var(--color-danger-border)' })}>
                <CircleAlert size={12} /> {availability ? 'לא זמין' : 'בודק…'}
              </span>
            )}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-2)' }}>פעילויות פעילות</span>
          <span style={{
            fontSize: 12, fontWeight: 900, color: 'var(--text-1)',
            background: 'var(--surface-3)', border: '1px solid var(--border-1)',
            borderRadius: 99, padding: '1px 9px',
          }}>
            {running.length}
          </span>
        </div>

        {running.length === 0 ? (
          <div style={{ fontSize: 12.5, color: 'var(--text-3)', lineHeight: 1.5 }}>
            אין פעילות פעילה במכשיר. המסך פנוי.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {running.map((activity) => {
              const tone = NATIVE_STATE[activity.activityState] || NATIVE_STATE.unknown;
              return (
                <div
                  key={activity.activityId}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
                    background: 'var(--surface-3)', border: '1px solid var(--border-1)',
                    borderRadius: 12, padding: '8px 10px',
                  }}
                >
                  <span style={chip(tone)}>{tone.label}</span>
                  <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-2)' }}>
                    {ROLE_LABEL[activity.role] || activity.role}
                  </span>
                  <span style={{ fontSize: 11.5, color: 'var(--text-3)' }}>
                    {PHASE_LABEL[activity.phase] || activity.phase || '—'}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--text-3)', marginInlineStart: 'auto' }} dir="ltr">
                    v{activity.revision}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="j-card" style={{ padding: 14 }}>
        <div style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--text-2)', marginBottom: 10 }}>
          מה יוצג על מסך הנעילה
        </div>

        {!snapshot ? (
          <div style={{ fontSize: 12.5, color: 'var(--text-3)' }}>
            אין תצוגה זמינה לשלב הזה.
          </div>
        ) : (
          <>
            <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--text-1)', lineHeight: 1.25 }}>
              {snapshot.title}
            </div>
            {snapshot.subtitle && (
              <div style={{ fontSize: 12.5, color: 'var(--text-2)', fontWeight: 600, marginTop: 3 }}>
                {snapshot.subtitle}
              </div>
            )}

            {hasStep && (
              <div style={{ marginTop: 12 }}>
                <div style={{ display: 'flex', gap: 5 }}>
                  {progress.steps.map((step, index) => (
                    <div
                      key={step.key}
                      style={{
                        flex: 1, height: 4, borderRadius: 99,
                        background: index <= progress.step ? 'var(--brand-primary)' : 'var(--border-1)',
                      }}
                    />
                  ))}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                  <span style={{ fontSize: 11.5, fontWeight: 800, color: 'var(--brand-primary)' }}>{stepLabel}</span>
                  <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-3)' }}>
                    {Math.min(progress.step + 1, progress.total)}/{progress.total}
                  </span>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
              <span style={chip()}>{ROLE_LABEL[role] || role}</span>
              <span style={chip()}>{PHASE_LABEL[snapshot.phase] || snapshot.phase}</span>
              {snapshot.categoryLabel && <span style={chip()}>{snapshot.categoryLabel}</span>}
              <span style={chip()} dir="ltr">v{revision}</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}