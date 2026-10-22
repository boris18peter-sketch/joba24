import { useState } from 'react';
import { toast } from 'sonner';
import { Btn } from '@/components/admin/brand/brandUi';

// The campaign link for a category: the ORDINARY publish form, with the
// category already chosen and the publishing funnel still tracked. It is the
// same form a visitor reaches from inside the app, so every metric, notification
// and Brand rule applies exactly as it does there.
const CAMPAIGN_BASE = 'https://joba24.com/create-task?track=publish&category=';
const campaignLink = key => CAMPAIGN_BASE + encodeURIComponent(key);

export default function GlobalTreeBranch({ node, rows, siblings, busy, onEdit, onToggle, onReorder, onAdd }) {
  const [expanded,setExpanded] = useState(false);
  // A visual group owns no form and is never a task category, so it has no link
  // of its own — each of its services carries one instead.
  const copyable = !['group','parent'].includes(node.node_type);
  const copyLink = async () => {
    const url = campaignLink(node.category_key);
    try { await navigator.clipboard.writeText(url); toast.success('הקישור הועתק'); }
    catch { toast.error('לא ניתן להעתיק אוטומטית', { description: url }); }
  };
  const children = rows.filter(r => r.parent_key === node.category_key).sort((a,b) => (a.sort_order || 0) - (b.sort_order || 0));
  // A branch (visual group or canonical root) may have children; a service may not.
  const isBranch = ['group','parent','root'].includes(node.node_type);
  const move = dir => { const i = siblings.findIndex(r => r.id === node.id), j = i + dir; if (j < 0 || j >= siblings.length) return; const next = [...siblings]; [next[i],next[j]] = [next[j],next[i]]; onReorder(next); };
  return <div className="rounded-lg border border-jborder-1 p-3 space-y-3">
    <div className="flex gap-2 flex-wrap items-center">
      {node.image_url ? <img src={node.image_url} alt="" className="w-10 h-10 object-cover rounded" /> : <span>{node.icon}</span>}
      <strong>{node.label}</strong><span className="text-xs text-jtext-3">{isBranch ? `${children.length} ילדים` : `${(node.fields || []).filter(f => f.enabled !== false).length} שדות גלובליים`}</span>
      <span className="text-xs text-jtext-2">{node.active === false ? 'לא פעילה' : 'פעילה'}</span>
      <button type="button" aria-label="העלה קטגוריה" disabled={busy} onClick={() => move(-1)}>↑</button><button type="button" aria-label="הורד קטגוריה" disabled={busy} onClick={() => move(1)}>↓</button>
      {copyable && <button type="button" className="text-xs font-bold underline text-brand-primary" onClick={copyLink}>העתק קישור קמפיין</button>}
      <Btn variant="soft" disabled={busy} onClick={() => onEdit(node)}>עריכה</Btn><Btn variant="soft" disabled={busy} onClick={() => onToggle(node)}>{node.active === false ? 'הפעל' : 'השבת'}</Btn>
      {isBranch && <><Btn variant="soft" onClick={() => setExpanded(v => !v)}>{expanded ? 'סגור' : 'הצג ילדים'}</Btn><Btn variant="soft" onClick={() => onAdd(node.category_key)}>הוסף שירות</Btn></>}
    </div>
    {node.description && <p className="text-sm text-jtext-3">{node.description}</p>}
    {expanded && <div className="ps-4 space-y-2">{children.map(child => <GlobalTreeBranch key={child.id} node={child} rows={rows} siblings={children} busy={busy} onEdit={onEdit} onToggle={onToggle} onReorder={onReorder} onAdd={onAdd} />)}{!children.length && <p className="text-sm text-jtext-3">אין שירותים, הוסיפו שירות גלובלי.</p>}</div>}
  </div>;
}