import { Star } from 'lucide-react';
import { useLanguage } from '@/lib/LanguageContext';

/**
 * LoyaltyProgressMeter — the worker's rank ladder, shown inside the bonus popup.
 *
 * The point is motivation: every completed task visibly fills the bar toward the
 * next rank, so a worker can see that the work they just did moved them forward.
 */
export default function LoyaltyProgressMeter({ progress }) {
  const { t } = useLanguage();
  const { tier, next, done, percent, remaining, isMax } = progress;

  return (
    <div style={{ background: 'var(--surface-3)', border: '1px solid var(--border-1)', borderRadius: 16, padding: '14px 16px', marginBottom: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-3)', letterSpacing: 0.4 }}>
          {t('lp_progress_title')}
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: tier.gradient, color: 'white', fontSize: 11, fontWeight: 800, padding: '3px 10px', borderRadius: 99 }}>
          <Star size={11} color="white" fill="white" />
          {t(tier.labelKey)}
        </span>
      </div>

      <div style={{ height: 9, borderRadius: 99, background: 'var(--border-1)', overflow: 'hidden', marginBottom: 8 }}>
        <div style={{
          width: `${percent}%`, height: '100%', borderRadius: 99,
          background: tier.gradient,
          transition: 'width 0.9s cubic-bezier(0.16,1,0.3,1)',
        }} />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-2)' }}>
          {t('lp_progress_count', { done, total: isMax ? done : next.min })}
        </span>
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)', textAlign: 'left' }}>
          {isMax ? t('lp_progress_max') : t('lp_progress_remaining', { n: remaining, tier: t(next.labelKey) })}
        </span>
      </div>
    </div>
  );
}