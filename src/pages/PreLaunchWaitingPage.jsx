import { useState, useEffect } from 'react';
import { getCurrentPosition } from '@/lib/nativeGeolocation';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, MapPin, CheckCircle2, Clock, Zap, ChevronLeft, ShieldCheck, Award, Sparkles, Download, Users, Pencil } from 'lucide-react';
import { useLanguage } from '@/lib/LanguageContext';
import { base44 } from '@/api/base44Client';
import { requestNotificationPermission, getFCMToken } from '@/lib/fcm';
import { useAuth } from '@/lib/AuthContext';
import VerifyModal from '@/components/VerifyModal';
import StoreDownloadButtons from '@/components/StoreDownloadButtons';
import SocialConnectSheet, { PLATFORMS } from '@/components/SocialConnectSheet';
import GoldBadge from '@/components/GoldBadge';
import VerifiedBadge from '@/components/VerifiedBadge';
import { isUserVerified, hasSocialVerified, isStandaloneApp } from '@/lib/utils';

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

// ── Registration counter with live increments ──
function RegistrationCounter() {
  const [count, setCount] = useState(648);
  useEffect(() => {
    const interval = setInterval(() => {
      setCount(c => c + Math.floor(Math.random() * 4) + 1);
    }, 60000);
    return () => clearInterval(interval);
  }, []);
  return (
    <div style={{ textAlign: 'center', marginBottom: 14 }}>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 99, padding: '8px 18px', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}>
        <Users size={16} color="rgba(255,255,255,0.7)" />
        <span style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.85)' }}>
          כבר נרשמו <span style={{ color: '#fbbf24', fontSize: 17, fontWeight: 900 }}>{count.toLocaleString()}</span> אנשים
        </span>
      </div>
    </div>
  );
}

// ── Enlarged numbered step row ──
function StepRow({ index, icon: Icon, title, subtitle, state, action, badge, customIcon }) {
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
      <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.45)', marginBottom: 5 }}>צעד {index}</div>
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

  // ── Notification permission — triggers native OS dialog ──
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

  // ── Location permission — triggers native OS dialog via @capacitor/geolocation ──
  const handleEnableLocation = () => {
    getCurrentPosition(
      () => setLocPerm('granted'),
      (err) => {
        // code 1 = PERMISSION_DENIED (works for both Web API and our native wrapper)
        setLocPerm(err?.code === 1 ? 'denied' : 'default');
      },
      { enableHighAccuracy: false, timeout: 10000 }
    );
  };

  const notifSupported = typeof Notification !== 'undefined';

  const kycStatus = me?.kyc_status;
  const isKycVerified = kycStatus === 'approved';
  const hasSocial = hasSocialVerified(me);

  const handleVerifySuccess = async () => {
    setShowVerifyModal(false);
    await refreshUser();
  };

  const handleSocialConnected = async () => {
    setShowSocialConnect(false);
    await refreshUser();
  };

  // ── Social: connected platforms ──
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

        {/* Brand + Hero + Edit button */}
        <div style={{ textAlign: 'center', marginBottom: 18, position: 'relative' }}>
          <button
            onClick={() => navigate('/join?edit=1&preview=1')}
            style={{
              position: 'absolute', top: 0, left: 0,
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '8px 14px', borderRadius: 12,
              background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
              color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer',
              backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
              minHeight: 'unset', minWidth: 'unset',
            }}
          >
            <Pencil size={14} color="white" />
            ערוך פרטים
          </button>

          <div style={{
            width: 64, height: 64, borderRadius: 18, overflow: 'hidden',
            margin: '0 auto 12px', border: '2px solid rgba(255,255,255,0.2)',
            boxShadow: '0 6px 22px rgba(0,0,0,0.3)',
          }}>
            <img src={BRAND_LOGO} alt="Joba24" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 900, color: 'white', margin: 0, lineHeight: 1.25 }}>
            {me?.full_name ? `${me.full_name.split(' ')[0]}, אתה בפנים!` : 'אתה בפנים!'}
          </h1>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.78)', margin: '8px auto 0', lineHeight: 1.5, maxWidth: 300 }}>
            נשלח לך התראה ברגע ש-Joba24 תיפתח באזורך.
          </p>
        </div>

        {/* ── Store download — only for users NOT inside the app ── */}
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

        {/* Readiness header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <Zap size={18} color="#fbbf24" />
          <span style={{ fontSize: 16, fontWeight: 800, color: 'white' }}>התכונן להשקה ב-4 צעדים</span>
        </div>

        {/* Step 1: Notifications */}
        <StepRow
          index={1}
          icon={Bell}
          state={notifState}
          title="אפשר התראות"
          subtitle={notifPerm === 'granted' ? 'מעולה! תקבל עדכון על כל עבודה חדשה.' : notifPerm === 'denied' ? 'הפעל התראות מהגדרות הטלפון → Joba24' : 'עדכון מיידי על כל עבודה חדשה.'}
          action={notifPerm !== 'granted' && notifSupported && notifPerm === 'default' ? (
            <button onClick={handleEnableNotifications} style={{ ...ACTION_BTN, background: 'rgba(251,191,36,0.15)', border: '1px solid rgba(251,191,36,0.4)', color: '#fbbf24' }}>
              אפשר <ChevronLeft size={14} />
            </button>
          ) : null}
        />

        {/* Step 2: Location */}
        <StepRow
          index={2}
          icon={MapPin}
          state={locState}
          title="אפשר גישה למיקום"
          subtitle={locPerm === 'granted' ? 'מעולה! נציג לך עבודות רלוונטיות באזורך.' : locPerm === 'denied' ? 'הפעל מיקום מהגדרות הטלפון → Joba24' : 'עבודות רלוונטיות באזורך.'}
          action={locPerm !== 'granted' && locPerm === 'default' ? (
            <button onClick={handleEnableLocation} style={{ ...ACTION_BTN, background: 'rgba(251,191,36,0.15)', border: '1px solid rgba(251,191,36,0.4)', color: '#fbbf24' }}>
              אפשר <ChevronLeft size={14} />
            </button>
          ) : null}
        />

        {/* Step 3: KYC — green badge icon */}
        <StepRow
          index={3}
          icon={ShieldCheck}
          customIcon={<GreenBadgeIcon />}
          state={kycStepState}
          title="אימות זהות (KYC)"
          subtitle={isKycVerified ? 'מאומת עם ווי ירוק.' : kycStatus === 'pending' ? 'נשלח, ממתין לאישור.' : 'קבל ווי ירוק ובנה אמון.'}
          badge={isKycVerified ? <VerifiedBadge size="md" /> : null}
          action={!isKycVerified && kycStatus !== 'pending' ? (
            <button onClick={() => setShowVerifyModal(true)} style={{ ...ACTION_BTN, background: 'rgba(52,211,153,0.15)', border: '1px solid rgba(52,211,153,0.4)', color: '#34d399' }}>
              אימות <ChevronLeft size={14} />
            </button>
          ) : null}
        />

        {/* Step 4: Social — gold badge icon */}
        <StepRow
          index={4}
          icon={isSocialConnected && isKycVerified ? Award : Sparkles}
          customIcon={<GoldBadgeIcon />}
          state={socialStepState}
          title="רשתות חברתיות"
          subtitle={isSocialConnected && isKycVerified
            ? `מחובר: ${connectedPlatforms.map(p => p.label).join(', ')} · ווי זהב פעיל`
            : isSocialConnected
              ? `מחובר: ${connectedPlatforms.map(p => p.label).join(', ')} · ווי זהב לאחר אימות זהות`
              : 'חבר רשת חברתית. ווי זהב לאחר אימות זהות.'}
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

        {/* Waiting status badge */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.3)', borderRadius: 99, padding: '8px 18px' }}>
            <Clock size={15} color="#fbbf24" />
            <span style={{ fontSize: 14, fontWeight: 700, color: '#fbbf24' }}>ממתין לאישור · השקה בקרוב</span>
          </div>
        </div>

        {/* Footer links */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10, marginTop: 20, flexWrap: 'nowrap' }}>
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