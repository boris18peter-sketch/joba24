import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import {
  Plus, ChevronUp, ChevronDown, Trash2, Pencil, Check, X, RefreshCw, ListPlus,
} from 'lucide-react';
import { Section, Field, inputStyle, Pill, Btn, card, mono } from '@/components/admin/brand/brandUi';
import { PLATFORM_CATEGORY_KEYS, platformCategoryLabel } from '@/lib/brand/brandCategories';

const FIELD_TYPES = [
  ['text', 'טקסט'], ['textarea', 'טקסט ארוך'], ['number', 'מספר'],
  ['select', 'בחירה'], ['multiselect', 'בחירה מרובה'], ['boolean', 'כן/לא'],
  ['date', 'תאריך'], ['time', 'שעה'],
];

/** Per-category task-form fields — the practical, supported shape. */
function FormConfigEditor({ value, onChange }) {
  const fields = value?.fields || [];

  const update = (i, patch) => onChange({
    fields: fields.map((f, idx) => (idx === i ? { ...f, ...patch } : f)),
  });
  const move = (i, dir) => {
    const next = [...fields];
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    onChange({ fields: next.map((f, idx) => ({ ...f, order: idx })) });
  };
  const add = () => onChange({
    fields: [...fields, {
      key: `field_${fields.length + 1}`, label: '', type: 'text',
      required: false, enabled: true, order: fields.length, options: [],
    }],
  });
  const remove = (i) => onChange({ fields: fields.filter((_, idx) => idx !== i) });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ fontSize: 12, color: 'var(--text-3)', lineHeight: 1.6 }}>
        שדות אלה יוצגו בטופס יצירת המשימה של המותג, מתחת לשדות הקטגוריה הרגילים.
      </div>

      {fields.length === 0 && (
        <div style={{ fontSize: 12, color: 'var(--text-3)' }}>לא הוגדרו שדות מותאמים לקטגוריה זו.</div>
      )}

      {fields.map((f, i) => (
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
            placeholder="תווית שתוצג למשתמש"
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
        </div>
      ))}

      <Btn variant="soft" onClick={add} style={{ height: 36, fontSize: 12, alignSelf: 'flex-start' }}>
        <ListPlus size={14} /> הוסף שדה
      </Btn>
    </div>
  );
}

const iconBtn = {
  width: 32, height: 32, borderRadius: 8, border: '1px solid var(--border-1)',
  background: 'var(--surface-1)', cursor: 'pointer', display: 'flex',
  alignItems: 'center', justifyContent: 'center', flexShrink: 0,
};
const checkLabel = {
  display: 'flex', alignItems: 'center', gap: 5, fontSize: 11,
  fontWeight: 700, color: 'var(--text-2)', cursor: 'pointer', whiteSpace: 'nowrap',
};

export default function BrandCategoriesTab({ brand, categories }) {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(null);
  const [editing, setEditing] = useState(null); // { id | null, category_key, label, icon, form_config }
  const [adding, setAdding] = useState(false);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['adminBrandCategories', brand.id] });

  const invoke = async (payload) => {
    const res = await base44.functions.invoke('adminManageCategory', { brand_id: brand.id, ...payload });
    return res?.data;
  };

  const act = (key) => async (payload, okMsg) => {
    setBusy(key);
    try {
      const data = await invoke(payload);
      if (!data?.success) {
        toast.error(
          data?.error === 'category_key_taken' ? 'המזהה כבר קיים במותג'
            : data?.error === 'category_key_invalid' ? 'מזהה קטגוריה לא תקין'
            : data?.error === 'category_in_use' ? 'הקטגוריה בשימוש במשימות — יש להשבית במקום למחוק'
            : 'הפעולה נכשלה'
        );
        return null;
      }
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

  const reorder = async (index, dir) => {
    const list = [...categories];
    const j = index + dir;
    if (j < 0 || j >= list.length) return;
    [list[index], list[j]] = [list[j], list[index]];
    await act('reorder')({ action: 'reorder', order: list.map((c, i) => ({ id: c.id, sort_order: i })) });
  };

  const openNew = () => {
    setEditing({ id: null, category_key: '', label: '', icon: '', enabled: true, form_config: { fields: [] } });
    setAdding(true);
  };

  const saveEditing = async () => {
    const e = editing;
    if (!e.category_key.trim()) { toast.error('יש להזין מזהה קטגוריה'); return; }
    const data = await act('save')({
      action: 'upsert',
      id: e.id || undefined,
      category_key: e.category_key.trim(),
      label: e.label,
      icon: e.icon,
      enabled: e.enabled !== false,
      form_config: e.form_config,
    }, e.id ? 'הקטגוריה עודכנה' : 'הקטגוריה נוספה');
    if (data) { setEditing(null); setAdding(false); }
  };

  const setEdit = (patch) => setEditing((e) => ({ ...e, ...patch }));

  return (
    <>
      <Section
        title="קטגוריות"
        desc="BrandCategory הוא המקור הקובע לקטגוריות שהמותג מציע. קטגוריה מושבתת לא תוצג ולא תיבחר ביצירת משימה."
        actions={
          <div style={{ display: 'flex', gap: 6 }}>
            <Btn variant="soft" loading={busy === 'sync'}
              onClick={() => act('sync')({ action: 'sync_platform' }, 'הקטגוריות סונכרנו')}
              style={{ height: 36, fontSize: 12 }}>
              <RefreshCw size={14} /> סנכרן מ-Joba24
            </Btn>
            <Btn onClick={openNew} style={{ height: 36, fontSize: 13 }}>
              <Plus size={15} /> קטגוריה
            </Btn>
          </div>
        }
      >
        {(adding || editing) && (
          <div style={{ ...card, padding: 13, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 14, fontWeight: 900, color: 'var(--text-1)' }}>
                {editing?.id ? 'עריכת קטגוריה' : 'קטגוריה חדשה'}
              </div>
              <button onClick={() => { setEditing(null); setAdding(false); }} style={iconBtn}>
                <X size={15} />
              </button>
            </div>

            <Field
              label="מזהה קטגוריה (key) *"
              hint={editing && PLATFORM_CATEGORY_KEYS.includes(editing.category_key)
                ? 'קטגוריית Joba24 קיימת.'
                : 'מזהה חדש שאינו של Joba24 — יישמר על המשימה כ"אחר" עם שמירת מזהה המותג.'}
            >
              <input
                style={{ ...inputStyle, ...mono }}
                value={editing?.category_key || ''}
                onChange={(e) => setEdit({ category_key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })}
                placeholder="wedding_photography"
              />
            </Field>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px', gap: 8 }}>
              <Field label="תווית תצוגה" hint={`ברירת מחדל: ${platformCategoryLabel(editing?.category_key || '')}`}>
                <input style={inputStyle} value={editing?.label || ''} onChange={(e) => setEdit({ label: e.target.value })} />
              </Field>
              <Field label="אייקון">
                <input style={inputStyle} value={editing?.icon || ''} onChange={(e) => setEdit({ icon: e.target.value })} placeholder="📸" />
              </Field>
            </div>

            <div style={{ borderTop: '1px solid var(--border-1)', paddingTop: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-1)', marginBottom: 8 }}>
                שדות טופס למשימה בקטגוריה זו
              </div>
              <FormConfigEditor
                value={editing?.form_config}
                onChange={(fc) => setEdit({ form_config: fc })}
              />
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <Btn onClick={saveEditing} loading={busy === 'save'}>
                <Check size={15} /> שמור
              </Btn>
              <Btn variant="soft" onClick={() => { setEditing(null); setAdding(false); }}>ביטול</Btn>
            </div>
          </div>
        )}

        {categories.length === 0 && !adding && (
          <div style={{ fontSize: 13, color: 'var(--text-3)', textAlign: 'center', padding: 20 }}>
            לא הוגדרו קטגוריות למותג זה
          </div>
        )}

        {categories.map((c, i) => {
          const fieldCount = (c.form_config?.fields || []).filter((f) => f.enabled !== false).length;
          const disabled = c.enabled === false;
          return (
            <div key={c.id} style={{ ...card, padding: 11, display: 'flex', flexDirection: 'column', gap: 8, opacity: disabled ? 0.6 : 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 15 }}>{c.icon || ''}</span>
                <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-1)' }}>
                  {c.label || platformCategoryLabel(c.category_key)}
                </span>
                <span style={{ fontSize: 11, color: 'var(--text-3)', ...mono }}>{c.category_key}</span>
                {!PLATFORM_CATEGORY_KEYS.includes(c.category_key) && <Pill tone="blue">מותג</Pill>}
                {fieldCount > 0 && <Pill tone="gray">{fieldCount} שדות</Pill>}
                {disabled && <Pill tone="amber">מושבת</Pill>}
              </div>

              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <button onClick={() => reorder(i, -1)} disabled={i === 0} style={{ ...iconBtn, opacity: i === 0 ? 0.4 : 1 }}>
                  <ChevronUp size={14} />
                </button>
                <button onClick={() => reorder(i, 1)} disabled={i === categories.length - 1}
                  style={{ ...iconBtn, opacity: i === categories.length - 1 ? 0.4 : 1 }}>
                  <ChevronDown size={14} />
                </button>
                <Btn variant="soft" onClick={() => act(`toggle:${c.id}`)({ action: 'toggle', id: c.id })}
                  style={{ height: 32, fontSize: 12 }}>
                  {disabled ? 'הפעל' : 'השבת'}
                </Btn>
                <Btn variant="soft"
                  onClick={() => { setEditing({ ...c, form_config: c.form_config || { fields: [] } }); setAdding(false); }}
                  style={{ height: 32, fontSize: 12 }}>
                  <Pencil size={13} /> עריכה
                </Btn>
                <Btn variant="danger" loading={busy === `remove:${c.id}`}
                  onClick={() => { if (window.confirm(`למחוק את ${c.label || c.category_key}?`)) act(`remove:${c.id}`)({ action: 'remove', id: c.id }, 'הקטגוריה נמחקה'); }}
                  style={{ height: 32, fontSize: 12 }}>
                  <Trash2 size={13} />
                </Btn>
              </div>
            </div>
          );
        })}
      </Section>
    </>
  );
}