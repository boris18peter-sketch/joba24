import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { base44 } from '@/api/base44Client';
import { X } from 'lucide-react';
import { Btn, Field } from '@/components/admin/brand/brandUi';
import EditorBlock from '@/components/admin/categories/EditorBlock';
import GlobalFormEditor from '@/components/admin/categories/GlobalFormEditor';
import StatusFlowEditor from '@/components/admin/categories/StatusFlowEditor';
import CategoryFeeEditor from '@/components/admin/categories/CategoryFeeEditor';
import { globalFormFields } from '@/lib/brand/globalCategories';

const ERRORS = {
  category_key_taken: 'המזהה כבר קיים',
  category_key_invalid: 'מזהה לא תקין',
  parent_required: 'בחרו קטגוריית אב',
  category_cycle: 'אי אפשר ליצור מעגל בהיררכיה',
  parent_invalid: 'קטגוריית האב אינה תקינה',
  field_keys_invalid: 'מזהי שדות חייבים להיות ייחודיים ותקינים',
  forms_belong_to_services: 'טפסים שייכים לשירותים בלבד',
  key_immutable: 'מזהה קיים אינו ניתן לשינוי',
  label_required: 'שם הוא שדה חובה',
};

/**
 * The editor for ONE category.
 *
 * ── WHY IT IS A FULL PANEL, NOT A BOX IN THE PAGE ───────────────────────────
 * It used to render inline, above the tree. Pressing "עריכה" on a category far
 * down the list therefore opened the editor OFF SCREEN, at the top of a page the
 * admin was not looking at, with nothing to say that anything had happened — so
 * the button read as broken. As a panel over the whole dashboard, the editor
 * appears where the eye already is, says what it is editing, and keeps Save in
 * reach the whole way down.
 *
 * ── AND WHY IT SHOWS THE FORM ───────────────────────────────────────────────
 * The form a category produces is the parent's questions plus its own, so the
 * editor states both and draws the result beside them, live. Its parts are
 * grouped into labelled blocks — identity, customer-facing content, the task
 * form, the status flow, the fee — so an admin opens a category and reads where
 * the thing they came to change lives, instead of scanning one long grid.
 */
export default function GlobalCategoryEditor({ category, rows, onSaved, onClose, onEdit }) {
  const [form, setForm] = useState({
    node_type: 'service', parent_key: '', category_key: '', label: '', icon: '', image_url: '',
    description: '', active: true, fields: [], sort_order: 0, status_flow: null, ...category,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  // A ROOT carries its own form too — the questions every service beneath it
  // inherits — so the form editor is shown for every node that can own a form.
  // Only a visual group has none.
  const canOwnForm = ['root', 'service'].includes(form.node_type);
  const fieldCount = (form.fields || []).length;

  // ── The form as it will ACTUALLY be built ────────────────────────────────
  // The catalogue map with the in-progress edits injected under this category's
  // key, so `globalFormFields` resolves the real, inherited, ordered form from
  // what is on screen right now — not from what was last saved. That is what
  // makes the preview live rather than a picture of the previous version.
  const map = useMemo(() => {
    const m = Object.fromEntries(rows.map((r) => [r.category_key, r]));
    if (form.category_key) m[form.category_key] = { ...(m[form.category_key] || {}), ...form, active: true };
    return m;
  }, [rows, form]);

  const mergedFields = useMemo(() => globalFormFields(map[form.category_key], map), [map, form.category_key]);
  const ownKeys = useMemo(() => new Set((form.fields || []).map((f) => f.key)), [form.fields]);
  const inheritedFields = useMemo(
    () => mergedFields.filter((f) => !ownKeys.has(f.key)),
    [mergedFields, ownKeys]
  );

  const parentRow = useMemo(() => rows.find((r) => r.category_key === form.parent_key) || null, [rows, form.parent_key]);

  const save = async () => {
    setBusy(true); setError('');
    try {
      const res = await base44.functions.invoke('adminManageGlobalCategory', { ...form, action: 'upsert' });
      if (!res.data?.success) throw new Error(res.data?.error);
      onSaved(res.data.category); onClose();
    } catch (e) {
      const code = e.response?.data?.error || e.message;
      setError(ERRORS[code] || 'לא נשמר. בדקו את הנתונים ונסו שוב.');
    } finally { setBusy(false); }
  };

  const title = form.id
    ? `עריכת קטגוריה — ${form.label || form.category_key}`
    : 'קטגוריה חדשה';

  return createPortal(
    <div dir="rtl" style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'var(--surface-1)', display: 'flex', flexDirection: 'column' }}>
      {/* ── The panel's own header: what is being edited, and how to finish ── */}
      <div style={{
        flexShrink: 0, display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 18px', background: 'var(--surface-2)', borderBottom: '1px solid var(--border-1)',
      }}>
        <button
          type="button"
          onClick={onClose}
          aria-label="סגור"
          style={{
            width: 36, height: 36, borderRadius: 11, flexShrink: 0,
            border: '1px solid var(--border-1)', background: 'var(--surface-1)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <X size={17} color="var(--text-2)" />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--text-1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {title}
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 1 }}>
            השינויים חלים על כל המותגים שמציעים את הקטגוריה. התצוגה המקדימה מתעדכנת תוך כדי העריכה.
          </div>
        </div>
        <Btn variant="soft" disabled={busy} onClick={onClose}>ביטול</Btn>
        <Btn loading={busy} onClick={save}>שמור גלובלית</Btn>
      </div>

      {/* ── Body ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '18px 18px 64px' }}>
        <div style={{ maxWidth: 1180, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 14 }}>

          <EditorBlock title="פרטי הקטגוריה" desc="איך הקטגוריה נקראת ואיפה היא יושבת בעץ. המזהה הקבוע נקבע פעם אחת ונשמר להיסטוריית המשימות.">
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="סוג">
                <select className="j-input p-2" disabled={!!form.id} value={form.node_type} onChange={(e) => set('node_type', e.target.value)}>
                  <option value="group">קבוצה ויזואלית (לא קטגוריית משימה)</option>
                  <option value="root">קטגוריית שורש / נישה</option>
                  <option value="service">שירות / קטגוריה לביצוע</option>
                </select>
              </Field>
              <Field label="קטגוריית אב">
                <select className="j-input p-2" value={form.parent_key || ''} onChange={(e) => set('parent_key', e.target.value)}>
                  <option value="">ללא אב (לשורש בלבד)</option>
                  {rows.filter((r) => ['group', 'parent', 'root'].includes(r.node_type) && r.id !== form.id)
                    .map((r) => <option key={r.id} value={r.category_key}>{r.label}</option>)}
                </select>
              </Field>
              <Field label="מזהה קבוע">
                <input className="j-input p-2" dir="ltr" disabled={!!form.id} value={form.category_key} onChange={(e) => set('category_key', e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))} />
              </Field>
              <Field label="שם">
                <input className="j-input p-2" value={form.label} onChange={(e) => set('label', e.target.value)} />
              </Field>
              <Field label="אייקון">
                <input className="j-input p-2" value={form.icon || ''} onChange={(e) => set('icon', e.target.value)} />
              </Field>
              <Field label="תמונה (קישור HTTPS)">
                <input className="j-input p-2" dir="ltr" value={form.image_url || ''} onChange={(e) => set('image_url', e.target.value)} />
              </Field>
              <Field label="תיאור">
                <input className="j-input p-2" value={form.description || ''} onChange={(e) => set('description', e.target.value)} />
              </Field>
              <Field label="סדר">
                <input className="j-input p-2" type="number" value={form.sort_order || 0} onChange={(e) => set('sort_order', Number(e.target.value))} />
              </Field>
            </div>
            <label className="flex gap-2 items-center text-sm">
              <input type="checkbox" checked={form.active !== false} onChange={(e) => set('active', e.target.checked)} /> פעילה בכל המותגים
            </label>
          </EditorBlock>

          {form.node_type !== 'group' && (
            <EditorBlock title="תוכן שמוצג ללקוח" desc="הטקסט שמופיע בתיבת התיאור ובשורות העזר של הטופס.">
              <Field label="דוגמת תיאור (מה שמופיע בתיבת התיאור)">
                <input className="j-input p-2" value={form.description_example || ''} onChange={(e) => set('description_example', e.target.value)} />
              </Field>
            </EditorBlock>
          )}

          {canOwnForm && (
            <EditorBlock
              title={`טופס השירות${fieldCount ? ` — ${fieldCount} שאלות משלו` : ''}`}
              desc="השאלות שנשאלות בעת פרסום משימה בקטגוריה זו, כולל הכפתורים והאפשרויות שלהן. שירות יורש את שאלות קטגוריית האב שלו, והן מוצגות כאן גם אם הן נערכות למעלה."
            >
              <GlobalFormEditor
                fields={form.fields || []}
                onChange={(v) => set('fields', v)}
                inherited={inheritedFields}
                parentLabel={parentRow?.label || ''}
                onEditInherited={parentRow && onEdit ? () => { onClose(); onEdit(parentRow); } : undefined}
                previewFields={mergedFields}
                categoryLabel={form.label || form.category_key}
              />
            </EditorBlock>
          )}

          {canOwnForm && <StatusFlowEditor flow={form.status_flow} onChange={(v) => set('status_flow', v)} />}
          {form.node_type !== 'group' && <CategoryFeeEditor fee={form.fee} onChange={(v) => set('fee', v)} />}

          {error && <p role="alert" className="text-destructive text-sm">{error}</p>}

          <div className="flex gap-2">
            <Btn loading={busy} onClick={save}>שמור גלובלית</Btn>
            <Btn variant="soft" disabled={busy} onClick={onClose}>ביטול</Btn>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}