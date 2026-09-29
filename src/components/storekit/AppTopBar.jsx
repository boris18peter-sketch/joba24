import { Menu } from 'lucide-react';
import CreditIcon from '@/components/CreditIcon';
import { APP_ICON } from '@/lib/storekit/specs';
import { DEMO_BALANCE, DEMO_LOCKED } from '@/lib/storekit/demoData';

/**
 * The real Joba24 app top bar — same lockup, same Joba balance pill treatment
 * and same menu button the live app header renders.
 */
export default function AppTopBar({ balance = DEMO_BALANCE, locked = DEMO_LOCKED }) {
  return (
    <div
      style={{
        height: 60,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 14px',
        background: 'var(--surface-2)',
        boxShadow: '0 1px 0 var(--border-1)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
        <img
          src={APP_ICON}
          alt="Joba24"
          crossOrigin="anonymous"
          style={{ width: 34, height: 34, objectFit: 'cover', borderRadius: 'var(--r-sm)' }}
        />
        <span style={{ fontWeight: 900, fontSize: 18, color: 'var(--text-1)', letterSpacing: -0.6 }}>
          Joba<span style={{ color: 'var(--brand-accent)' }}>24</span>
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            height: 38,
            padding: '0 12px',
            borderRadius: 'var(--r-sm)',
            background: 'var(--brand-primary-light)',
            border: '1px solid #bfdbfe',
          }}
        >
          <CreditIcon size={16} />
          <span style={{ fontSize: 14, fontWeight: 900, color: 'var(--text-1)', fontVariantNumeric: 'tabular-nums' }}>
            {balance}
          </span>
          {locked > 0 && (
            <span
              style={{
                fontSize: 10.5,
                fontWeight: 800,
                color: '#b45309',
                background: '#fffbeb',
                border: '1px solid #fde68a',
                borderRadius: 999,
                padding: '1px 6px',
                whiteSpace: 'nowrap',
              }}
            >
              {locked} נעולים
            </span>
          )}
        </div>
        <button
          style={{
            width: 42,
            height: 42,
            borderRadius: 'var(--r-sm)',
            background: 'var(--brand-primary)',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Menu size={19} color="#ffffff" />
        </button>
      </div>
    </div>
  );
}