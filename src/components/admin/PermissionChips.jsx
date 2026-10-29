import { Bell, MapPin } from 'lucide-react';

/**
 * PermissionChips — the two device permissions that decide whether a user can
 * actually be reached, shown on the user's own row in the admin dashboard.
 *
 *   ✓ granted  the user approved it
 *   ✕ denied   the user (or the OS) refused it
 *   —          never seen yet (no value on the record)
 */
const TONES = {
  granted: { color: '#166534', bg: '#dcfce7', border: '#bbf7d0', mark: '✓' },
  denied: { color: '#b91c1c', bg: '#fef2f2', border: '#fecaca', mark: '✕' },
  unknown: { color: 'var(--text-3)', bg: 'var(--surface-3)', border: 'var(--border-1)', mark: '—' },
};

function Chip({ Icon, label, value, grantedTitle, deniedTitle, idleTitle }) {
  const state = value === 'granted' ? 'granted' : value === 'denied' ? 'denied' : 'unknown';
  const tone = TONES[state];
  const title = state === 'granted' ? grantedTitle : state === 'denied' ? deniedTitle : idleTitle;
  return (
    <span
      title={title}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 3,
        fontSize: 9, fontWeight: 800, padding: '1px 6px', borderRadius: 6,
        background: tone.bg, color: tone.color, border: `1px solid ${tone.border}`,
        whiteSpace: 'nowrap',
      }}
    >
      <Icon size={9} /> {label} {tone.mark}
    </span>
  );
}

export default function PermissionChips({ user }) {
  return (
    <>
      <Chip
        Icon={Bell}
        label="התראות"
        value={user.push_permission}
        grantedTitle="התראות מופעלות במכשיר"
        deniedTitle="ההתראות חסומות במכשיר"
        idleTitle="טרם אושרו התראות"
      />
      <Chip
        Icon={MapPin}
        label="מיקום"
        value={user.location_permission}
        grantedTitle="שיתוף מיקום מאושר"
        deniedTitle="שיתוף מיקום חסום"
        idleTitle="טרם אושר שיתוף מיקום"
      />
    </>
  );
}