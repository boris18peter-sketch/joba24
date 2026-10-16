import { Check } from 'lucide-react';
import { PROFESSIONS } from '@/lib/professions';
import { ISRAELI_CITIES } from '@/lib/israeliCities';

/**
 * The worker profile step, built from the app's OWN data: the real profession
 * list and the real city list the worker onboarding offers, laid out with the
 * same chips the live screen uses. Nothing here is invented — only the selection
 * shown is illustrative.
 *
 * The picture shows just the two choices this slide teaches. No step counter and
 * no summary strip: the slide's own line already says a full profile brings
 * better-matched work.
 *
 * Chips carry the app's text token (not the brand blue on a tint) so the contrast
 * between the card, the chips and their labels holds in Light and Dark alike.
 */
const SELECTED_PROFESSIONS = ['חשמלאי', 'אינסטלטור', 'איש תיקונים / הנדימן'];
const SELECTED_CITIES = ['תל אביב', 'רמת גן', 'גבעתיים'];

function Chip({ label, selected }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        fontSize: 12.5,
        fontWeight: 800,
        padding: '8px 13px',
        borderRadius: 999,
        background: selected ? 'var(--brand-primary)' : 'var(--surface-3)',
        color: selected ? '#ffffff' : 'var(--text-1)',
        border: `1px solid ${selected ? 'var(--brand-primary)' : 'var(--border-1)'}`,
        whiteSpace: 'nowrap',
      }}
    >
      {selected && <Check size={12} strokeWidth={3} />}
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

      <div style={{ background: 'var(--surface-1)', padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="j-card" style={{ padding: '14px 14px 16px' }}>
          <div style={{ fontSize: 13.5, fontWeight: 900, color: 'var(--text-1)', marginBottom: 10 }}>תחומי עיסוק</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
            {PROFESSIONS.slice(0, 12).map(p => (
              <Chip key={p} label={p} selected={SELECTED_PROFESSIONS.includes(p)} />
            ))}
          </div>
        </div>

        <div className="j-card" style={{ padding: '14px 14px 16px' }}>
          <div style={{ fontSize: 13.5, fontWeight: 900, color: 'var(--text-1)', marginBottom: 10 }}>אזורי עבודה</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
            {ISRAELI_CITIES.slice(0, 10).map(c => (
              <Chip key={c} label={c} selected={SELECTED_CITIES.includes(c)} />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}