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
 * ── ONE HERO, THEN THE ACTION ─────────────────────────────────────────────
 * Order is deliberate: the banner carousel first (it now carries the whole
 * message — "צריך עזרה במשהו?" lives inside it), then immediately the publish
 * button, then a quiet history link, then the categories, then the explainer.
 * There is no separate headline or explanation above the banner: that was the
 * same message twice.
 */
export default function PublishedTasksEmptyState() {
  const navigate = useNavigate();
  const { t, lang, isRTL } = useLanguage();
  const { rootGroups, globalMap } = useBrandCategories();
  const { data: pool = [] } = useWorkerPool();

  const items = useMemo(() => {
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
      {/* 1. The hero — message and illustration in one compact banner */}
      <BenefitsBanner />

      {/* 2. The one action this screen exists for, directly under the banner */}
      <button
        type="button"
        onClick={() => publish()}
        style={{
          marginTop: 10, width: '100%', height: 50, borderRadius: 14, border: 'none',
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

      {/* 3. The categories, with the one line that explains what the row is.
          The block gets real air above AND below it, so the rail reads as its own
          section instead of being squeezed between two buttons. */}
      {items.length > 0 && (
        <div style={{ marginTop: 26, marginBottom: 22 }}>
          <div style={{
            marginBottom: 10, fontSize: 13, fontWeight: 800,
            letterSpacing: '-0.1px', color: 'var(--text-2)',
          }}>
            {t('empty_cats_heading')}
          </div>
          <CategoryCarousel items={items} onSelect={publish} isRTL={isRTL} />
        </div>
      )}

      {/* 4. The explainer video — pushed further down: it is the last, optional
          item on the screen, so it must not sit on the heels of the catalogue. */}
      <div style={{ marginTop: 40 }}>
        <EmptyStateVideoCard
          title={t('mtempty_video_title')}
          subtitle={t('mtempty_video_sub')}
        />
      </div>
    </div>
  );
}