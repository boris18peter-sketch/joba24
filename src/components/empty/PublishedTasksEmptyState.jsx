import { Fragment, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Wrench, Zap, Truck, Sparkles, Package, ShoppingBag, Snowflake, Paintbrush,
  KeyRound, Hammer, Leaf, Monitor, PawPrint, Baby, BookOpen, HeartHandshake,
  PartyPopper, Dumbbell, ClipboardList, Plus, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { useLanguage } from '@/lib/LanguageContext';
import { useBrandCategories } from '@/lib/brand/brandCategories';
import { localizedCategoryLabel } from '@/lib/brand/categoryLabels';
import EmptyStateVideoCard from '@/components/empty/EmptyStateVideoCard';

/**
 * The empty state of My Published Tasks › Active — and ONLY that.
 *
 * It is rendered only where the screen has already established that the request
 * finished, succeeded, and returned nothing active, so it can never appear while
 * tasks are loading or when a task exists.
 *
 * Publishing goes through the form the app already has, and a category tile is
 * just that form opened on that category (`/create-task?category=<key>`), which
 * the form itself already understands — no new publish flow, no new state.
 *
 * Layout is deliberately compact: one message, one action, one line explaining
 * the flow, four categories, one video row. Everything is reachable with almost
 * no scrolling on a small phone.
 */
// Preference only — the four that are actually shown are the first of these that
// THIS brand really offers, so a specialised brand never sees an empty tile.
const QUICK_ORDER = [
  'moving', 'cleaning', 'plumbing', 'electricity', 'handyman', 'assemblies', 'ac',
  'painting', 'home_maintenance', 'heavy_lifting', 'gardening', 'locksmith',
  'carpentry', 'delivery', 'shopping', 'pets', 'babysitting', 'elderly_care',
  'tutoring', 'it_support', 'personal_help', 'fitness', 'parent_events', 'other',
];

// Line icons only, in the brand colour — an emoji per tile would put four
// different typefaces on one row.
const ICONS = {
  plumbing: Wrench, home_maintenance: Hammer, handyman: Hammer, carpentry: Hammer,
  assemblies: Wrench,
  electricity: Zap, ac: Snowflake, moving: Truck, heavy_lifting: Package,
  cleaning: Sparkles, gardening: Leaf, painting: Paintbrush, locksmith: KeyRound,
  delivery: Truck, shopping: ShoppingBag, pets: PawPrint, babysitting: Baby,
  elderly_care: HeartHandshake, tutoring: BookOpen, it_support: Monitor,
  personal_help: HeartHandshake, fitness: Dumbbell, parent_events: PartyPopper,
  events: PartyPopper, other: ClipboardList,
};

// The catalogue's labels carry their emoji; the tile already has an icon.
const plain = (s) => (typeof s === 'string' ? s.replace(/^[^\p{L}\p{N}]+/u, '').trim() : s);

export default function PublishedTasksEmptyState() {
  const navigate = useNavigate();
  const { t, lang, isRTL } = useLanguage();
  const { roots, categories, globalMap } = useBrandCategories();

  // Real categories of THIS brand. Roots first (the broad "what do you need"
  // choice); if the brand offers no roots, its actionable services are used.
  const quick = useMemo(() => {
    const pool = (roots?.length ? roots : categories || [])
      .filter(c => c?.category_key || c?.value);
    const keyOf = (c) => c.category_key || c.value;
    const byKey = new Map(pool.map(c => [keyOf(c), c]));
    const out = [];
    for (const k of QUICK_ORDER) {
      if (out.length >= 4) break;
      if (byKey.has(k)) out.push(byKey.get(k));
    }
    for (const c of pool) {
      if (out.length >= 4) break;
      if (!out.includes(c)) out.push(c);
    }
    return out.map((c) => {
      const key = keyOf(c);
      return {
        key,
        label: plain(localizedCategoryLabel(key, globalMap?.[key], lang, t) || c.label),
        Icon: ICONS[key] || ClipboardList,
      };
    });
  }, [roots, categories, globalMap, lang, t]);

  const publish = (key) => {
    try { navigator.vibrate?.(12); } catch {}
    navigate(key ? `/create-task?category=${encodeURIComponent(key)}` : '/create-task');
  };

  const steps = [t('mtempty_step_1'), t('mtempty_step_2'), t('mtempty_step_3')];
  const StepArrow = isRTL ? ChevronLeft : ChevronRight;

  return (
    <div style={{ paddingTop: 2 }}>
      {/* A. What this screen is for — one headline, one supporting line */}
      <h2 style={{
        margin: 0, fontSize: 22, fontWeight: 900, lineHeight: 1.24,
        letterSpacing: -0.5, color: 'var(--text-1)',
      }}>
        {t('mtempty_title')}
      </h2>
      <p style={{
        margin: '8px 0 0', fontSize: 13.5, lineHeight: 1.5,
        fontWeight: 500, color: 'var(--text-2)',
      }}>
        {t('mtempty_sub')}
      </p>

      {/* B. The one action this screen exists for */}
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

      {/* C. The whole flow in one line — no cards, no colour blocks */}
      <div style={{ display: 'flex', alignItems: 'flex-start', marginTop: 14 }}>
        {steps.map((label, i) => (
          <Fragment key={label}>
            <div style={{
              flex: 1, minWidth: 0,
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
            }}>
              <span style={{
                width: 20, height: 20, borderRadius: '50%',
                background: 'var(--brand-primary-light)', color: 'var(--brand-primary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 900, flexShrink: 0,
              }}>
                {i + 1}
              </span>
              <span style={{
                fontSize: 11.5, fontWeight: 700, color: 'var(--text-2)',
                whiteSpace: 'nowrap', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <StepArrow size={13} style={{ color: 'var(--text-3)', opacity: 0.7, marginTop: 4, flexShrink: 0 }} />
            )}
          </Fragment>
        ))}
      </div>

      {/* D. Quick categories — real ones, opening the form on that category */}
      {quick.length > 0 && (
        <>
          <div style={{
            margin: '18px 0 8px', fontSize: 12.5, fontWeight: 800,
            color: 'var(--text-3)', letterSpacing: 0.2,
          }}>
            {t('mtempty_cat_label')}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(quick.length, 4)}, 1fr)`, gap: 8 }}>
            {quick.map(({ key, label, Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => publish(key)}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  gap: 6, padding: '10px 4px', minHeight: 66,
                  borderRadius: 14, background: 'var(--surface-2)',
                  border: '1px solid var(--border-1)',
                  cursor: 'pointer', fontFamily: 'inherit', WebkitTapHighlightColor: 'transparent',
                  transition: 'transform 0.12s ease, border-color 0.15s ease',
                }}
              >
                <Icon size={19} strokeWidth={1.9} color="var(--brand-primary)" />
                <span style={{
                  fontSize: 11, fontWeight: 700, color: 'var(--text-1)',
                  maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {label}
                </span>
              </button>
            ))}
          </div>
        </>
      )}

      {/* E. The explainer video that already exists in the app */}
      <div style={{ marginTop: 18 }}>
        <EmptyStateVideoCard
          title={t('mtempty_video_title')}
          subtitle={t('mtempty_video_sub')}
        />
      </div>
    </div>
  );
}