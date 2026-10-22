import { ArrowUp, ArrowDown, X, Plus } from 'lucide-react';
import { Btn, IconBtn } from '@/components/admin/brand/brandUi';

/**
 * The OPTION LIST of a choice field — the pills the visitor actually presses.
 *
 * This replaces the single comma-separated text box that used to hold them. That
 * box could not express order, could not show a mistake, and turned one missing
 * comma into two half-options — so the only way to fix a choice field was to
 * retype the whole list and hope. Each option is now its own row: add, rename,
 * reorder and delete are separate actions, and the preview underneath shows the
 * pills exactly as they render in the publish form.
 */
export default function GlobalOptionsEditor({ options = [], type, onChange }) {
  const update = (i, value) => onChange(options.map((o, j) => (j === i ? value : o)));
  const remove = (i) => onChange(options.filter((_, j) => j !== i));
  const move = (i, dir) => {
    const j = i + dir;
    if (j < 0 || j >= options.length) return;
    const next = [...options];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  const add = () => onChange([...options, '']);

  const named = options.filter((o) => String(o || '').trim());

  return (
    <div className="rounded-lg border border-jborder-1 bg-surface-2 p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold text-jtext-2">
          {type === 'multiselect' ? 'אפשרויות — הכפתורים שיופיעו בטופס' : 'אפשרויות הבחירה'}
        </span>
        <span className="text-xs text-jtext-3">{named.length} אפשרויות</span>
      </div>

      {options.map((option, i) => (
        <div key={i} className="flex gap-1 items-center">
          <span className="text-xs text-jtext-3" style={{ width: 16, flexShrink: 0 }}>{i + 1}</span>
          <input
            className="j-input p-2 flex-1"
            value={option}
            onChange={(e) => update(i, e.target.value)}
            placeholder="הטקסט שעל הכפתור"
          />
          <IconBtn title="העלה אפשרות" disabled={i === 0} onClick={() => move(i, -1)}><ArrowUp size={14} /></IconBtn>
          <IconBtn title="הורד אפשרות" disabled={i === options.length - 1} onClick={() => move(i, 1)}><ArrowDown size={14} /></IconBtn>
          <IconBtn title="הסר אפשרות" danger onClick={() => remove(i)}><X size={15} /></IconBtn>
        </div>
      ))}

      {!options.length && (
        <p className="text-xs text-jtext-3">אין אפשרויות. הוסיפו לפחות אחת — בלעדיה השדה יופיע ריק בטופס.</p>
      )}

      <Btn variant="soft" onClick={add} style={{ height: 34, fontSize: 12 }}>
        <Plus size={14} /> הוסף אפשרות
      </Btn>

      {named.length > 0 && (
        <div className="pt-2 border-t border-jborder-1">
          <div className="text-xs text-jtext-3 mb-2">תצוגה מקדימה — כך זה ייראה בטופס</div>
          <div className="flex flex-wrap gap-2">
            {named.map((option, i) => (
              <span
                key={i}
                style={{
                  padding: '9px 14px', borderRadius: 20, fontSize: 13, fontWeight: 700,
                  border: '1.5px solid var(--border-1)',
                  background: 'var(--surface-1)',
                  color: 'var(--text-2)',
                }}
              >
                {option}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}