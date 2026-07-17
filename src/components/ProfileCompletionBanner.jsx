import { useNavigate } from 'react-router-dom';
import { Zap } from 'lucide-react';

const JOIN_COMPLETED_KEY = 'joba24_join_completed';

export default function ProfileCompletionBanner({ me }) {
  const navigate = useNavigate();

  if (!me) return null;

  // Single source of truth: user entity. If the user already has categories AND cities,
  // onboarding is complete — never show the banner again (works across devices).
  const isComplete = me.preferred_categories?.length > 0 && me.preferred_cities?.length > 0;
  if (isComplete) return null;

  return (
    <div
      dir="rtl"
      onClick={() => navigate('/join')}
      style={{
        background: 'linear-gradient(135deg, #1a6fd4 0%, #0a52b0 100%)',
        borderRadius: 16,
        padding: '16px',
        marginBottom: 12,
        cursor: 'pointer',
        overflow: 'hidden',
        position: 'relative',
        zIndex: 10,
        boxShadow: '0 4px 20px rgba(26,111,212,0.3)',
      }}
    >
      {/* Decorative circles */}
      <div style={{ position: 'absolute', top: -24, left: -24, width: 96, height: 96, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: -16, right: -16, width: 72, height: 72, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', pointerEvents: 'none' }} />

      {/* Top row — icon + text */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
        <div style={{ width: 42, height: 42, borderRadius: 13, background: 'rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Zap size={22} color="white" strokeWidth={2} fill="white" />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 900, color: 'white', marginBottom: 5, lineHeight: 1.3 }}>
            רוצה להרוויח ולקבל יותר משימות?
          </div>
          <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.88)', lineHeight: 1.55 }}>
            פרופיל מלא עוזר לנו להתאים לך משימות רלוונטיות יותר, ומגדיל את הסיכוי שמפרסמים יסמכו עליך ויבחרו בך מהר יותר.
          </div>
        </div>
      </div>

      {/* CTA button */}
      <div
        style={{
          width: '100%',
          height: 44,
          borderRadius: 12,
          background: '#fbbf24',
          color: '#1a3a6b',
          fontWeight: 900,
          fontSize: 14,
          border: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          boxShadow: '0 3px 12px rgba(251,191,36,0.45)',
        }}
      >
        🎁 השלם פרופיל עובד וקבל בונוס 25 ג'ובות
      </div>
    </div>
  );
}