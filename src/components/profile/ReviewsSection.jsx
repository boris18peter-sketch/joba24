import { useMemo, useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { classifyReviews } from '@/lib/reviewClassification';
import ReviewCard from './ReviewCard';
import RatingDistribution from './RatingDistribution';
import { useLanguage } from '@/lib/LanguageContext';

const PREVIEW_COUNT = 3;

/**
 * ReviewsSection — the professional reviews area.
 *
 * One summary (overall rating, review count, star distribution) and one
 * segmented control that separates the reviews the profile owner received as a
 * CLIENT from those received as a WORKER — the two are never mixed, and the
 * split comes from the real Task relationships (see reviewClassification).
 */
export default function ReviewsSection({
  reviews = [],
  tasks = [],
  profileUserId,
  rating = 0,
  scope = null,
  showTaskTitle = false,
  collapsible = false,
}) {
  const { t } = useLanguage();
  const [filter, setFilter] = useState('all');
  const [expanded, setExpanded] = useState(!collapsible);

  const { aboutWorker, aboutClient } = useMemo(
    () => classifyReviews(reviews, profileUserId, tasks),
    [reviews, tasks, profileUserId],
  );

  const taskById = useMemo(() => {
    const map = {};
    tasks.forEach((tk) => { if (tk?.id) map[tk.id] = tk; });
    return map;
  }, [tasks]);

  const counts = useMemo(() => {
    const dist = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach((r) => {
      const star = Math.max(1, Math.min(5, Math.round(Number(r.rating) || 0)));
      dist[star] += 1;
    });
    return dist;
  }, [reviews]);

  const average = useMemo(() => {
    if (Number(rating) > 0) return Number(rating);
    if (!reviews.length) return 0;
    return reviews.reduce((sum, r) => sum + (Number(r.rating) || 0), 0) / reviews.length;
  }, [rating, reviews]);

  const segments = [
    { key: 'all', label: t('rev_seg_all'), items: reviews },
    { key: 'client', label: t('rev_seg_as_client'), items: aboutClient },
    { key: 'worker', label: t('rev_seg_as_worker'), items: aboutWorker },
  ];
  const active = segments.find((s) => s.key === filter) || segments[0];
  const visible = expanded ? active.items : active.items.slice(0, PREVIEW_COUNT);

  return (
    <div style={{
      background: 'var(--brand-card-bg, var(--surface-2))',
      borderRadius: 18,
      border: '1px solid var(--border-1)',
      padding: '16px 16px 14px',
      boxShadow: 'var(--shadow-xs)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14 }}>
        <MessageCircle size={14} color="var(--brand-primary)" />
        <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-3)', letterSpacing: 0.3 }}>
          {t('rev_section_title')}
        </span>
      </div>

      {reviews.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '16px 0', color: 'var(--text-3)', fontSize: 13, fontWeight: 600 }}>
          {t('rev_empty_all')}
        </div>
      ) : (
        <>
          {/* Summary */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 18, marginBottom: 14 }}>
            <div style={{ textAlign: 'center', flexShrink: 0 }}>
              <div style={{ fontSize: 34, fontWeight: 900, color: 'var(--text-1)', lineHeight: 1 }}>
                {average.toFixed(1)}
              </div>
              <div style={{ fontSize: 13, color: '#fbbf24', letterSpacing: 1, marginTop: 3 }}>★★★★★</div>
              <div style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 700, marginTop: 4 }}>
                {t('rev_count', { n: reviews.length })}
              </div>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <RatingDistribution counts={counts} total={reviews.length} label={t('rev_distribution')} />
            </div>
          </div>

          {/* Role split */}
          <div style={{ display: 'flex', gap: 4, background: 'var(--surface-3)', borderRadius: 12, padding: 4, marginBottom: 12 }}>
            {segments.map((seg) => {
              const isActive = seg.key === filter;
              return (
                <button
                  key={seg.key}
                  onClick={() => { setFilter(seg.key); setExpanded(false); }}
                  style={{
                    flex: 1, minHeight: 36, borderRadius: 9, border: 'none', cursor: 'pointer',
                    background: isActive ? 'var(--surface-2)' : 'transparent',
                    boxShadow: isActive ? 'var(--shadow-xs)' : 'none',
                    color: isActive ? 'var(--brand-primary)' : 'var(--text-2)',
                    fontSize: 11.5, fontWeight: isActive ? 800 : 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                    padding: '6px 2px', transition: 'all 0.15s',
                  }}
                >
                  {seg.label}
                  <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)' }}>({seg.items.length})</span>
                </button>
              );
            })}
          </div>

          {/* Cards */}
          {visible.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '18px 0', color: 'var(--text-3)', fontSize: 12.5, fontWeight: 600 }}>
              {t('rev_empty_filtered')}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {visible.map((review, i) => (
                <ReviewCard
                  key={review.id || i}
                  review={review}
                  task={review.task_id ? taskById[review.task_id] : null}
                  kind={filter === 'worker' ? 'about_worker' : filter === 'client' ? 'about_client' : (aboutWorker.includes(review) ? 'about_worker' : 'about_client')}
                  scope={scope}
                  showTaskTitle={showTaskTitle}
                />
              ))}
            </div>
          )}

          {active.items.length > PREVIEW_COUNT && (
            <button
              onClick={() => setExpanded((v) => !v)}
              style={{
                width: '100%', marginTop: 12, minHeight: 40, borderRadius: 12,
                background: 'var(--surface-3)', border: '1px solid var(--border-1)',
                color: 'var(--brand-primary)', fontWeight: 800, fontSize: 12.5, cursor: 'pointer',
              }}
            >
              {expanded ? t('rev_show_less') : t('rev_show_more', { n: active.items.length - PREVIEW_COUNT })}
            </button>
          )}
        </>
      )}
    </div>
  );
}