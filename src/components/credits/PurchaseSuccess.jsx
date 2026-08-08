import { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { CheckCircle2 } from 'lucide-react';
import CreditIcon from '@/components/CreditIcon';
import { useLanguage } from '@/lib/LanguageContext';

/**
 * PurchaseSuccess — celebration screen shown after a successful purchase.
 * Props:
 *   pkg: { credits, price }
 *   isSubscription: boolean
 *   onDone: () => void
 */
export default function PurchaseSuccess({ pkg, isSubscription, onDone }) {
  const { t } = useLanguage();
  useEffect(() => {
    const fire = (x, y) => {
      confetti({
        particleCount: 60,
        spread: 65,
        origin: { x, y },
        colors: ['#1a6fd4', '#fbbf24', '#059669', '#a855f7'],
      });
    };
    fire(0.2, 0.4);
    setTimeout(() => fire(0.8, 0.4), 200);
    setTimeout(() => fire(0.5, 0.3), 400);
  }, []);

  return (
    <div style={{ padding: '40px 24px 32px', textAlign: 'center' }}>
      {/* Animated check */}
      <div style={{
        width: 80, height: 80, borderRadius: '50%',
        background: 'linear-gradient(135deg, #10b981, #059669)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 8px 32px rgba(16,185,129,0.35)',
        margin: '0 auto 20px',
        animation: 'successPop 0.5s cubic-bezier(0.16,1.4,0.3,1) both',
      }}>
        <CheckCircle2 size={42} color="white" strokeWidth={2} />
      </div>

      <div style={{ fontSize: 21, fontWeight: 900, color: 'var(--text-1)', marginBottom: 6 }}>
        {t('buy_success_title')}
      </div>

      <div style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.6, marginBottom: 8 }}>
        {t('buy_success_added').replace('{n}', pkg.credits).replace('{monthly}', isSubscription ? t('buy_success_monthly_suffix') : '')}
      </div>

      <div style={{ fontSize: 13, color: 'var(--color-success)', fontWeight: 700, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 6 }}>
        {t('buy_success_ready')}
      </div>

      <button
        onClick={onDone}
        style={{
          width: '100%', height: 52, borderRadius: 'var(--r-md)',
          background: 'linear-gradient(135deg, #10b981, #059669)',
          color: 'white', fontWeight: 800, fontSize: 15,
          border: 'none', cursor: 'pointer',
          boxShadow: '0 4px 20px rgba(16,185,129,0.3)',
        }}
      >
        {t('buy_success_done')}
      </button>

      <style>{`
        @keyframes successPop {
          0% { transform: scale(0.4); opacity: 0; }
          70% { transform: scale(1.1); opacity: 1; }
          100% { transform: scale(1); }
        }
      `}</style>
    </div>
  );
}