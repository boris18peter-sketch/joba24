import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Bell, MapPin, Smartphone, CheckCircle2, Clock, Loader2 } from 'lucide-react';

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
      border: `1.5px solid ${status === 'done' ? 'rgba(34,197,94,0.5)' : 'rgba(255,255,255,0.12)'}`,
      borderRadius: 18,
      padding: '16px 18px',
      display: 'flex', alignItems: 'flex-start', gap: 14,
    }}>
      <div style={{
        width: 42, height: 42, borderRadius: 13, flexShrink: 0,
        background: status === 'done' ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.1)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: `1px solid ${status === 'done' ? 'rgba(34,197,94,0.4)' : 'rgba(255,255,255,0.15)'}`,
      }}>
        {status === 'done' ? <CheckCircle2 size={20} color="#4ade80" /> : icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: 'white', marginBottom: 4 }}>{title}</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>{description}</div>
        {status === 'action' && onAction && (
          <button
            onClick={onAction}
            style={{
              marginTop: 10, padding: '8px 16px', borderRadius: 10,
              background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)',
              color: 'white', fontSize: 12, fontWeight: 700, cursor: 'pointer',
            }}
          >
            {actionLabel}
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
          <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: 'white', flexShrink: 0 }}>{step}</div>
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
        { step: '3', text: 'אשר בלחיצה על "Add"', emoji: '✅' },
      ].map(({ step, text, emoji }) => (
        <div key={step} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: 'white', flexShrink: 0 }}>{step}</div>
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
      background: 'linear-gradient(160deg, #0a1f4e 0%, #0f2b6b 40%, #1a6fd4 100%)',
      display: 'flex', flexDirection: 'column',
      padding: 'max(40px, env(safe-area-inset-top)) 20px max(40px, env(safe-area-inset-bottom))',
      overflowY: 'auto',
      WebkitOverflowScrolling: 'touch'
    }}>
      {/* Logo + Brand */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{
          width: 76, height: 76, borderRadius: 22,
          background: 'rgba(255,255,255,0.12)',
          border: '1.5px solid rgba(255,255,255,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 20px',
          fontSize: 36,
          boxShadow: '0 8px 24px rgba(0,0,0,0.2)'
        }}>
          🚀
        </div>
        <div style={{ fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.5)', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 10 }}>
          Joba24 · Pre-Launch
        </div>
        <h1 style={{ fontSize: 26, fontWeight: 900, color: 'white', margin: 0, lineHeight: 1.3 }}>
          {me?.full_name ? `תודה שנרשמת, ${me.full_name.split(' ')[0]}! 🎉` : 'תודה שנרשמת! 🎉'}
        </h1>
        <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.9)', marginTop: 12, lineHeight: 1.5, maxWidth: 320, margin: '12px auto 0' }}>
          הפרופיל שלך ממתין לאישור.<br/>בקרוב מאוד תתחיל לקבל המון עבודות חדשות דרך Joba24!
        </p>
        <div style={{ background: 'rgba(251,191,36,0.15)', border: '1px solid rgba(251,191,36,0.3)', borderRadius: 14, padding: '12px', marginTop: 16, maxWidth: 340, margin: '16px auto 0' }}>
          <p style={{ fontSize: 13, color: '#fbbf24', lineHeight: 1.5, margin: 0, fontWeight: 600 }}>
            בינתיים, אנו ממליצים בחום להוריד את האפליקציה למסך הבית ולאשר התראות ומיקום כדי שתוכל להיות מעודכן בהשקה ולהיות הראשון לקבל עבודות באזורך.
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.6)' }}>מוכנות להשקה</span>
          <span style={{ fontSize: 12, fontWeight: 800, color: '#fbbf24' }}>{completedSteps}/3 שלבים</span>
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28 }}>

        {/* Step 1: Install to home screen */}
        <StepCard
          icon={<Smartphone size={20} color="rgba(255,255,255,0.8)" />}
          title="שמור אותנו במסך הבית"
          description={isPWA ? 'כבר מותקן! תחווית אפליקציה מלאה מחכה לך.' : 'הוסף את Joba24 למסך הבית כדי לקבל חוויה של אפליקציה אמיתית בלי להוריד מהחנות.'}
          status={pwaStatus}
          onAction={handleInstallPWA}
          actionLabel={showInstallGuide ? 'הסתר הוראות' : (deferredPrompt ? 'התקן אפליקציה' : 'הצג הוראות')}
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
              ? <Loader2 size={20} color="rgba(255,255,255,0.8)" className="animate-spin" />
              : <Bell size={20} color={notifStatus === 'denied' ? '#f87171' : 'rgba(255,255,255,0.8)'} />
          }
          title="קבל התראות בזמן אמת"
          description={
            notifStatus === 'denied'
              ? 'ההרשאה נדחתה. תוכל לאפשר ידנית מהגדרות הדפדפן שלך.'
              : notifStatus === 'done'
              ? 'מושלם! נודיע לך ברגע שיש לך משימה חדשה.'
              : 'ברגע שנשיק, נשלח לך התראה על המשימות הכי רלוונטיות לך — בזמן אמת.'
          }
          status={notifStatus === 'requesting' ? 'action' : notifActionStatus}
          onAction={notifStatus === 'idle' || notifStatus === 'denied' ? requestNotifications : undefined}
          actionLabel="אפשר התראות"
        />

        {/* Step 3: Allow location */}
        <StepCard
          icon={
            locationStatus === 'requesting'
              ? <Loader2 size={20} color="rgba(255,255,255,0.8)" className="animate-spin" />
              : <MapPin size={20} color={locationStatus === 'denied' ? '#f87171' : 'rgba(255,255,255,0.8)'} />
          }
          title="אפשר גישה למיקום"
          description={
            locationStatus === 'denied'
              ? 'ההרשאה נדחתה. אפשר לאפשר ידנית מהגדרות.'
              : locationStatus === 'done'
              ? 'מצוין! נתאים לך משימות ליד הבית.'
              : 'כדי שנוכל להציג לך משימות ברדיוס שלך ברגע שנשיק.'
          }
          status={locationStatus === 'requesting' ? 'action' : locationActionStatus}
          onAction={locationStatus === 'idle' || locationStatus === 'denied' ? requestLocation : undefined}
          actionLabel="אפשר מיקום"
        />
      </div>

      {/* What's coming */}
      <div style={{
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 18, padding: '18px 16px', marginBottom: 24,
      }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: 'rgba(255,255,255,0.5)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 14 }}>
          מה מחכה לך בהשקה
        </div>
        {[
          { emoji: '📍', text: 'משימות ליד הבית לפי מיקום' },
          { emoji: '💰', text: 'תשלום מהיר דרך האפליקציה' },
          { emoji: '⭐', text: 'בניית מוניטין ודירוגים' },
          { emoji: '🚀', text: '25 ג\'ובות בונוס ביום ההצטרפות' },
        ].map(({ emoji, text }) => (
          <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <span style={{ fontSize: 18 }}>{emoji}</span>
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', fontWeight: 500 }}>{text}</span>
          </div>
        ))}
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
        }}
      >
        <span style={{ fontSize: 20 }}>💬</span>
        עדכן אותי ב-WhatsApp
      </a>

      {/* Waiting status */}
      <div style={{ textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.3)', borderRadius: 99, padding: '6px 14px' }}>
          <Clock size={12} color="#fbbf24" />
          <span style={{ fontSize: 11, fontWeight: 700, color: '#fbbf24' }}>ממתין לאישור · השקה בקרוב</span>
        </div>
      </div>
    </div>
  );
}