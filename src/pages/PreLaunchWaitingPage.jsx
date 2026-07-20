import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Bell, MapPin, CheckCircle2, Clock, Zap, ChevronLeft, ShieldCheck, Award, Sparkles } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { requestNotificationPermission, getFCMToken } from '@/lib/fcm';
import { useAuth } from '@/lib/AuthContext';
import VerifyModal from '@/components/VerifyModal';
import SocialLinksSection from '@/components/SocialLinksSection';
import GoldBadge from '@/components/GoldBadge';
import VerifiedBadge from '@/components/VerifiedBadge';
import { isUserVerified, hasSocialVerified } from '@/lib/utils';

const BRAND_LOGO = 'https://media.base44.com/images/public/69e6bdb4986a04a256653a23/d5824a161_IMG_0357.jpg';

export default function PreLaunchWaitingPage({ me }) {
  const { refreshUser } = useAuth();
  const [notifPerm, setNotifPerm] = useState('default');
  const [locPerm, setLocPerm] = useState('default');
  const [showVerifyModal, setShowVerifyModal] = useState(false);

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

  // ── Location permission — triggers native OS dialog, saves coordinates ──
  const handleEnableLocation = () => {
    if (!navigator.geolocation) {
      setLocPerm('denied');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setLocPerm('granted');
        try {
          await base44.auth.updateMe({
            last_lat: pos.coords.latitude,
            last_lng: pos.coords.longitude,
            last_location_update: new Date().toISOString(),
            location_sharing_enabled: true,
          });
        } catch {}
      },
      (err) => setLocPerm(err.code === err.PERMISSION_DENIED ? 'denied' : 'default'),
      { enableHighAccuracy: false, timeout: 10000 }
    );
  };

  const notifSupported = typeof Notification !== 'undefined';

  const isKycVerified = kycStatus === 'approved';
  const hasSocial = hasSocialVerified(me);
  const kycStatus = me?.kyc_status;

  const handleVerifySuccess = async () => {
    setShowVerifyModal(false);
    await refreshUser();
  };

  return (
    <div dir="rtl" style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'linear-gradient(170deg, #0a1f4e 0%, #0f2b6b 40%, #1a6fd4 100%)',
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Decorative blurred glows */}
      <div style={{ position: 'absolute', top: '-8%', right: '-12%', width: 260, height: 260, borderRadius: '50%', background: 'radial-gradient(circle, rgba(251,191,36,0.15) 0%, transparent 70%)', filter: 'blur(35px)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '-8%', left: '-12%', width: 260, height: 260, borderRadius: '50%', background: 'radial-gradient(circle, rgba(26,111,212,0.3) 0%, transparent 70%)', filter: 'blur(35px)', pointerEvents: 'none' }} />

      {/* Scrollable content */}
      <div style={{
        flex: 1, overflowY: 'auto', overflowX: 'hidden',
        WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain',
        padding: 'max(28px, env(safe-area-inset-top)) 20px max(28px, env(safe-area-inset-bottom))',
        position: 'relative', zIndex: 1,
      }}>

        {/* Brand + Hero */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 64, height: 64, borderRadius: 18, overflow: 'hidden',
            margin: '0 auto 16px', border: '2px solid rgba(255,255,255,0.2)',
            boxShadow: '0 8px 28px rgba(0,0,0,0.3)',
          }}>
            <img src={BRAND_LOGO} alt="Joba24" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <div style={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.5)', letterSpacing: 4, textTransform: 'uppercase', marginBottom: 8 }}>
            Joba24
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: 'white', margin: 0, lineHeight: 1.3 }}>
            {me?.full_name ? `${me.full_name.split(' ')[0]}, אתה בפנים!` : 'אתה בפנים!'}
          </h1>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', margin: '10px auto 0', lineHeight: 1.6, maxWidth: 300 }}>
            נשלח לך התראה ברגע ש-Joba24 תיפתח באזורך.
          </p>
        </div>

        {/* Readiness header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
          <Zap size={15} color="#fbbf24" />
          <span style={{ fontSize: 13, fontWeight: 800, color: 'white' }}>התכונן להשקה ב-2 צעדים</span>
        </div>

        {/* Step 1: Enable notifications — triggers native dialog */}
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>צעד 1</div>
          <div style={{
            background: notifPerm === 'granted' ? 'rgba(52,211,153,0.08)' : 'rgba(255,255,255,0.07)',
            backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
            border: `1.5px solid ${notifPerm === 'granted' ? 'rgba(52,211,153,0.4)' : 'rgba(255,255,255,0.12)'}`,
            borderRadius: 14, padding: '14px 16px',
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <div style={{
              width: 38, height: 38, borderRadius: 11, flexShrink: 0,
              background: notifPerm === 'granted' ? 'rgba(52,211,153,0.2)' : 'rgba(255,255,255,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: `1px solid ${notifPerm === 'granted' ? 'rgba(52,211,153,0.4)' : 'rgba(255,255,255,0.15)'}`,
            }}>
              {notifPerm === 'granted'
                ? <CheckCircle2 size={20} color="#34d399" />
                : <Bell size={20} color="rgba(255,255,255,0.8)" />}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 800, color: 'white', marginBottom: 2 }}>אפשר התראות</div>
              <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.6)', lineHeight: 1.4 }}>
                {notifPerm === 'granted'
                  ? 'מעולה! תקבל עדכון על כל עבודה חדשה.'
                  : notifPerm === 'denied'
                    ? 'הפעל התראות מהגדרות הטלפון → Joba24'
                    : 'עדכון מיידי על כל עבודה חדשה.'}
              </div>
            </div>
            {notifPerm === 'granted' ? (
              <span style={{ fontSize: 18 }}>✅</span>
            ) : notifSupported && notifPerm === 'default' ? (
              <button
                onClick={handleEnableNotifications}
                style={{
                  padding: '8px 14px', borderRadius: 10, flexShrink: 0,
                  background: 'rgba(251,191,36,0.15)', border: '1px solid rgba(251,191,36,0.4)',
                  color: '#fbbf24', fontSize: 12, fontWeight: 800, cursor: 'pointer',
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                }}
              >
                אפשר
                <ChevronLeft size={12} />
              </button>
            ) : null}
          </div>
        </div>

        {/* Step 2: Location — triggers native dialog */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>צעד 2</div>
          <div style={{
            background: locPerm === 'granted' ? 'rgba(52,211,153,0.08)' : 'rgba(255,255,255,0.07)',
            backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
            border: `1.5px solid ${locPerm === 'granted' ? 'rgba(52,211,153,0.4)' : 'rgba(255,255,255,0.12)'}`,
            borderRadius: 14, padding: '14px 16px',
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <div style={{
              width: 38, height: 38, borderRadius: 11, flexShrink: 0,
              background: locPerm === 'granted' ? 'rgba(52,211,153,0.2)' : 'rgba(255,255,255,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: `1px solid ${locPerm === 'granted' ? 'rgba(52,211,153,0.4)' : 'rgba(255,255,255,0.15)'}`,
            }}>
              {locPerm === 'granted'
                ? <CheckCircle2 size={20} color="#34d399" />
                : <MapPin size={20} color="rgba(255,255,255,0.8)" />}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 800, color: 'white', marginBottom: 2 }}>אפשר גישה למיקום</div>
              <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.6)', lineHeight: 1.4 }}>
                {locPerm === 'granted'
                  ? 'מעולה! נציג לך עבודות רלוונטיות באזורך.'
                  : locPerm === 'denied'
                    ? 'הפעל מיקום מהגדרות הטלפון → Joba24'
                    : 'עבודות רלוונטיות באזורך.'}
              </div>
            </div>
            {locPerm === 'granted' ? (
              <span style={{ fontSize: 18 }}>✅</span>
            ) : locPerm === 'default' ? (
              <button
                onClick={handleEnableLocation}
                style={{
                  padding: '8px 14px', borderRadius: 10, flexShrink: 0,
                  background: 'rgba(251,191,36,0.15)', border: '1px solid rgba(251,191,36,0.4)',
                  color: '#fbbf24', fontSize: 12, fontWeight: 800, cursor: 'pointer',
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                }}
              >
                אפשר
                <ChevronLeft size={12} />
              </button>
            ) : null}
          </div>
        </div>

        {/* ── Verification Section: KYC + Social ── */}
        <div style={{ marginTop: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
            <ShieldCheck size={15} color="#fbbf24" />
            <span style={{ fontSize: 13, fontWeight: 800, color: 'white' }}>בנה אמון ובלוט</span>
          </div>

          {/* Step 3: KYC Verification */}
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>צעד 3 — ווי ירוק</div>
            <div style={{
              background: isKycVerified ? 'rgba(52,211,153,0.08)' : 'rgba(255,255,255,0.07)',
              backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
              border: `1.5px solid ${isKycVerified ? 'rgba(52,211,153,0.4)' : kycStatus === 'pending' ? 'rgba(251,191,36,0.4)' : 'rgba(255,255,255,0.12)'}`,
              borderRadius: 14, padding: '14px 16px',
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <div style={{
                width: 38, height: 38, borderRadius: 11, flexShrink: 0,
                background: isKycVerified ? 'rgba(52,211,153,0.2)' : 'rgba(255,255,255,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: `1px solid ${isKycVerified ? 'rgba(52,211,153,0.4)' : 'rgba(255,255,255,0.15)'}`,
              }}>
                {isKycVerified
                  ? <CheckCircle2 size={20} color="#34d399" />
                  : kycStatus === 'pending'
                    ? <Clock size={20} color="#fbbf24" />
                    : <ShieldCheck size={20} color="rgba(255,255,255,0.8)" />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 800, color: 'white', marginBottom: 2, display: 'flex', alignItems: 'center', gap: 5 }}>
                  אימות זהות (KYC)
                  {isKycVerified && <VerifiedBadge size="sm" />}
                </div>
                <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.6)', lineHeight: 1.4 }}>
                  {isKycVerified
                    ? 'מאומת עם ווי ירוק.'
                    : kycStatus === 'pending'
                      ? 'נשלח, ממתין לאישור.'
                      : 'קבל ווי ירוק ובנה אמון.'}
                </div>
              </div>
              {!isKycVerified && kycStatus !== 'pending' ? (
                <button
                  onClick={() => setShowVerifyModal(true)}
                  style={{
                    padding: '8px 14px', borderRadius: 10, flexShrink: 0,
                    background: 'rgba(52,211,153,0.15)', border: '1px solid rgba(52,211,153,0.4)',
                    color: '#34d399', fontSize: 12, fontWeight: 800, cursor: 'pointer',
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                  }}
                >
                  אימות
                  <ChevronLeft size={12} />
                </button>
              ) : null}
            </div>
          </div>

          {/* Step 4: Social Links — always available */}
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>
              צעד 4 — ווי זהב {hasSocial && isKycVerified && <span style={{ color: '#fbbf24' }}>✓</span>}
            </div>
            <div style={{
              background: (hasSocial && isKycVerified) ? 'rgba(251,191,36,0.08)' : 'rgba(255,255,255,0.07)',
              backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
              border: `1.5px solid ${(hasSocial && isKycVerified) ? 'rgba(251,191,36,0.4)' : 'rgba(255,255,255,0.12)'}`,
              borderRadius: 14, padding: '14px 16px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: (hasSocial && isKycVerified) ? 0 : 10 }}>
                <div style={{
                  width: 38, height: 38, borderRadius: 11, flexShrink: 0,
                  background: (hasSocial && isKycVerified) ? 'rgba(251,191,36,0.2)' : 'rgba(255,255,255,0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: `1px solid ${(hasSocial && isKycVerified) ? 'rgba(251,191,36,0.4)' : 'rgba(255,255,255,0.15)'}`,
                }}>
                  {(hasSocial && isKycVerified)
                    ? <Award size={20} color="#fbbf24" />
                    : <Sparkles size={20} color="rgba(255,255,255,0.8)" />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 800, color: 'white', marginBottom: 2, display: 'flex', alignItems: 'center', gap: 5 }}>
                    רשתות חברתיות
                    {hasSocial && isKycVerified && <GoldBadge size="sm" />}
                  </div>
                  <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.6)', lineHeight: 1.4 }}>
                    {hasSocial && isKycVerified
                      ? 'ווי זהב פעיל!'
                      : hasSocial
                        ? 'רשת מחוברת. ווי זהב יופיע לאחר אימות זהות.'
                        : 'חבר רשת. ווי זהב יופיע לאחר אימות זהות.'}
                  </div>
                </div>
              </div>
              {!(hasSocial && isKycVerified) && (
                <div style={{
                  background: 'rgba(0,0,0,0.2)', borderRadius: 10, padding: 2,
                  marginTop: 4,
                }}>
                  <SocialLinksSection user={me} />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Waiting status badge */}
        <div style={{ textAlign: 'center', marginTop: 20 }}>
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
    </div>
  );
}