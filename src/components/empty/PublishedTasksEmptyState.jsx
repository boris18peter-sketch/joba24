import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useLanguage } from '@/lib/LanguageContext';
import { useBrandCategories } from '@/lib/brand/brandCategories';
import { localizedCategoryLabel } from '@/lib/brand/categoryLabels';
import { BrandLogo } from '@/components/BrandIdentity';
import { categoryIcon } from '@/components/empty/categoryIcons';
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
 * ── WHICH CATEGORIES ──────────────────────────────────────────────────────
 * MAIN categories only. On the platform Brand that is the top-level taxonomy
 * (a trade a person chooses: plumbing, moving, cleaning) — not the dozens of
 * single jobs beneath it, which belong to the task form. A Brand scoped to its
 * own niche shows ITS categories instead, derived from its own assignment, so a
 * sub-brand reads as that brand rather than as the whole marketplace.
 *
 * Both lists come from the same hook the task creation form reads, so no list,
 * order or name is written here: re-ordering the catalogue re-orders this rail.
 * A category opens that same form on that category (`/create-task?category=`),
 * which the form already understands — including a main category, which opens
 * the picker on it.
 */
export default function PublishedTasksEmptyState() {
  const navigate = useNavigate();
  const { t, lang, isRTL } = useLanguage();
  const { roots, categories, globalMap, isPlatformBrand } = useBrandCategories();

  const items = useMemo(() => {
    const source = isPlatformBrand
      ? (roots || []).map((r) => ({ key: r.category_key, row: r }))
      : (categories || []).map((c) => ({ key: c.value, row: globalMap?.[c.value] }));
    const seen = new Set();
    return source
      .filter(({ key }) => key && !seen.has(key) && seen.add(key))
      .map(({ key, row }) => {
        // The label, never the emoji: the icon comes from the shared line-icon
        // set so every tile is drawn identically.
        const raw = String(row ? localizedCategoryLabel(key, row, lang, t) : (t(`cat_${key}`) || key));
        const label = raw.replace(/^[^\p{L}\p{N}]+/u, '').trim() || raw;
        return { key, label, Icon: categoryIcon(key, globalMap) };
      });
  }, [isPlatformBrand, roots, categories, globalMap, lang, t]);

  const publish = (key) => {
    try { navigator.vibrate?.(12); } catch {}
    navigate(key ? `/create-task?category=${encodeURIComponent(key)}` : '/create-task');
  };

  // The block is centred in the space the screen leaves it, so the screen ends
  // on content instead of on a band of empty background under the last row.
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', justifyContent: 'center',
      minHeight: 'calc(100dvh - 210px)', paddingBottom: 4,
    }}>
      {/* A. One headline, one line — with the Brand's own mark beside it */}
      <div style={{ textAlign: 'center' }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          <BrandLogo size={26} radius={9} alt="" />
          <h2 style={{
            margin: 0, fontSize: 21, fontWeight: 900, lineHeight: 1.26,
            letterSpacing: -0.4, color: 'var(--text-1)', textAlign: 'start',
          }}>
            {t('mtempty_title')}
          </h2>
        </div>
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
          marginTop: 12, width: '100%', height: 50, borderRadius: 14, border: 'none',
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

      {/* C. The main categories — one consistent icon per category */}
      {items.length > 0 && (
        <div style={{ marginTop: 14 }}>
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
      <div style={{ marginTop: 12 }}>
        <EmptyStateVideoCard
          title={t('mtempty_video_title')}
          subtitle={t('mtempty_video_sub')}
        />
      </div>
    </div>
  );
}