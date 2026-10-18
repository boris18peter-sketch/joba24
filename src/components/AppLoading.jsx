import { BrandLogo, BrandName } from '@/components/BrandIdentity';

/**
 * THE loading screen.
 *
 * One component for every full-screen wait in the app — boot, Brand resolution,
 * auth resolution and route transitions — so a slow start always looks the same
 * instead of cycling through several unrelated spinners. It carries the active
 * Brand's own identity, so the first thing a visitor sees is already the Brand
 * they arrived at, never a generic platform look.
 */
export default function AppLoading() {
  return (
    <div
      style={{
        position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 14,
        background: 'var(--surface-1)',
      }}
    >
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