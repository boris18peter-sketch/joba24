import { createPortal } from 'react-dom';
import { useState, useEffect } from 'react';
import { X, Zap, Shield, RotateCcw, CreditCard } from 'lucide-react';
import CreditIcon from '@/components/CreditIcon';
import { useAuth } from '@/lib/AuthContext';
import { useLanguage } from '@/lib/LanguageContext';
import useCountUp from '@/hooks/useCountUp';
import CreditPackageCard from '@/components/credits/CreditPackageCard';
import PaymentConfirm from '@/components/credits/PaymentConfirm';
import PurchaseSuccess from '@/components/credits/PurchaseSuccess';
import TranzilaIframe from '@/components/credits/TranzilaIframe';
import { base44 } from '@/api/base44Client';

const SHIMMER_STYLE = `
  @keyframes shimmerWipe {
    0%   { transform: translateX(-120%) skewX(-15deg); }
    100% { transform: translateX(250%) skewX(-15deg); }
  }
  .pkg-card::after {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: var(--r-lg);
    background: linear-gradient(100deg, transparent 30%, rgba(255,255,255,0.18) 50%, transparent 70%);
    transform: translateX(-120%) skewX(-15deg);
    pointer-events: none;
    overflow: hidden;
  }
  .pkg-card.pkg-shimmer::after {
    animation: shimmerWipe 1.3s ease-in-out;
  }
`;

const ONE_TIME_PACKAGES = [
  { id: 'ot1', credits: 5,   price: 9.99,   badge: null,      coins: 1 },
  { id: 'ot2', credits: 14,  price: 24.99,  badge: null,      coins: 1 },
  { id: 'ot3', credits: 29,  price: 49.99,  badge: 'popular', coins: 2 },
  { id: 'ot4', credits: 60,  price: 99.99,  badge: null,      coins: 3 },
  { id: 'ot5', credits: 100, price: 149.99, badge: null,      coins: 4 },
  { id: 'ot6', credits: 135, price: 199.99, badge: 'best',    coins: 5 },
];

const SUBSCRIPTION_PACKAGES = [
  { id: 'sub1', credits: 20,  price: 24.99,  badge: null,      coins: 1 },
  { id: 'sub2', credits: 45,  price: 49.99,  badge: 'popular', coins: 2 },
  { id: 'sub3', credits: 95,  price: 99.99,  badge: null,      coins: 3 },
  { id: 'sub4', credits: 145, price: 149.99, badge: null,     coins: 4 },
  { id: 'sub5', credits: 190, price: 199.99, badge: 'best',    coins: 5 },
];

const TRUST_FEATURES = [
  { icon: Shield,    title: 'רכישה מאובטחת',    desc: 'המידע הפיננסי מוצפן ומאובטח בתקנים המחמירים ביותר' },
  { icon: RotateCcw, title: 'החזר אוטומטי',    desc: 'לא נבחרת למשימה? הקרדיטים חוזרים מיידית לארנק' },
  { icon: CreditCard, title: 'גמישות מלאה',     desc: 'ניתן לבטל מנוי בכל עת ישירות מהגדרות החשבון' },
];

export default function BuyCreditsModal({ onClose, creditsNeeded }) {
  const { user: me } = useAuth();
  const { t } = useLanguage();
  const animatedCredits = useCountUp(me?.worker_credits ?? 0);

  const [tab, setTab] = useState('oneTime');
  const [selectedPkg, setSelectedPkg] = useState(null);
  const [step, setStep] = useState('browse'); // 'browse' | 'confirm' | 'iframe' | 'success'
  const [loading, setLoading] = useState(false);
  const [tranzilaData, setTranzilaData] = useState(null);

  // Inject shimmer keyframes once
  useEffect(() => {
    const id = 'buy-credits-styles';
    if (!document.getElementById(id)) {
      const s = document.createElement('style');
      s.id = id;
      s.textContent = SHIMMER_STYLE;
      document.head.appendChild(s);
    }
  }, []);

  // Trigger shimmer periodically on visible cards
  useEffect(() => {
    if (step !== 'browse') return;
    const trigger = () => {
      document.querySelectorAll('.pkg-card').forEach((el, i) => {
        setTimeout(() => {
          el.classList.remove('pkg-shimmer');
          void el.offsetWidth;
          el.classList.add('pkg-shimmer');
          setTimeout(() => el.classList.remove('pkg-shimmer'), 1400);
        }, i * 80);
      });
    };
    trigger();
    const iv = setInterval(trigger, 5000);
    return () => clearInterval(iv);
  }, [step, tab]);

  const packages = tab === 'oneTime' ? ONE_TIME_PACKAGES : SUBSCRIPTION_PACKAGES;
  const isSubscription = tab === 'subscription';

  const handleSelectPkg = (pkg) => {
    setSelectedPkg(pkg);
    setStep('confirm');
  };

  const handleConfirm = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke('tranzilaCreatePayment', {
        sum: selectedPkg.price,
        credits: selectedPkg.credits,
        package_id: selectedPkg.id,
        is_subscription: isSubscription,
      });
      setTranzilaData(res.data);
      setStep('iframe');
    } catch (err) {
      console.error('Tranzila payment init failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (step === 'success') {
      onClose();
      window.location.reload();
    } else {
      onClose();
    }
  };

  return createPortal(
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 999999,
        background: 'rgba(5,15,40,0.65)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        backdropFilter: 'blur(6px)',
      }}
      onClick={(e) => e.target === e.currentTarget && handleClose()}
    >
      <div
        dir="rtl"
        style={{
          background: 'var(--sheet-bg)',
          borderRadius: '28px 28px 0 0',
          width: '100%',
          maxWidth: 480,
          maxHeight: '92vh',
          overflowY: 'auto',
          boxShadow: '0 -16px 60px rgba(0,0,0,0.25)',
          paddingBottom: step === 'success' ? 'max(32px, env(safe-area-inset-bottom))' : 0,
        }}
      >
        {/* Header — only on browse step */}
        {step === 'browse' && (
          <>
            <div style={{ padding: '14px 20px 0', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ width: 40, height: 4, borderRadius: 99, background: 'var(--border-1)', margin: '0 auto 16px' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 14,
                    background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-primary-dark))',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <CreditIcon size={26} />
                  </div>
                  <div>
                    <div style={{ fontSize: 19, fontWeight: 900, color: 'var(--text-1)', letterSpacing: -0.3 }}>
                      חנות הקרדיטים
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 1, display: 'flex', alignItems: 'center', gap: 4 }}>
                      יתרה: <span style={{ fontWeight: 700, color: 'var(--brand-primary)', display: 'flex', alignItems: 'center', gap: 3 }}>
                        {animatedCredits} <CreditIcon size={13} />
                      </span>
                    </div>
                  </div>
                </div>
                {creditsNeeded && (
                  <div style={{
                    marginTop: 12, background: 'var(--color-warning-bg)',
                    border: '1px solid var(--color-warning-border)', borderRadius: 12,
                    padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8,
                  }}>
                    <Zap size={14} color="var(--color-warning)" />
                    <span style={{ fontSize: 13, color: 'var(--color-warning)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                      נדרש <strong style={{ display: 'flex', alignItems: 'center', gap: 3 }}>{creditsNeeded} <CreditIcon size={14} /></strong>
                    </span>
                  </div>
                )}
              </div>
              <button
                onClick={handleClose}
                style={{
                  width: 34, height: 34, borderRadius: 11,
                  background: 'var(--surface-3)', border: 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', flexShrink: 0, marginTop: 24,
                }}
              >
                <X size={16} color="var(--text-3)" />
              </button>
            </div>

            {/* Tabs */}
            <div style={{ padding: '16px 20px 0' }}>
              <div style={{
                display: 'flex', background: 'var(--surface-3)',
                borderRadius: 'var(--r-md)', padding: 4, gap: 4,
              }}>
                <button
                  onClick={() => setTab('oneTime')}
                  style={{
                    flex: 1, height: 40, borderRadius: 'var(--r-sm)',
                    border: 'none', cursor: 'pointer',
                    background: tab === 'oneTime' ? 'var(--surface-2)' : 'transparent',
                    boxShadow: tab === 'oneTime' ? 'var(--shadow-xs)' : 'none',
                    fontSize: 13, fontWeight: tab === 'oneTime' ? 800 : 600,
                    color: tab === 'oneTime' ? 'var(--brand-primary)' : 'var(--text-2)',
                    transition: 'all 0.2s',
                  }}
                >
                  חבילות חד-פעמיות
                </button>
                <button
                  onClick={() => setTab('subscription')}
                  style={{
                    flex: 1, height: 40, borderRadius: 'var(--r-sm)',
                    border: 'none', cursor: 'pointer',
                    background: tab === 'subscription' ? 'var(--surface-2)' : 'transparent',
                    boxShadow: tab === 'subscription' ? 'var(--shadow-xs)' : 'none',
                    fontSize: 13, fontWeight: tab === 'subscription' ? 800 : 600,
                    color: tab === 'subscription' ? 'var(--brand-primary)' : 'var(--text-2)',
                    transition: 'all 0.2s',
                  }}
                >
                  מנוי חודשי
                </button>
              </div>
            </div>
          </>
        )}

        {/* Step: Browse packages */}
        {step === 'browse' && (
          <>
            <div style={{
              padding: '14px 14px 0',
              display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12,
            }}>
              {packages.map(pkg => (
                <CreditPackageCard
                  key={pkg.id}
                  pkg={pkg}
                  selected={false}
                  onSelect={handleSelectPkg}
                  isSubscription={isSubscription}
                />
              ))}
            </div>

            {/* Trust features */}
            <div style={{ padding: '20px 20px 8px' }}>
              {TRUST_FEATURES.map((feat, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 12,
                  padding: '12px 0',
                  borderBottom: i < TRUST_FEATURES.length - 1 ? '1px solid var(--border-1)' : 'none',
                }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: 'var(--surface-3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <feat.icon size={17} color="var(--brand-primary)" strokeWidth={1.8} />
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-1)' }}>{feat.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 2, lineHeight: 1.5 }}>{feat.desc}</div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ padding: '4px 20px max(32px, env(safe-area-inset-bottom))', textAlign: 'center', color: 'var(--text-3)', fontSize: 11 }}>
              רכישה מאובטחת · תשלום דרך Tranzila
            </div>
          </>
        )}

        {/* Step: Payment confirmation */}
        {step === 'confirm' && selectedPkg && (
          <PaymentConfirm
            pkg={selectedPkg}
            isSubscription={isSubscription}
            onBack={() => setStep('browse')}
            onConfirm={handleConfirm}
            loading={loading}
          />
        )}

        {/* Step: Tranzila iframe */}
        {step === 'iframe' && tranzilaData && (
          <TranzilaIframe
            supplier={tranzilaData.supplier}
            sum={tranzilaData.sum}
            paymentId={tranzilaData.payment_id}
            isSubscription={isSubscription}
            pkg={selectedPkg}
            onClose={() => { setStep('browse'); setTranzilaData(null); }}
            onSuccess={() => setStep('success')}
          />
        )}

        {/* Step: Success */}
        {step === 'success' && selectedPkg && (
          <PurchaseSuccess
            pkg={selectedPkg}
            isSubscription={isSubscription}
            onDone={handleClose}
          />
        )}
      </div>
    </div>,
    document.body
  );
}