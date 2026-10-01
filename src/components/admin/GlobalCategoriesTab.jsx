import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import {
  Plus, ChevronUp, ChevronDown, Trash2, Pencil, Check, X, RefreshCw, ListPlus, Globe2,
} from 'lucide-react';
import { Section, Field, inputStyle, Pill, Btn, card, mono, SaveBar } from '@/components/admin/brand/brandUi';
import { fetchGlobalCategories, globalFormFields } from '@/lib/brand/globalCategories';

/**
 * Global Categories — Platform Admin → Categories.
 *
 * THE authoritative place for the marketplace category definitions and their
 * TASK FORMS. One definition per category, shared by every Brand.
 *
 * Improving the Events form here improves it for Joba24, Save A Date and every
 * future Brand that offers Events — with no per-Brand work.
 *
 * A Brand never owns a form; it only chooses which of these categories to offer
 * (Brand → Categories).
 */

const FIELD_TYPES = [
  ['text', 'טקסט'], ['textarea', 'טקסט ארוך'], ['number', 'מספר'],
  ['select', 'בחירה'], ['multiselect', 'בחירה מרובה'], ['boolean', 'כן/לא'],
  ['date', 'תאריך'], ['time', 'שעה'],
];

const iconBtn = {
  width: 32, height: 32, borderRadius: 8, border: '1px solid var(--border-1)',
  background: 'var(--surface-1)', cursor: 'pointer', display: 'flex',
  alignItems: 'center', justifyContent: 'center', flexShrink: 0,
};
const checkLabel = {
  display: 'flex', alignItems: 'center', gap: 5, fontSize: 11,
  fontWeight: 700, color: 'var(--text-2)', cursor: 'pointer', whiteSpace: 'nowrap',
};

/** The global task form editor — one definition, every Brand inherits it. */
function FormEditor({ fields, onChange }) {
  const list = fields || [];

  const update = (i, patch) => onChange(list.map((f, idx) => (idx === i ? { ...f, ...patch } : f)));
  const move = (i, dir) => {
    const next = [...list];
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next.map((f, idx) => ({ ...f, order: idx })));
  };
  const add = () => onChange([...list, {
    key: `field_${list.length + 1}`, label: '', description: '', type: 'text',
    required: false, enabled: true, order: list.length, options: [],
  }]);
  const remove = (i) => onChange(list.filter((_, idx) => idx !== i));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ fontSize: 12, color: 'var(--text-3)', lineHeight: 1.6 }}>
        שדות אלה יוצגו בטופס יצירת המשימה של <b>כל מותג</b> שמציע את הקטגוריה הזו.
      </div>

      {list.length === 0 && (
        <div style={{ fontSize: 12, color: 'var(--text-3)' }}>לא הוגדרו שדות. הטופס יהיה הטופס הבסיסי של הפלטפורמה.</div>
      )}

      {list.map((f, i) => (
        <div key={i} style={{ ...card, padding: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <input
              style={{ ...inputStyle, height: 36, flex: 1, fontSize: 12, ...mono }}
              value={f.key}
              onChange={(e) => update(i, { key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })}
              placeholder="field_key"
            />
            <button onClick={() => move(i, -1)} style={iconBtn}><ChevronUp size={14} /></button>
            <button onClick={() => move(i, 1)} style={iconBtn}><ChevronDown size={14} /></button>
            <button onClick={() => remove(i)} style={iconBtn}><Trash2 size={14} color="#991b1b" /></button>
          </div>
          <input
            style={{ ...inputStyle, height: 36, fontSize: 12 }}
            value={f.label}
            onChange={(e) => update(i, { label: e.target.value })}
            placeholder="שאלה שתוצג למפרסם"
          />
          <input
            style={{ ...inputStyle, height: 36, fontSize: 12 }}
            value={f.description || ''}
            onChange={(e) => update(i, { description: e.target.value })}
            placeholder="טקסט עזר (אופציונלי)"
          />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 8, alignItems: 'center' }}>
            <select
              style={{ ...inputStyle, height: 36, fontSize: 12 }}
              value={f.type}
              onChange={(e) => update(i, { type: e.target.value })}
            >
              {FIELD_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <label style={checkLabel}>
              <input type="checkbox" checked={f.required === true} onChange={(e) => update(i, { required: e.target.checked })} />
              חובה
            </label>
            <label style={checkLabel}>
              <input type="checkbox" checked={f.enabled !== false} onChange={(e) => update(i, { enabled: e.target.checked })} />
              פעיל
            </label>
          </div>
          {(f.type === 'select' || f.type === 'multiselect') && (
            <input
              style={{ ...inputStyle, height: 36, fontSize: 12 }}
              value={(f.options || []).join(', ')}
              onChange={(e) => update(i, { options: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
              placeholder="אפשרויות מופרדות בפסיק"
            />
          )}
          {(f.type === 'number') && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <input
                type="number" style={{ ...inputStyle, height: 36, fontSize: 12 }}
                value={f.validation?.min ?? ''}
                onChange={(e) => update(i, { validation: { ...(f.validation || {}), min: e.target.value } })}
                placeholder="מינימום"
              />
              <input
                type="number" style={{ ...inputStyle, height: 36, fontSize: 12 }}
                value={f.validation?.max ?? ''}
                onChange={(e) => update(i, { validation: { ...(f.validation || {}), max: e.target.value } })}
                placeholder="מקסימום"
              />
            </div>
          )}
        </div>
      ))}

      <Btn variant="soft" onClick={add} style={{ height: 36, fontSize: 12, alignSelf: 'flex-start' }}>
        <ListPlus size={14} /> הוסף שדה
      </Btn>
    </div>
  );
}

export default function GlobalCategoriesTab() {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(null);
  const [editing, setEditing] = useState(null);
  const [state, setState] = useState('idle');

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['globalCategories'],
    queryFn: fetchGlobalCategories,
  });

  const sorted = useMemo(
    () => rows.slice().sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)),
    [rows],
  );

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['globalCategories'] });

  const invoke = async (payload) => {
    const res = await base44.functions.invoke('adminManageGlobalCategory', payload);
    return res?.data;
  };

  const errText = (code) =>
    code === 'category_key_taken' ? 'המזהה כבר קיים'
      : code === 'category_key_invalid' ? 'מזהה קטגוריה לא תקין'
      : code === 'category_in_use' ? 'קטגוריה בשימוש אצל מותגים — יש להשבית במקום למחוק'
      : 'הפעולה נכשלה';

  const act = (key) => async (payload, okMsg) => {
    setBusy(key);
    try {
      const data = await invoke(payload);
      if (!data?.success) { toast.error(errText(data?.error)); return null; }
      refresh();
      if (okMsg) toast.success(okMsg);
      return data;
    } catch (e) {
      toast.error('הפעולה נכשלה');
      return null;
    } finally {
      setBusy(null);
    }
  };

  const openNew = () => {
    setEditing({ id: null, category_key: '', label: '', icon: '', description: '', active: true, fields: [] });
    setState('idle');
  };

  const save = async () => {
    const e = editing;
    if (!e.category_key.trim()) { toast.error('יש להזין מזהה קטגוריה'); return; }
    setState('saving');
    const data = await act('save')({
      action: 'upsert',
      id: e.id || undefined,
      category_key: e.category_key.trim(),
      label: e.label,
      icon: e.icon,
      description: e.description,
      active: e.active !== false,
      fields: e.fields,
    }, e.id ? 'הקטגוריה עודכנה — כל המותגים עודכנו' : 'הקטגוריה נוספה');
    if (data) { setEditing(null); setState('saved'); }
    else setState('error');
  };

  const setEdit = (patch) => { setEditing((e) => ({ ...e, ...patch })); setState('dirty'); };

  if (isLoading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><RefreshCw size={22} className="animate-spin" color="var(--text-3)" /></div>;
  }

  return (
    <>
      <Section
        title="קטלוג הקטגוריות הגלובלי"
        desc="המקום הקובע להגדרת קטגוריות השוק ולטופס המשימה שלהן. קטגוריה מוגדרת פעם אחת ומשותפת לכל המותגים."
        actions={
          <div style={{ display: 'flex', gap: 6 }}>
            <Btn variant="soft" loading={busy === 'seed'}
              onClick={() => act('seed')({ action: 'seed' }, 'הקטלוג סונכרן')}
              style={{ height: 36, fontSize: 12 }}>
              <RefreshCw size={14} /> סנכרן מהפלטפורמה
            </Btn>
            <Btn onClick={openNew} style={{ height: 36, fontSize: 13 }}>
              <Plus size={15} /> קטגוריה
            </Btn>
          </div>
        }
      >
        <div style={{
          background: 'var(--surface-1)', border: '1px solid var(--border-1)',
          borderRadius: 12, padding: 12, display: 'flex', gap: 9, alignItems: 'flex-start',
        }}>
          <Globe2 size={15} color="var(--text-3)" style={{ flexShrink: 0, marginTop: 1 }} />
          <div style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.65 }}>
            שיפור טופס הקטגוריה כאן מתעדכן מיד בכל מותג שמציע אותה — Joba24, מותגי שותפים וכל מותג עתידי.
            אין צורך לשכפל טופס לכל מותג.
          </div>
        </div>

        {editing && (
          <div style={{ ...card, padding: 13, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 14, fontWeight: 900, color: 'var(--text-1)' }}>
                {editing.id ? 'עריכת קטגוריה גלובלית' : 'קטגוריה גלובלית חדשה'}
              </div>
              <button onClick={() => setEditing(null)} style={iconBtn}><X size={15} /></button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px', gap: 8 }}>
              <Field label="מזהה (key) *" hint="אותיות קטנות, ספרות וקו תחתון.">
                <input
                  style={{ ...inputStyle, ...mono }}
                  value={editing.category_key}
                  onChange={(e) => setEdit({ category_key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })}
                  placeholder="wedding_photography"
                />
              </Field>
              <Field label="אייקון">
                <input style={inputStyle} value={editing.icon} placeholder="📸"
                  onChange={(e) => setEdit({ icon: e.target.value })} />
              </Field>
            </div>

            <Field label="שם הקטגוריה">
              <input style={inputStyle} value={editing.label}
                onChange={(e) => setEdit({ label: e.target.value })} placeholder="צילום חתונות" />
            </Field>

            <Field label="תיאור" hint="יוצג למפרסם בבחירת הקטגוריה.">
              <input style={inputStyle} value={editing.description}
                onChange={(e) => setEdit({ description: e.target.value })} />
            </Field>

            <label style={{ ...checkLabel, fontSize: 12 }}>
              <input type="checkbox" checked={editing.active !== false}
                onChange={(e) => setEdit({ active: e.target.checked })} />
              פעילה בכל הפלטפורמה
            </label>

            <div style={{ borderTop: '1px solid var(--border-1)', paddingTop: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-1)', marginBottom: 8 }}>
                טופס המשימה הגלובלי
              </div>
              <FormEditor fields={editing.fields} onChange={(fields) => setEdit({ fields })} />
            </div>

            <SaveBar state={state} onSave={save} label="שמור קטגוריה" />
          </div>
        )}

        {sorted.map((c, i) => {
          const fieldCount = globalFormFields(c).length;
          const inactive = c.active === false;
          return (
            <div key={c.id} style={{ ...card, padding: 11, display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap', opacity: inactive ? 0.62 : 1 }}>
              <span style={{ fontSize: 15 }}>{c.icon || ''}</span>
              <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-1)' }}>
                {c.label || c.category_key}
              </span>
              <span style={{ fontSize: 11, color: 'var(--text-3)', ...mono }}>{c.category_key}</span>
              {inactive ? <Pill tone="amber">לא פעילה</Pill> : <Pill tone="green">פעילה</Pill>}
              {fieldCount > 0 && <Pill tone="blue">{fieldCount} שדות גלובליים</Pill>}

              <span style={{ flex: 1 }} />

              <button onClick={() => act(`reorder:${c.id}`)({ action: 'reorder', order: sorted.map((x, xi) => ({ id: x.id, sort_order: xi })) })} style={{ display: 'none' }} />
              <button
                onClick={() => {
                  const next = [...sorted];
                  if (i === 0) return;
                  [next[i - 1], next[i]] = [next[i], next[i - 1]];
                  act('reorder')({ action: 'reorder', order: next.map((x, xi) => ({ id: x.id, sort_order: xi })) });
                }}
                disabled={i === 0} style={{ ...iconBtn, opacity: i === 0 ? 0.4 : 1 }}>
                <ChevronUp size={14} />
              </button>
              <button
                onClick={() => {
                  const next = [...sorted];
                  if (i === sorted.length - 1) return;
                  [next[i + 1], next[i]] = [next[i], next[i + 1]];
                  act('reorder')({ action: 'reorder', order: next.map((x, xi) => ({ id: x.id, sort_order: xi })) });
                }}
                disabled={i === sorted.length - 1}
                style={{ ...iconBtn, opacity: i === sorted.length - 1 ? 0.4 : 1 }}>
                <ChevronDown size={14} />
              </button>
              <Btn variant="soft" loading={busy === `toggle:${c.id}`}
                onClick={() => act(`toggle:${c.id}`)({ action: 'toggle', id: c.id }, 'הסטטוס עודכן')}
                style={{ height: 32, fontSize: 12 }}>
                {inactive ? 'הפעל' : 'השבת'}
              </Btn>
              <Btn variant="soft"
                onClick={() => { setEditing({ ...c, fields: c.fields || [] }); setState('idle'); }}
                style={{ height: 32, fontSize: 12 }}>
                <Pencil size={13} /> עריכה
              </Btn>
              <Btn variant="danger" loading={busy === `remove:${c.id}`}
                onClick={() => { if (window.confirm(`למחוק את ${c.label || c.category_key} מהקטלוג הגלובלי?`)) act(`remove:${c.id}`)({ action: 'remove', id: c.id }, 'הקטגוריה נמחקה'); }}
                style={{ height: 32, fontSize: 12 }}>
                <Trash2 size={13} />
              </Btn>
            </div>
          );
        })}

        {sorted.length === 0 && (
          <div style={{ fontSize: 13, color: 'var(--text-3)', textAlign: 'center', padding: 20 }}>
            הקטלוג ריק. לחץ "סנכרן מהפלטפורמה" כדי להתחיל מקטגוריות ברירת המחדל.
          </div>
        )}
      </Section>

      {!editing && <div style={{ height: 4 }} />}
      <div style={{ display: 'none' }}><Check size={1} /></div>
    </>
  );
}