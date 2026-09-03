import { useState } from 'react';
import { ArrowRight, Shield, Loader2 } from 'lucide-react';
import CreditIcon from '@/components/CreditIcon';
import { useLanguage } from '@/lib/LanguageContext';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { purchaseIosProduct, finishIosTransaction, IOS_IAP_PRODUCT_IDS } from '@/lib/iosIap';

/**
 * IosPurchaseConfirm — Apple In-App Purchase confirm step (iOS native only).
 *
 * Flow (App Store Guideline 3.1.1):
 *   1. Opens the native StoreKit purchase sheet → signed JWS receipt.
 *   2. Server-side verification via verifyIosPurchase (full certificate-chain
 *      check against Apple Root CA - G3) — credits are granted there.
 *   3. Only after the credits were granted, the transaction is finished so
 *      StoreKit stops re-delivering it.
 */
export default function IosPurchaseConfirm({ pkg, priceLabel, onBack, onDone }) {
  const { t } = useLanguage();
  const [phase, setPhase] = useState('idle'); // idle | purchasing | verifying

  const handlePurchase = async () => {
    if (phase !== 'idle') return;
    setPhase('purchasing');
    try {
      // 1. Native StoreKit purchase sheet → signed JWS receipt
      const purchase = await purchaseIosProduct(IOS_IAP_PRODUCT_IDS[pkg.id]);
      // 2. Server-side verification + credit grant
      setPhase('verifying');
      const verify = await base44.functions.invoke('verifyIosPurchase', { jws: purchase.jws });
      if (verify.data?.success) {
        // 3. Only after credits are granted — finish the transaction
        await finishIosTransaction(purchase.transactionId);
        onDone();
      } else {
        toast.error(t('buy_ios_error'));
        setPhase('idle');
      }
    } catch (err) {
      const msg = String(err?.message || err || '');
      if (/cancel/i.test(msg)) {
        toast.error(t('buy_ios_cancelled'));
      } else {
        toast.error(t('buy_ios_error'));
      }
      setPhase('idle');
    }
  };

  const busy = phase !== 'idle';
  const displayPrice = priceLabel || `₪${pkg.price.toFixed(2)}`;

  return (
    <div style={{ padding: '8px 20px 0' }}>
      {/* Back */}
      <button
        onClick={onBack}
        disabled={busy}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: 'none', border: 'none', cursor: busy ? 'default' : 'pointer',
          color: 'var(--text-2)', fontSize: 13, fontWeight: 600,
          padding: 0, marginBottom: 16,
        }}
      >
        <ArrowRight size={15} /> {t('buy_back_to_pkg')}
      </button>

      {/* Summary card — same look as the regular confirm step */}
      <div style={{
        background: 'var(--surface-3)',
        borderRadius: 'var(--r-lg)',
        padding: '20px 18px',
        textAlign: 'center',
        marginBottom: 16,
      }}>
        <div style={{
          fontSize: 12, fontWeight: 700, color: 'var(--text-3)',
          textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12,
        }}>
          {t('buy_selected_pkg')}
        </div>
        <div style={{
          fontSize: 36, fontWeight: 900, color: 'var(--brand-primary)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          marginBottom: 6,
        }}>
          {pkg.credits}
          <CreditIcon size={24} />
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 16 }}>
          {t('buy_jobs_added_balance')}
        </div>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: 'var(--surface-2)', borderRadius: 99,
          padding: '6px 18px',
        }}>
          <span style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600 }}>{t('buy_final_price')}</span>
          <span style={{ fontSize: 20, fontWeight: 900, color: 'var(--text-1)' }}>{displayPrice}</span>
        </div>
      </div>

      {/* Apple payment note */}
      <div style={{
        background: 'var(--brand-primary-light)',
        border: '1px solid #bfdbfe',
        borderRadius: 'var(--r-md)',
        padding: '12px 14px',
        marginBottom: 18,
        fontSize: 12, color: 'var(--text-2)', lineHeight: 1.6,
      }}>
        {t('buy_ios_note')}
      </div>

      {/* Purchase button — Apple style (black) */}
      <button
        onClick={handlePurchase}
        disabled={busy}
        style={{
          width: '100%', height: 54, borderRadius: 'var(--r-md)',
          background: '#000000', color: 'white',
          fontWeight: 900, fontSize: 15, border: 'none',
          cursor: busy ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          opacity: busy ? 0.75 : 1,
        }}
      >
        {phase === 'purchasing' ? (
          <><Loader2 size={18} className="animate-spin" /> {t('buy_ios_purchasing')}</>
        ) : phase === 'verifying' ? (
          <><Loader2 size={18} className="animate-spin" /> {t('buy_ios_verifying')}</>
        ) : (
          <><Shield size={17} /> {t('buy_ios_button')}</>
        )}
      </button>

      <div style={{
        fontSize: 10, color: 'var(--text-3)', textAlign: 'center',
        marginTop: 10, lineHeight: 1.6,
        paddingBottom: 'max(24px, env(safe-area-inset-bottom))',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
      }}>
        <Shield size={11} /> {t('buy_ios_secure')}
      </div>
    </div>
  );
}