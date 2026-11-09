import { MapPin, Navigation } from 'lucide-react';
import NavButtons from '@/components/NavButtons';

/**
 * MapUnavailableCard — what a task's location shows when the map itself cannot.
 *
 * Before this, a failed (or never-arriving) map token left a spinner turning on
 * a pale blue box. Forever: the token promise simply resolved with nothing, no
 * state changed, and the box kept spinning while the task location — the one
 * thing the person needed — was never shown at all.
 *
 * A spinner with no end is worse than no map. So the failure gets a real answer:
 * the address in words, and the two buttons that actually get somebody there.
 * Waze and Google Maps open natively and need no map inside the app, which is
 * exactly why they are the right fallback rather than a retry loop.
 */
export default function MapUnavailableCard({ task, height = 220, fullScreen = false, t, title, note }) {
  const address = [task?.location_name, task?.city].filter(Boolean).join(', ');

  return (
    <div
      style={{
        minHeight: fullScreen ? '100dvh' : height,
        background: 'var(--surface-2)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: 14, padding: '24px 20px', textAlign: 'center',
        boxSizing: 'border-box',
      }}
    >
      <div style={{
        width: 52, height: 52, borderRadius: '50%',
        background: 'var(--surface-3)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <MapPin size={24} strokeWidth={1.9} color="var(--brand-primary)" />
      </div>

      <div style={{ maxWidth: 340 }}>
        <div style={{ fontSize: 14.5, fontWeight: 800, color: 'var(--text-1)' }}>
          {title || t('map_unavailable_title', 'המפה לא זמינה כרגע')}
        </div>
        {address && (
          <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 5, lineHeight: 1.45 }}>
            {address}
          </div>
        )}
        <div style={{ fontSize: 12.5, color: 'var(--text-3)', marginTop: 6, lineHeight: 1.45 }}>
          {note || t('map_unavailable_note', 'אפשר עדיין להגיע ליעד דרך ניווט חיצוני:')}
        </div>
      </div>

      <NavButtons lat={task?.lat} lng={task?.lng} locationName={address} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, color: 'var(--text-3)', fontWeight: 600 }}>
        <Navigation size={12} strokeWidth={2} />
        {t('map_unavailable_hint', 'הכפתורים יפתחו ניווט במכשיר')}
      </div>
    </div>
  );
}