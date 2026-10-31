import { Star } from 'lucide-react';
import { useLanguage } from '@/lib/LanguageContext';

/**
 * The profile's stats row — rating | tasks posted | tasks completed.
 *
 * A cube exists only when it stands for a real number. Before this, the row was
 * always three cubes wide: a brand-new user was shown "— · 0 · 0", which reads
 * as a broken profile rather than an empty one. Each metric is now included only
 * when it has a value, the row divides the width it actually has between the
 * cubes that were kept, and with nothing to show the whole pill disappears.
 *
 * Every cube is still exactly two rows (value, label), so the survivors stay
 * perfectly symmetrical: their numbers sit on one line and their labels on the
 * next, wherever the dividers land.
 *
 * Rendered on the blue hero of Profile / PublicProfile, so it keeps the frosted
 * translucent style that blends with the gradient behind it.
 */
export default function ProfileStatsPill({ rating, reviewCount, postedCount, completedCount }) {
  const { t } = useLanguage();
  const r = Number(rating) || 0;
  const posted = Number(postedCount) || 0;
  const completed = Number(completedCount) || 0;

  const metrics = [];
  if (r > 0) {
    metrics.push({
      key: 'rating',
      value: (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
          <Star size={14} color="#fbbf24" fill="#fbbf24" />
          {r.toFixed(1)}
        </span>
      ),
      label: t('pr_rating'),
    });
  }
  if (posted > 0) metrics.push({ key: 'posted', value: posted, label: t('pr_tasks_posted_long') });
  if (completed > 0) metrics.push({ key: 'completed', value: completed, label: t('pr_tasks_done_long') });

  // Nothing measured yet — show no cubes at all rather than empty ones.
  if (!metrics.length) return null;

  const colStyle = {
    flex: 1, minWidth: 0,
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    gap: 3, padding: '6px 4px', textAlign: 'center',
  };
  const valueStyle = { fontSize: 26, fontWeight: 900, color: 'var(--brand-hero-text, white)', lineHeight: 1 };
  const labelStyle = { fontSize: 11, fontWeight: 700, color: 'var(--brand-hero-text, rgba(255,255,255,0.8))' };

  return (
    <div dir="rtl" style={{
      background: 'rgba(255,255,255,0.14)',
      borderRadius: 18,
      border: '1px solid rgba(255,255,255,0.25)',
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
      padding: '13px 8px',
      display: 'flex', alignItems: 'stretch',
    }}>
      {metrics.map((m, i) => (
        <div key={m.key} style={colStyle}>
          <span style={valueStyle}>{m.value}</span>
          <span style={labelStyle}>{m.label}</span>
        </div>
      ))}
    </div>
  );
}