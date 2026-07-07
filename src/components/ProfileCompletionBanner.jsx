import { useNavigate } from 'react-router-dom';
import VerifiedBadge from '@/components/VerifiedBadge';
import {
  getVerificationLevel,
  getProfileCompletionSteps,
  getProfileCompletionPercent,
} from '@/lib/verificationLevel';
import { Shield, CheckCircle2, Circle, ChevronLeft, Crown } from 'lucide-react';

/**
 * ProfileCompletionBanner — motivates users to complete their profile.
 *
 * Shows:
 *   - Current verification level (gold/green/none) with badge
 *   - Progress bar (X/5 steps)
 *   - Step checklist with links to complete each step
 *   - Motivation text emphasizing safety and trust
 *
 * When fully verified (gold), shows a celebratory state instead.
 */
export default function ProfileCompletionBanner({ user, onVerifyClick }) {
  const navigate = useNavigate();
  const level = getVerificationLevel(user);
  const steps = getProfileCompletionSteps(user);
  const percent = getProfileCompletionPercent(user);
  const completed = steps.filter(s => s.done).length;

  // Gold level — celebratory state
  if (level === 'gold') {
    return (
      <div style={{
        background: 'linear-gradient(135deg,#fef3c7,#fde68a)',
        border: '1.5px solid #fbbf24',
        borderRadius: 18,
        padding: '16px',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
      }}>
        <div style={{
          width: 48, height: 48, borderRadius: 14,
          background: 'linear-gradient(135deg,#fbbf24,#d97706)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
          boxShadow: '0 4px 14px rgba(217,119,6,0.3)',
        }}>
          <Crown size={24} color="white" />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 900, color: '#92400e', display: 'flex', alignItems: 'center', gap: 6 }}>
            מאומר ברמה הגבוהה ביותר! 🏆
          </div>
          <div style={{ fontSize: 12, color: '#b45309', marginTop: 2, fontWeight: 600, lineHeight: 1.5 }}>
            פרופיל מלא + אימות זהות — אתה נראה אמין ובטוח לכולם
          </div>
        </div>
        <VerifiedBadge level="gold" size="md" />
      </div>
    );
  }

  const isGreen = level === 'green';

  return (
    <div style={{
      background: isGreen
        ? 'linear-gradient(135deg,#f0fdf4,#dcfce7)'
        : 'var(--surface-2)',
      border: isGreen ? '1.5px solid #86efac' : '1px solid var(--border-1)',
      borderRadius: 18,
      padding: '16px',
    }}>
      {/* Header: badge + title + percent */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 12,
          background: isGreen ? 'linear-gradient(135deg,#16a34a,#059669)' : 'var(--surface-3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          {isGreen
            ? <VerifiedBadge level="green" size="md" />
            : <Shield size={20} color="var(--text-3)" />}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: isGreen ? '#166534' : 'var(--text-1)' }}>
            {isGreen ? 'פרופיל מלא ✓' : 'השלם את הפרופיל שלך'}
          </div>
          <div style={{ fontSize: 11, color: isGreen ? '#15803d' : 'var(--text-3)', marginTop: 1, fontWeight: 600 }}>
            {completed} מתוך {steps.length} שלבים הושלמו
          </div>
        </div>
        <span style={{
          fontSize: 18, fontWeight: 900,
          color: isGreen ? '#16a34a' : 'var(--text-2)',
        }}>
          {percent}%
        </span>
      </div>

      {/* Progress bar */}
      <div style={{ height: 6, background: isGreen ? '#bbf7d0' : 'var(--surface-3)', borderRadius: 99, overflow: 'hidden', marginBottom: 14 }}>
        <div style={{
          height: '100%',
          width: `${percent}%`,
          background: isGreen
            ? 'linear-gradient(90deg,#16a34a,#059669)'
            : 'linear-gradient(90deg,#1a6fd4,#0a52b0)',
          borderRadius: 99,
          transition: 'width 0.4s ease',
        }} />
      </div>

      {/* Motivation text */}
      <div style={{
        fontSize: 12, color: 'var(--text-2)', lineHeight: 1.6, fontWeight: 600,
        marginBottom: 12, padding: '8px 10px',
        background: isGreen ? 'rgba(22,163,74,0.06)' : 'var(--surface-3)',
        borderRadius: 10,
      }}>
        {isGreen
          ? '🎉 פרופיל מלא! אתה מקבל וי ירוק. השלם אימות זהות (KYC) כדי לקבל וי זהב ולבלוט עוד יותר.'
          : 'ככל שהפרופיל שלך מלא יותר, אתה נראה אמין יותר. משתמשים עם וי ירוק מקבלים עדיפות בפיד ויותר בקשות. השלם את כל השלבים כדי לקבל וי ירוק 🟢'}
      </div>

      {/* Steps */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {steps.map((step) => {
          const isKYC = step.link === 'kyc';
          return (
            <div
              key={step.key}
              onClick={() => {
                if (step.done) return;
                if (isKYC) {
                  onVerifyClick?.();
                } else {
                  navigate(step.link);
                }
              }}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 4px',
                cursor: step.done ? 'default' : 'pointer',
                borderRadius: 8,
                transition: 'background 0.15s',
              }}
              onPointerDown={e => { if (!step.done) e.currentTarget.style.background = 'var(--surface-3)'; }}
              onPointerUp={e => { e.currentTarget.style.background = ''; }}
              onPointerLeave={e => { e.currentTarget.style.background = ''; }}
            >
              {step.done
                ? <CheckCircle2 size={18} color={step.key === 'kyc' ? '#d97706' : '#16a34a'} style={{ flexShrink: 0 }} />
                : <Circle size={18} color="var(--text-3)" style={{ flexShrink: 0 }} />}
              <span style={{ fontSize: 13, fontWeight: step.done ? 600 : 700, color: step.done ? 'var(--text-2)' : 'var(--text-1)', flex: 1 }}>
                {step.icon} {step.label}
              </span>
              {!step.done && (
                <ChevronLeft size={14} color="var(--text-3)" style={{ flexShrink: 0 }} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}