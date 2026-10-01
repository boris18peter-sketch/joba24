import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import {
  ChevronUp, ChevronDown, Check, X, RefreshCw, Pencil, Layers, PowerOff,
} from 'lucide-react';
import { Section, Field, inputStyle, Pill, Btn, card, mono, refreshBrand } from '@/components/admin/brand/brandUi';
import { platformCategoryLabel } from '@/lib/brand/brandCategories';

/**
 * Brand Categories — which GLOBAL categories this Brand offers.
 *
 * The Brand does NOT own the category definition or the task form; those are
 * global (Admin → Categories). This tab only controls:
 *   • enabled / disabled for this Brand
 *   • this Brand's ordering
 *   • an optional display label / icon override
 *
 * Toggles are OPTIMISTIC: the switch flips instantly and the write happens
 * behind it, so nothing ever waits on a round trip to feel responsive.
 */

export default function BrandCategoriesTab({ brand, rows = [], globalRows = [] }) {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(null);
  const [overrides, setOverrides] = useState({}); // category_key -> enabled (optimistic)
  const [localOrder, setLocalOrder] = useState(null); // [category_key]
  const [editing, setEditing] = useState(null); // { category_key, label, icon }

  const rowByKey = useMemo(() => {
    const m = {};
    for (const r of rows) m[r.category_key] = r;
    return m;
  }, [rows]);

  const activeGlobals = useMemo(
    () => globalRows.filter((g) => g.active !== false),
    [globalRows],
  );

  /**
   * Every active global category, with this Brand's state resolved.
   * When a Brand has no rows at all the runtime offers everything, so the UI
   * shows everything as enabled rather than lying about it.
   */
  const list = useMemo(() => {
    const configured = rows.length > 0;
    const items = activeGlobals.map((g) => {
      const row = rowByKey[g.category_key];
      const enabled = overrides[g.category_key] ?? (configured ? (row?.enabled !== false) : true);
      return {
        key: g.category_key,
        row,
        enabled,
        label: row?.label || g.label || platformCategoryLabel(g.category_key),
        icon: row?.icon || g.icon || '',
        overridden: !!(row?.label || row?.icon),
        fieldCount: (g.fields || []).filter((f) => f.enabled !== false).length,
        sort: row?.sort_order ?? g.sort_order ?? 0,
      };
    });

    if (!localOrder) return items.slice().sort((a, b) => a.sort - b.sort);
    const pos = new Map(localOrder.map((k, i) => [k, i]));
    return items.slice().sort((a, b) => (pos.get(a.key) ?? 999) - (pos.get(b.key) ?? 999));
  }, [activeGlobals, rowByKey, overrides, localOrder, rows.length]);

  const enabledCount = list.filter((c) => c.enabled).length;

  const invoke = async (payload) => {
    const res = await base44.functions.invoke('adminManageCategory', { brand_id: brand.id, ...payload });
    return res?.data;
  };

  const errText = (code) =>
    code === 'category_in_use' ? 'הקטגוריה בשימוש במשימות — יש להשבית במקום להסיר'
      : code === 'category_not_found' ? 'הקטגוריה לא נמצאה'
      : 'הפעולה נכשלה';

  /** Optimistic toggle — flips immediately, rolls back only on a real failure. */
  const toggle = async (item) => {
    const next = !item.enabled;
    setOverrides((o) => ({ ...o, [item.key]: next }));
    setBusy(`toggle:${item.key}`);
    try {
      const data = await invoke({ action: next ? 'enable' : 'disable', category_key: item.key });
      if (!data?.success) {
        setOverrides((o) => ({ ...o, [item.key]: !next }));
        toast.error(errText(data?.error));
        return;
      }
      refreshBrand(queryClient, brand.id);
    } catch (e) {
      setOverrides((o) => ({ ...o, [item.key]: !next }));
      toast.error('הפעולה נכשלה');
    } finally {
      setBusy(null);
    }
  };

  const bulk = async (enabled) => {
    setBusy(`bulk:${enabled}`);
    const optimistic = {};
    for (const c of list) optimistic[c.key] = enabled;
    setOverrides(optimistic);
    try {
      const data = await invoke({ action: 'bulk_toggle', enabled });
      if (!data?.success) {
        setOverrides({});
        toast.error('הפעולה נכשלה');
        return;
      }
      refreshBrand(queryClient, brand.id);
      toast.success(enabled ? 'כל הקטגוריות הופעלו' : 'כל הקטגוריות הושבתו');
    } catch (e) {
      setOverrides({});
      toast.error('הפעולה נכשלה');
    } finally {
      setBusy(null);
    }
  };

  const move = async (index, dir) => {
    const j = index + dir;
    if (j < 0 || j >= list.length) return;
    const keys = list.map((c) => c.key);
    [keys[index], keys[j]] = [keys[j], keys[index]];
    setLocalOrder(keys); // instant
    setBusy('reorder');
    try {
      const data = await invoke({
        action: 'reorder',
        order: keys.map((k, i) => ({ id: rowByKey[k]?.id, sort_order: i })).filter((o) => o.id),
      });
      if (!data?.success) { setLocalOrder(null); toast.error('הסידור נכשל'); return; }
      refreshBrand(queryClient, brand.id);
    } catch (e) {
      setLocalOrder(null);
      toast.error('הסידור נכשל');
    } finally {
      setBusy(null);
    }
  };

  const saveLabel = async () => {
    setBusy('label');
    try {
      const data = await invoke({
        action: 'set_label',
        category_key: editing.category_key,
        label: editing.label,
        icon: editing.icon,
      });
      if (!data?.success) { toast.error(errText(data?.error)); return; }
      setEditing(null);
      refreshBrand(queryClient, brand.id);
      toast.success('התצוגה עודכנה');
    } catch (e) {
      toast.error('השמירה נכשלה');
    } finally {
      setBusy(null);
    }
  };

  return (
    <Section
      title="קטגוריות"
      desc="הקטגוריות שהמותג מציע. ההגדרה וטופס המשימה של כל קטגוריה הם גלובליים — כאן קובעים רק מה מוצג במותג הזה, ובאיזה סדר."
      actions={
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <Btn variant="soft" loading={busy === 'bulk:true'} onClick={() => bulk(true)} style={{ height: 36, fontSize: 12 }}>
            הפעל הכל
          </Btn>
          <Btn variant="soft" loading={busy === 'bulk:false'} onClick={() => bulk(false)} style={{ height: 36, fontSize: 12 }}>
            <PowerOff size={13} /> השבת הכל
          </Btn>
          <Btn variant="soft" loading={busy === 'sync'}
            onClick={async () => {
              setBusy('sync');
              const data = await invoke({ action: 'sync_global' }).catch(() => null);
              setBusy(null);
              if (data?.success) { refreshBrand(queryClient, brand.id); toast.success('הקטלוג סונכרן'); }
              else toast.error('הסנכרון נכשל');
            }}
            style={{ height: 36, fontSize: 12 }}>
            <RefreshCw size={14} /> סנכרן מהקטלוג
          </Btn>
        </div>
      }
    >
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <Pill tone={enabledCount ? 'green' : 'gray'}>{enabledCount} מופעלות</Pill>
        <Pill tone="gray">{list.length - enabledCount} מושבתות</Pill>
        <Pill tone="blue">הטופס גלובלי — {activeGlobals.reduce((s, g) => s + (g.fields || []).filter((f) => f.enabled !== false).length, 0)} שדות</Pill>
      </div>

      {editing && (
        <div style={{ ...card, padding: 13, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 14, fontWeight: 900, color: 'var(--text-1)' }}>
              תצוגה למותג · <span style={mono}>{editing.category_key}</span>
            </div>
            <button onClick={() => setEditing(null)} style={iconBtn}><X size={15} /></button>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-3)', lineHeight: 1.6 }}>
            זו עקיפה לתצוגה בלבד — היא אינה משנה את הקטגוריה הגלובלית או את טופס המשימה.
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px', gap: 8 }}>
            <Field label="תווית תצוגה" hint={`ברירת מחדל: ${platformCategoryLabel(editing.category_key)}`}>
              <input style={inputStyle} value={editing.label}
                onChange={(e) => setEditing((s) => ({ ...s, label: e.target.value }))} />
            </Field>
            <Field label="אייקון">
              <input style={inputStyle} value={editing.icon} placeholder="📸"
                onChange={(e) => setEditing((s) => ({ ...s, icon: e.target.value }))} />
            </Field>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn onClick={saveLabel} loading={busy === 'label'}><Check size={15} /> שמור</Btn>
            <Btn variant="soft" onClick={() => setEditing(null)}>ביטול</Btn>
          </div>
        </div>
      )}

      {list.length === 0 && (
        <div style={{ fontSize: 13, color: 'var(--text-3)', textAlign: 'center', padding: 20 }}>
          אין קטגוריות גלובליות פעילות. הוסף אותן ב-Admin → Categories.
        </div>
      )}

      {list.map((c, i) => (
        <div key={c.key} style={{
          ...card, padding: 11, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
          opacity: c.enabled ? 1 : 0.62,
          borderColor: c.enabled ? 'var(--border-1)' : 'var(--border-2)',
        }}>
          <button
            onClick={() => toggle(c)}
            disabled={busy === `toggle:${c.key}`}
            title={c.enabled ? 'השבת למותג זה' : 'הפעל למותג זה'}
            style={{
              width: 46, height: 26, borderRadius: 20, border: 'none', cursor: 'pointer',
              background: c.enabled ? 'var(--brand-primary)' : 'var(--border-2)',
              position: 'relative', flexShrink: 0, transition: 'background .15s',
            }}
          >
            <span style={{
              position: 'absolute', top: 3, left: c.enabled ? 23 : 3,
              width: 20, height: 20, borderRadius: '50%', background: 'white',
              transition: 'left .15s', boxShadow: '0 1px 3px rgba(0,0,0,.25)',
            }} />
          </button>

          <span style={{ fontSize: 15 }}>{c.icon || ''}</span>
          <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-1)' }}>
            {c.label}
          </span>
          <span style={{ fontSize: 11, color: 'var(--text-3)', ...mono }}>{c.key}</span>
          {c.enabled
            ? <Pill tone="green">מופעלת במותג</Pill>
            : <Pill tone="gray">מושבתת במותג</Pill>}
          {c.overridden && <Pill tone="blue">תצוגה מותאמת</Pill>}
          {c.fieldCount > 0 && <Pill tone="gray">{c.fieldCount} שדות גלובליים</Pill>}

          <span style={{ flex: 1 }} />

          <button onClick={() => move(i, -1)} disabled={i === 0} style={{ ...iconBtn, opacity: i === 0 ? 0.4 : 1 }}>
            <ChevronUp size={14} />
          </button>
          <button onClick={() => move(i, 1)} disabled={i === list.length - 1}
            style={{ ...iconBtn, opacity: i === list.length - 1 ? 0.4 : 1 }}>
            <ChevronDown size={14} />
          </button>
          <button
            onClick={() => setEditing({ category_key: c.key, label: c.row?.label || '', icon: c.row?.icon || '' })}
            style={iconBtn} title="עקיפת תצוגה"
          >
            <Pencil size={13} />
          </button>
        </div>
      ))}

      <div style={{
        background: 'var(--surface-1)', border: '1px solid var(--border-1)',
        borderRadius: 12, padding: 12, display: 'flex', gap: 9, alignItems: 'flex-start',
      }}>
        <Layers size={15} color="var(--text-3)" style={{ flexShrink: 0, marginTop: 1 }} />
        <div style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.65 }}>
          טופס המשימה של כל קטגוריה מוגדר פעם אחת בלבד ב-<b>Admin → Categories</b> ומשותף לכל המותגים.
          שיפור הטופס שם מתעדכן מיד בכל המותגים שמציעים את הקטגוריה — בלי עבודה לכל מותג.
        </div>
      </div>
    </Section>
  );
}

const iconBtn = {
  width: 32, height: 32, borderRadius: 8, border: '1px solid var(--border-1)',
  background: 'var(--surface-1)', cursor: 'pointer', display: 'flex',
  alignItems: 'center', justifyContent: 'center', flexShrink: 0,
};