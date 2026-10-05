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
 * A top-level VISUAL GROUP that actually holds services is offered too: it
 * bundles the roots beneath it, so a Brand that was scoped by a group (the
 * legacy scoping) can always be un-scoped here. A group with nothing under it
 * can change nothing, so it is not offered — nothing that affects the
 * storefront is ever left invisible.
 *
 * Nothing here is specific to any category: pick any node and it works.
 */
export default function BrandCategoriesTab({ brand, globalRows = [] }) {
  const { scope, saving, parent, child } = useBrandCategoryScope(brand);

  const bySort = (a, b) => (a.sort_order || 0) - (b.sort_order || 0);

  // The services a node would offer — resolved by the SAME generic engine the
  // storefront uses, so what an admin sees is exactly what the Brand gets.
  const servicesFor = (key) =>
    deriveServices(globalRows, { assigned_parent_keys: [key], excluded_child_keys: [], category_model_version: 2 }).sort(bySort);

  const topLevel = globalRows.filter((g) => !g.parent_key);

  // Assignable niches: canonical roots (plus legacy 'parent' rows on an
  // unmigrated catalogue, so this screen never goes blank).
  const niches = topLevel.filter((g) => ['root', 'parent'].includes(g.node_type)).sort(bySort);

  // Top-level visual GROUPS that actually hold services.
  const domains = topLevel.filter((g) => g.node_type === 'group' && servicesFor(g.category_key).length).sort(bySort);

  const effective = deriveServices(globalRows, { ...brand, ...scope, category_model_version: 2 });

  const grid = (nodes) => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {nodes.map((p) => (
        <BrandParentCard
          key={p.id}
          parent={p}
          services={servicesFor(p.category_key)}
          assigned={scope.assigned_parent_keys.includes(p.category_key)}
          excluded={scope.excluded_child_keys}
          onParent={(on) => parent(p.category_key, on)}
          onChild={child}
        />
      ))}
    </div>
  );

  return (
    <>
      <Section
        title="נישת המותג / קטגוריות שורש"
        desc="בחרו תחום שורש אחד או יותר. המותג מציג ישירות את השירותים שמתחתיו — ללא שלב ביניים וללא תוכן נפרד."
      >
        <p role="status" className="text-sm text-jtext-2">
          {effective.length} שירותים זמינים · {saving ? 'שומר ברקע…' : 'נשמר'} · הטפסים והתוכן גלובליים ומשותפים לכל המותגים
        </p>
        {grid(niches)}
        {!niches.length && (
          <p className="text-sm text-jtext-3">אין קטגוריות שורש; הגדירו אותן ב-Admin → Categories.</p>
        )}
        <p className="text-xs text-jtext-3">
          שירות חדש שיתווסף גלובלית מתחת לשורש נבחר יופיע כאן אוטומטית. שיפור טופס או דוגמה גלובלית מתעדכן בכל המותגים.
        </p>
      </Section>

      {!!domains.length && (
        <Section
          title="תחומים רחבים"
          desc="תחום מאגד כמה קטגוריות שורש. סימון תחום מעניק למותג את כל השירותים שתחתיו, וביטול הסימון מסיר אותם ממנו."
        >
          <p className="text-sm text-jtext-2">
            אם סומן תחום וגם שורשים בודדים שבתוכו — בטלו כאן את סימון התחום כדי שהמותג לא יציע את כולו.
          </p>
          {grid(domains)}
        </Section>
      )}
    </>
  );
}