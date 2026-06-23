import { useState, useEffect } from 'react';
import { Bell, MapPin, Smartphone, CheckCircle2, Clock, Zap, TrendingUp, Shield, Star, DollarSign, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const BRAND_LOGO = 'https://media.base44.com/images/public/69e6bdb4986a04a256653a23/d5824a161_IMG_0357.jpg';

function isInStandaloneMode() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isAndroid() {
  return /android/i.test(navigator.userAgent);
}

export default function PreLaunchWaitingPage({ me }) {
  const navigate = useNavigate();
  const [isPWA, setIsPWA] = useState(false);
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    setIsPWA(isInStandaloneMode());

    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

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

      {/* Scrollable inner content */}
      <div style={{
        flex: 1, overflowY: 'auto', overflowX: 'hidden',
        WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain',
        padding: 'max(28px, env(safe-area-inset-top)) 20px max(28px, env(safe-area-inset-bottom))',
        position: 'relative', zIndex: 1,
      }}>

        {/* Brand + Hero */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{
            width: 64, height: 64, borderRadius: 18, overflow: 'hidden',
            margin: '0 auto 16px',
            border: '2px solid rgba(255,255,255,0.2)',
            boxShadow: '0 8px 28px rgba(0,0,0,0.3)',
          }}>
            <img src={BRAND_LOGO} alt="Joba24" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <div style={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.5)', letterSpacing: 4, textTransform: 'uppercase', marginBottom: 6 }}>
            Joba24
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: 'white', margin: 0, lineHeight: 1.3 }}>
            {me?.full_name ? `${me.full_name.split(' ')[0]}, תודה שנרשמת! 🎉` : 'תודה שנרשמת! 🎉'}
          </h1>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.85)', margin: '8px auto 0', lineHeight: 1.6, maxWidth: 300 }}>
            הפרופיל שלך ממתין לאישור. בקרוב תקבל <strong style={{ color: '#fbbf24' }}>המון עבודות</strong> באזורך.
          </p>
        </div>

        {/* Benefits — compact glass card */}
        <div style={{
          background: 'rgba(255,255,255,0.06)',
          backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 16, padding: '14px 16px', marginBottom: 20,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <TrendingUp size={14} color="#fbbf24" />
            <span style={{ fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.5)', letterSpacing: 0.5, textTransform: 'uppercase' }}>למה כדאי לך להיות מוכן</span>
          </div>
          {[
            { icon: <DollarSign size={14} color="#34d399" />, text: 'הראשונים שמקבלים עבודות — מרוויחים יותר' },
            { icon: <Star size={14} color="#fbbf24" />, text: 'בניית מוניטין מוקדם = יותר לקוחות חוזרים' },
            { icon: <Shield size={14} color="#60a5fa" />, text: 'קהילה מאומתת ומהימנה של עובדים' },
          ].map(({ icon, text }, i, arr) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
              <div style={{ width: 26, height: 26, borderRadius: 8, background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{icon}</div>
              <span style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.85)', fontWeight: 500, lineHeight: 1.4 }}>{text}</span>
            </div>
          ))}
        </div>

        {/* Readiness header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
          <Zap size={15} color="#fbbf24" />
          <span style={{ fontSize: 13, fontWeight: 800, color: 'white' }}>התכונן להשקה</span>
        </div>

        {/* PWA install — the only actionable step (browser supports it) */}
        <div style={{
          background: 'rgba(255,255,255,0.07)',
          backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
          border: `1.5px solid ${isPWA ? 'rgba(52,211,153,0.5)' : 'rgba(255,255,255,0.12)'}`,
          borderRadius: 14, padding: '14px 16px', marginBottom: 10,
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{
            width: 38, height: 38, borderRadius: 11, flexShrink: 0,
            background: isPWA ? 'rgba(52,211,153,0.2)' : 'rgba(255,255,255,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: `1px solid ${isPWA ? 'rgba(52,211,153,0.4)' : 'rgba(255,255,255,0.15)'}`,
          }}>
            {isPWA ? <CheckCircle2 size={20} color="#34d399" /> : <Smartphone size={20} color="rgba(255,255,255,0.8)" />}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13.5, fontWeight: 800, color: 'white', marginBottom: 2 }}>שמור במסך הבית</div>
            <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.6)', lineHeight: 1.4 }}>
              {isPWA ? 'מעולה! האפליקציה מותקנת.' : 'התקן כדי לקבל התראות push וחוויה מלאה.'}
            </div>
          </div>
          {!isPWA && (
            <button
              onClick={handleInstallPWA}
              style={{
                padding: '8px 14px', borderRadius: 10, flexShrink: 0,
                background: 'rgba(251,191,36,0.15)', border: '1px solid rgba(251,191,36,0.4)',
                color: '#fbbf24', fontSize: 12, fontWeight: 800, cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', gap: 5,
              }}
            >
              {showInstallGuide ? 'הסתר' : (deferredPrompt ? 'התקן' : 'הוראות')}
              {!showInstallGuide && <ChevronLeft size={12} />}
            </button>
          )}
        </div>

        {/* Install instructions — collapsible */}
        {!isPWA && showInstallGuide && (
          <div style={{
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 12, padding: '12px 14px', marginBottom: 10,
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.7)', marginBottom: 8 }}>
              {isIOS() ? 'הוסף למסך הבית (iPhone):' : isAndroid() ? 'הוסף למסך הבית (Android):' : 'הוסף למסך הבית:'}
            </div>
            {[
              isIOS() ? 'לחץ על כפתור השיתוף ⬆️' : 'לחץ על התפריט ⋮ בדפדפן',
              isIOS() ? 'בחר "Add to Home Screen" 📱' : 'בחר "Add to Home screen" 📲',
              'לחץ "Add" ✅',
            ].map((text, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'rgba(251,191,36,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: '#fbbf24', flexShrink: 0 }}>{i + 1}</div>
                <span style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.65)' }}>{text}</span>
              </div>
            ))}
          </div>
        )}

        {/* Notifications — informational only (not clickable) */}
        <div style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 12, padding: '12px 14px', marginBottom: 8,
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, flexShrink: 0, background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Bell size={16} color="rgba(255,255,255,0.7)" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: 'rgba(255,255,255,0.9)', marginBottom: 1 }}>הפעלת התראות</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', lineHeight: 1.4 }}>
              לאחר ההשקה, אפשר התראות מהגדרות הטלפון כדי לקבל עדכון על כל עבודה חדשה.
            </div>
          </div>
        </div>

        {/* Location — informational only (not clickable) */}
        <div style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 12, padding: '12px 14px', marginBottom: 20,
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, flexShrink: 0, background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <MapPin size={16} color="rgba(255,255,255,0.7)" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: 'rgba(255,255,255,0.9)', marginBottom: 1 }}>גישה למיקום</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', lineHeight: 1.4 }}>
              אפשר גישה למיקום מהגדרות הטלפון כדי שנציג לך משימות רלוונטיות באזורך.
            </div>
          </div>
        </div>

        {/* Waiting status badge */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.3)', borderRadius: 99, padding: '6px 14px' }}>
            <Clock size={12} color="#fbbf24" />
            <span style={{ fontSize: 11, fontWeight: 700, color: '#fbbf24' }}>ממתין לאישור · השקה בקרוב</span>
          </div>
        </div>
      </div>
    </div>
  );
}