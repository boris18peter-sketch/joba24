import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Bell, MapPin, CheckCircle2, Clock, Zap, ChevronLeft, ShieldCheck, Award, Sparkles, Download } from 'lucide-react';
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
  padding: '7px 13px', borderRadius: 10, flexShrink: 0,
  fontSize: 12, fontWeight: 800, cursor: 'pointer',
  display: 'inline-flex', alignItems: 'center', gap: 5,
};

// ── Compact numbered step row ──
function StepRow({ index, icon: Icon, title, subtitle, state, action, badge }) {
  const done = state === 'done';
  const pending = state === 'pending';
  const border = done ? 'rgba(52,211,153,0.4)' : pending ? 'rgba(251,191,36,0.4)' : 'rgba(255,255,255,0.12)';
  const bg = done ? 'rgba(52,211,153,0.08)' : pending ? 'rgba(251,191,36,0.08)' : 'rgba(255,255,255,0.07)';
  const iconBg = done ? 'rgba(52,211,153,0.2)' : pending ? 'rgba(251,191,36,0.18)' : 'rgba(255,255,255,0.1)';
  const iconColor = done ? '#34d399' : pending ? '#fbbf24' : 'rgba(255,255,255,0.8)';
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontSize: 10.5, fontWeight: 700, color: 'rgba(255,255,255,0.45)', marginBottom: 4 }}>צעד {index}</div>
      <div style={{
        background: bg, backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
        border: `1.5px solid ${border}`, borderRadius: 13, padding: '10px 12px',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <div style={{
          width: 34, height: 34, borderRadius: 10, flexShrink: 0,
          background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: `1px solid ${border}`,
        }}>
          {done ? <CheckCircle2 size={18} color={iconColor} /> : <Icon size={18} color={iconColor} />}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: 'white', marginBottom: 1, display: 'flex', alignItems: 'center', gap: 5 }}>
            {title}
            {badge}
          </div>
          <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.62)', lineHeight: 1.35 }}>{subtitle}</div>
        </div>
        {action}
      </div>
    </div>
  );
}

export default function PreLaunchWaitingPage({ me }) {
  const { refreshUser } = useAuth();
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

  // ── Location permission — triggers native OS dialog ──
  const handleEnableLocation = () => {
    if (!navigator.geolocation) {
      setLocPerm('denied');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      () => setLocPerm('granted'),
      (err) => setLocPerm(err.code === err.PERMISSION_DENIED ? 'denied' : 'default'),
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

  // ── Social: connected platforms (compact) ──
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

        {/* Brand + Hero — compact */}
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 15, overflow: 'hidden',
            margin: '0 auto 10px', border: '2px solid rgba(255,255,255,0.2)',
            boxShadow: '0 6px 22px rgba(0,0,0,0.3)',
          }}>
            <img src={BRAND_LOGO} alt="Joba24" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: 'white', margin: 0, lineHeight: 1.25 }}>
            {me?.full_name ? `${me.full_name.split(' ')[0]}, אתה בפנים!` : 'אתה בפנים!'}
          </h1>
          <p style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.78)', margin: '6px auto 0', lineHeight: 1.5, maxWidth: 280 }}>
            נשלח לך התראה ברגע ש-Joba24 תיפתח באזורך.
          </p>
        </div>

        {/* ── Store download — strategic, visible without scroll ── */}
        {!isStandaloneApp && (
          <div style={{
            background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
            border: '1.5px solid rgba(251,191,36,0.3)', borderRadius: 16,
            padding: '12px 14px 14px', marginBottom: 18, textAlign: 'center',
          }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <Download size={13} color="#fbbf24" />
              <span style={{ fontSize: 12.5, fontWeight: 800, color: 'white' }}>הורד את האפליקציה ותישאר מעודכן</span>
            </div>
            <StoreDownloadButtons size="md" />
          </div>
        )}

        {/* Readiness header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
          <Zap size={15} color="#fbbf24" />
          <span style={{ fontSize: 13, fontWeight: 800, color: 'white' }}>התכונן להשקה ב-4 צעדים</span>
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
              אפשר <ChevronLeft size={12} />
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
              אפשר <ChevronLeft size={12} />
            </button>
          ) : null}
        />

        {/* Step 3: KYC */}
        <StepRow
          index={3}
          icon={ShieldCheck}
          state={kycStepState}
          title="אימות זהות (KYC)"
          subtitle={isKycVerified ? 'מאומת עם ווי ירוק.' : kycStatus === 'pending' ? 'נשלח, ממתין לאישור.' : 'קבל ווי ירוק ובנה אמון.'}
          badge={isKycVerified ? <VerifiedBadge size="sm" /> : null}
          action={!isKycVerified && kycStatus !== 'pending' ? (
            <button onClick={() => setShowVerifyModal(true)} style={{ ...ACTION_BTN, background: 'rgba(52,211,153,0.15)', border: '1px solid rgba(52,211,153,0.4)', color: '#34d399' }}>
              אימות <ChevronLeft size={12} />
            </button>
          ) : null}
        />

        {/* Step 4: Social — compact row, no white box */}
        <StepRow
          index={4}
          icon={isSocialConnected && isKycVerified ? Award : Sparkles}
          state={socialStepState}
          title="רשתות חברתיות"
          subtitle={isSocialConnected && isKycVerified
            ? `מחובר: ${connectedPlatforms.map(p => p.label).join(', ')} · ווי זהב פעיל`
            : isSocialConnected
              ? `מחובר: ${connectedPlatforms.map(p => p.label).join(', ')} · ווי זהב לאחר אימות זהות`
              : 'חבר רשת חברתית. ווי זהב לאחר אימות זהות.'}
          badge={isSocialConnected && isKycVerified ? <GoldBadge size="sm" /> : null}
          action={
            <button
              onClick={() => setShowSocialConnect(true)}
              disabled={socialLoading}
              style={{ ...ACTION_BTN, background: 'rgba(251,191,36,0.15)', border: '1px solid rgba(251,191,36,0.4)', color: '#fbbf24' }}
            >
              {isSocialConnected ? 'חבר עוד' : 'חבר'} <ChevronLeft size={12} />
            </button>
          }
        />

        {/* Connected platforms — tiny chips with disconnect */}
        {isSocialConnected && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 2, marginBottom: 4, paddingRight: 2 }}>
            {connectedPlatforms.map(p => (
              <span key={p.key} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.3)', borderRadius: 99, padding: '3px 8px 3px 5px' }}>
                <span style={{ width: 16, height: 16, borderRadius: 5, background: p.brandColor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <p.icon size={10} color="white" />
                </span>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.85)' }}>@{me?.[`${p.key}_username`]}</span>
                <button
                  onClick={() => handleDisconnectSocial(p.key)}
                  disabled={socialLoading}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', opacity: 0.6, minHeight: 'unset', minWidth: 'unset' }}
                  title="נתק"
                >
                  <ChevronLeft size={12} color="rgba(255,255,255,0.6)" style={{ transform: 'rotate(90deg)' }} />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Waiting status badge */}
        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.3)', borderRadius: 99, padding: '6px 14px' }}>
            <Clock size={12} color="#fbbf24" />
            <span style={{ fontSize: 11, fontWeight: 700, color: '#fbbf24' }}>ממתין לאישור · השקה בקרוב</span>
          </div>
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