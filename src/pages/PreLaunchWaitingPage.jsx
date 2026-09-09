import { useState, useEffect } from 'react';
import { getCurrentPosition } from '@/lib/nativeGeolocation';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, MapPin, CheckCircle2, Zap, ChevronLeft, ShieldCheck, Award, Sparkles, Download, Users } from 'lucide-react';
import { useLanguage } from '@/lib/LanguageContext';
import { base44 } from '@/api/base44Client';
import { requestNotificationPermission, getFCMToken } from '@/lib/fcm';
import { useAuth } from '@/lib/AuthContext';
import VerifyModal from '@/components/VerifyModal';
import StoreDownloadButtons from '@/components/StoreDownloadButtons';
import SocialConnectSheet, { PLATFORMS } from '@/components/SocialConnectSheet';
import GoldBadge from '@/components/GoldBadge';
import VerifiedBadge from '@/components/VerifiedBadge';
import { hasSocialVerified, isStandaloneApp } from '@/lib/utils';

const BRAND_LOGO = 'https://media.base44.com/images/public/69e6bdb4986a04a256653a23/d5824a161_IMG_0357.jpg';

const ACTION_BTN = {
  padding: '10px 18px', borderRadius: 12, flexShrink: 0,
  fontSize: 14, fontWeight: 800, cursor: 'pointer',
  display: 'inline-flex', alignItems: 'center', gap: 6,
};

// ── Large badge icons for step circles ──
const GreenBadgeIcon = ({ size = 26 }) => (
  <div style={{ width: size, height: size, borderRadius: '50%', background: 'linear-gradient(135deg,#16a34a,#059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(22,163,74,0.3)' }}>
    <svg width={size * 0.58} height={size * 0.58} viewBox="0 0 10 10" fill="none">
      <path d="M2 5.5L4 7.5L8 3" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  </div>
);

const GoldBadgeIcon = ({ size = 26 }) => (
  <div style={{ width: size, height: size, borderRadius: '50%', background: 'linear-gradient(135deg,#fbbf24,#d97706)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(217,119,6,0.3)' }}>
    <svg width={size * 0.58} height={size * 0.58} viewBox="0 0 10 10" fill="none">
      <path d="M2 5.5L4 7.5L8 3" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  </div>
);

// ── Registration counter — increments 1-3 every 5 minutes ──
function RegistrationCounter() {
  const [count, setCount] = useState(648);
  const [justChanged, setJustChanged] = useState(false);

  const bump = () => {
    setCount(c => c + Math.floor(Math.random() * 3) + 1);
    setJustChanged(true);
    setTimeout(() => setJustChanged(false), 2000);
  };

  useEffect(() => {
    // First bump after 10s so the user immediately sees it's live
    const firstBump = setTimeout(bump, 10000);
    // Then every 5 minutes
    const interval = setInterval(bump, 300000);
    return () => { clearTimeout(firstBump); clearInterval(interval); };
  }, []);

  const isMilestone = count >= 1000;

  return (
    <div style={{ textAlign: 'center', marginBottom: 14 }}>
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 8,
        background: isMilestone ? 'rgba(251,191,36,0.15)' : 'rgba(255,255,255,0.08)',
        border: `1px solid ${isMilestone ? 'rgba(251,191,36,0.4)' : 'rgba(255,255,255,0.15)'}`,
        borderRadius: 99, padding: '10px 20px',
        backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
      }}>
        {isMilestone ? <span style={{ fontSize: 16 }}>🔥</span> : <Users size={16} color="rgba(255,255,255,0.7)" />}
        <span style={{
          fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.85)',
          transition: 'transform 0.3s ease',
          transform: justChanged ? 'scale(1.12)' : 'scale(1)',
          display: 'inline-flex', alignItems: 'baseline', gap: 4,
        }}>
          <span style={{ color: '#fbbf24', fontSize: 17, fontWeight: 900 }}>{count.toLocaleString()}</span>
          {isMilestone ? 'עובדים כבר בפנים' : 'עובדים כבר מוכנים לקבל משימות'}
        </span>
      </div>
    </div>
  );
}

// ── Enlarged step row ──
function StepRow({ icon: Icon, title, subtitle, state, action, badge, customIcon }) {
  const done = state === 'done';
  const pending = state === 'pending';
  const border = done ? 'rgba(52,211,153,0.4)' : pending ? 'rgba(251,191,36,0.4)' : 'rgba(255,255,255,0.12)';
  const bg = done ? 'rgba(52,211,153,0.08)' : pending ? 'rgba(251,191,36,0.08)' : 'rgba(255,255,255,0.07)';
  const iconBg = done ? 'rgba(52,211,153,0.2)' : pending ? 'rgba(251,191,36,0.18)' : 'rgba(255,255,255,0.1)';

  const iconContent = customIcon
    ? <div style={{ opacity: done ? 1 : 0.35, transition: 'opacity 0.3s' }}>{customIcon}</div>
    : done
      ? <CheckCircle2 size={22} color="#34d399" />
      : <Icon size={22} color="rgba(255,255,255,0.8)" />;

  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{
        background: bg, backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
        border: `1.5px solid ${border}`, borderRadius: 16, padding: '14px 16px',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12, flexShrink: 0,
          background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: `1px solid ${border}`,
        }}>
          {iconContent}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: 'white', marginBottom: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
            {title}
            {badge}
          </div>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.62)', lineHeight: 1.4 }}>{subtitle}</div>
        </div>
        {action}
      </div>
    </div>
  );
}

export default function PreLaunchWaitingPage({ me }) {
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const { t } = useLanguage();
  const inApp = isStandaloneApp || (typeof window !== 'undefined' && !!window.Capacitor?.isNativePlatform?.());
  const [notifPerm, setNotifPerm] = useState('default');
  const [locPerm, setLocPerm] = useState('default');
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [showSocialConnect, setShowSocialConnect] = useState(false);
  const [socialLoading, setSocialLoading] = useState(false);

  useEffect(() => {
    if (typeof Notification !== 'undefined') {
      setNotifPerm(Notification.permission);
    }
  }, []);

  const handleEnableNotifications = async () => {
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

  const handleEnableLocation = () => {
    getCurrentPosition(
      () => setLocPerm('granted'),
      (err) => setLocPerm(err?.code === 1 ? 'denied' : 'default'),
      { enableHighAccuracy: false, timeout: 10000 }
    );
  };

  const notifSupported = typeof Notification !== 'undefined';

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

  // Step states
  const notifState = notifPerm === 'granted' ? 'done' : 'default';
  const locState = locPerm === 'granted' ? 'done' : 'default';
  const kycStepState = isKycVerified ? 'done' : kycStatus === 'pending' ? 'pending' : 'default';
  const socialStepState = (isSocialConnected && isKycVerified) ? 'done' : isSocialConnected ? 'pending' : 'default';

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

        {/* Brand + Hero */}
        <div style={{ textAlign: 'center', marginBottom: 18 }}>
          <div style={{
            width: 64, height: 64, borderRadius: 18, overflow: 'hidden',
            margin: '0 auto 12px', border: '2px solid rgba(255,255,255,0.2)',
            boxShadow: '0 6px 22px rgba(0,0,0,0.3)',
          }}>
            <img src={BRAND_LOGO} alt="Joba24" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 900, color: 'white', margin: 0, lineHeight: 1.25 }}>
            {me?.full_name ? `${me.full_name.split(' ')[0]}, הפרופיל שלך מוכן! 🎉` : 'הפרופיל שלך מוכן! 🎉'}
          </h1>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.78)', margin: '8px auto 4px', lineHeight: 1.5, maxWidth: 320 }}>
            בימים הקרובים יתחילו להגיע משימות שמתאימות לך.
          </p>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', margin: '0 auto', lineHeight: 1.5, maxWidth: 320 }}>
            נתאים לך משימות לפי המיקום, הקטגוריות והפרטים שבחרת בפרופיל.
          </p>
        </div>

        {/* Store download — only for users NOT inside the app */}
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

        {/* Section header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <Zap size={18} color="#fbbf24" />
          <span style={{ fontSize: 16, fontWeight: 800, color: 'white' }}>כדי שלא תפספס משימה</span>
        </div>

        {/* Step 1: Notifications */}
        <StepRow
          icon={Bell}
          state={notifState}
          title="התראות"
          subtitle={notifPerm === 'granted' ? 'מעולה! תקבל עדכון על כל משימה חדשה.' : notifPerm === 'denied' ? 'הפעל התראות מהגדרות הטלפון → Joba24' : 'קבל עדכון מיד על משימה מתאימה.'}
          action={notifPerm !== 'granted' && notifSupported && notifPerm === 'default' ? (
            <button onClick={handleEnableNotifications} style={{ ...ACTION_BTN, background: 'rgba(251,191,36,0.15)', border: '1px solid rgba(251,191,36,0.4)', color: '#fbbf24' }}>
              אפשר <ChevronLeft size={14} />
            </button>
          ) : null}
        />

        {/* Step 2: Location */}
        <StepRow
          icon={MapPin}
          state={locState}
          title="מיקום"
          subtitle={locPerm === 'granted' ? 'מעולה! נציג לך משימות רלוונטיות באזורך.' : locPerm === 'denied' ? 'הפעל מיקום מהגדרות הטלפון → Joba24' : 'קבל משימות רלוונטיות באזור שלך.'}
          action={locPerm !== 'granted' && locPerm === 'default' ? (
            <button onClick={handleEnableLocation} style={{ ...ACTION_BTN, background: 'rgba(251,191,36,0.15)', border: '1px solid rgba(251,191,36,0.4)', color: '#fbbf24' }}>
              אפשר <ChevronLeft size={14} />
            </button>
          ) : null}
        />

        {/* Step 3: KYC — green badge icon */}
        <StepRow
          icon={ShieldCheck}
          customIcon={<GreenBadgeIcon />}
          state={kycStepState}
          title="אימות זהות"
          subtitle={isKycVerified ? 'מאומת עם ווי ירוק.' : kycStatus === 'pending' ? 'נשלח, ממתין לאישור.' : 'קבל ווי ירוק וחזק את האמון בפרופיל.'}
          badge={isKycVerified ? <VerifiedBadge size="md" /> : null}
          action={!isKycVerified && kycStatus !== 'pending' ? (
            <button onClick={() => setShowVerifyModal(true)} style={{ ...ACTION_BTN, background: 'rgba(52,211,153,0.15)', border: '1px solid rgba(52,211,153,0.4)', color: '#34d399' }}>
              אמת <ChevronLeft size={14} />
            </button>
          ) : null}
        />

        {/* Step 4: Social — gold badge icon */}
        <StepRow
          icon={isSocialConnected && isKycVerified ? Award : Sparkles}
          customIcon={<GoldBadgeIcon />}
          state={socialStepState}
          title="רשת חברתית"
          subtitle={isSocialConnected && isKycVerified
            ? `מחובר: ${connectedPlatforms.map(p => p.label).join(', ')} · ווי זהב פעיל`
            : isSocialConnected
              ? `מחובר: ${connectedPlatforms.map(p => p.label).join(', ')} · ווי זהב לאחר אימות זהות`
              : 'קבל ווי זהב וחזק את הפרופיל.'}
          badge={isSocialConnected && isKycVerified ? <GoldBadge size="md" /> : null}
          action={
            <button
              onClick={() => setShowSocialConnect(true)}
              disabled={socialLoading}
              style={{ ...ACTION_BTN, background: 'rgba(251,191,36,0.15)', border: '1px solid rgba(251,191,36,0.4)', color: '#fbbf24' }}
            >
              {isSocialConnected ? 'חבר עוד' : 'חבר'} <ChevronLeft size={14} />
            </button>
          }
        />

        {/* Connected platforms — chips with disconnect */}
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

        {/* Registration counter — live */}
        <RegistrationCounter />

        {/* Status section — "הפרופיל שלך פעיל" */}
        <div style={{
          textAlign: 'center',
          background: 'rgba(52,211,153,0.08)',
          border: '1px solid rgba(52,211,153,0.25)',
          borderRadius: 16, padding: '14px 18px', marginBottom: 14,
        }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <CheckCircle2 size={16} color="#34d399" />
            <span style={{ fontSize: 15, fontWeight: 800, color: '#34d399' }}>הפרופיל שלך פעיל</span>
          </div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.62)', lineHeight: 1.5 }}>
            אנחנו מתחילים להכניס משימות בימים הקרובים.<br />
            כשמשימה מתאימה לך - תקבל התראה.
          </div>
        </div>

        {/* Flow explanation */}
        <div style={{
          textAlign: 'center', fontSize: 13, fontWeight: 600,
          color: 'rgba(255,255,255,0.55)', lineHeight: 1.6, marginBottom: 18, padding: '0 8px',
        }}>
          🔔 משימה מתאימה מתפרסמת ← תקבל התראה ← תוכל להגיש מועמדות
        </div>

        {/* Edit preferences — prominent at bottom */}
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', textAlign: 'center', marginBottom: 8 }}>
          רוצה לקבל עוד סוגי משימות? ניתן לשנות קטגוריות, אזור ופרטים בכל שלב.
        </div>
        <button
          onClick={() => navigate('/join?edit=1&preview=1')}
          style={{
            width: '100%',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            padding: '14px 18px', borderRadius: 14,
            background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.25)',
            color: 'white', fontSize: 15, fontWeight: 800, cursor: 'pointer',
            backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
            minHeight: 'unset', minWidth: 'unset',
            marginBottom: 18,
          }}
        >
          עריכת העדפות עבודה
          <ChevronLeft size={16} color="white" />
        </button>

        {/* Footer links */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10, marginTop: 4, flexWrap: 'nowrap' }}>
          <Link to="/terms" style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', textDecoration: 'none', fontWeight: 600, whiteSpace: 'nowrap' }}>{t('terms_title')}</Link>
          <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 13 }}>|</span>
          <Link to="/privacy" style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', textDecoration: 'none', fontWeight: 600, whiteSpace: 'nowrap' }}>{t('privacy_title')}</Link>
          <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 13 }}>|</span>
          <Link to="/faq" style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', textDecoration: 'none', fontWeight: 600, whiteSpace: 'nowrap' }}>{t('faq_title')}</Link>
        </div>
      </div>

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
    </div>
  );
}