import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Btn } from '@/components/admin/brand/brandUi';
import GlobalFieldEditor from '@/components/admin/categories/GlobalFieldEditor';
import CategoryFormPreview from '@/components/admin/categories/CategoryFormPreview';

/**
 * The task form of ONE category — its questions, in order.
 *
 * ── THE TWO KINDS OF QUESTION, AND WHY THEY ARE SHOWN TOGETHER ──────────────
 * A category's form is not only what is written here. A service inherits every
 * question its parent root asks and adds only what is genuinely its own, so a
 * form can be asking eight things while this editor lists two — and an admin
 * reading only this list concluded that the existing questions could not be
 * edited at all. The inherited questions are therefore listed explicitly, with
 * where they are edited, and the preview beside the editor shows the REAL form
 * the two of them add up to.
 *
 * ── AND WHY THERE IS A PREVIEW ──────────────────────────────────────────────
 * Fields are set through a list of settings, which means writing blind: the
 * question, its kind and its chips only reveal how they read once the form is
 * opened. The preview is built from the edits as they are being made, so
 * tailoring a category is a matter of looking at the result.
 *
 * Fields are added by first choosing the KIND of question, because that is the
 * decision that shapes everything else: a choice field needs options, a number
 * needs a range, a yes/no needs neither.
 */

const ADD_TYPES = [
  ['text', 'טקסט'],
  ['textarea', 'טקסט ארוך'],
  ['number', 'מספר'],
  ['select', 'בחירה אחת'],
  ['multiselect', 'בחירה מרובה (כפתורים)'],
  ['boolean', 'כן / לא'],
  ['date', 'תאריך'],
  ['time', 'שעה'],
];

const TYPE_LABEL = Object.fromEntries(ADD_TYPES);
const HAS_OPTIONS = ['select', 'multiselect'];

const uniqueKey = (base, taken) => {
  let i = 1;
  while (taken.has(`${base}_${i}`)) i += 1;
  return `${base}_${i}`;
};

export default function GlobalFormEditor({
  fields = [],
  onChange,
  inherited = [],
  parentLabel = '',
  onEditInherited,
  previewFields = [],
  categoryLabel = '',
}) {
  const [addType, setAddType] = useState('text');

  const update = (i, patch) => onChange(fields.map((f, j) => (j === i ? { ...f, ...patch } : f)));
  const remove = (i) => onChange(fields.filter((_, j) => j !== i).map((f, k) => ({ ...f, order: k })));
  const move = (i, dir) => {
    const next = [...fields];
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next.map((f, k) => ({ ...f, order: k })));
  };
  const add = () => {
    const key = uniqueKey(addType === 'multiselect' ? 'option' : addType, new Set(fields.map((f) => f.key)));
    onChange([...fields, { key, label: '', description: '', type: addType, required: false, enabled: true, order: fields.length, options: [] }]);
  };

  const active = fields.filter((f) => f.enabled !== false).length;
  const inheritedLabel = parentLabel ? `״${parentLabel}״` : 'קטגוריית האב';

  return (
    <div className="grid md:grid-cols-2 gap-4 items-start">
      {/* ── What this category asks itself ── */}
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2 items-center">
          <select className="j-input p-2" style={{ width: 'auto' }} value={addType} onChange={(e) => setAddType(e.target.value)} aria-label="סוג השאלה החדשה">
            {ADD_TYPES.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select>
          <Btn variant="soft" onClick={add}><Plus size={15} /> הוסף שאלה</Btn>
          {fields.length > 0 && <span className="text-xs text-jtext-3">{active} מתוך {fields.length} פעילות</span>}
        </div>

        {!fields.length && (
          <p className="text-sm text-jtext-2">
            אין לקטגוריה הזו שאלות משלה.
            {inherited.length
              ? ` כל השאלות שלה עוברות בירושה מ${inheritedLabel} ומופיעות למטה.`
              : ' כל שאלה שתוסיפו כאן תופיע בטופס של הקטגוריה הזו.'}
          </p>
        )}

        {fields.map((f, i) => (
          <GlobalFieldEditor
            key={i}
            index={i}
            field={f}
            onChange={(patch) => update(i, patch)}
            onMove={(dir) => move(i, dir)}
            onRemove={() => remove(i)}
          />
        ))}

        {fields.length > 0 && (
          <p className="text-xs text-jtext-3">
            הסדר כאן הוא הסדר שבו השאלות יופיעו בטופס. שירות יורש את שדות קטגוריית האב שלו, ולכן אין צורך לחזור על שאלות משותפות.
          </p>
        )}

        {/* ── The questions this category does NOT own ──
            A service's form is the parent's questions plus its own, so the
            inherited half has to be visible here — otherwise the editor lists
            fewer questions than the form asks and there is no way to tell why.
            They are edited at the parent, because that is where they live: they
            are asked by every service beneath it. */}
        {inherited.length > 0 && (
          <div className="rounded-lg border border-jborder-1 bg-surface-2 p-3 space-y-2">
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <div>
                <div className="text-xs font-bold text-jtext-2">
                  שאלות שעוברות בירושה מ{inheritedLabel}
                </div>
                <div className="text-xs text-jtext-3 mt-1 leading-relaxed">
                  הן נשאלות בכל השירותים שתחת {inheritedLabel}, ולכן נערכות שם. כאן הן מוצגות כדי שתדעו בדיוק מה הטופס ישאל בפועל.
                </div>
              </div>
              {onEditInherited && (
                <Btn variant="soft" onClick={onEditInherited} style={{ height: 34, fontSize: 12 }}>
                  ערוך ב{inheritedLabel}
                </Btn>
              )}
            </div>

            {inherited.map((f) => (
              <div key={f.key} className="flex items-center gap-2 text-sm pt-2 border-t border-jborder-1">
                <span className="font-bold">{f.label || f.key}</span>
                <span className="text-xs text-jtext-3">
                  {TYPE_LABEL[f.type] || f.type}
                  {f.required ? ' · חובה' : ''}
                  {HAS_OPTIONS.includes(f.type) ? ` · ${(f.options || []).filter((o) => String(o || '').trim()).length} אפשרויות` : ''}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── The form those two halves add up to ── */}
      <CategoryFormPreview fields={previewFields} categoryLabel={categoryLabel} />
    </div>
  );
}