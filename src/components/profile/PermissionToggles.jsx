import { useCallback, useEffect, useState } from 'react';
import { MapPin, Bell, Loader2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import {
  checkLocationPermission, requestLocation,
  getNotificationStatus, requestNotifications, registerPushToken,
} from '@/lib/permissions';

/**
 * Two switches that reflect — and request — the device permissions the app
 * relies on: location and notifications.
 *
 * Turning a switch ON shows the operating-system permission dialog. Turning it
 * OFF cannot be done from the app: the OS only lets the user revoke a
 * permission in device settings, so the switch snaps back and says so.
 */
function PermissionRow({ icon: Icon, iconBg, iconColor, label, sub, granted, loading, onToggle, hint }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 14px' }}>
      <div style={{ width: 38, height: 38, borderRadius: 11, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={17} color={iconColor} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)' }}>{label}</div>
        <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 1 }}>{sub}</div>
        {hint && <div style={{ fontSize: 11, color: 'var(--color-warning)', marginTop: 3, fontWeight: 600 }}>{hint}</div>}
      </div>
      {loading
        ? <Loader2 size={18} className="animate-spin" color="var(--text-3)" />
        : <Switch checked={granted} onCheckedChange={onToggle} />}
    </div>
  );
}

export default function PermissionToggles() {
  const [location, setLocation] = useState(null);      // 'granted' | 'denied' | 'prompt'
  const [notifications, setNotifications] = useState(null);
  const [busy, setBusy] = useState(null);              // 'location' | 'notifications'
  const [hint, setHint] = useState(null);              // key of the row showing the "turn off in settings" note

  const refresh = useCallback(async () => {
    const [loc, notif] = await Promise.all([checkLocationPermission(), getNotificationStatus()]);
    setLocation(loc);
    setNotifications(notif);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  // Permissions can change while the app is backgrounded (the user flipping
  // them in device settings), so re-read them whenever the app comes back.
  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === 'visible') refresh(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [refresh]);

  const handleLocationToggle = async (next) => {
    setHint(null);
    if (!next) { setHint('location'); return; }
    setBusy('location');
    const status = await requestLocation();
    setLocation(status);
    setBusy(null);
  };

  const handleNotificationToggle = async (next) => {
    setHint(null);
    if (!next) { setHint('notifications'); return; }
    setBusy('notifications');
    const status = await requestNotifications();
    setNotifications(status);
    if (status === 'granted') await registerPushToken();
    setBusy(null);
  };

  return (
    <div style={{ background: 'var(--surface-2)', borderRadius: 14, border: '1px solid var(--border-1)', overflow: 'hidden' }}>
      <div style={{ padding: '14px 14px 4px' }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-3)' }}>הרשאות</div>
        <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 3, lineHeight: 1.5 }}>
          הפעילו הרשאות כדי לקבל משימות קרובות ולהתעדכן מיד כשיש חדש.
        </div>
      </div>

      <PermissionRow
        icon={MapPin} iconBg="#f0f9ff" iconColor="#0369a1"
        label="הרשאת מיקום"
        sub={location === 'granted' ? 'פעיל — רואים משימות בקרבתכם' : 'נדרש כדי להציג משימות קרובות'}
        granted={location === 'granted'}
        loading={busy === 'location' || location === null}
        onToggle={handleLocationToggle}
        hint={hint === 'location' ? 'לכיבוי יש להיכנס להגדרות המכשיר' : null}
      />

      <div style={{ height: 1, background: 'var(--border-1)', margin: '0 14px 0 64px' }} />

      <PermissionRow
        icon={Bell} iconBg="#fffbeb" iconColor="#d97706"
        label="הרשאת התראות"
        sub={notifications === 'granted' ? 'פעיל — תקבלו עדכונים על משימות וצ׳אטים' : 'נדרש כדי לקבל עדכונים בזמן אמת'}
        granted={notifications === 'granted'}
        loading={busy === 'notifications' || notifications === null}
        onToggle={handleNotificationToggle}
        hint={hint === 'notifications' ? 'לכיבוי יש להיכנס להגדרות המכשיר' : null}
      />
    </div>
  );
}