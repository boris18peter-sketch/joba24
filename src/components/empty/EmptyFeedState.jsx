import { useState } from 'react';
import {
  Briefcase, Bell, BellRing, Check, MapPin, Navigation,
  MessageCircle, Send, Facebook, Loader2, Settings,
} from 'lucide-react';
import { useLanguage } from '@/lib/LanguageContext';
import { useAuth } from '@/lib/AuthContext';
import { showPermissionPopup } from '@/lib/permissionPopup';
import { enablePushNotifications } from '@/hooks/usePushNotifications';
import useDevicePermissions from '@/hooks/useDevicePermissions';
import useCommunityConfig, { isRealLink } from '@/hooks/useCommunityConfig';

/**
 * EmptyFeedState — the feed when there is NOTHING to show, which is a different
 * message from "your search found nothing" (that one is EmptySearchState).
 *
 * ── WHY THE TWO STATES ARE SPLIT ────────────────────────────────────────────
 * "מחקת סינון ותמצא משימות" and "עוד לא פורסמו משימות" are two different facts,
 * and telling a visitor to change a filter when the marketplace is simply empty
 * sends them to fix something that is not broken. This screen is only ever
 * rendered when no task is available at all, with the search and filters
 * ignored (HomeFeed answers that question from the unfiltered task list).
 *
 * ── WHY THE PERMISSION AREA IS DYNAMIC ──────────────────────────────────────
 * Here the only useful action is "let us reach you when something is posted",
 * so the screen offers exactly the steps this device still has open:
 *   · notifications off            → one button that asks for them;
 *   · notifications on and a token
 *     actually registered          → a quiet confirmation, no button;
 *   · blocked in the device        → how to unblock, never a second ask the OS
 *                                    would refuse to show;
 *   · location not granted         → an optional button that asks for it while
 *                                    the app is in use, or the city picker when
 *                                    the device has blocked it for good.
 * Everything is read from the device on every return to the app (see
 * useDevicePermissions), so a permission changed in Settings is reflected here
 * instead of a value remembered from a previous launch.
 */
const Pill = ({ children, ...rest }) => (
  <button
    type="button"
    {...rest}
    style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '8px 13px', borderRadius: 999,
      background: 'var(--surface-2)',
      border: '1px solid var(--border-1)',
      color: 'var(--text-2)', fontSize: 12.5, fontWeight: 700,
      cursor: 'pointer', textDecoration: 'none',
      minHeight: 'unset', minWidth: 'unset',
    }}
  >
    {children}
  </button>
);

/* A permission that IS granted: one quiet green line, no button. */
const StatusLine = ({ children }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '2px 0' }}>
    <Check size={14} color="var(--color-success)" strokeWidth={2.8} style={{ flexShrink: 0 }} />
    <span style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--color-success)' }}>{children}</span>
  </div>
);

/* A permission the screen still has to do something about — one full-width row,
   the SAME height and shape for both notifications and location, so the two
   never look like different kinds of thing. `primary` is reserved for the main
   ask (notifications); the other is a bordered row on the card surface. */
const PermRow = ({ icon: Icon, variant = 'outline', busy, children, ...rest }) => {
  const primary = variant === 'primary';
  return (
    <button
      type="button"
      {...rest}
      style={{
        width: '100%', height: 50, borderRadius: 14,
        border: primary ? 'none' : '1.5px solid var(--border-1)',
        background: primary
          ? 'linear-gradient(135deg, var(--brand-primary), var(--brand-primary-dark))'
          : 'var(--surface-2)',
        color: primary ? '#fff' : 'var(--text-1)',
        fontWeight: primary ? 900 : 800,
        fontSize: primary ? 15 : 14,
        cursor: rest.disabled ? 'wait' : 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        boxShadow: primary ? '0 6px 20px rgba(26,111,212,0.3)' : 'none',
      }}
    >
      {busy ? <Loader2 size={17} className="animate-spin" /> : <Icon size={primary ? 17 : 16} strokeWidth={2.2} />}
      {children}
    </button>
  );
};

export default function EmptyFeedState({ onEnableLocation }) {
  const { isRTL } = useLanguage();
  const { user, refreshUser } = useAuth();
  const { push, location, refresh } = useDevicePermissions();
  const { config } = useCommunityConfig();
  const [pushBusy, setPushBusy] = useState(false);
  const [locBusy, setLocBusy] = useState(false);

  // A granted permission is not enough on its own: without a registered device
  // token no update can ever reach the phone, so both must be true before this
  // screen is allowed to say "notifications are on".
  const registered = (user?.fcm_tokens || []).length > 0;
  const notificationsOn = push === 'granted' && registered;

  const askNotifications = async () => {
    setPushBusy(true);
    try {
      await enablePushNotifications();
      await refresh();
      await refreshUser?.();
    } finally {
      setPushBusy(false);
    }
  };

  const explainBlockedNotifications = () => {
    showPermissionPopup({
      kind: 'notifications',
      mode: 'denied',
      onRetry: async () => {
        await refresh();
        await refreshUser?.();
      },
    });
  };

  const askLocation = async () => {
    setLocBusy(true);
    try {
      await onEnableLocation?.();
      await refresh();
    } finally {
      setLocBusy(false);
    }
  };

  // The device has blocked the location for good, so the OS will not show the
  // dialog again: the shared sheet explains where to reopen it, exactly as it
  // does for notifications.
  const explainBlockedLocation = () => {
    showPermissionPopup({
      kind: 'location',
      mode: 'denied',
      onRetry: async () => {
        await refresh();
      },
    });
  };

  const community = [
    { url: config.whatsapp_url, label: 'וואטסאפ', icon: MessageCircle },
    { url: config.telegram_url, label: 'טלגרם', icon: Send },
    { url: config.facebook_url, label: 'פייסבוק', icon: Facebook },
  ].filter((c) => isRealLink(c.url));

  return (
    <>
      <style>{`
        @keyframes emptyFadeUp {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes emptyIconFloat {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-6px); }
        }
      `}</style>

      <div
        dir={isRTL ? 'rtl' : 'ltr'}
        style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          padding: '52px 24px 32px',
          animation: 'emptyFadeUp 0.4s ease-out both',
        }}
      >
        {/* Badge — the same circle as the search-empty icon, carrying the trade */}
        <div style={{
          position: 'relative', width: 76, height: 76, marginBottom: 20,
          animation: 'emptyIconFloat 3s ease-in-out infinite',
        }}>
          <div style={{
            width: 76, height: 76, borderRadius: '50%',
            background: 'var(--surface-3)',
            border: '2px solid var(--border-1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Briefcase size={30} color="var(--brand-primary)" strokeWidth={1.5} />
          </div>
          <div style={{
            position: 'absolute', bottom: -2, insetInlineStart: -2,
            width: 26, height: 26, borderRadius: '50%',
            background: 'var(--brand-primary-light)',
            border: '2px solid var(--border-1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <BellRing size={13} color="var(--brand-primary)" strokeWidth={2} />
          </div>
        </div>

        <p style={{
          fontWeight: 900, fontSize: 18,
          color: 'var(--text-1)', margin: '0 0 8px', textAlign: 'center',
          lineHeight: 1.35,
        }}>
          המשימות הבאות יופיעו בקרוב
        </p>

        {/* ── ONE SENTENCE, AND IT DEPENDS ON THE TRUTH ────────────────────
            It never asks for something that is already on, and it says what the
            visitor actually gets: a task that fits them, not "an update". */}
        <p style={{
          fontSize: 13, color: 'var(--text-3)', margin: '0 0 22px',
          textAlign: 'center', lineHeight: 1.6, maxWidth: 300,
        }}>
          {notificationsOn
            ? 'אין כרגע משימות זמינות. תקבל עדכון על משימות שמתאימות לפרופיל ולמיקום שלך.'
            : 'הפעל התראות וקבל עדכון על משימות שמתאימות לפרופיל ולמיקום שלך.'}
        </p>

        <div style={{ width: '100%', maxWidth: 330, display: 'flex', flexDirection: 'column', gap: 8 }}>

          {/* ── THE TWO PERMISSIONS, IN THE SAME SHAPE ────────────────────
              Notifications and location are one idea here — "let us reach you
              when a task fits" — so they answer the visitor identically:
                granted   → one quiet green line, no button at all;
                blocked   → the sheet that explains how to reopen it (the OS
                            refuses to ask a second time, so asking again would
                            be a dead button);
                askable   → one full-width button that asks, once.
              The location used to fall back to a city picker when blocked,
              which looked like a different feature entirely. */}
          {notificationsOn ? (
            <StatusLine>ההתראות פעילות — תקבל עדכון על משימות מתאימות לך</StatusLine>
          ) : push === 'denied' ? (
            <PermRow icon={Settings} onClick={explainBlockedNotifications}>
              ההתראות חסומות — פתח הגדרות
            </PermRow>
          ) : (
            <PermRow variant="primary" icon={Bell} onClick={askNotifications} busy={pushBusy}>
              הפעל התראות
            </PermRow>
          )}

          {location === 'granted' ? (
            <StatusLine>המיקום פעיל — תקבל עדכון על משימות באזורך</StatusLine>
          ) : location === 'denied' ? (
            <PermRow icon={MapPin} onClick={explainBlockedLocation}>
              המיקום חסום — פתח הגדרות
            </PermRow>
          ) : (
            <PermRow icon={Navigation} onClick={askLocation} busy={locBusy}>
              הפעל מיקום
            </PermRow>
          )}

          {/* ── Community — only the links that were really configured ── */}
          {community.length > 0 && (
            <div style={{
              display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center',
              marginTop: 6, paddingTop: 12, borderTop: '1px solid var(--border-1)',
            }}>
              {community.map(({ url, label, icon: Icon }) => (
                <a key={label} href={url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                  <Pill>
                    <Icon size={13} strokeWidth={2.2} />
                    {label}
                  </Pill>
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}