import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { getCategoryLabel } from '@/lib/categories';
import { useLanguage } from '@/lib/LanguageContext';

/**
 * WorkerAvailabilityIndicator — compact dynamic bar for the CreateTask form.
 *
 * Shows a live count of available professionals that narrows as the user
 * selects a category and city:
 *   - No category:     "26 professionals connected" + trust message
 *   - Category only:   "11 plumbing connected"     + "select a city" hint
 *   - Category + city:  "3 plumbing in Herzliya"   + "publish now" hint
 *
 * Data source: single WorkerStat record (stat_type='worker_counts') that is
 * recomputed by the recountWorkerStats backend function on a schedule.
 */
export default function WorkerAvailabilityIndicator({ category, city }) {
  const { t, isRTL } = useLanguage();

  const { data: stats } = useQuery({
    queryKey: ['workerStats'],
    queryFn: async () => {
      const records = await base44.entities.WorkerStat.filter({ stat_type: 'worker_counts' });
      return records[0]?.data || null;
    },
    refetchInterval: 60000,
    staleTime: 30000,
  });

  // Compute count based on category + city selection
  const hasCategory = category && category !== 'other';
  const hasCity = !!city;

  const count = (() => {
    if (!stats) return 0;
    if (hasCategory && hasCity) {
      return stats.category_city?.[`${category}|${city}`] || 0;
    }
    if (hasCategory) {
      return stats.categories?.[category] || 0;
    }
    return stats.total || 0;
  })();

  // Animated count-up
  const [displayCount, setDisplayCount] = useState(0);
  useEffect(() => {
    if (count === displayCount) return;
    const start = displayCount;
    const diff = count - start;
    if (diff === 0) return;
    const duration = 600;
    const startTime = Date.now();
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayCount(Math.round(start + diff * eased));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [count]); // eslint-disable-line

  // Compose label
  const catLabel = hasCategory ? getCategoryLabel(category, t) : '';
  const mainLabel = (() => {
    if (hasCategory && hasCity) {
      return `${catLabel} ${t('worker_avail_in_city', { city })}`;
    }
    if (hasCategory) {
      return `${catLabel} ${t('worker_avail_connected')}`;
    }
    return t('worker_avail_professionals');
  })();

  // Compose hint
  const hint = (() => {
    if (hasCategory && hasCity) {
      return t('worker_avail_publish_hint');
    }
    if (hasCategory) {
      return t('worker_avail_select_city');
    }
    return t('worker_avail_trust_msg');
  })();

  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      style={{
        background: 'linear-gradient(135deg, #0a52b0 0%, #1a6fd4 100%)',
        borderRadius: 16,
        padding: '14px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        boxShadow: '0 3px 14px rgba(26,111,212,0.2)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Decorative glow */}
      <div style={{
        position: 'absolute', top: -20, [isRTL ? 'left' : 'right']: -20, width: 80, height: 80,
        background: 'radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%)',
        borderRadius: '50%', pointerEvents: 'none',
      }} />

      {/* Live dot */}
      <div style={{
        width: 10, height: 10, borderRadius: '50%',
        background: '#4ade80',
        boxShadow: '0 0 0 0 rgba(74,222,128,0.7)',
        animation: 'waiDotPulse 2s infinite',
        flexShrink: 0,
        zIndex: 1,
      }} />

      {/* Count */}
      <div style={{ flexShrink: 0, zIndex: 1 }}>
        <span style={{ color: 'white', fontSize: 26, fontWeight: 900, lineHeight: 1 }}>
          {displayCount.toLocaleString()}
        </span>
      </div>

      {/* Label + hint */}
      <div style={{ flex: 1, minWidth: 0, zIndex: 1 }}>
        <div style={{ color: 'white', fontSize: 13, fontWeight: 800, lineHeight: 1.2 }}>
          {mainLabel}
        </div>
        <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: 500, marginTop: 2, lineHeight: 1.3 }}>
          {hint}
        </div>
      </div>

      <style>{`
        @keyframes waiDotPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(74,222,128,0.7); }
          50% { box-shadow: 0 0 0 5px rgba(74,222,128,0); }
        }
      `}</style>
    </div>
  );
}