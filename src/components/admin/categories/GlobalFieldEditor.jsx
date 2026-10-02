import { Field } from '@/components/admin/brand/brandUi';
export default function GlobalFieldEditor({ field: f, onChange, onMove, onRemove }) {
  return <div className="rounded-lg border border-jborder-1 bg-surface-1 p-3 space-y-2">
    <div className="flex gap-2 flex-wrap">
      <input className="j-input p-2 flex-1" aria-label="מזהה שדה" value={f.key} onChange={e => onChange({ key: e.target.value })} placeholder="field_key" dir="ltr" />
      <button type="button" onClick={() => onMove(-1)} aria-label="העלה שדה">↑</button><button type="button" onClick={() => onMove(1)} aria-label="הורד שדה">↓</button><button type="button" onClick={onRemove}>הסר שדה</button>
    </div>
    <input className="j-input p-2" value={f.label || ''} onChange={e => onChange({ label: e.target.value })} placeholder="שם / שאלה" />
    <input className="j-input p-2" value={f.description || ''} onChange={e => onChange({ description: e.target.value })} placeholder="טקסט עזר" />
    <div className="flex gap-3 flex-wrap items-center">
      <select className="j-input p-2 w-auto" value={f.type} onChange={e => onChange({ type: e.target.value })}>
        {[['text','טקסט'],['textarea','טקסט ארוך'],['number','מספר'],['select','בחירה'],['multiselect','בחירה מרובה'],['boolean','כן/לא'],['date','תאריך'],['time','שעה']].map(([key,label]) => <option key={key} value={key}>{label}</option>)}
      </select>
      <label><input type="checkbox" checked={!!f.required} onChange={e => onChange({ required: e.target.checked })} /> חובה</label>
      <label><input type="checkbox" checked={f.enabled !== false} onChange={e => onChange({ enabled: e.target.checked })} /> פעיל</label>
    </div>
    {['select','multiselect'].includes(f.type) && <input className="j-input p-2" value={(f.options || []).join(', ')} onChange={e => onChange({ options: e.target.value.split(',').map(v => v.trim()).filter(Boolean) })} placeholder="אפשרויות מופרדות בפסיק" />}
    {f.type === 'number' && <div className="grid grid-cols-2 gap-2">{['min','max'].map(k => <Field key={k} label={k === 'min' ? 'מינימום' : 'מקסימום'}><input className="j-input p-2" type="number" value={f.validation?.[k] ?? ''} onChange={e => onChange({ validation: { ...f.validation, [k]: e.target.value } })} /></Field>)}</div>}
  </div>;
}