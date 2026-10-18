import { useEffect, useState } from 'react';
import { BrandLogo, BrandName } from '@/components/BrandIdentity';
import { bootMark } from '@/lib/bootTrace';
import { reloadFresh } from '@/lib/reloadFresh';

/**
 * THE loading screen.
 *
 * One component for every full-screen wait in the app — boot, Brand resolution,
 * auth resolution and route transitions — so a slow start always looks the same
 * instead of cycling through several unrelated spinners. It carries the active
 * Brand's own identity, so the first thing a visitor sees is already the Brand
 * they arrived at, never a generic platform look.
 *
 * ── IT IS NOT ALLOWED TO BE A DEAD END ──────────────────────────────────────
 * A wait that never ends, with no explanation and no way out, is the one
 * outcome a loading screen must never have. Whatever stage is holding it — a
 * Brand resolution, a route chunk that will not arrive, a WebView that stopped
 * responding — the visitor is offered a real retry rather than being left
 * staring at a spinner. Nothing is faked and nothing navigates on its own: the
 * retry is a button, and the screen says plainly that the launch is taking
 * longer than it should.
 */
const STUCK_AFTER_MS = 12000;

// Only the FIRST splash is recorded — route transitions reuse this component
// and would otherwise flood the trace.
let splashRecorded = false;

export default function AppLoading() {
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    if (!splashRecorded) {
      splashRecorded = true;
      bootMark('splash', 'shown');
    }
    const timer = setTimeout(() => setStuck(true), STUCK_AFTER_MS);
    return () => clearTimeout(timer);
  }, []);

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

      {stuck && (
        <div style={{ marginTop: 10, textAlign: 'center', maxWidth: 300, padding: '0 20px' }} dir="rtl">
          <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-1)', marginBottom: 6 }}>
            ההפעלה מתארכת יותר מהרגיל
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.55, marginBottom: 14 }}>
            משהו בטעינה נתקע. נסה שוב — הפעם החלקים שכבר ירדו ייטענו מהר יותר.
          </div>
          <button
            onClick={() => reloadFresh()}
            style={{
              minWidth: 160, height: 48, padding: '0 24px', borderRadius: 14, border: 'none',
              background: 'linear-gradient(135deg, var(--brand-primary, #1a6fd4), var(--brand-primary-dark, #0a52b0))',
              color: '#ffffff', fontWeight: 800, fontSize: 15, cursor: 'pointer',
              boxShadow: '0 6px 20px rgba(26,111,212,0.28)',
            }}
          >
            נסה שוב
          </button>
        </div>
      )}
    </div>
  );
}