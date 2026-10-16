import { PROFESSIONS } from '@/lib/professions';
import { ISRAELI_CITIES } from '@/lib/israeliCities';

/**
 * The worker profile step, built from the app's OWN data: the real profession
 * list and the real city list the worker onboarding offers, laid out with the
 * same chips the live screen uses. Nothing here is invented — only the
 * selection shown is illustrative.
 */
const SELECTED_PROFESSIONS = ['חשמלאי', 'אינסטלטור', 'איש תיקונים / הנדימן'];
const SELECTED_CITIES = ['תל אביב', 'רמת גן', 'גבעתיים'];

function Chip({ label, selected }) {
  return (
    <span
      style={{
        fontSize: 12.5,
        fontWeight: 700,
        padding: '8px 13px',
        borderRadius: 999,
        background: selected ? 'var(--brand-primary)' : 'var(--surface-3)',
        color: selected ? '#ffffff' : 'var(--text-2)',
        border: `1px solid ${selected ? 'var(--brand-primary)' : 'var(--border-1)'}`,
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </span>
  );
}

export default function WorkerProfileScreen() {
  return (
    <>
      <div style={{ height: 56, flexShrink: 0, display: 'flex', alignItems: 'center', padding: '0 14px', background: 'var(--surface-2)', boxShadow: '0 1px 0 var(--border-1)' }}>
        <span style={{ fontSize: 16.5, fontWeight: 900, color: 'var(--text-1)' }}>הפרופיל שלי</span>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', background: 'var(--surface-1)', padding: 14 }}>
        <div className="j-card" style={{ padding: '14px 14px 16px' }}>
          <div style={{ fontSize: 13.5, fontWeight: 900, color: 'var(--text-1)', marginBottom: 10 }}>תחומי עיסוק</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
            {PROFESSIONS.slice(0, 12).map(p => (
              <Chip key={p} label={p} selected={SELECTED_PROFESSIONS.includes(p)} />
            ))}
          </div>
        </div>

        <div className="j-card" style={{ padding: '14px 14px 16px', marginTop: 12 }}>
          <div style={{ fontSize: 13.5, fontWeight: 900, color: 'var(--text-1)', marginBottom: 10 }}>אזורי עבודה</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
            {ISRAELI_CITIES.slice(0, 10).map(c => (
              <Chip key={c} label={c} selected={SELECTED_CITIES.includes(c)} />
            ))}
          </div>
        </div>

        <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8, background: 'var(--brand-primary-light)', border: '1px solid var(--border-2)', borderRadius: 14, padding: '11px 14px' }}>
          <span style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--brand-primary)' }}>
            פרופיל מלא = משימות רלוונטיות יותר
          </span>
        </div>
      </div>
    </>
  );
}