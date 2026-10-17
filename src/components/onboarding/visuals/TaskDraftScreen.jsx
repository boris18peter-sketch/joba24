import { MapPin } from 'lucide-react';
import { ONBOARDING_TASK } from '@/lib/onboardingDemoTask';

/**
 * The publish form's description + location, FILLED IN.
 *
 * This mirrors the real `/create-task` section card for section card: the same
 * section label and the same text field styling (`--input-bg`, 1.5px
 * `--border-1`, radius 12) the live form uses.
 *
 * It shows a COMPLETED task rather than an empty form — an empty form reads as
 * something the visitor is meant to fill in, which is exactly what a preview
 * must never look like. Only the two things this screen teaches are shown: what
 * you wrote and where. No category chip, no building/floor fields and no
 * buttons — the address details stay private until a worker is chosen, and the
 * illustration has no reason to hint at either.
 */
export default function TaskDraftScreen() {
  return (
    <>
      <div style={{ height: 52, flexShrink: 0, display: 'flex', alignItems: 'center', padding: '0 14px', background: 'var(--surface-2)', boxShadow: '0 1px 0 var(--border-1)' }}>
        <span style={{ fontSize: 16.5, fontWeight: 900, color: 'var(--text-1)' }}>פרסם משימה</span>
      </div>

      <div style={{ background: 'var(--surface-1)', padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* ── תאור המשימה — the main input ── */}
        <div className="j-card" style={{ padding: '14px 14px 16px' }}>
          <div style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--text-1)', marginBottom: 8 }}>
            📝 תאר את המשימה *
          </div>

          <div style={{ background: 'var(--input-bg)', border: '1.5px solid var(--border-1)', borderRadius: 12, padding: '11px 14px' }}>
            <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.6, color: 'var(--text-1)' }}>{ONBOARDING_TASK.description}</p>
          </div>
        </div>

        {/* ── מיקום ── */}
        <div className="j-card" style={{ padding: '14px 14px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 9 }}>
            <MapPin size={14} strokeWidth={2.2} color="var(--text-2)" />
            <span style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--text-1)' }}>מיקום *</span>
          </div>

          {/* Street and city ONLY. A task preview must never show a specific
              address — building, floor and apartment stay private until a
              worker is chosen. */}
          <div style={{
            background: 'var(--input-bg)', border: '1.5px solid var(--border-1)', borderRadius: 12,
            padding: '11px 14px', fontSize: 13.5, fontWeight: 700, color: 'var(--text-1)', lineHeight: 1.5,
          }}>
            {ONBOARDING_TASK.location}
          </div>
        </div>

      </div>
    </>
  );
}