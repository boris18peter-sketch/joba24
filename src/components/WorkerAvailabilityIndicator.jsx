import { useState, useEffect } from 'react';
import { useWorkerStats } from '@/hooks/useWorkerStats';
import { getCategoryLabel } from '@/lib/categories';
import { useLanguage } from '@/lib/LanguageContext';

/**
 * WorkerAvailabilityIndicator — compact, transparent indicator
 * designed to sit inside the CreateTask header (on dark blue background).
 *
 * Shows a live count of available professionals that narrows as the user
 * selects a category and city.
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
      display: 'flex', alignItems: 'center', gap: 8,
      margin: '0 16px 10px',
      padding: '8px 12px',
      background: 'rgba(255,255,255,0.07)',
      borderRadius: 12,
      border: '1px solid rgba(255,255,255,0.08)',
    }}>
      {/* Live indicator dot */}
      <span style={{
        width: 7, height: 7, borderRadius: '50%',
        background: '#4ade80',
        boxShadow: '0 0 6px rgba(74,222,128,0.6)',
        flexShrink: 0,
        animation: 'waiPulse 2s infinite',
      }} />

      {/* Count */}
      <span style={{ color: 'white', fontSize: 16, fontWeight: 900, flexShrink: 0, lineHeight: 1 }}>
        {displayCount}
      </span>

      {/* Label + hint */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: 'rgba(255,255,255,0.95)', fontSize: 12, fontWeight: 700, lineHeight: 1.2 }}>
          {mainLabel}
        </div>
        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: 500, marginTop: 1, lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {hint}
        </div>
      </div>

      <style>{`
        @keyframes waiPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.8); }
        }
      `}</style>
    </div>
  );
}