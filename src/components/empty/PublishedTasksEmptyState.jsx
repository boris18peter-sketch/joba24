import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useLanguage } from '@/lib/LanguageContext';
import { useBrandCategories } from '@/lib/brand/brandCategories';
import { localizedCategoryLabel } from '@/lib/brand/categoryLabels';
import CategoryCarousel from '@/components/empty/CategoryCarousel';
import EmptyStateVideoCard from '@/components/empty/EmptyStateVideoCard';

/**
 * The empty state of My Published Tasks › Active — and ONLY that.
 *
 * It is rendered only where the screen has already established that the request
 * finished, succeeded, and returned nothing active, so it can never appear while
 * tasks are loading or when a task exists.
 *
 * Three things, in this order: one headline with one line under it, the publish
 * button, and the way in from a category. Nothing else — no steps, no second
 * title, no explanation blocks.
 *
 * The categories are the ones the task creation form offers, in the SAME order
 * it offers them: they come from the same hook (`useBrandCategories`), which is
 * already brand-scoped and catalogue-ordered by sort_order. No list, order or
 * name is written here, so re-ordering the catalogue re-orders this rail too.
 * A category opens that same form on that category (`/create-task?category=`),
 * which the form already understands.
 */
export default function PublishedTasksEmptyState() {
  const navigate = useNavigate();
  const { t, lang, isRTL } = useLanguage();
  const { categories, globalMap } = useBrandCategories();

  // Every actionable category of this Brand, untouched and in catalogue order.
  // The emoji is split off the label so it can sit inside the round icon while
  // the label keeps only the words — the category's own icon, not a new one.
  const items = useMemo(() => (categories || [])
    .filter(c => c?.value)
    .map((c) => {
      const raw = String(
        localizedCategoryLabel(c.value, globalMap?.[c.value], lang, t) || c.label || c.value
      );
      const lead = raw.match(/^[^\p{L}\p{N}]+/u);
      return {
        key: c.value,
        label: (lead ? raw.slice(lead[0].length) : raw).trim() || raw,
        emoji: (lead ? lead[0].trim() : '') || globalMap?.[c.value]?.icon || '',
      };
    }), [categories, globalMap, lang, t]);

  const publish = (key) => {
    try { navigator.vibrate?.(12); } catch {}
    navigate(key ? `/create-task?category=${encodeURIComponent(key)}` : '/create-task');
  };

  return (
    <div style={{ paddingTop: 4 }}>
      {/* A. One headline, one line. Nothing above it. */}
      <div style={{ textAlign: 'center' }}>
        <h2 style={{
          margin: 0, fontSize: 21, fontWeight: 900, lineHeight: 1.26,
          letterSpacing: -0.4, color: 'var(--text-1)',
        }}>
          {t('mtempty_title')}
        </h2>
        <p style={{
          margin: '6px 0 0', fontSize: 13.5, lineHeight: 1.5,
          fontWeight: 500, color: 'var(--text-2)',
        }}>
          {t('mtempty_sub')}
        </p>
      </div>

      {/* B. The one action this screen exists for — the only filled element */}
      <button
        type="button"
        onClick={() => publish()}
        style={{
          marginTop: 14, width: '100%', height: 50, borderRadius: 14, border: 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
          background: 'linear-gradient(135deg, var(--brand-btn-primary-bg, var(--brand-primary)), var(--brand-btn-primary-bg, var(--brand-primary-dark)))',
          color: 'var(--brand-btn-primary-text, #ffffff)',
          fontSize: 16, fontWeight: 900, cursor: 'pointer',
          boxShadow: '0 8px 20px rgba(26,111,212,0.26)',
          fontFamily: 'inherit', WebkitTapHighlightColor: 'transparent',
        }}
      >
        <Plus size={18} strokeWidth={2.8} />
        {t('post_task_btn')}
      </button>

      {/* C. Every category the form offers, in the form's own order */}
      {items.length > 0 && (
        <div style={{ marginTop: 18 }}>
          <div style={{
            marginBottom: 8, fontSize: 12.5, fontWeight: 800,
            color: 'var(--text-3)', letterSpacing: 0.2,
          }}>
            {t('mtempty_cat_label')}
          </div>
          <CategoryCarousel items={items} onSelect={publish} isRTL={isRTL} />
        </div>
      )}

      {/* D. The explainer video that already exists in the app */}
      <div style={{ marginTop: 16 }}>
        <EmptyStateVideoCard
          title={t('mtempty_video_title')}
          subtitle={t('mtempty_video_sub')}
        />
      </div>
    </div>
  );
}