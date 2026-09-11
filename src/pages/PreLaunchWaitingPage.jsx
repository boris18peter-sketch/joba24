import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, CheckCircle2, Zap, ChevronLeft, ShieldCheck, Award, Sparkles, Download, Users, Pencil, X } from 'lucide-react';
import { useLanguage } from '@/lib/LanguageContext';
import { base44 } from '@/api/base44Client';
import { requestNotificationPermission, getFCMToken } from '@/lib/fcm';
import { useAuth } from '@/lib/AuthContext';
import VerifyModal from '@/components/VerifyModal';
import StoreDownloadButtons from '@/components/StoreDownloadButtons';
import SocialConnectSheet, { PLATFORMS } from '@/components/SocialConnectSheet';
import { isStandaloneApp } from '@/lib/utils';
import NotificationsPermissionPrompt from '@/components/NotificationsPermissionPrompt';
import { isAndroidWebView, hasCapacitorBridge } from '@/lib/nativeEnv';

const BRAND_LOGO = 'https://media.base44.com/images/public/69e6bdb4986a04a256653a23/d5824a161_IMG_0357.jpg';

const ACTION_BTN = {
  padding: '8px 14px', borderRadius: 10, flexShrink: 0,
  fontSize: 13, fontWeight: 800, cursor: 'pointer',
  display: 'inline-flex', alignItems: 'center', gap: 4,
};

// ── Badge icons for step circles ──
const GreenBadgeIcon = ({ size = 24, done = false }) => (
  <div style={{ width: size, height: size, borderRadius: '50%', background: done ? 'linear-gradient(135deg,#16a34a,#059669)' : 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: done ? '0 2px 8px rgba(22,163,74,0.3)' : 'none', border: done ? 'none' : '1.5px solid rgba(255,255,255,0.2)', transition: 'all 0.3s ease' }}>
    {done && (
      <svg width={size * 0.58} height={size * 0.58} viewBox="0 0 10 10" fill="none">
        <path d="M2 5.5L4 7.5L8 3" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    )}
  </div>
);

const GoldBadgeIcon = ({ size = 24, done = false }) => (
  <div style={{ width: size, height: size, borderRadius: '50%', background: done ? 'linear-gradient(135deg,#fbbf24,#d97706)' : 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: done ? '0 2px 8px rgba(217,119,6,0.3)' : 'none', border: done ? 'none' : '1.5px solid rgba(255,255,255,0.2)', transition: 'all 0.3s ease' }}>
    {done && (
      <svg width={size * 0.58} height={size * 0.58} viewBox="0 0 10 10" fill="none">
        <path d="M2 5.5L4 7.5L8 3" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    )}
  </div>
);

// ── Registration counter — persistent, only increases, survives reloads ──
const STORAGE_KEY = 'joba24_worker_count';
const START_COUNT = 648;
const BASE_DATE = new Date('2026-09-09T00:00:00').getTime();

function getExpectedCount() {
  // Time-based growth: ~2 workers per hour since launch day, never decreases
  const hoursSinceBase = (Date.now() - BASE_DATE) / 3600000;
  const growth = Math.max(0, Math.floor(hoursSinceBase * 2.3));
  return START_COUNT + growth;
}

function RegistrationCounter() {
  const [count, setCount] = useState(() => {
    const stored = Number(localStorage.getItem(STORAGE_KEY));
    const expected = getExpectedCount();
    // Use whichever is higher — never go backwards
    return Math.max(stored, expected);
  });
  const [justChanged, setJustChanged] = useState(false);

  const bump = () => {
    setCount(c => {
      const next = c + Math.floor(Math.random() * 3) + 1;
      localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
    setJustChanged(true);
    setTimeout(() => setJustChanged(false), 2000);
  };

  useEffect(() => {
    // Sync with expected count on mount (in case time passed since last visit)
    const expected = getExpectedCount();
    setCount(c => {
      const next = Math.max(c, expected);
      localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
    const firstBump = setTimeout(bump, 10000);
    const interval = setInterval(bump, 300000);
    return () => { clearTimeout(firstBump); clearInterval(interval); };
  }, []);

  return (
    <div style={{ textAlign: 'center', marginBottom: 14 }}>
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        background: 'rgba(255,255,255,0.08)',
        border: '1px solid rgba(255,255,255,0.15)',
        borderRadius: 99, padding: '8px 18px',
        backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
      }}>
        <Users size={14} color="rgba(255,255,255,0.7)" />
        <span style={{
          fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.85)',
          transition: 'transform 0.3s ease',
          transform: justChanged ? 'scale(1.12)' : 'scale(1)',
          display: 'inline-flex', alignItems: 'baseline', gap: 3,
        }}>
          כבר
          <span style={{ color: '#fbbf24', fontSize: 16, fontWeight: 900 }}>{count.toLocaleString()}</span>
          הצטרפו ל-Joba24
        </span>
      </div>
    </div>
  );
}

// ── Compact step row — shows "✓ X פעיל" when done ──
function StepRow({ icon: Icon, title, subtitle, state, action, customIcon }) {
  const done = state === 'done';
  const pending = state === 'pending';
  const border = done ? 'rgba(52,211,153,0.35)' : pending ? 'rgba(251,191,36,0.35)' : 'rgba(255,255,255,0.1)';
  const bg = done ? 'rgba(52,211,153,0.06)' : pending ? 'rgba(251,191,36,0.06)' : 'rgba(255,255,255,0.05)';
  const iconBg = done ? 'rgba(52,211,153,0.15)' : pending ? 'rgba(251,191,36,0.15)' : 'rgba(255,255,255,0.08)';

  const useCustomBadge = !!customIcon;
  const badgeSize = 34;

  const iconContent = useCustomBadge
    ? React.cloneElement(customIcon, { done, size: badgeSize })
    : done
      ? <CheckCircle2 size={20} color="#34d399" strokeWidth={2.5} />
      : <Icon size={20} color="rgba(255,255,255,0.75)" />;

  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{
        background: bg, backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
        border: `1.5px solid ${border}`, borderRadius: 14, padding: '12px 14px',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        {/* When a custom badge is used, the box is transparent — only the badge shows.
            No double-circle effect. */}
        <div style={{
          width: useCustomBadge ? badgeSize : 40,
          height: useCustomBadge ? badgeSize : 40,
          borderRadius: useCustomBadge ? '50%' : 10,
          flexShrink: 0,
          background: useCustomBadge ? 'transparent' : iconBg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: useCustomBadge ? 'none' : `1px solid ${border}`,
        }}>
          {iconContent}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: done ? 'rgba(255,255,255,0.95)' : 'white' }}>
            {title}
          </div>
          {subtitle && (
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 1.4, marginTop: 1 }}>{subtitle}</div>
          )}
        </div>
        {action}
      </div>
    </div>
  );
}

// ── Completion badge for the "all done" state ──
function CompletionItem({ icon, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
      <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg,#10b981,#059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <CheckCircle2 size={16} color="white" strokeWidth={2.5} />
      </div>
      <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)', flex: 1 }}>{label}</span>
      {icon}
    </div>
  );
}

export default function PreLaunchWaitingPage({ me }) {
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const { t } = useLanguage();
  const inApp = isStandaloneApp || (typeof window !== 'undefined' && !!window.Capacitor?.isNativePlatform?.());
  const [notifPerm, setNotifPerm] = useState('default');
  const [hasFcmToken, setHasFcmToken] = useState(false);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [showSocialConnect, setShowSocialConnect] = useState(false);
  const [socialLoading, setSocialLoading] = useState(false);
  const [showNotifSettings, setShowNotifSettings] = useState(false);

  useEffect(() => {
    if (typeof Notification !== 'undefined') {
      setNotifPerm(Notification.permission);
    }
    // In native apps the web Notification API doesn't exist, so check for
    // an FCM token instead — if the user has one, they can receive pushes.
    if (me?.fcm_tokens?.length > 0) {
      setHasFcmToken(true);
    }
  }, [me?.fcm_tokens]);

  const handleEnableNotifications = async () => {
    // On Android WebView without Capacitor bridge (old server.url build),
    // the web Notification API CANNOT trigger the native POST_NOTIFICATIONS
    // dialog — the WebView doesn't support notification permission prompts
    // (unlike geolocation). So we skip the doomed requestPermission() call
    // and show a settings redirect modal with an intent:// button instead.
    if (isAndroidWebView() && !hasCapacitorBridge()) {
      setShowNotifSettings(true);
      setNotifPerm('denied');
      return;
    }

    const perm = await requestNotificationPermission();
    setNotifPerm(perm);
    if (perm === 'granted') {
      const token = await getFCMToken();
      if (token) {
        try {
          const meData = await base44.auth.me();
          const existing = meData.fcm_tokens || [];
          if (!existing.includes(token)) {
            await base44.auth.updateMe({ fcm_tokens: [...existing, token] });
          }
        } catch {}
      }
    }
  };

  const notifSupported = inApp || isAndroidWebView() || typeof Notification !== 'undefined';

  const kycStatus = me?.kyc_status;
  const isKycVerified = kycStatus === 'approved';

  const handleVerifySuccess = async () => {
    setShowVerifyModal(false);
    await refreshUser();
  };

  const handleSocialConnected = async () => {
    setShowSocialConnect(false);
    await refreshUser();
  };

  const connectedPlatforms = PLATFORMS.filter(p => me?.[`${p.key}_username`] && me?.[`${p.key}_verified`]);
  const isSocialConnected = connectedPlatforms.length > 0;

  const handleDisconnectSocial = async (platform) => {
    setSocialLoading(true);
    try {
      await base44.functions.invoke('verifyInstagram', { action: 'disconnect', platform });
      await refreshUser();
    } catch {}
    setSocialLoading(false);
  };

  // ── Step states ──
  const notifDone = notifPerm === 'granted' || hasFcmToken;
  const kycDone = isKycVerified;
  const socialDone = isSocialConnected && isKycVerified;

  const notifState = notifDone ? 'done' : 'default';
  const kycStepState = kycDone ? 'done' : kycStatus === 'pending' ? 'pending' : 'default';
  const socialStepState = socialDone ? 'done' : isSocialConnected ? 'pending' : 'default';

  return (
    <div dir="rtl" style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'linear-gradient(170deg, #0a1f4e 0%, #0f2b6b 40%, #1a6fd4 100%)',
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Decorative blurred glows */}
      <div style={{ position: 'absolute', top: '-8%', right: '-12%', width: 240, height: 240, borderRadius: '50%', background: 'radial-gradient(circle, rgba(251,191,36,0.15) 0%, transparent 70%)', filter: 'blur(35px)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '-8%', left: '-12%', width: 240, height: 240, borderRadius: '50%', background: 'radial-gradient(circle, rgba(26,111,212,0.3) 0%, transparent 70%)', filter: 'blur(35px)', pointerEvents: 'none' }} />

      {/* Scrollable content */}
      <div style={{
        flex: 1, overflowY: 'auto', overflowX: 'hidden',
        WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain',
        padding: 'max(20px, env(safe-area-inset-top)) 18px max(20px, env(safe-area-inset-bottom))',
        position: 'relative', zIndex: 1,
      }}>

        {/* ── Hero ── */}
        <div style={{ textAlign: 'center', marginBottom: 18 }}>
          <div style={{
            width: 60, height: 60, borderRadius: 18, overflow: 'hidden',
            margin: '0 auto 10px', border: '2px solid rgba(255,255,255,0.2)',
            boxShadow: '0 6px 22px rgba(0,0,0,0.3)',
          }}>
            <img src={BRAND_LOGO} alt="Joba24" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <h1 style={{ fontSize: 25, fontWeight: 900, color: 'white', margin: 0, lineHeight: 1.25 }}>
            {me?.full_name ? `${me.full_name.split(' ')[0]}, הפרופיל שלך מוכן! 🎉` : 'הפרופיל שלך מוכן! 🎉'}
          </h1>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.72)', margin: '10px auto 0', lineHeight: 1.6, maxWidth: 340 }}>
            זהו מסך זמני לקראת הפתיחה! בימים הקרובים יתחילו לעלות ל־Joba24 המון משימות ועבודות חדשות שתוכל לראות, לבחור ולהגיש אליהן מועמדות ישירות מהאפליקציה.
          </p>
        </div>

        {/* Store download */}
        {!inApp && (
          <div style={{
            background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
            border: '1.5px solid rgba(251,191,36,0.3)', borderRadius: 16,
            padding: '14px 16px 16px', marginBottom: 20, textAlign: 'center',
          }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
              <Download size={15} color="#fbbf24" />
              <span style={{ fontSize: 14, fontWeight: 800, color: 'white' }}>הורד את האפליקציה ותישאר מעודכן</span>
            </div>
            <StoreDownloadButtons size="md" />
          </div>
        )}

        {/* ═══ CHECKLIST ═══ */}
        <>
            {/* Section header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <Zap size={18} color="#fbbf24" />
              <span style={{ fontSize: 16, fontWeight: 800, color: 'white' }}>כדי שלא תפספס משימה</span>
            </div>

            {/* Step 1: Notifications */}
            <StepRow
              icon={Bell}
              state={notifState}
              title={notifDone ? 'התראות פעילות' : 'התראות'}
              subtitle={notifDone ? 'מומלץ גם להפעיל מיקום בהגדרות למשימות קרובות.' : notifPerm === 'denied' ? 'הפעל התראות מהגדרות הטלפון → Joba24. מומלץ גם להפעיל מיקום.' : 'קבל עדכון מיד על משימה מתאימה. מומלץ גם להפעיל מיקום בהגדרות.'}
              action={!notifDone ? (
                <button onClick={handleEnableNotifications} style={{ ...ACTION_BTN, background: 'rgba(251,191,36,0.15)', border: '1px solid rgba(251,191,36,0.4)', color: '#fbbf24' }}>
                  אפשר <ChevronLeft size={13} />
                </button>
              ) : null}
            />

            {/* Step 2: KYC */}
            <StepRow
              icon={ShieldCheck}
              customIcon={<GreenBadgeIcon />}
              state={kycStepState}
              title={kycDone ? 'זהות אומתה' : 'אימות זהות'}
              subtitle={kycDone ? null : kycStatus === 'pending' ? 'נשלח, ממתין לאישור.' : 'קבל וי ירוק וחזק את האמון בפרופיל.'}
              action={!kycDone && kycStatus !== 'pending' ? (
                <button onClick={() => setShowVerifyModal(true)} style={{ ...ACTION_BTN, background: 'rgba(52,211,153,0.15)', border: '1px solid rgba(52,211,153,0.4)', color: '#34d399' }}>
                  אמת <ChevronLeft size={13} />
                </button>
              ) : null}
            />

            {/* Step 3: Social */}
            <StepRow
              icon={isSocialConnected && isKycVerified ? Award : Sparkles}
              customIcon={<GoldBadgeIcon />}
              state={socialStepState}
              title={socialDone ? 'רשת חברתית חוברה' : 'רשת חברתית'}
              subtitle={socialDone ? null : isSocialConnected
                ? `מחובר: ${connectedPlatforms.map(p => p.label).join(', ')}`
                : 'קבל וי זהב וחזק את הפרופיל.'}
              action={
                <button
                  onClick={() => setShowSocialConnect(true)}
                  disabled={socialLoading}
                  style={{ ...ACTION_BTN, background: 'rgba(251,191,36,0.15)', border: '1px solid rgba(251,191,36,0.4)', color: '#fbbf24' }}
                >
                  {isSocialConnected ? 'עוד' : 'חבר'} <ChevronLeft size={13} />
                </button>
              }
            />

            {/* Connected platforms chips */}
            {isSocialConnected && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4, marginBottom: 6, paddingRight: 4 }}>
                {connectedPlatforms.map(p => (
                  <span key={p.key} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.3)', borderRadius: 99, padding: '5px 10px 5px 6px' }}>
                    <span style={{ width: 18, height: 18, borderRadius: 5, background: p.brandColor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <p.icon size={11} color="white" />
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.85)' }}>@{me?.[`${p.key}_username`]}</span>
                    <button
                      onClick={() => handleDisconnectSocial(p.key)}
                      disabled={socialLoading}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', opacity: 0.6, minHeight: 'unset', minWidth: 'unset' }}
                      title="נתק"
                    >
                      <ChevronLeft size={14} color="rgba(255,255,255,0.6)" style={{ transform: 'rotate(90deg)' }} />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Live counter */}
            <RegistrationCounter />

          </>

        {/* Edit preferences — secondary, smaller */}
        <button
          onClick={() => navigate('/join?edit=1&preview=1')}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            padding: '10px 16px', borderRadius: 12, margin: '0 auto 4px',
            background: 'transparent', border: '1px solid rgba(255,255,255,0.18)',
            color: 'rgba(255,255,255,0.75)', fontSize: 13, fontWeight: 700, cursor: 'pointer',
            minHeight: 'unset', minWidth: 'unset',
          }}
        >
          <Pencil size={13} color="rgba(255,255,255,0.6)" />
          שינוי קטגוריות והעדפות
        </button>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginBottom: 18 }}>
          ניתן לעדכן את ההעדפות בכל שלב.
        </div>

        {/* Footer links */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10, marginTop: 4, flexWrap: 'nowrap' }}>
          <Link to="/terms" style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', textDecoration: 'none', fontWeight: 600, whiteSpace: 'nowrap' }}>{t('terms_title')}</Link>
          <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 13 }}>|</span>
          <Link to="/privacy" style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', textDecoration: 'none', fontWeight: 600, whiteSpace: 'nowrap' }}>{t('privacy_title')}</Link>
          <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 13 }}>|</span>
          <Link to="/faq" style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', textDecoration: 'none', fontWeight: 600, whiteSpace: 'nowrap' }}>{t('faq_title')}</Link>
        </div>
      </div>

      {/* Auto-trigger notification permission on first app entry (not second) */}
      <NotificationsPermissionPrompt />

      {showVerifyModal && createPortal(
        <VerifyModal
          onClose={() => setShowVerifyModal(false)}
          onSuccess={handleVerifySuccess}
        />,
        document.body
      )}

      {showSocialConnect && createPortal(
        <SocialConnectSheet user={me} onClose={handleSocialConnected} />,
        document.body
      )}

      {showNotifSettings && createPortal(
        <div
          dir="rtl"
          onClick={(e) => { if (e.target === e.currentTarget) setShowNotifSettings(false); }}
          style={{
            position: 'fixed', inset: 0, zIndex: 100001,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 20, background: 'rgba(5,15,40,0.7)', backdropFilter: 'blur(6px)',
            animation: 'sheetFadeIn 0.2s ease both',
          }}
        >
          <div style={{
            width: '100%', maxWidth: 360, borderRadius: 24,
            background: 'var(--surface-2)', padding: '28px 24px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            animation: 'scaleIn 0.3s cubic-bezier(0.34,1.4,0.64,1) both',
            position: 'relative',
          }}>
            <button
              onClick={() => setShowNotifSettings(false)}
              style={{
                position: 'absolute', top: 16, left: 16,
                background: 'none', border: 'none', cursor: 'pointer',
                display: 'flex', color: 'var(--text-2)',
              }}
            >
              <X size={20} />
            </button>

            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{
                width: 56, height: 56, borderRadius: 16,
                background: 'linear-gradient(135deg,#1a6fd4,#0a52b0)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 14px',
                boxShadow: '0 4px 16px rgba(26,111,212,0.3)',
              }}>
                <Bell size={26} color="white" />
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 900, color: 'var(--text-1)', margin: '0 0 8px' }}>
                הפעלת התראות
              </h3>
              <p style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.6, margin: 0 }}>
                כדי לקבל התראות על משימות מתאימות, יש לאפשר זאת בהגדרות המכשיר:
              </p>
            </div>

            <div style={{
              background: 'var(--surface-3)', borderRadius: 14, padding: '14px 16px',
              marginBottom: 20, textAlign: 'center',
            }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-2)', lineHeight: 1.8 }}>
                הגדרות ← אפליקציות ← Joba24<br />← התראות ← אפשר הכל
              </div>
            </div>

            {/* intent:// opens the app's notification settings directly on Android */}
            <a
              href="intent://#Intent;action=android.settings.APP_NOTIFICATION_SETTINGS;S.android.app.extra.APP_PACKAGE=com.base69e6bdb4986a04a256653a23.app;end"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                width: '100%', height: 52, borderRadius: 16,
                background: 'linear-gradient(135deg,#1a6fd4,#0a52b0)',
                color: 'white', textDecoration: 'none',
                fontWeight: 900, fontSize: 15,
                boxShadow: '0 4px 16px rgba(26,111,212,0.35)',
              }}
            >
              <Bell size={18} />
              פתח הגדרות התראות
            </a>
            <button
              onClick={() => setShowNotifSettings(false)}
              style={{
                width: '100%', height: 48, borderRadius: 16, marginTop: 10,
                background: 'var(--surface-3)', border: '1px solid var(--border-1)',
                color: 'var(--text-1)', fontWeight: 700, fontSize: 14, cursor: 'pointer',
              }}
            >
              אולי אחר כך
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}