/**
 * StripeOnboardingGate
 * Shown once (first-time apply) — worker must connect their Stripe account before applying.
 * After onboarding, re-checks status and proceeds automatically.
 */
import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2, Wallet, ExternalLink, CheckCircle2, ArrowLeft } from 'lucide-react';

export default function StripeOnboardingGate({ onReady, onClose }) {
  const [status, setStatus] = useState('checking'); // checking | needed | linking | done
  const [onboardingUrl, setOnboardingUrl] = useState(null);
  const [popup, setPopup] = useState(null);

  // Check if worker already has a connected Stripe account
  useEffect(() => {
    checkStripeStatus();
  }, []);

  // Poll for popup close and re-check
  useEffect(() => {
    if (!popup) return;
    const timer = setInterval(() => {
      if (popup.closed) {
        clearInterval(timer);
        setStatus('checking');
        setPopup(null);
        checkStripeStatus();
      }
    }, 800);
    return () => clearInterval(timer);
  }, [popup]);

  const checkStripeStatus = async () => {
    setStatus('checking');
    const res = await base44.functions.invoke('stripeAccountStatus', {});
    const data = res.data;
    if (data?.payoutsEnabled || data?.payouts_enabled) {
      // Already onboarded — proceed
      setStatus('done');
      setTimeout(() => onReady?.(), 600);
    } else {
      setStatus('needed');
    }
  };

  const startOnboarding = async () => {
    setStatus('linking');
    const returnUrl = window.location.href;
    const res = await base44.functions.invoke('stripeOnboard', { returnUrl, refreshUrl: returnUrl });
    const url = res.data?.url;
    if (url) {
      setOnboardingUrl(url);
      const p = window.open(url, '_blank');
      setPopup(p);
      setStatus('waiting');
    } else {
      setStatus('needed');
    }
  };

  return (
    <div className="mobile-sheet-overlay">
      <div dir="rtl" className="mobile-sheet" style={{ width: '100%', maxWidth: 480 }}>
        {/* Handle */}
        <div style={{ width: 40, height: 4, borderRadius: 99, background: '#dde4ef', margin: '12px auto 0' }} />

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px 8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Wallet size={18} color="#1a6fd4" />
            <span style={{ fontWeight: 900, fontSize: 16, color: '#0f2b6b' }}>חבר ארנק לקבלת תשלומים</span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, fontSize: 20, color: '#888', lineHeight: 1 }}>✕</button>
        </div>

        <div style={{ padding: '12px 20px 28px' }}>

          {/* Checking */}
          {(status === 'checking') && (
            <div style={{ textAlign: 'center', padding: '32px 0' }}>
              <Loader2 size={28} color="#1a6fd4" style={{ margin: '0 auto 12px' }} className="animate-spin" />
              <div style={{ fontSize: 14, color: '#888' }}>בודק סטטוס חשבון...</div>
            </div>
          )}

          {/* Needed */}
          {status === 'needed' && (
            <>
              <div style={{ background: '#f0f7ff', border: '1px solid #bfdbfe', borderRadius: 16, padding: '16px 18px', marginBottom: 18 }}>
                <div style={{ fontWeight: 800, color: '#0f2b6b', fontSize: 14, marginBottom: 8 }}>🎯 כדי לקבל תשלומים</div>
                <div style={{ fontSize: 13, color: '#3b6aab', lineHeight: 1.7 }}>
                  פעולה זו נדרשת פעם אחת בלבד. תוצנח לממשק Stripe המאובטח שם תוסיף:
                </div>
                <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {['✅ פרטים אישיים (שם, ת.ז., תאריך לידה)', '✅ מספר חשבון בנק ישראלי', '✅ כתובת מגורים'].map(item => (
                    <div key={item} style={{ fontSize: 13, color: '#1a6fd4', fontWeight: 600 }}>{item}</div>
                  ))}
                </div>
              </div>

              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: '10px 14px', marginBottom: 18, fontSize: 12, color: '#15803d', display: 'flex', gap: 8 }}>
                <span>🔒</span>
                <span>הפרטים שלך מאוחסנים ומוצפנים אצל Stripe בלבד — לנו אין גישה אליהם</span>
              </div>

              <button
                onClick={startOnboarding}
                style={{ width: '100%', height: 54, borderRadius: 16, background: 'linear-gradient(135deg,#1a6fd4,#0a52b0)', border: 'none', color: 'white', fontWeight: 900, fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 4px 16px rgba(26,111,212,0.3)' }}
              >
                <ExternalLink size={16} /> חבר ארנק דרך Stripe
              </button>
              <button onClick={onClose} style={{ width: '100%', marginTop: 10, height: 44, borderRadius: 14, background: 'transparent', border: '1px solid #dce8f5', color: '#666', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
                לא עכשיו
              </button>
            </>
          )}

          {/* Waiting for popup to close */}
          {status === 'waiting' && (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <Loader2 size={28} color="#1a6fd4" style={{ margin: '0 auto 12px' }} className="animate-spin" />
              <div style={{ fontSize: 15, fontWeight: 700, color: '#0f2b6b', marginBottom: 6 }}>ממתין לחיבור ב-Stripe...</div>
              <div style={{ fontSize: 13, color: '#888', marginBottom: 20 }}>לאחר סיום ה-onboarding הדף יתרענן אוטומטית</div>
              {onboardingUrl && (
                <a href={onboardingUrl} target="_blank" rel="noreferrer"
                  style={{ fontSize: 13, color: '#1a6fd4', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, textDecoration: 'none' }}>
                  <ArrowLeft size={13} /> פתח שוב אם הכרטיסייה נסגרה
                </a>
              )}
            </div>
          )}

          {/* Linking (fetching URL) */}
          {status === 'linking' && (
            <div style={{ textAlign: 'center', padding: '32px 0' }}>
              <Loader2 size={28} color="#1a6fd4" style={{ margin: '0 auto 12px' }} className="animate-spin" />
              <div style={{ fontSize: 14, color: '#888' }}>מכין קישור לחיבור...</div>
            </div>
          )}

          {/* Done */}
          {status === 'done' && (
            <div style={{ textAlign: 'center', padding: '28px 0' }}>
              <CheckCircle2 size={52} color="#16a34a" style={{ margin: '0 auto 12px' }} />
              <div style={{ fontSize: 20, fontWeight: 900, color: '#166534', marginBottom: 6 }}>הארנק מחובר! 🎉</div>
              <div style={{ fontSize: 14, color: '#15803d' }}>עכשיו אפשר להגיש בקשה</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}