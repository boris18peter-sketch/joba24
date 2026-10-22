import { useState } from 'react';
import { ArrowUp, ArrowDown, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { Field, IconBtn } from '@/components/admin/brand/brandUi';
import GlobalOptionsEditor from '@/components/admin/categories/GlobalOptionsEditor';

/**
 * ONE question in a category's task form.
 *
 * The form used to be a column of fully-open field editors, so a category with
 * eight questions was eight screens of inputs and finding the third one meant
 * scrolling past the first two. Each field is now a CARD that summarises itself
 * — its place in the order, the question, its kind, whether it is required —
 * and opens only when it is being edited. A new field opens by itself, because
 * an empty card would otherwise be invisible.
 *
 * `options` is the list behind a choice field: the pills the visitor presses.
 * It has its own editor so adding, renaming, reordering and deleting an option
 * are separate actions rather than one comma-separated line to retype.
 */

const TYPES = [
  ['text', 'טקסט'],
  ['textarea', 'טקסט ארוך'],
  ['number', 'מספר'],
  ['select', 'בחירה אחת (רשימה)'],
  ['multiselect', 'בחירה מרובה (כפתורים)'],
  ['boolean', 'כן / לא'],
  ['date', 'תאריך'],
  ['time', 'שעה'],
];
const TYPE_LABEL = Object.fromEntries(TYPES);
const HAS_OPTIONS = ['select', 'multiselect'];

export default function GlobalFieldEditor({ field: f, index, onChange, onMove, onRemove }) {
  const [open, setOpen] = useState(!f.label);
  const options = f.options || [];

  const summary = [
    TYPE_LABEL[f.type] || f.type,
    HAS_OPTIONS.includes(f.type) ? `${options.filter((o) => String(o || '').trim()).length} אפשרויות` : null,
    f.required ? 'חובה' : null,
    f.enabled === false ? 'כבוי' : null,
  ].filter(Boolean).join(' · ');

  return (
    <div className="rounded-lg border border-jborder-1 bg-surface-1">
      {/* ── Summary — the whole field, one line, always readable ── */}
      <div className="flex gap-2 items-center p-2.5">
        <span className="text-xs font-bold text-jtext-3" style={{ width: 16, flexShrink: 0 }}>{index + 1}</span>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex-1 text-start min-w-0"
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          <span className="font-bold text-sm">{f.label || 'שדה ללא שם'}</span>
          <span className="text-xs text-jtext-3"> · {summary}</span>
        </button>
        <IconBtn title="העלה שדה" disabled={index === 0} onClick={() => onMove(-1)}><ArrowUp size={14} /></IconBtn>
        <IconBtn title="הורד שדה" onClick={() => onMove(1)}><ArrowDown size={14} /></IconBtn>
        <IconBtn title={open ? 'סגור' : 'עריכה'} onClick={() => setOpen((v) => !v)}>
          {open ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        </IconBtn>
        <IconBtn title="הסר שדה" danger onClick={onRemove}><Trash2 size={15} /></IconBtn>
      </div>

      {open && (
        <div className="p-3 pt-0 space-y-3 border-t border-jborder-1">
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="השאלה שמוצגת ללקוח">
              <input className="j-input p-2" value={f.label || ''} onChange={(e) => onChange({ label: e.target.value })} placeholder="למשל: מה צריך?" />
            </Field>
            <Field
              label="מזהה פנימי"
              hint="המזהה נשמר עם כל משימה שפורסמה. שינוי שלו מנתק את התשובות שנשמרו במשימות קיימות."
            >
              <input className="j-input p-2" dir="ltr" value={f.key} onChange={(e) => onChange({ key: e.target.value })} placeholder="field_key" />
            </Field>
          </div>

          <Field label="טקסט עזר (אופציונלי)">
            <input className="j-input p-2" value={f.description || ''} onChange={(e) => onChange({ description: e.target.value })} placeholder="הסבר קצר מתחת לשאלה" />
          </Field>

          <div className="grid sm:grid-cols-2 gap-3 items-end">
            <Field label="סוג השדה">
              <select className="j-input p-2" value={f.type} onChange={(e) => onChange({ type: e.target.value })}>
                {TYPES.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
              </select>
            </Field>
            <div className="flex gap-4 items-center pb-2">
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!f.required} onChange={(e) => onChange({ required: e.target.checked })} /> חובה</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.enabled !== false} onChange={(e) => onChange({ enabled: e.target.checked })} /> פעיל</label>
            </div>
          </div>

          {HAS_OPTIONS.includes(f.type) && (
            <GlobalOptionsEditor options={options} type={f.type} onChange={(v) => onChange({ options: v })} />
          )}

          {f.type === 'number' && (
            <div className="grid grid-cols-2 gap-3">
              {['min', 'max'].map((k) => (
                <Field key={k} label={k === 'min' ? 'מינימום' : 'מקסימום'}>
                  <input className="j-input p-2" type="number" value={f.validation?.[k] ?? ''} onChange={(e) => onChange({ validation: { ...f.validation, [k]: e.target.value } })} />
                </Field>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}