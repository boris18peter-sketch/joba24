import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Btn, Field } from '@/components/admin/brand/brandUi';
import GlobalFormEditor from '@/components/admin/categories/GlobalFormEditor';
import StatusFlowEditor from '@/components/admin/categories/StatusFlowEditor';
export default function GlobalCategoryEditor({ category, rows, onSaved, onClose }) {
  const [form,setForm] = useState({ node_type: 'service', parent_key: '', category_key: '', label: '', icon: '', image_url: '', description: '', active: true, fields: [], sort_order: 0, status_flow: null, ...category });
  const [busy,setBusy] = useState(false), [error,setError] = useState('');
  const set = (key,value) => setForm(f => ({ ...f,[key]:value }));
  const save = async () => {
    setBusy(true); setError('');
    try {
      const res = await base44.functions.invoke('adminManageGlobalCategory', { ...form, action: 'upsert' });
      if (!res.data?.success) throw new Error(res.data?.error);
      onSaved(res.data.category); onClose();
    } catch (e) { const code = e.response?.data?.error || e.message; setError(({ category_key_taken: 'המזהה כבר קיים', category_key_invalid: 'מזהה לא תקין', parent_required: 'בחרו קטגוריית אב', category_cycle: 'אי אפשר ליצור מעגל בהיררכיה', parent_invalid: 'קטגוריית האב אינה תקינה', field_keys_invalid: 'מזהי שדות חייבים להיות ייחודיים ותקינים', forms_belong_to_services: 'טפסים שייכים לשירותים בלבד', key_immutable: 'מזהה קיים אינו ניתן לשינוי', label_required: 'שם הוא שדה חובה' })[code] || 'לא נשמר. בדקו את הנתונים ונסו שוב.'); }
    finally { setBusy(false); }
  };
  return <div className="rounded-lg border border-jborder-2 bg-surface-2 p-4 space-y-3">
    <h3 className="font-bold">{form.id ? 'עריכת קטגוריה' : 'קטגוריה חדשה'}</h3>
    <div className="grid sm:grid-cols-2 gap-3">
      <Field label="סוג"><select className="j-input p-2" disabled={!!form.id} value={form.node_type} onChange={e => set('node_type',e.target.value)}><option value="group">קבוצה ויזואלית (לא קטגוריית משימה)</option><option value="root">קטגוריית שורש / נישה</option><option value="service">שירות / קטגוריה לביצוע</option></select></Field>
      <Field label="קטגוריית אב"><select className="j-input p-2" value={form.parent_key || ''} onChange={e => set('parent_key',e.target.value)}><option value="">ללא אב (לשורש בלבד)</option>{rows.filter(r => ['group','parent','root'].includes(r.node_type) && r.id !== form.id).map(r => <option key={r.id} value={r.category_key}>{r.label}</option>)}</select></Field>
      <Field label="מזהה קבוע"><input className="j-input p-2" dir="ltr" disabled={!!form.id} value={form.category_key} onChange={e => set('category_key',e.target.value.toLowerCase().replace(/[^a-z0-9_]/g,''))} /></Field>
      <Field label="שם"><input className="j-input p-2" value={form.label} onChange={e => set('label',e.target.value)} /></Field>
      <Field label="אייקון"><input className="j-input p-2" value={form.icon || ''} onChange={e => set('icon',e.target.value)} /></Field>
      <Field label="תמונה (קישור HTTPS)"><input className="j-input p-2" dir="ltr" value={form.image_url || ''} onChange={e => set('image_url',e.target.value)} /></Field>
      <Field label="תיאור"><input className="j-input p-2" value={form.description || ''} onChange={e => set('description',e.target.value)} /></Field>
      <Field label="סדר"><input className="j-input p-2" type="number" value={form.sort_order || 0} onChange={e => set('sort_order',Number(e.target.value))} /></Field>
    </div>
    <label className="flex gap-2"><input type="checkbox" checked={form.active !== false} onChange={e => set('active',e.target.checked)} /> פעילה בכל המותגים</label>
    {form.node_type === 'service' && <GlobalFormEditor fields={form.fields || []} onChange={v => set('fields',v)} />}
    {form.node_type === 'service' && <StatusFlowEditor flow={form.status_flow} onChange={v => set('status_flow',v)} />}
    {error && <p role="alert" className="text-destructive text-sm">{error}</p>}
    <div className="flex gap-2"><Btn loading={busy} onClick={save}>שמור גלובלית</Btn><Btn variant="soft" disabled={busy} onClick={onClose}>ביטול</Btn></div>
  </div>;
}