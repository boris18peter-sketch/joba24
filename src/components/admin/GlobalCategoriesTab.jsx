import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { Section, Btn } from '@/components/admin/brand/brandUi';
import { useGlobalCategories } from '@/lib/brand/globalCategories';
import GlobalCategoryEditor from '@/components/admin/categories/GlobalCategoryEditor';
import GlobalTreeBranch from '@/components/admin/categories/GlobalTreeBranch';
export default function GlobalCategoriesTab() {
  const cache = useQueryClient(), { rows,isLoading } = useGlobalCategories();
  const [editing,setEditing] = useState(null), [busy,setBusy] = useState(false);
  const roots = rows.filter(r => !r.parent_key).sort((a,b) => (a.sort_order || 0) - (b.sort_order || 0));
  const refresh = () => { cache.invalidateQueries({ queryKey: ['globalCategories'] }); cache.invalidateQueries({ queryKey: ['brandDashboard'] }); };
  const saved = category => { cache.setQueryData(['globalCategories'], old => [...(old || []).filter(r => r.id !== category.id),category]); refresh(); };
  const act = async (payload, optimistic) => {
    const previous = cache.getQueryData(['globalCategories']);
    setBusy(true); if (optimistic) cache.setQueryData(['globalCategories'],optimistic);
    try { const res = await base44.functions.invoke('adminManageGlobalCategory',payload); if (!res.data?.success) throw new Error(res.data?.error); refresh(); }
    catch { cache.setQueryData(['globalCategories'],previous); toast.error('לא נשמר, השינוי הוחזר'); }
    finally { setBusy(false); }
  };
  const add = parent => setEditing({ node_type: parent ? 'service' : 'root', parent_key: parent || '', sort_order: rows.filter(r => (r.parent_key || '') === (parent || '')).length });
  if (isLoading) return <p className="text-sm text-jtext-3">טוען קטגוריות…</p>;
  return <Section title="עץ הקטגוריות הגלובלי" desc="קטגוריות אב מגדירות תחומים; שירותי הילד וטופסיהם משותפים לכל המותגים." actions={<Btn onClick={() => add('')}>הוסף קטגוריית אב</Btn>}>
    {editing && <GlobalCategoryEditor key={editing.id || `${editing.node_type}:${editing.parent_key}`} category={editing} rows={rows} onSaved={saved} onClose={() => setEditing(null)} />}
    {roots.map(node => <GlobalTreeBranch key={node.id} node={node} rows={rows} siblings={roots} busy={busy} onEdit={setEditing} onAdd={add}
      onToggle={r => act({ action: 'toggle',id:r.id }, rows.map(g => g.id === r.id ? { ...g,active:g.active === false } : g))}
      onReorder={next => act({ action: 'reorder',order:next.map(r => ({ id:r.id })) }, rows.map(r => { const i=next.findIndex(g => g.id === r.id); return i < 0 ? r : { ...r,sort_order:i }; }))} />)}
    {!roots.length && <p className="text-sm text-jtext-3">אין קטגוריות אב. הוסיפו קטגוריית אב ושירותים תחתיה.</p>}
    <p className="text-xs text-jtext-3">מזהים קיימים נשמרים להיסטוריית משימות. להסתרה השתמשו בהשבתה; הזזה מתבצעת בעריכה דרך שינוי קטגוריית האב.</p>
  </Section>;
}