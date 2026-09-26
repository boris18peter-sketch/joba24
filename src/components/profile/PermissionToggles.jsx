import { useCallback, useEffect, useState } from 'react';
import { MapPin, Bell, Loader2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import {
  getLocationStatus, requestLocation,
  getNotificationStatus, requestNotifications,
  registerPushToken, getAppSettingsIntent,
} from '@/lib/permissions';

/**
 * Two switches that reflect — and request — the device permissions the app
 * relies on: location and notifications.
 *
 * Turning a switch ON opens the operating-system permission dialog, and the
 * switch then shows exactly what the OS answered. Turning it OFF cannot be done
 * from the app — the OS only lets the user revoke a permission in device
 * settings — so the switch snaps back and says so.
 *
 * Whenever the OS dialog cannot be opened at all (blocked, or the OS will not
 * ask again), the row says what happened and links straight to device settings
 * instead of leaving the user with a switch that appears to do nothing.
 */
/**
 * The note shown when the OS will not open its own permission dialog again.
 * Returns null while the dialog can still be shown, so the app never nudges
 * the user to device settings when it can just ask directly.
 */
function blockedNote(status, href) {
  if (status === 'denied') return { text: 'ההרשאה נחסמה במערכת.', href };
  if (status === 'unavailable') return { text: 'לא ניתן לפתוח כאן את חלון ההרשאה.', href };
  return null;
}

function PermissionRow({ icon: Icon, iconBg, iconColor, label, sub, granted, loading, onToggle, note }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 14px' }}>
      <div style={{ width: 38, height: 38, borderRadius: 11, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={17} color={iconColor} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)' }}>{label}</div>
        <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 1 }}>{sub}</div>
        {note && (
          <div style={{ fontSize: 11, color: 'var(--color-warning)', marginTop: 3, fontWeight: 600, lineHeight: 1.55 }}>
            {note.text}{' '}
            {note.href
              ? <a href={note.href} style={{ color: 'var(--brand-primary)', fontWeight: 800 }}>פתח הגדרות</a>
              : <span style={{ color: 'var(--text-2)' }}>הגדרות ← Joba24</span>}
          </div>
        )}
      </div>
      {loading
        ? <Loader2 size={18} className="animate-spin" color="var(--text-3)" />
        : <Switch checked={granted} onCheckedChange={onToggle} />}
    </div>
  );
}

export default function PermissionToggles() {
  const [location, setLocation] = useState(null);      // 'granted' | 'denied' | 'prompt' | 'unavailable'
  const [notifications, setNotifications] = useState(null);
  const [busy, setBusy] = useState(null);              // 'location' | 'notifications'
  const [notes, setNotes] = useState({});              // { location: {text, href}, notifications: {...} }

  const locationSettings = getAppSettingsIntent('location');
  const notificationSettings = getAppSettingsIntent('notifications');

  const refresh = useCallback(async () => {
    const [loc, notif] = await Promise.all([getLocationStatus(), getNotificationStatus()]);
    setLocation(loc);
    setNotifications(notif);
    // Already blocked at the OS level: the dialog will not open again, so the
    // row points at device settings instead of a switch that cannot help.
    setNotes(prev => ({
      location: loc === 'granted' ? null : (blockedNote(loc, locationSettings) || prev.location || null),
      notifications: notif === 'granted' ? null : (blockedNote(notif, notificationSettings) || prev.notifications || null),
    }));
  }, [locationSettings, notificationSettings]);

  useEffect(() => { refresh(); }, [refresh]);

  // Permissions can change while the app is backgrounded (the user flipping
  // them in device settings), so re-read them whenever the app comes back.
  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === 'visible') refresh(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [refresh]);

  /**
   * Turns the OS answer into the note shown under the row. A granted permission
   * clears the note; anything else explains what happened and, when the OS will
   * no longer ask, points at device settings.
   */
  const setOutcome = (key, status, href) => {
    setNotes(prev => ({
      ...prev,
      [key]: status === 'granted'
        ? null
        : (blockedNote(status, href) || { text: 'ההרשאה טרם אושרה.' }),
    }));
  };

  const handleLocationToggle = async (next) => {
    if (!next) { setOutcome('location', 'denied', locationSettings); return; }
    setBusy('location');
    const status = await requestLocation();
    setLocation(status);
    setBusy(null);
    setOutcome('location', status, locationSettings);
  };

  const handleNotificationToggle = async (next) => {
    if (!next) { setOutcome('notifications', 'denied', notificationSettings); return; }
    setBusy('notifications');
    const status = await requestNotifications();
    setNotifications(status);
    setOutcome('notifications', status, notificationSettings);
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
        note={notes.location}
      />

      <div style={{ height: 1, background: 'var(--border-1)', margin: '0 14px 0 64px' }} />

      <PermissionRow
        icon={Bell} iconBg="#fffbeb" iconColor="#d97706"
        label="הרשאת התראות"
        sub={notifications === 'granted' ? 'פעיל — תקבלו עדכונים על משימות וצ׳אטים' : 'נדרש כדי לקבל עדכונים בזמן אמת'}
        granted={notifications === 'granted'}
        loading={busy === 'notifications' || notifications === null}
        onToggle={handleNotificationToggle}
        note={notes.notifications}
      />
    </div>
  );
}