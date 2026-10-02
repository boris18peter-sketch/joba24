import { useState } from 'react';
import { Btn } from '@/components/admin/brand/brandUi';
export default function BrandParentCard({ parent, services, assigned, excluded, onParent, onChild }) {
  const [expanded,setExpanded] = useState(false);
  const activeServices = services.filter(s => s.active !== false);
  const offered = assigned && parent.active !== false ? activeServices.filter(s => !excluded.includes(s.category_key)).length : 0;
  return <article className="rounded-lg border border-jborder-1 bg-surface-2 p-4 space-y-3">
    <div className="flex items-center gap-3">
      <label className="flex-1 flex items-center gap-3 cursor-pointer">
        <input type="checkbox" className="h-5 w-5" checked={assigned} onChange={e => onParent(e.target.checked)} />
        {parent.image_url ? <img className="h-10 w-10 rounded object-cover" src={parent.image_url} alt="" /> : <span>{parent.icon}</span>}
        <span><strong className="block text-jtext-1">{parent.label}</strong><span className="text-sm text-jtext-3">{assigned ? `${offered} שירותים זמינים במותג` : `${activeServices.length} שירותים פעילים`}{parent.active === false ? ' · האב מושבת גלובלית' : ''}</span></span>
      </label>
      <Btn variant="soft" onClick={() => setExpanded(v => !v)}>{expanded ? 'סגור' : 'שירותים'}</Btn>
    </div>
    {expanded && <div className="space-y-2 border-t border-jborder-1 pt-3">
      <p className="text-xs text-jtext-3">כל הילדים הפעילים יורשים הפעלה. ביטול סימון מחריג רק שירות זה מהמותג; הטופס נשאר גלובלי.</p>
      {services.map(s => <label key={s.category_key} className="flex items-center gap-2 text-sm py-1">
        <input type="checkbox" checked={assigned && s.active !== false && !excluded.includes(s.category_key)} disabled={!assigned || parent.active === false || s.active === false} onChange={e => onChild(s.category_key,e.target.checked)} />
        <span>{s.icon} {s.label}</span><span className="text-xs text-jtext-3">{s.active === false ? 'מושבת גלובלית' : excluded.includes(s.category_key) ? 'מוחרג מהמותג' : 'יורש הפעלה'}</span>
      </label>)}
      {!services.length && <p className="text-sm text-jtext-3">אין שירותים תחת אב זה.</p>}
    </div>}
  </article>;
}