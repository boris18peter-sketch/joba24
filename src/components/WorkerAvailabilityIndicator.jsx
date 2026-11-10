import { useState, useEffect } from 'react';
import { useWorkerStats } from '@/hooks/useWorkerStats';
import { getCategoryLabel } from '@/lib/categories';
import { useGlobalCategories } from '@/lib/brand/globalCategories';
import { rootKeyFor } from '@/lib/workerCounts';
import { useLanguage } from '@/lib/LanguageContext';
import LiveWorkerAvatars from '@/components/LiveWorkerAvatars';

/**
 * WorkerAvailabilityIndicator — compact, transparent indicator
 * designed to sit inside the CreateTask header (on dark blue background).
 *
 * Shows a live count of available professionals that narrows as the user
 * selects a category and city.
 */
export default function WorkerAvailabilityIndicator({ category, city }) {
  const { t, isRTL } = useLanguage();
  const { map: categoryMap } = useGlobalCategories();

  // ── WHOSE NUMBER IS THIS? THE CATEGORY'S ──────────────────────────────────
  // The bar reports how many professionals work in the CATEGORY, not in the one
  // service the publisher narrowed to. Handing the raw selection to the count let
  // a sub-service key resolve to itself wherever the map was not ready yet, and
  // the number then moved every time the service changed — the same trade showing
  // two different totals while the publisher was still choosing. The key is
  // resolved to its canonical category FIRST, and that resolved key feeds both the
  // count and the label, so the two can never disagree.
  const rootKey = category ? rootKeyFor(category, categoryMap) : '';
  const { count, hasCategory, hasCity } = useWorkerStats(rootKey || category, city);

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

  // The count is the PARENT category's total — the same number the feed's tile
  // for that category shows — so the label is the parent's name as well. Naming
  // the single service here ("בעיית אינסטלציה אחרת") next to the whole trade's
  // count was exactly the mismatch the publisher saw: a big number under a
  // service nobody had actually subscribed to.
  const catLabel = hasCategory ? (categoryMap[rootKey]?.label || getCategoryLabel(rootKey || category, t)) : '';

  const mainLabel = (() => {
    if (hasCategory && hasCity) {
      return `${catLabel} ${t('worker_avail_in_city', { city })}`;
    }
    if (hasCategory) {
      return `${catLabel} ${t('worker_avail_connected')}`;
    }
    return t('worker_avail_professionals');
  })();

  // Nothing to announce when nobody is available for this exact service.
  if (count === 0) return null;

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

      {/* Label only — the small explanatory line under it is deliberately gone */}
      <div style={{ flex: 1, minWidth: 0, color: 'rgba(255,255,255,0.95)', fontSize: 12, fontWeight: 700, lineHeight: 1.2 }}>
        {mainLabel}
      </div>

      {/* ── THE FACES BEHIND THE COUNT ────────────────────────────────────────
          The number on the right says how many professionals are available;
          these are the people it refers to, pulled from their own profiles for
          THIS category and refreshed whenever the publisher changes it. The
          component renders nothing at all when nobody matching has a photo, so
          the row falls back to the plain number rather than inventing a face. */}
      <LiveWorkerAvatars category={category} />

      <style>{`
        @keyframes waiPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.8); }
        }
      `}</style>
    </div>
  );
}