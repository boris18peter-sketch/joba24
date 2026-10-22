import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Btn } from '@/components/admin/brand/brandUi';
import GlobalFieldEditor from '@/components/admin/categories/GlobalFieldEditor';

/**
 * The task form of ONE category — its questions, in order.
 *
 * Fields are added by first choosing the KIND of question, because that is the
 * decision that shapes everything else: a choice field needs options, a number
 * needs a range, a yes/no needs neither. Picking it up front means the new card
 * opens with the right controls already in it, instead of being added as text
 * and then converted.
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

const uniqueKey = (base, taken) => {
  let i = 1;
  while (taken.has(`${base}_${i}`)) i += 1;
  return `${base}_${i}`;
};

export default function GlobalFormEditor({ fields = [], onChange }) {
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

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 items-center">
        <select className="j-input p-2" style={{ width: 'auto' }} value={addType} onChange={(e) => setAddType(e.target.value)} aria-label="סוג השדה החדש">
          {ADD_TYPES.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </select>
        <Btn variant="soft" onClick={add}><Plus size={15} /> הוסף שדה</Btn>
        {fields.length > 0 && <span className="text-xs text-jtext-3">{active} מתוך {fields.length} פעילים</span>}
      </div>

      {!fields.length && (
        <p className="text-sm text-jtext-2">אין שדות מותאמים. כרגע הטופס משתמש בשדות הפלטפורמה הבסיסיים (תיאור, מחיר, מיקום).</p>
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
    </div>
  );
}