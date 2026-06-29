import { useState } from 'react';
import { ArrowRight, CreditCard, Apple, Shield, Lock } from 'lucide-react';
import CreditIcon from '@/components/CreditIcon';

/**
 * PaymentConfirm — second step: confirm purchase with payment method.
 * Props:
 *   pkg: { credits, price }
 *   isSubscription: boolean
 *   onBack: () => void
 *   onConfirm: () => void  — called when user confirms (should trigger actual payment)
 *   loading: boolean
 */
export default function PaymentConfirm({ pkg, isSubscription, onBack, onConfirm, loading }) {
  const [payMethod, setPayMethod] = useState('card');

  return (
    <div style={{ padding: '8px 20px 0' }}>
      {/* Back */}
      <button
        onClick={onBack}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--text-2)', fontSize: 13, fontWeight: 600,
          padding: 0, marginBottom: 16,
        }}
      >
        <ArrowRight size={15} /> חזרה לחבילות
      </button>

      {/* Summary card */}
      <div style={{
        background: 'var(--surface-3)',
        borderRadius: 'var(--r-lg)',
        padding: '20px 18px',
        textAlign: 'center',
        marginBottom: 20,
      }}>
        <div style={{
          fontSize: 12, fontWeight: 700, color: 'var(--text-3)',
          textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12,
        }}>
          {isSubscription ? 'המנוי שנבחר' : 'החבילה שנבחרה'}
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
          {isSubscription ? 'קרדיטים שיתווספו מדי חודש' : 'קרדיטים שיתווספו לארנק'}
        </div>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: 'var(--surface-2)', borderRadius: 99,
          padding: '6px 18px',
        }}>
          <span style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600 }}>מחיר סופי</span>
          <span style={{ fontSize: 20, fontWeight: 900, color: 'var(--text-1)' }}>
            ₪{pkg.price.toFixed(2)}
          </span>
          {isSubscription && (
            <span style={{ fontSize: 11, color: 'var(--text-3)' }}>/חודש</span>
          )}
        </div>
      </div>

      {/* Payment methods */}
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-2)', marginBottom: 10 }}>
        אמצעי תשלום
      </div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <button
          onClick={() => setPayMethod('card')}
          style={{
            flex: 1, height: 52, borderRadius: 'var(--r-md)',
            border: payMethod === 'card'
              ? '2px solid var(--brand-primary)'
              : '1.5px solid var(--border-1)',
            background: payMethod === 'card' ? 'var(--brand-primary-light)' : 'var(--surface-2)',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            fontSize: 13, fontWeight: 700,
            color: payMethod === 'card' ? 'var(--brand-primary)' : 'var(--text-2)',
            transition: 'all 0.15s',
          }}
        >
          <CreditCard size={16} /> כרטיס אשראי
        </button>
        <button
          onClick={() => setPayMethod('apple')}
          style={{
            flex: 1, height: 52, borderRadius: 'var(--r-md)',
            border: payMethod === 'apple'
              ? '2px solid var(--brand-primary)'
              : '1.5px solid var(--border-1)',
            background: payMethod === 'apple' ? 'var(--brand-primary-light)' : 'var(--surface-2)',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            fontSize: 13, fontWeight: 700,
            color: payMethod === 'apple' ? 'var(--brand-primary)' : 'var(--text-2)',
            transition: 'all 0.15s',
          }}
        >
          <Apple size={16} /> Apple Pay
        </button>
      </div>

      {/* Confirm button */}
      <button
        onClick={onConfirm}
        disabled={loading}
        style={{
          width: '100%', height: 54, borderRadius: 'var(--r-md)',
          background: loading
            ? 'var(--border-1)'
            : 'linear-gradient(135deg, var(--brand-primary), var(--brand-primary-dark))',
          color: 'white', fontWeight: 900, fontSize: 15,
          border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          boxShadow: loading ? 'none' : '0 4px 20px rgba(26,111,212,0.3)',
          marginBottom: 12,
        }}
      >
        {loading ? (
          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : (
          <>
            <Shield size={17} />
            אשר תשלום ₪{pkg.price.toFixed(2)}
          </>
        )}
      </button>

      {/* Trust line */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        fontSize: 11, color: 'var(--text-3)', marginBottom: 8,
      }}>
        <Lock size={11} />
        רכישה מאובטחת SSL · ניתן לבטל מנוי בכל עת
      </div>

      <div style={{
        fontSize: 10, color: 'var(--text-3)', textAlign: 'center', lineHeight: 1.6,
        paddingBottom: 'max(24px, env(safe-area-inset-bottom))',
      }}>
        בלחיצה על כפתור התשלום אתה מאשר את תנאי השימוש ומדיניות הפרטיות של Joba24
      </div>
    </div>
  );
}