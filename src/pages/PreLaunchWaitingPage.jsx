import { useState, useEffect } from 'react';
import { Bell, MapPin, Smartphone, CheckCircle2, Clock, Loader2, Zap, TrendingUp, Shield, Star, DollarSign } from 'lucide-react';

const BRAND_LOGO = 'https://media.base44.com/images/public/69e6bdb4986a04a256653a23/d5824a161_IMG_0357.jpg';

// Detect if running as installed PWA
function isInStandaloneMode() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

// Detect iOS
function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

// Detect Android
function isAndroid() {
  return /android/i.test(navigator.userAgent);
}

function StepCard({ icon, title, description, status, onAction, actionLabel }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.07)',
      backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
      border: `1.5px solid ${status === 'done' ? 'rgba(52,211,153,0.5)' : 'rgba(255,255,255,0.12)'}`,
      borderRadius: 18,
      padding: '16px 18px',
      display: 'flex', alignItems: 'flex-start', gap: 14,
      transition: 'border-color 0.2s, background 0.2s',
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: 13, flexShrink: 0,
        background: status === 'done' ? 'rgba(52,211,153,0.2)' : 'rgba(255,255,255,0.1)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: `1px solid ${status === 'done' ? 'rgba(52,211,153,0.4)' : 'rgba(255,255,255,0.15)'}`,
      }}>
        {status === 'done' ? <CheckCircle2 size={22} color="#34d399" /> : icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14.5, fontWeight: 800, color: 'white', marginBottom: 4 }}>{title}</div>
        <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.65)', lineHeight: 1.5 }}>{description}</div>
        {status === 'action' && onAction && (
          <button
            onClick={onAction}
            style={{
              marginTop: 12, padding: '9px 18px', borderRadius: 11,
              background: 'rgba(251,191,36,0.15)', border: '1px solid rgba(251,191,36,0.4)',
              color: '#fbbf24', fontSize: 12.5, fontWeight: 800, cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: 6,
            }}
          >
            {actionLabel}
            <Zap size={13} />
          </button>
        )}
      </div>
    </div>
  );
}

function IOSInstallGuide() {
  return (
    <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, padding: '14px 16px', marginTop: 8 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.8)', marginBottom: 10 }}>הוסף למסך הבית (iPhone/iPad):</div>
      {[
        { step: '1', text: 'לחץ על כפתור השיתוף', emoji: '⬆️' },
        { step: '2', text: 'גלול מטה ולחץ "Add to Home Screen"', emoji: '📱' },
        { step: '3', text: 'לחץ "Add" בפינה העליונה', emoji: '✅' },
      ].map(({ step, text, emoji }) => (
        <div key={step} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(251,191,36,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: '#fbbf24', flexShrink: 0 }}>{step}</div>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>{emoji} {text}</span>
        </div>
      ))}
    </div>
  );
}

function AndroidInstallGuide() {
  return (
    <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, padding: '14px 16px', marginTop: 8 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.8)', marginBottom: 10 }}>הוסף למסך הבית (Android):</div>
      {[
        { step: '1', text: 'לחץ על התפריט (⋮) בדפדפן', emoji: '⋮' },
        { step: '2', text: 'בחר "Add to Home screen"', emoji: '📲' },
        { step: '3', text: 'אשר בלחיצה עת "Add"', emoji: '✅' },
      ].map(({ step, text, emoji }) => (
        <div key={step} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(251,191,36,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: '#fbbf24', flexShrink: 0 }}>{step}</div>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>{emoji} {text}</span>
        </div>
      ))}
    </div>
  );
}

export default function PreLaunchWaitingPage({ me }) {
  const [notifStatus, setNotifStatus] = useState('idle'); // idle | requesting | done | denied
  const [locationStatus, setLocationStatus] = useState('idle');
  const [isPWA, setIsPWA] = useState(false);
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    setIsPWA(isInStandaloneMode());

    // Check existing permissions
    if ('Notification' in window && Notification.permission === 'granted') setNotifStatus('done');
    if ('Notification' in window && Notification.permission === 'denied') setNotifStatus('denied');

    if ('geolocation' in navigator) {
      navigator.permissions?.query({ name: 'geolocation' }).then(result => {
        if (result.state === 'granted') setLocationStatus('done');
      }).catch(() => {});
    }

    // Listen for PWA install prompt (Android Chrome)
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const requestNotifications = async () => {
    if (!('Notification' in window)) {
      setNotifStatus('denied');
      return;
    }
    setNotifStatus('requesting');
    try {
      const permission = await Notification.requestPermission();
      setNotifStatus(permission === 'granted' ? 'done' : 'denied');
    } catch {
      setNotifStatus('denied');
    }
  };

  const requestLocation = () => {
    setLocationStatus('requesting');
    navigator.geolocation.getCurrentPosition(
      () => setLocationStatus('done'),
      () => setLocationStatus('denied'),
      { timeout: 10000 }
    );
  };

  const handleInstallPWA = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') setIsPWA(true);
      setDeferredPrompt(null);
    } else {
      setShowInstallGuide(v => !v);
    }
  };

  const pwaStatus = isPWA ? 'done' : 'action';
  const notifActionStatus = notifStatus === 'done' ? 'done' : 'action';
  const locationActionStatus = locationStatus === 'done' ? 'done' : 'action';

  const completedSteps = [isPWA, notifStatus === 'done', locationStatus === 'done'].filter(Boolean).length;

  return (
    <div dir="rtl" style={{
      height: '100dvh',
      width: '100%',
      boxSizing: 'border-box',
      background: 'linear-gradient(170deg, #0a1f4e 0%, #0f2b6b 40%, #1a6fd4 100%)',
      display: 'flex', flexDirection: 'column',
      padding: 'max(32px, env(safe-area-inset-top)) 20px max(32px, env(safe-area-inset-bottom))',
      overflowY: 'auto',
      WebkitOverflowScrolling: 'touch',
      position: 'relative',
    }}>
      {/* Decorative blurred glows */}
      <div style={{ position: 'absolute', top: '-8%', right: '-12%', width: 260, height: 260, borderRadius: '50%', background: 'radial-gradient(circle, rgba(251,191,36,0.15) 0%, transparent 70%)', filter: 'blur(35px)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '-8%', left: '-12%', width: 260, height: 260, borderRadius: '50%', background: 'radial-gradient(circle, rgba(26,111,212,0.3) 0%, transparent 70%)', filter: 'blur(35px)', pointerEvents: 'none' }} />

      {/* Brand + Hero */}
      <div style={{ textAlign: 'center', marginBottom: 28, position: 'relative', zIndex: 1 }}>
        <div style={{
          width: 72, height: 72, borderRadius: 20, overflow: 'hidden',
          margin: '0 auto 18px',
          border: '2px solid rgba(255,255,255,0.2)',
          boxShadow: '0 12px 36px rgba(0,0,0,0.3)',
        }}>
          <img src={BRAND_LOGO} alt="Joba24" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
        <div style={{ fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.5)', letterSpacing: 4, textTransform: 'uppercase', marginBottom: 8 }}>
          Joba24
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 900, color: 'white', margin: 0, lineHeight: 1.3 }}>
          {me?.full_name ? `תודה שנרשמת, ${me.full_name.split(' ')[0]}! 🎉` : 'תודה שנרשמת! 🎉'}
        </h1>
        <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.85)', marginTop: 10, lineHeight: 1.6, maxWidth: 320, margin: '10px auto 0' }}>
          הפרופיל שלך ממתין לאישור. בקרוב תקבל <strong style={{ color: '#fbbf24' }}>המון עבודות</strong> באזורך דרך Joba24.
        </p>
      </div>

      {/* Benefit highlight — why join */}
      <div style={{
        background: 'rgba(255,255,255,0.06)',
        backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 18, padding: '18px 16px', marginBottom: 24,
        position: 'relative', zIndex: 1,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <TrendingUp size={16} color="#fbbf24" />
          <span style={{ fontSize: 12, fontWeight: 800, color: 'rgba(255,255,255,0.5)', letterSpacing: 0.5, textTransform: 'uppercase' }}>למה כדאי לך להיות מוכן</span>
        </div>
        {[
          { icon: <DollarSign size={16} color="#34d399" />, text: 'הראשונים שמקבלים עבודות — מרוויחים יותר' },
          { icon: <Star size={16} color="#fbbf24" />, text: 'בניית מוניטין מוקדם = יותר לקוחות חוזרים' },
          { icon: <Shield size={16} color="#60a5fa" />, text: 'קהילה מאומתת ומהימנה של עובדים' },
        ].map(({ icon, text }, i, arr) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
            <div style={{ width: 30, height: 30, borderRadius: 9, background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{icon}</div>
            <span style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.85)', fontWeight: 500, lineHeight: 1.4 }}>{text}</span>
          </div>
        ))}
      </div>

      {/* Readiness section header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, position: 'relative', zIndex: 1 }}>
        <Zap size={16} color="#fbbf24" />
        <span style={{ fontSize: 14, fontWeight: 800, color: 'white' }}>התכונן להשקה — 3 צעדים מהירים</span>
      </div>

      {/* Progress bar */}
      <div style={{ marginBottom: 20, position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.5)' }}>מוכנות</span>
          <span style={{ fontSize: 12, fontWeight: 800, color: '#fbbf24' }}>{completedSteps}/3</span>
        </div>
        <div style={{ height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 99, overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${(completedSteps / 3) * 100}%`,
            background: 'linear-gradient(90deg, #fbbf24, #f59e0b)',
            borderRadius: 99,
            transition: 'width 0.5s ease',
          }} />
        </div>
      </div>

      {/* Steps */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28, position: 'relative', zIndex: 1 }}>

        {/* Step 1: Install to home screen */}
        <StepCard
          icon={<Smartphone size={22} color="rgba(255,255,255,0.8)" />}
          title="שמור את האפליקציה במסך הבית"
          description={isPWA ? 'מעולה! האפליקציה מותקנת — חוויה מלאה מחכה לך.' : 'התקן כדי לקבל התראות push, גישה מהירה וחוויה של אפליקציה אמיתית.'}
          status={pwaStatus}
          onAction={handleInstallPWA}
          actionLabel={showInstallGuide ? 'הסתר הוראות' : (deferredPrompt ? 'התקן עכשיו' : 'הצג הוראות')}
        />
        {!isPWA && showInstallGuide && (
          <div style={{ marginTop: -4 }}>
            {isIOS() ? <IOSInstallGuide /> : isAndroid() ? <AndroidInstallGuide /> : <IOSInstallGuide />}
          </div>
        )}

        {/* Step 2: Allow notifications */}
        <StepCard
          icon={
            notifStatus === 'requesting'
              ? <Loader2 size={22} color="rgba(255,255,255,0.8)" className="animate-spin" />
              : <Bell size={22} color={notifStatus === 'denied' ? '#f87171' : 'rgba(255,255,255,0.8)'} />
          }
          title="הפעל התראות בזמן אמת"
          description={
            notifStatus === 'denied'
              ? 'ההרשאה נדחתה. תוכל לאפשר ידנית מהגדרות הדפדפן שלך.'
              : notifStatus === 'done'
              ? 'מושלם! נשלח לך התראה על כל משימה חדשה באזורך.'
              : 'קבל התראה מיידית על כל ג\'ובה חדש — לפני כולם.'
          }
          status={notifStatus === 'requesting' ? 'action' : notifActionStatus}
          onAction={notifStatus === 'idle' || notifStatus === 'denied' ? requestNotifications : undefined}
          actionLabel="אפשר התראות"
        />

        {/* Step 3: Allow location */}
        <StepCard
          icon={
            locationStatus === 'requesting'
              ? <Loader2 size={22} color="rgba(255,255,255,0.8)" className="animate-spin" />
              : <MapPin size={22} color={locationStatus === 'denied' ? '#f87171' : 'rgba(255,255,255,0.8)'} />
          }
          title="אפשר גישה למיקום"
          description={
            locationStatus === 'denied'
              ? 'ההרשאה נדחתה. אפשר לאפשר ידנית מהגדרות.'
              : locationStatus === 'done'
              ? 'מצוין! נתאים לך משימות ברדיוס שלך.'
              : 'כדי שנוכל להציג לך רק משימות רלוונטיות באזור שלך.'
          }
          status={locationStatus === 'requesting' ? 'action' : locationActionStatus}
          onAction={locationStatus === 'idle' || locationStatus === 'denied' ? requestLocation : undefined}
          actionLabel="אפשר מיקום"
        />
      </div>

      {/* WhatsApp CTA */}
      <a
        href="https://wa.me/972500000000"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          width: '100%', padding: '16px 0', borderRadius: 16,
          background: 'linear-gradient(135deg, #25D366, #128C7E)',
          color: 'white', fontSize: 15, fontWeight: 900,
          textDecoration: 'none',
          boxShadow: '0 8px 24px rgba(37,211,102,0.3)',
          marginBottom: 16,
          position: 'relative', zIndex: 1,
        }}
      >
        <span style={{ fontSize: 20 }}>💬</span>
        עדכן אותי ב-WhatsApp כשנפתח
      </a>

      {/* Waiting status */}
      <div style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.3)', borderRadius: 99, padding: '6px 14px' }}>
          <Clock size={12} color="#fbbf24" />
          <span style={{ fontSize: 11, fontWeight: 700, color: '#fbbf24' }}>ממתין לאישור · השקה בקרוב</span>
        </div>
      </div>
    </div>
  );
}