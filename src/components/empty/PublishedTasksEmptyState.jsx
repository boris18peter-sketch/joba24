import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useLanguage } from '@/lib/LanguageContext';
import { useBrandCategories } from '@/lib/brand/brandCategories';
import { localizedCategoryLabel } from '@/lib/brand/categoryLabels';
import { deriveMainCategories } from '@/lib/brand/categoryTree';
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
 * The content sits at the TOP of the space under the header, never centred in
 * it: a vertically centred block opens with a band of empty background, which
 * reads as a loading gap rather than as a designed screen.
 *
 * ── WHICH CATEGORIES ──────────────────────────────────────────────────────
 * The catalogue's own MAIN categories, read from data (deriveMainCategories) —
 * every pickable category that is not a single job hidden under a trade. That
 * is the top-level taxonomy as the catalogue defines it, which includes the
 * categories that hang directly off a section (רכב, משלוח, הסעות, קניות) and
 * not only the nodes typed as a root. Nothing is listed, ordered or renamed
 * here: re-ordering the catalogue re-orders this rail.
 *
 * A Brand scoped to its own niche shows ITS categories instead, derived from
 * its own assignment, so a sub-brand reads as that brand rather than as the
 * whole marketplace.
 */
export default function PublishedTasksEmptyState() {
  const navigate = useNavigate();
  const { t, lang, isRTL } = useLanguage();
  const { categories, globalMap, globalRows, isPlatformBrand } = useBrandCategories();

  const items = useMemo(() => {
    const source = isPlatformBrand
      ? deriveMainCategories(globalRows || []).map((r) => ({ key: r.category_key, row: r }))
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
  }, [isPlatformBrand, categories, globalRows, globalMap, lang, t]);

  const publish = (key) => {
    try { navigator.vibrate?.(12); } catch {}
    navigate(key ? `/create-task?category=${encodeURIComponent(key)}` : '/create-task');
  };

  return (
    <div style={{ paddingTop: 26 }}>
      {/* A. One headline, one line — the screen's own words, no mark beside them */}
      <h2 style={{
        margin: 0, fontSize: 22, fontWeight: 900, lineHeight: 1.26,
        letterSpacing: -0.4, color: 'var(--text-1)', textAlign: 'center',
      }}>
        {t('mtempty_title')}
      </h2>
      <p style={{
        margin: '6px 0 0', fontSize: 14, lineHeight: 1.5,
        fontWeight: 500, color: 'var(--text-2)', textAlign: 'center',
      }}>
        {t('mtempty_sub')}
      </p>

      {/* B. The one action this screen exists for — the only filled element */}
      <button
        type="button"
        onClick={() => publish()}
        style={{
          marginTop: 16, width: '100%', height: 50, borderRadius: 14, border: 'none',
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
        <div style={{ marginTop: 16 }}>
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
      <div style={{ marginTop: 8 }}>
        <EmptyStateVideoCard
          title={t('mtempty_video_title')}
          subtitle={t('mtempty_video_sub')}
        />
      </div>
    </div>
  );
}