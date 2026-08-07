import { createPortal } from 'react-dom';
import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { X, Zap, Shield, RotateCcw, CreditCard, RefreshCw, AlertTriangle, CheckCircle2, Lock } from 'lucide-react';
import CreditIcon from '@/components/CreditIcon';
import { useAuth } from '@/lib/AuthContext';
import useCountUp from '@/hooks/useCountUp';
import { packageValueLabel, computeLockedJobas } from '@/lib/jobaBalance';
import CreditPackageCard from '@/components/credits/CreditPackageCard';
import PaymentConfirm from '@/components/credits/PaymentConfirm';
import PurchaseSuccess from '@/components/credits/PurchaseSuccess';
import TranzilaIframe from '@/components/credits/TranzilaIframe';
import SubscriptionManager from '@/components/credits/SubscriptionManager';
import { base44 } from '@/api/base44Client';
import { useLanguage } from '@/lib/LanguageContext';

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

function useTrustFeatures(t) {
  return [
    { icon: Shield,     title: t('buy_trust_secure'),    desc: t('buy_trust_secure_desc') },
    { icon: RotateCcw,  title: t('buy_trust_refund'),   desc: t('buy_trust_refund_desc') },
    { icon: CreditCard, title: t('buy_trust_flex'),     desc: t('buy_trust_flex_desc') },
  ];
}

export default function BuyCreditsModal({ onClose, creditsNeeded }) {
  const { user: me } = useAuth();
  const queryClient = useQueryClient();
  const { t, isRTL } = useLanguage();
  const animatedCredits = useCountUp(me?.worker_credits ?? 0);
  const TRUST_FEATURES = useTrustFeatures(t);

  // Pending applications — for locked (committed) balance display next to available
  const { data: myApplications = [] } = useQuery({
    queryKey: ['myLockedJobas', me?.id],
    queryFn: () => base44.entities.TaskApplication.filter({ worker_id: me.id, status: 'pending' }, '-created_date', 50),
    enabled: !!me?.id,
    staleTime: 15000,
  });
  const lockedJobas = computeLockedJobas(myApplications);

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
      dir={isRTL ? 'rtl' : 'ltr'}
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
            {/* Compact header — title + balance inline, close button */}
            <div style={{
              background: 'linear-gradient(135deg, #0a52b0 0%, #1a6fd4 50%, #2563eb 100%)',
              padding: '12px 18px 14px',
              borderRadius: '0 0 24px 24px',
              position: 'relative',
              overflow: 'hidden',
            }}>
              <div style={{ position: 'absolute', top: -26, left: -16, width: 110, height: 110, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
              <div style={{ position: 'absolute', bottom: -32, right: -8, width: 70, height: 70, borderRadius: '50%', background: 'rgba(251,191,36,0.1)' }} />

              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                  <div style={{
                    width: 34, height: 34, borderRadius: 10,
                    background: 'rgba(255,255,255,0.15)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    border: '1px solid rgba(255,255,255,0.2)',
                  }}>
                    <CreditIcon size={20} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 16, fontWeight: 900, color: 'white', letterSpacing: -0.3, lineHeight: 1.1 }}>
                      {t('buy_header_title')}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 3 }}>
                      <span style={{ fontSize: 16, fontWeight: 900, color: '#fbbf24', letterSpacing: -0.3, lineHeight: 1 }}>
                        {animatedCredits}
                      </span>
                      <CreditIcon size={13} />
                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: 700 }}>{t('buy_balance_label')}</span>
                      {lockedJobas > 0 && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, marginRight: 4, background: 'rgba(217,119,6,0.25)', borderRadius: 99, padding: '1px 7px', border: '1px solid rgba(217,119,6,0.45)' }}>
                          <Lock size={10} color="#fbbf24" strokeWidth={2.5} />
                          <span style={{ fontSize: 11, fontWeight: 800, color: '#fbbf24' }}>{lockedJobas}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleClose}
                  style={{
                    width: 32, height: 32, borderRadius: 10,
                    background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', flexShrink: 0,
                  }}
                >
                  <X size={15} color="white" />
                </button>
              </div>

              {creditsNeeded && (
                <div style={{
                  marginTop: 10, background: 'rgba(251,191,36,0.15)',
                  border: '1px solid rgba(251,191,36,0.3)', borderRadius: 10,
                  padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8,
                  position: 'relative',
                }}>
                  <Zap size={13} color="#fbbf24" fill="#fbbf24" />
                  <span style={{ fontSize: 12, color: '#fbbf24', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                    {t('buy_credits_needed', { n: creditsNeeded })} <CreditIcon size={12} />
                  </span>
                </div>
              )}
            </div>

            {/* Tabs — moved up to where balance row was */}
            <div style={{ padding: '12px 16px 0' }}>
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
                  {t('buy_tab_onetime')}
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
                  {t('buy_tab_subscription')}
                </button>
              </div>
            </div>

            {/* Active subscriptions — only renders if user has one */}
            <div style={{ padding: '10px 16px 0' }}>
              <SubscriptionManager />
            </div>
          </>
        )}

        {/* Step: Browse packages */}
        {step === 'browse' && (
          <>
            <div style={{ padding: '8px 16px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-1)' }}>
                {isSubscription ? t('buy_choose_sub') : t('buy_choose_pkg')}
              </span>
              <span style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600 }}>
                {t('buy_options', { n: packages.length })}
              </span>
            </div>
            <div style={{
              padding: '12px 16px 0',
              display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10,
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

            {/* Trust features — compact */}
            <div style={{ padding: '10px 16px 0' }}>
              <div style={{ display: 'flex', gap: 6 }}>
                {TRUST_FEATURES.map((feat, i) => (
                  <div key={i} style={{
                    flex: 1, textAlign: 'center',
                    background: 'var(--surface-2)',
                    border: '1px solid var(--border-1)',
                    borderRadius: 'var(--r-md)',
                    padding: '10px 4px',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                  }}>
                    <div style={{
                      width: 30, height: 30, borderRadius: 9,
                      background: 'var(--brand-primary-light)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <feat.icon size={15} color="var(--brand-primary)" strokeWidth={1.8} />
                    </div>
                    <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-1)', lineHeight: 1.2 }}>{feat.title}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{
              padding: '4px 20px max(20px, env(safe-area-inset-bottom))',
              textAlign: 'center',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              color: 'var(--text-3)', fontSize: 10, fontWeight: 600,
            }}>
              <Shield size={11} color="var(--text-3)" />
              {t('buy_secure_footer')}
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