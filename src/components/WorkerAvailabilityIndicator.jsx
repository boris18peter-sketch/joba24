import { useState, useEffect } from 'react';
import { useWorkerStats } from '@/hooks/useWorkerStats';
import { getCategoryLabel } from '@/lib/categories';
import { useLanguage } from '@/lib/LanguageContext';

/**
 * WorkerAvailabilityIndicator — compact, transparent indicator
 * designed to sit inside the CreateTask header (on dark blue background).
 *
 * Unifies three former components: the header progress context, the worker
 * availability bar, and the info banner — into one clean row.
 *
 * Shows a live count of available professionals that narrows as the user
 * selects a category and city:
 *   - No category:     "26 professionals connected" + detail tip
 *   - Category only:   "11 plumbing connected"     + "select a city" hint
 *   - Category + city:  "3 plumbing in Herzliya"   + "publish now" hint
 */
export default function WorkerAvailabilityIndicator({ category, city }) {
  const { t, isRTL } = useLanguage();
  const { count, hasCategory, hasCity } = useWorkerStats(category, city);

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

  const hint = (() => {
    if (hasCategory && hasCity) {
      return t('worker_avail_publish_hint');
    }
    if (hasCategory) {
      return t('worker_avail_select_city');
    }
    return t('important_note_body');
  })();

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '0 16px 10px',
    }}>
      {/* Live dot */}
      <div style={{
        width: 8, height: 8, borderRadius: '50%',
        background: '#4ade80',
        boxShadow: '0 0 0 0 rgba(74,222,128,0.7)',
        animation: 'waiDotPulse 2s infinite',
        flexShrink: 0,
      }} />

      {/* Count */}
      <span style={{ color: 'white', fontSize: 22, fontWeight: 900, lineHeight: 1, flexShrink: 0 }}>
        {displayCount.toLocaleString()}
      </span>

      {/* Label + hint */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: 'white', fontSize: 12.5, fontWeight: 800, lineHeight: 1.2 }}>
          {mainLabel}
        </div>
        <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 10.5, fontWeight: 500, marginTop: 1, lineHeight: 1.3 }}>
          {hint}
        </div>
      </div>

      <style>{`
        @keyframes waiDotPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(74,222,128,0.7); }
          50% { box-shadow: 0 0 0 4px rgba(74,222,128,0); }
        }
      `}</style>
    </div>
  );
}