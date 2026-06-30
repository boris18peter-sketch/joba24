import { createPortal } from 'react-dom';
import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { X, Zap, Shield, RotateCcw, CreditCard, RefreshCw, AlertTriangle, CheckCircle2 } from 'lucide-react';
import CreditIcon from '@/components/CreditIcon';
import { useAuth } from '@/lib/AuthContext';
import useCountUp from '@/hooks/useCountUp';
import CreditPackageCard from '@/components/credits/CreditPackageCard';
import PaymentConfirm from '@/components/credits/PaymentConfirm';
import PurchaseSuccess from '@/components/credits/PurchaseSuccess';
import TranzilaIframe from '@/components/credits/TranzilaIframe';
import SubscriptionManager from '@/components/credits/SubscriptionManager';
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
    border-radius: var(--r-xl);
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
  { icon: Shield,     title: 'רכישה מאובטחת',    desc: 'המידע הפיננסי מוצפן ומאובטח בתקנים המחמירים ביותר' },
  { icon: RotateCcw, title: 'החזר אוטומטי',    desc: 'לא נבחרת למשימה? הקרדיטים חוזרים מיידית לארנק' },
  { icon: CreditCard, title: 'גמישות מלאה',     desc: 'ניתן לבטל מנוי בכל עת ישירות מהגדרות החשבון' },
];

export default function BuyCreditsModal({ onClose, creditsNeeded }) {
  const { user: me } = useAuth();
  const queryClient = useQueryClient();
  const animatedCredits = useCountUp(me?.worker_credits ?? 0);

  const [tab, setTab] = useState('oneTime');
  const [selectedPkg, setSelectedPkg] = useState(null);
  const [step, setStep] = useState('browse');
  const [loading, setLoading] = useState(false);
  const [tranzilaData, setTranzilaData] = useState(null);
  useEffect(() => {
    const id = 'buy-credits-styles';
    if (!document.getElementById(id)) {
      const s = document.createElement('style');
      s.id = id;
      s.textContent = SHIMMER_STYLE;
      document.head.appendChild(s);
    }
  }, []);

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

  const handleConfirm = async (payMethod) => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke('tranzilaCreatePayment', {
        sum: selectedPkg.price,
        credits: selectedPkg.credits,
        package_id: selectedPkg.id,
        is_subscription: isSubscription,
        pay_method: payMethod,
      });
      setTranzilaData({ ...res.data, payMethod });
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
      dir="rtl"
      style={{
        position: 'fixed', inset: 0, zIndex: 999999,
        background: 'rgba(5,15,40,0.65)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        backdropFilter: 'blur(6px)',
        overflowX: 'hidden',
      }}
      onClick={(e) => e.target === e.currentTarget && handleClose()}
    >
      <div
        style={{
          background: 'var(--sheet-bg)',
          borderRadius: '28px 28px 0 0',
          width: '100%',
          maxWidth: 480,
          maxHeight: '92vh',
          overflowY: 'auto',
          overflowX: 'hidden',
          boxShadow: '0 -16px 60px rgba(0,0,0,0.25)',
          paddingBottom: step === 'success' ? 'max(32px, env(safe-area-inset-bottom))' : 0,
          boxSizing: 'border-box',
        }}
      >
        {/* Header — only on browse step */}
        {step === 'browse' && (
          <>
            <div style={{
              background: 'linear-gradient(135deg, #0a52b0 0%, #1a6fd4 50%, #2563eb 100%)',
              padding: '20px 20px 22px',
              borderRadius: '0 0 28px 28px',
              position: 'relative',
              overflow: 'hidden',
            }}>
              <div style={{
                position: 'absolute', top: -30, left: -20,
                width: 120, height: 120, borderRadius: '50%',
                background: 'rgba(255,255,255,0.06)',
              }} />
              <div style={{
                position: 'absolute', bottom: -40, right: -10,
                width: 80, height: 80, borderRadius: '50%',
                background: 'rgba(251,191,36,0.12)',
              }} />

              <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ width: 40, height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.3)', margin: '0 auto 14px' }} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: 12,
                      background: 'rgba(255,255,255,0.15)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      border: '1px solid rgba(255,255,255,0.2)',
                    }}>
                      <CreditIcon size={24} />
                    </div>
                    <div>
                      <div style={{ fontSize: 18, fontWeight: 900, color: 'white', letterSpacing: -0.3 }}>
                        חנות הקרדיטים
                      </div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>
                        Joba24 Credits Store
                      </div>
                    </div>
                  </div>

                  <div style={{
                    background: 'rgba(255,255,255,0.1)',
                    borderRadius: 14, padding: '12px 16px',
                    border: '1px solid rgba(255,255,255,0.15)',
                    backdropFilter: 'blur(8px)',
                  }}>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', fontWeight: 700, marginBottom: 4 }}>
                      היתרה שלך
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 28, fontWeight: 900, color: 'white', letterSpacing: -0.5 }}>
                        {animatedCredits}
                      </span>
                      <CreditIcon size={20} />
                      <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', fontWeight: 700, marginRight: 4 }}>
                        קרדיטים
                      </span>
                    </div>
                  </div>

                  {creditsNeeded && (
                    <div style={{
                      marginTop: 10, background: 'rgba(251,191,36,0.15)',
                      border: '1px solid rgba(251,191,36,0.3)', borderRadius: 12,
                      padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8,
                    }}>
                      <Zap size={14} color="#fbbf24" fill="#fbbf24" />
                      <span style={{ fontSize: 13, color: '#fbbf24', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                        נדרשים עוד <strong style={{ display: 'flex', alignItems: 'center', gap: 3 }}>{creditsNeeded} <CreditIcon size={14} /></strong> להגשת מועמדות
                      </span>
                    </div>
                  )}
                </div>
                <button
                  onClick={handleClose}
                  style={{
                    width: 34, height: 34, borderRadius: 11,
                    background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', flexShrink: 0, marginTop: 24,
                  }}
                >
                  <X size={16} color="white" />
                </button>
              </div>
            </div>

            {/* Active subscriptions — shared component (synced with Profile) */}
            <div style={{ padding: '16px 20px 0' }}>
              <SubscriptionManager />
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
                    flex: 1, height: 42, borderRadius: 'var(--r-sm)',
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
                    flex: 1, height: 42, borderRadius: 'var(--r-sm)',
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
            <div style={{ padding: '14px 20px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-1)' }}>
                {isSubscription ? 'בחר מנוי חודשי' : 'בחר חבילה'}
              </span>
              <span style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600 }}>
                {packages.length} אפשרויות
              </span>
            </div>
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
              <div style={{
                background: 'var(--surface-3)',
                borderRadius: 'var(--r-lg)',
                padding: '4px 16px',
              }}>
                {TRUST_FEATURES.map((feat, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '14px 0',
                    borderBottom: i < TRUST_FEATURES.length - 1 ? '1px solid var(--border-1)' : 'none',
                  }}>
                    <div style={{
                      width: 38, height: 38, borderRadius: 11,
                      background: 'var(--brand-primary-light)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      border: '1px solid #bfdbfe',
                    }}>
                      <feat.icon size={18} color="var(--brand-primary)" strokeWidth={1.8} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-1)' }}>{feat.title}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 2, lineHeight: 1.5 }}>{feat.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{
              padding: '4px 20px max(32px, env(safe-area-inset-bottom))',
              textAlign: 'center',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              color: 'var(--text-3)', fontSize: 11, fontWeight: 600,
            }}>
              <Shield size={12} color="var(--text-3)" />
              רכישה מאובטחת · תשלום דרך Tranzila · PCI DSS Level 1
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
            payMethod={tranzilaData.payMethod}
            thtk={tranzilaData.thtk}
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