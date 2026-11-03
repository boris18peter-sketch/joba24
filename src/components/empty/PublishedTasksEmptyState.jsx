import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useLanguage } from '@/lib/LanguageContext';
import { useBrandCategories } from '@/lib/brand/brandCategories';
import { localizedCategoryLabel } from '@/lib/brand/categoryLabels';
import { useWorkerPool } from '@/hooks/useWorkerPool';
import { categoryIcon } from '@/components/empty/categoryIcons';
import BenefitsBanner from '@/components/empty/BenefitsBanner';
import CategoryCarousel from '@/components/empty/CategoryCarousel';
import EmptyStateVideoCard from '@/components/empty/EmptyStateVideoCard';

/**
 * The empty state of My Published Tasks › Active — and ONLY that.
 *
 * It is rendered only where the screen has already established that the request
 * finished, succeeded, and returned nothing active, so it can never appear while
 * tasks are loading or when a task exists.
 *
 * Content order is deliberate: the history control above (in the screen header),
 * then the rotating trust banner, then the headline, its explanation, the one
 * primary action, the categories, and the explainer video last. The block sits
 * at the TOP of the space, never centred in it — a vertically centred column
 * opens with a band of empty background, which reads as a loading gap.
 *
 * ── THE CATEGORIES ARE THE PUBLISH FORM'S OWN LIST ────────────────────────
 * `rootGroups` comes from the same shared grouping the publish form's first
 * "בחרו קטגוריה" step reads (categoryTree.categoryRootGroups), so the rail shows
 * exactly the form's main categories, in exactly the form's order, with no
 * local sorting, renaming or filtering. A category added or re-ordered in the
 * catalogue appears here automatically.
 *
 * ── THE NUMBER ON EACH TILE ───────────────────────────────────────────────
 * The count is real: it is the number of professionals in the public worker pool
 * who offer anything inside that section (their own declared categories), read
 * from the same shared pool query the app's live "N professionals" surfaces use.
 * It counts PEOPLE, not category listings, so someone who offers both plumbing
 * and a plumbing sub-service is one professional — never two. A section with
 * nobody in it shows no badge at all rather than a "0".
 */
export default function PublishedTasksEmptyState() {
  const navigate = useNavigate();
  const { t, lang, isRTL } = useLanguage();
  const { rootGroups, globalMap } = useBrandCategories();
  const { data: pool = [] } = useWorkerPool();

  const items = useMemo(() => {
    // Each section's own keys: its root key plus every service beneath it.
    const keySets = (rootGroups || []).map((g) => new Set((g.services || []).map((s) => s.value).filter(Boolean)));
    const counts = keySets.map(() => 0);
    for (const w of pool || []) {
      const offers = w.preferred_categories || [];
      if (!offers.length) continue;
      keySets.forEach((keys, i) => {
        if (offers.some((k) => keys.has(k))) counts[i] += 1;
      });
    }
    const seen = new Set();
    return (rootGroups || [])
      .filter((g) => g?.key && !seen.has(g.key) && seen.add(g.key))
      .map((g, i) => {
        // The label, never the emoji: the icon comes from the shared line-icon
        // set so every tile is drawn identically on every device.
        const raw = String(localizedCategoryLabel(g.key, globalMap?.[g.key], lang, t) || g.label || g.key);
        const label = raw.replace(/^[^\p{L}\p{N}]+/u, '').trim() || raw;
        return { key: g.key, label, Icon: categoryIcon(g.key, globalMap), count: counts[i] || 0 };
      });
  }, [rootGroups, globalMap, pool, lang, t]);

  const publish = (key) => {
    try { navigator.vibrate?.(12); } catch {}
    navigate(key ? `/create-task?category=${encodeURIComponent(key)}` : '/create-task');
  };

  return (
    <div style={{ paddingTop: 2 }}>
      {/* 2. The rotating benefits banner — trust before the ask */}
      <BenefitsBanner />

      {/* 3. One headline, one line */}
      <h2 style={{
        margin: '18px 0 0', fontSize: 22, fontWeight: 900, lineHeight: 1.26,
        letterSpacing: -0.4, color: 'var(--text-1)', textAlign: 'center',
      }}>
        {t('mtempty_title')}
      </h2>

      {/* 4. A single short explanation */}
      <p style={{
        margin: '6px 0 0', fontSize: 14, lineHeight: 1.5,
        fontWeight: 500, color: 'var(--text-2)', textAlign: 'center',
      }}>
        {t('mtempty_sub')}
      </p>

      {/* 5. The one action this screen exists for — the only filled element */}
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

      {/* 6. The categories — no heading: they speak for themselves */}
      {items.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <CategoryCarousel items={items} onSelect={publish} isRTL={isRTL} />
        </div>
      )}

      {/* 7. The explainer video that already exists in the app */}
      <div style={{ marginTop: 10 }}>
        <EmptyStateVideoCard
          title={t('mtempty_video_title')}
          subtitle={t('mtempty_video_sub')}
        />
      </div>
    </div>
  );
}