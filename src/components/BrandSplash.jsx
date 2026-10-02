import { BrandLogo, BrandName } from '@/components/BrandIdentity';

/**
 * The Brand's loading surface. Shown while the app boots, so the very first
 * thing a visitor sees already carries the active Brand's identity — never a
 * flash of the platform Brand on a specialised domain.
 */
export default function BrandSplash() {
  return (
    <div style={{
      position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 14,
      background: 'var(--surface-1)',
    }}>
      <BrandLogo size={64} radius={18} />
      <BrandName style={{ fontWeight: 900, fontSize: 18, color: 'var(--text-1)', letterSpacing: -0.5 }} />
      <div
        className="animate-spin"
        style={{
          width: 30, height: 30, borderRadius: '50%',
          border: '3px solid var(--border-1)',
          borderTopColor: 'var(--brand-primary, #1a6fd4)',
        }}
      />
    </div>
  );
}