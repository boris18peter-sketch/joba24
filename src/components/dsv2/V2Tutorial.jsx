import { Plus } from 'lucide-react';
import V2NavBar from '@/components/dsv2/V2NavBar';

/**
 * Design System V2 — onboarding hint.
 *
 * One sentence, one action, one subtle spotlight. No badge, no icon, no glow,
 * no pulsing ring, no arrow, no long explanation, no pagination chrome.
 */
export default function V2Tutorial() {
  return (
    <div dir="rtl" style={{ position: 'relative', minHeight: 620, background: 'var(--v2-bg-soft)', overflow: 'hidden' }}>
      {/* The real feed, sitting underneath — dimmed but recognisable */}
      <div style={{ padding: '18px 16px 120px', display: 'flex', flexDirection: 'column', gap: 12, opacity: 0.5 }}>
        <div className="v2-card" style={{ height: 112 }} />
        <div className="v2-card" style={{ height: 112 }} />
        <div className="v2-card" style={{ height: 112 }} />
      </div>

      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}>
        <V2NavBar active="home" />
      </div>

      {/* Spotlight — a hairline ring, and one huge shadow that dims everything else */}
      <div style={{
        position: 'absolute', left: '50%', bottom: 16, transform: 'translateX(-50%)',
        width: 88, height: 88, borderRadius: '50%',
        border: '2px solid var(--v2-blue)',
        boxShadow: '0 0 0 2000px rgba(9,20,45,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 2,
      }}>
        <div className="v2-fab"><Plus size={24} color="#fff" strokeWidth={2.4} /></div>
      </div>

      {/* The hint itself */}
      <div style={{
        position: 'absolute', left: 24, right: 24, bottom: 138, zIndex: 3,
        background: '#fff', borderRadius: 20, padding: '24px 22px',
        boxShadow: '0 20px 50px rgba(9,20,45,0.28)',
      }}>
        <h3 style={{ margin: 0, fontSize: 19, fontWeight: 800, letterSpacing: '-0.3px', color: 'var(--v2-ink)' }}>
          צריכים עזרה?
        </h3>
        <p className="v2-body" style={{ marginTop: 8 }}>לחצו על + ופרסמו משימה.</p>
        <button className="v2-btn v2-btn-primary v2-btn-block" style={{ marginTop: 20, height: 50 }}>הבא</button>
        <button className="v2-btn v2-btn-tertiary v2-btn-block" style={{ marginTop: 4 }}>דלג</button>
      </div>
    </div>
  );
}