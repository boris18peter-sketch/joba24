import { Section } from '@/components/admin/brand/brandUi';
import BrandParentCard from '@/components/admin/brand/BrandParentCard';
import useBrandCategoryScope from '@/components/admin/brand/useBrandCategoryScope';
import { deriveServices } from '@/lib/brand/categoryTree';

/**
 * BrandCategoriesTab — the Brand's NICHE, expressed generically.
 *
 * The Brand's niche is one or more canonical ROOT categories. Everything below
 * a selected root is offered automatically, at any depth, and every form and
 * piece of content stays GLOBAL — a Brand never owns a copy.
 *
 * Nothing here is specific to any category: pick any root and it works.
 */
export default function BrandCategoriesTab({ brand, globalRows = [] }) {
  const { scope, saving, parent, child } = useBrandCategoryScope(brand);

  // Assignable niches: canonical roots (plus legacy 'parent' rows on an
  // unmigrated catalogue, so this screen never goes blank).
  const roots = globalRows
    .filter((g) => !g.parent_key && ['root', 'parent'].includes(g.node_type))
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

  const effective = deriveServices(globalRows, { ...brand, ...scope, category_model_version: 2 });

  // The services a root would offer — resolved by the SAME generic engine the
  // storefront uses, so what an admin sees is exactly what the Brand gets.
  const servicesFor = (key) =>
    deriveServices(globalRows, { assigned_parent_keys: [key], excluded_child_keys: [], category_model_version: 2 });

  return (
    <Section
      title="נישת המותג / קטגוריות שורש"
      desc="בחרו תחום שורש אחד או יותר. המותג מציג ישירות את השירותים שמתחתיו — ללא שלב ביניים וללא תוכן נפרד."
    >
      <p role="status" className="text-sm text-jtext-2">
        {effective.length} שירותים זמינים · {saving ? 'שומר ברקע…' : 'נשמר'} · הטפסים והתוכן גלובליים ומשותפים לכל המותגים
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {roots.map((p) => (
          <BrandParentCard
            key={p.id}
            parent={p}
            services={servicesFor(p.category_key).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))}
            assigned={scope.assigned_parent_keys.includes(p.category_key)}
            excluded={scope.excluded_child_keys}
            onParent={(on) => parent(p.category_key, on)}
            onChild={child}
          />
        ))}
      </div>
      {!roots.length && (
        <p className="text-sm text-jtext-3">אין קטגוריות שורש; הגדירו אותן ב-Admin → Categories.</p>
      )}
      <p className="text-xs text-jtext-3">
        שירות חדש שיתווסף גלובלית מתחת לשורש נבחר יופיע כאן אוטומטית. שיפור טופס או דוגמה גלובלית מתעדכן בכל המותגים.
      </p>
    </Section>
  );
}