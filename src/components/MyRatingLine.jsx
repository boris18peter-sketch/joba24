import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Star } from 'lucide-react';
import { useLanguage } from '@/lib/LanguageContext';

/**
 * MyRatingLine — "how did I rate the other side", stated exactly.
 *
 * A completed task used to say only that it was completed. The one thing both
 * sides want back from it — the score they actually gave — was nowhere on the
 * card, so the rating felt like it had vanished. This prints the real score:
 * five stars, the ones that were given filled, and the number beside them.
 *
 * One read per completed card, cached for five minutes; it renders nothing at
 * all when there is no rating, so a card never grows an empty row.
 */
export default function MyRatingLine({ taskId, userId, tone = 'green' }) {
  const { t } = useLanguage();
  const { data: review } = useQuery({
    queryKey: ['myReviewForTask', taskId, userId],
    queryFn: () => base44.entities.Review.filter({ task_id: taskId, reviewer_id: userId }),
    select: (d) => (Array.isArray(d) ? d[0] : d) ?? null,
    enabled: !!taskId && !!userId,
    staleTime: 5 * 60 * 1000,
  });

  const rating = Number(review?.rating) || 0;
  if (!rating) return null;

  const color = tone === 'amber' ? '#92400e' : '#15803d';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
      <span style={{ fontSize: 11, color, fontWeight: 700 }}>{t('you_rated_label')}</span>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Star
            key={n}
            size={12}
            strokeWidth={1.6}
            style={{ fill: n <= rating ? '#fbbf24' : 'transparent', color: n <= rating ? '#fbbf24' : '#cbd5e1' }}
          />
        ))}
      </span>
      <span style={{ fontSize: 12.5, fontWeight: 900, color }}>{rating}</span>
    </div>
  );
}