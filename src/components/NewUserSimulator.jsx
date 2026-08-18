/**
 * NewUserSimulator — Admin-only feature to test the new user onboarding flow.
 *
 * Exports two components:
 * 1. NewUserSimulatorButton — admin-only button for the SideMenu
 * 2. DemoModeExitBanner — floating "Exit Demo" banner shown when in demo mode
 */
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Sparkles, AlertTriangle, X, Loader2, FlaskConical } from 'lucide-react';
import { enterDemoMode, exitDemoMode, isInDemoMode } from '@/lib/demoMode';

// ── Confirmation Modal ────────────────────────────────────────────────────────
function ConfirmModal({ onClose }) {
  const { data: me } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });
  const [loading, setLoading] = useState(false);

  const handleStart = async () => {
    setLoading(true);
    try {
      await enterDemoMode(me);
      // enterDemoMode reloads the page — no need to close
    } catch (err) {
      setLoading(false);
      alert('שגיאה בהפעלת סימולציה: ' + (err?.message || 'נסה שוב'));
    }
  };

  return createPortal(
    <div
      dir="rtl"
      onClick={(e) => e.target === e.currentTarget && !loading && onClose()}
      style={{
        position: 'fixed', inset: 0, zIndex: 999999,
        background: 'rgba(5,15,40,0.7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20, backdropFilter: 'blur(8px)',
      }}
    >
      <div style={{
        background: 'var(--surface-2)', borderRadius: 22, maxWidth: 380, width: '100%',
        padding: 24, boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
        border: '1px solid var(--border-1)',
      }}>
        {/* Icon */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16,
            background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 24px rgba(99,102,241,0.3)',
          }}>
            <FlaskConical size={26} color="white" strokeWidth={2} />
          </div>
        </div>

        <div style={{ fontSize: 19, fontWeight: 800, color: 'var(--text-1)', textAlign: 'center', marginBottom: 8 }}>
          סימולציית משתמש חדש
        </div>
        <div style={{ fontSize: 14, color: 'var(--text-2)', textAlign: 'center', lineHeight: 1.6, marginBottom: 20 }}>
          הפרופיל שלך יאופס זמנית למצב משתמש חדש — ללא אימות, ללא פרופיל עובד, ללא היסטוריה.
          <br />
          תוכל לעבור את כל תהליך ההצטרפות כמשתמש חדש.
        </div>

        {/* Warning box */}
        <div style={{
          display: 'flex', gap: 10, alignItems: 'flex-start',
          background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.3)',
          borderRadius: 12, padding: '12px 14px', marginBottom: 20,
        }}>
          <AlertTriangle size={16} color="#d97706" strokeWidth={2} style={{ flexShrink: 0, marginTop: 1 }} />
          <div style={{ fontSize: 12, color: '#92400e', lineHeight: 1.5 }}>
            <strong>לסיום הסימולציה:</strong> לחץ על כפתור "צא מסימולציה" שיופיע צף על המסך. הפרופיל המלא ישוחזר אוטומטית.
          </div>
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button
            onClick={handleStart}
            disabled={loading}
            style={{
              width: '100%', height: 50, borderRadius: 14,
              background: loading ? '#c9d6e8' : 'linear-gradient(135deg, #6366f1, #4f46e5)',
              color: 'white', fontWeight: 800, fontSize: 15, border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: loading ? 'none' : '0 4px 16px rgba(99,102,241,0.3)',
            }}
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <><Sparkles size={18} /> התחל סימולציה</>}
          </button>
          <button
            onClick={onClose}
            disabled={loading}
            style={{
              width: '100%', height: 44, borderRadius: 14,
              background: 'transparent', color: 'var(--text-2)',
              fontWeight: 700, fontSize: 14, border: '1px solid var(--border-1)',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            ביטול
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ── SideMenu Button (admin only) ─────────────────────────────────────────────
export function NewUserSimulatorButton({ onOpen }) {
  return (
    <button
      onClick={onOpen}
      style={{
        display: 'flex', alignItems: 'center', gap: 14, padding: '13px 20px',
        background: 'transparent', color: '#a5b4fc', fontWeight: 700, fontSize: 15,
        border: 'none', borderLeft: '3px solid transparent', cursor: 'pointer',
        width: '100%', textAlign: 'right', textDecoration: 'none',
        transition: 'all 0.15s',
      }}
    >
      <FlaskConical size={18} style={{ opacity: 0.8 }} />
      סימולציית משתמש חדש
    </button>
  );
}

// ── Floating Exit Banner (shown when in demo mode) ───────────────────────────
export function DemoModeExitBanner() {
  const [loading, setLoading] = useState(false);

  if (!isInDemoMode()) return null;

  const handleExit = async () => {
    setLoading(true);
    try {
      await exitDemoMode();
    } catch (err) {
      setLoading(false);
      alert('שגיאה בשחזור פרופיל: ' + (err?.message || 'נסה שוב'));
    }
  };

  return createPortal(
    <div
      dir="rtl"
      style={{
        position: 'fixed', bottom: 'max(72px, env(safe-area-inset-bottom))',
        left: '50%', transform: 'translateX(-50%)',
        zIndex: 999999, pointerEvents: 'none',
      }}
    >
      <div style={{
        pointerEvents: 'auto',
        display: 'flex', alignItems: 'center', gap: 10,
        background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
        borderRadius: 99, padding: '10px 18px',
        boxShadow: '0 8px 28px rgba(99,102,241,0.4)',
        border: '2px solid rgba(255,255,255,0.2)',
      }}>
        <FlaskConical size={16} color="white" strokeWidth={2} />
        <span style={{ color: 'white', fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap' }}>
          מצב סימולציה
        </span>
        <button
          onClick={handleExit}
          disabled={loading}
          style={{
            background: 'rgba(255,255,255,0.2)', border: 'none',
            borderRadius: 99, padding: '5px 14px',
            color: 'white', fontSize: 12, fontWeight: 800,
            cursor: loading ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', gap: 5,
            whiteSpace: 'nowrap',
          }}
        >
          {loading ? <Loader2 size={13} className="animate-spin" /> : <><X size={13} /> צא</>}
        </button>
      </div>
    </div>,
    document.body
  );
}

export default function NewUserSimulator() {
  const [showConfirm, setShowConfirm] = useState(false);

  return (
    <>
      <NewUserSimulatorButton onOpen={() => setShowConfirm(true)} />
      {showConfirm && <ConfirmModal onClose={() => setShowConfirm(false)} />}
    </>
  );
}