import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2, CheckCircle2, AlertCircle, ExternalLink, Zap } from 'lucide-react';
import { toast } from 'sonner';

export default function StripeConnectOnboarding() {
  const [status, setStatus] = useState(null); // null | loading | connected | not_connected | pending
  const [loading, setLoading] = useState(true);
  const [onboarding, setOnboarding] = useState(false);

  const fetchStatus = async () => {
    try {
      const res = await base44.functions.invoke('stripeAccountStatus', {});
      setStatus(res.data);
    } catch {
      setStatus({ connected: false });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStatus(); }, []);

  const handleConnect = async () => {
    setOnboarding(true);
    try {
      const res = await base44.functions.invoke('stripeOnboard', {
        returnUrl: window.location.href + '?stripe_return=1',
        refreshUrl: window.location.href + '?stripe_refresh=1',
      });
      window.open(res.data.url, '_blank');
      // Poll for status update after tab potentially closes
      const timer = setInterval(async () => {
        const check = await base44.functions.invoke('stripeAccountStatus', {});
        if (check.data?.onboardingComplete) {
          clearInterval(timer);
          setStatus(check.data);
          toast.success('חשבון Stripe מחובר בהצלחה! 🎉');
        }
      }, 3000);
      setTimeout(() => clearInterval(timer), 120000); // stop after 2min
    } catch (err) {
      toast.error('שגיאה: ' + err.message);
    } finally {
      setOnboarding(false);
    }
  };

  if (loading) return (
    <div style={{ background: 'white', borderRadius: 16, border: '1px solid #dce8f5', padding: '20px', textAlign: 'center' }}>
      <Loader2 size={22} className="animate-spin" style={{ color: '#1a6fd4', margin: '0 auto' }} />
    </div>
  );

  if (status?.onboardingComplete) return (
    <div style={{ background: '#f0fdf4', borderRadius: 16, border: '1.5px solid #86efac', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
      <CheckCircle2 size={22} color="#16a34a" style={{ flexShrink: 0 }} />
      <div>
        <div style={{ fontWeight: 800, color: '#166534', fontSize: 14 }}>חשבון Stripe מחובר ✓</div>
        <div style={{ fontSize: 12, color: '#15803d', marginTop: 2 }}>תשלומים מועברים ישירות לחשבונך</div>
      </div>
    </div>
  );

  if (status?.connected && !status?.onboardingComplete) return (
    <div style={{ background: '#fffbeb', borderRadius: 16, border: '1.5px solid #fcd34d', padding: '16px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <AlertCircle size={20} color="#d97706" style={{ flexShrink: 0 }} />
        <div>
          <div style={{ fontWeight: 800, color: '#92400e', fontSize: 14 }}>נדרשים פרטים נוספים</div>
          <div style={{ fontSize: 12, color: '#b45309', marginTop: 2 }}>השלם את הגדרת החשבון כדי לקבל תשלומים</div>
        </div>
      </div>
      <button onClick={handleConnect} disabled={onboarding}
        style={{ width: '100%', height: 44, borderRadius: 12, background: '#f59e0b', border: 'none', color: 'white', fontWeight: 800, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
        {onboarding ? <Loader2 size={16} className="animate-spin" /> : <><ExternalLink size={15} /> השלם הגדרת חשבון</>}
      </button>
    </div>
  );

  // Not connected
  return (
    <div style={{ background: 'white', borderRadius: 16, border: '1px solid #dce8f5', padding: '16px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Zap size={20} color="#1a6fd4" />
        </div>
        <div>
          <div style={{ fontWeight: 800, color: '#0f2b6b', fontSize: 14 }}>קבל תשלומים ישירות</div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>חבר חשבון Stripe וקבל כסף מהמשימות שלך</div>
        </div>
      </div>
      <button onClick={handleConnect} disabled={onboarding}
        style={{ width: '100%', height: 48, borderRadius: 14, background: 'linear-gradient(135deg,#1a6fd4,#0a52b0)', border: 'none', color: 'white', fontWeight: 900, fontSize: 15, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 4px 16px rgba(26,111,212,0.3)' }}>
        {onboarding ? <Loader2 size={18} className="animate-spin" /> : <><ExternalLink size={16} /> חבר Stripe לקבלת תשלומים</>}
      </button>
      <div style={{ textAlign: 'center', marginTop: 8, fontSize: 11, color: '#bbb' }}>מאובטח על ידי Stripe · ללא עמלות נסתרות</div>
    </div>
  );
}