import { Section } from '@/components/admin/brand/brandUi';
import BrandParentCard from '@/components/admin/brand/BrandParentCard';
import useBrandCategoryScope from '@/components/admin/brand/useBrandCategoryScope';
import { ancestorsOf, deriveServices } from '@/lib/brand/categoryTree';
export default function BrandCategoriesTab({ brand, globalRows = [] }) {
  const { scope,saving,parent,child } = useBrandCategoryScope(brand);
  const map = Object.fromEntries(globalRows.map(g => [g.category_key,g]));
  const parents = globalRows.filter(g => g.node_type === 'parent' && !g.parent_key).sort((a,b) => (a.sort_order || 0) - (b.sort_order || 0));
  const effective = deriveServices(globalRows, { ...brand,...scope,category_model_version:2 });
  return <Section title="קטגוריות אב של המותג" desc="בחרו תחום אחד או יותר. המותג מקבל אוטומטית את איחוד שירותי הילד הפעילים, ללא כפילויות.">
    <p role="status" className="text-sm text-jtext-2">{effective.length} שירותים זמינים · {saving ? 'שומר ברקע…' : 'נשמר'} · הטפסים גלובליים</p>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{parents.map(p => <BrandParentCard key={p.id} parent={p}
      services={globalRows.filter(g => g.node_type !== 'parent' && ancestorsOf(g,map).some(a => a.category_key === p.category_key)).sort((a,b) => (a.sort_order || 0) - (b.sort_order || 0))}
      assigned={scope.assigned_parent_keys.includes(p.category_key)} excluded={scope.excluded_child_keys} onParent={on => parent(p.category_key,on)} onChild={child} />)}</div>
    {!parents.length && <p className="text-sm text-jtext-3">אין קטגוריות אב; הגדירו אותן ב-Admin → Categories.</p>}
    <p className="text-xs text-jtext-3">שירות חדש תחת אב שנבחר יופיע אוטומטית. השבתה או שינוי גלובלי מתעדכנים בכל המותגים. המידע הישן נשמר לצורך שחזור.</p>
  </Section>;
}