import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { CATEGORIES } from '@/lib/categories';
import { useLanguage } from '@/lib/LanguageContext';

/**
 * WorkerAvailabilityBar — prominent trust-building bar showing live counts
 * of available professionals per category. Refetches every 30s for a "live" feel.
 *
 * Data source: single WorkerStat record (stat_type='worker_counts') that is
 * recomputed by the recountWorkerStats backend function on a schedule.
 */
export default function WorkerAvailabilityBar() {
  const { t, isRTL } = useLanguage();

  const { data: stats } = useQuery({
    queryKey: ['workerStats'],
    queryFn: async () => {
      const records = await base44.entities.WorkerStat.filter({ stat_type: 'worker_counts' });
      return records[0]?.data || null;
    },
    refetchInterval: 30000,
    staleTime: 20000,
  });

  const total = stats?.total || 0;
  const categories = stats?.categories || {};

  // Sort categories by count descending, take top 12
  const sortedCats = Object.entries(categories)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 12);

  // Animated count-up
  const [displayCount, setDisplayCount] = useState(0);
  useEffect(() => {
    if (!total) return;
    const start = displayCount;
    const diff = total - start;
    if (diff === 0) return;
    const duration = 1000;
    const startTime = Date.now();
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayCount(Math.round(start + diff * eased));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [total]); // eslint-disable-line

  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      style={{
        background: 'linear-gradient(135deg, #0a52b0 0%, #1a6fd4 50%, #2563eb 100%)',
        borderRadius: 18,
        padding: '16px 16px 14px',
        margin: '0 0 12px',
        boxShadow: '0 4px 20px rgba(26,111,212,0.25)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Decorative glow */}
      <div style={{
        position: 'absolute', top: -30, right: -30, width: 100, height: 100,
        background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)',
        borderRadius: '50%', pointerEvents: 'none',
      }} />

      {/* Header with live dot */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <div style={{
          width: 8, height: 8, borderRadius: '50%',
          background: '#4ade80',
          boxShadow: '0 0 0 0 rgba(74,222,128,0.7)',
          animation: 'liveDotPulse 2s infinite',
          flexShrink: 0,
        }} />
        <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: 12, fontWeight: 700 }}>
          {t('workers_live_now') || (isRTL ? 'עובדים זמינים כעת' : 'Available now')}
        </span>
      </div>

      {/* Total count */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 6 }}>
        <span style={{ color: 'white', fontSize: 30, fontWeight: 900, lineHeight: 1 }}>
          {displayCount.toLocaleString()}
        </span>
        <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: 14, fontWeight: 700 }}>
          {t('workers_professionals') || (isRTL ? 'בעלי מקצוע מחוברים' : 'professionals')}
        </span>
      </div>

      {/* Trust message */}
      <div style={{
        color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: 500,
        marginBottom: 12, lineHeight: 1.4,
      }}>
        {t('workers_trust_msg') || (isRTL ? 'פרסם משימה וקבל הצעות תוך דקות ספורות' : 'Post a task and get offers within minutes')}
      </div>

      {/* Category pills */}
      {sortedCats.length > 0 && (
        <div className="worker-stats-scroll" style={{
          display: 'flex', gap: 7, overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
          paddingBottom: 4, margin: '0 -16px', paddingInline: '16px',
        }}>
          {sortedCats.map(([cat, count]) => {
            const catData = CATEGORIES.find(c => c.value === cat);
            const label = catData?.label || cat;
            return (
              <div key={cat} style={{
                flexShrink: 0,
                background: 'rgba(255,255,255,0.15)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: 99,
                padding: '5px 11px',
                display: 'flex', alignItems: 'center', gap: 5,
              }}>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.95)', fontWeight: 700, whiteSpace: 'nowrap' }}>
                  {label}
                </span>
                <span style={{
                  background: 'rgba(255,255,255,0.25)',
                  borderRadius: 99, padding: '1px 7px',
                  fontSize: 11, fontWeight: 900, color: 'white',
                  minWidth: 18, textAlign: 'center',
                }}>
                  {count}
                </span>
              </div>
            );
          })}
        </div>
      )}

      <style>{`
        .worker-stats-scroll::-webkit-scrollbar { display: none; }
        .worker-stats-scroll { scrollbar-width: none; -ms-overflow-style: none; }
        @keyframes liveDotPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(74,222,128,0.7); }
          50% { box-shadow: 0 0 0 6px rgba(74,222,128,0); }
        }
      `}</style>
    </div>
  );
}