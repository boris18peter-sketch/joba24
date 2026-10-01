import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { AlertTriangle } from 'lucide-react';
import { Section, Field, inputStyle, Pill, Btn, mono } from '@/components/admin/brand/brandUi';

const LOCALES = [
  ['he', 'עברית'], ['en', 'English'], ['ar', 'العربية'], ['es', 'Español'],
  ['fr', 'Français'], ['ru', 'Русский'], ['zh', '中文'], ['hi', 'हिन्दी'], ['fil', 'Filipino'],
];

const STATUSES = [
  ['active', 'פעיל', 'green'],
  ['suspended', 'מושהה', 'amber'],
  ['archived', 'ארכיון', 'red'],
];

export default function BrandGeneralTab({ brand, config, onSaved }) {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [confirmSlug, setConfirmSlug] = useState(false);
  const [form, setForm] = useState({
    name: brand.name || '',
    slug: brand.slug || '',
    status: brand.status || 'active',
    display_name: config?.display_name || brand.name || '',
    default_locale: config?.default_locale || 'he',
  });

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const slugChanged = form.slug.trim().toLowerCase() !== brand.slug;

  const save = async () => {
    if (slugChanged && !confirmSlug) { toast.error('יש לאשר את שינוי המזהה'); return; }
    setSaving(true);
    try {
      const res = await base44.functions.invoke('adminUpdateBrand', {
        brand_id: brand.id,
        name: form.name,
        slug: form.slug,
        status: form.status,
        display_name: form.display_name,
        default_locale: form.default_locale,
        confirm_slug_change: slugChanged ? true : undefined,
      });
      const data = res?.data;
      if (!data?.success) {
        const code = data?.error;
        toast.error(
          code === 'slug_taken' ? 'המזהה כבר תפוס'
            : code === 'slug_invalid' ? 'מזהה לא תקין — אותיות קטנות, ספרות ומקף בלבד'
            : code === 'slug_locked_default' ? 'לא ניתן לשנות מזהה של מותג הפלטפורמה'
            : code === 'cannot_change_default_status' ? 'לא ניתן להשהות את מותג הפלטפורמה'
            : code === 'name_required' ? 'שם הוא שדה חובה'
            : 'השמירה נכשלה'
        );
        return;
      }
      queryClient.invalidateQueries({ queryKey: ['adminBrand', brand.id] });
      queryClient.invalidateQueries({ queryKey: ['adminBrands'] });
      setConfirmSlug(false);
      toast.success('הפרטים נשמרו');
      onSaved?.(data);
    } catch (e) {
      toast.error('השמירה נכשלה');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Section title="פרטי מותג" desc="השם, המזהה והסטטוס של המותג בפלטפורמה.">
        <Field label="שם המותג *">
          <input style={inputStyle} value={form.name} onChange={set('name')} />
        </Field>

        <Field
          label="שם תצוגה"
          hint="השם שמוצג למשתמשים. אם ריק — יוצג שם המותג."
        >
          <input style={inputStyle} value={form.display_name} onChange={set('display_name')} />
        </Field>

        <Field label="מזהה (slug)">
          <input
            style={{ ...inputStyle, ...mono }}
            value={form.slug}
            disabled={brand.is_default}
            onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))}
          />
        </Field>

        {brand.is_default ? (
          <div style={{ fontSize: 12, color: 'var(--text-3)', lineHeight: 1.6 }}>
            זהו מותג הפלטפורמה (Joba24). המזהה והסטטוס שלו נעולים.
          </div>
        ) : slugChanged && (
          <div style={{
            background: 'var(--color-warning-bg)', border: '1px solid var(--color-warning-border)',
            borderRadius: 12, padding: 12, display: 'flex', gap: 9, alignItems: 'flex-start',
          }}>
            <AlertTriangle size={16} color="#d97706" style={{ flexShrink: 0, marginTop: 1 }} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#92400e' }}>
                שינוי מזהה — פעולה משמעותית
              </div>
              <div style={{ fontSize: 12, color: '#92400e', lineHeight: 1.6, marginTop: 4 }}>
                המזהה משמש כמזהה קבוע של המותג, עשוי להופיע בכתובות ובהפניות,
                ואינו משפיע על הדומיינים הרשומים. שינוי אינו ניתן לביטול אוטומטי.
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 8, fontSize: 12, fontWeight: 700, color: '#92400e', cursor: 'pointer' }}>
                <input type="checkbox" checked={confirmSlug} onChange={(e) => setConfirmSlug(e.target.checked)} />
                אני מאשר/ת את שינוי המזהה
              </label>
            </div>
          </div>
        )}

        <Field label="סטטוס">
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {STATUSES.map(([value, text, tone]) => {
              const locked = brand.is_default && value !== 'active';
              return (
                <button
                  key={value}
                  disabled={locked}
                  onClick={() => setForm((f) => ({ ...f, status: value }))}
                  style={{
                    height: 40, padding: '0 16px', borderRadius: 11, fontWeight: 800, fontSize: 13,
                    cursor: locked ? 'not-allowed' : 'pointer', opacity: locked ? 0.45 : 1,
                    background: form.status === value ? TONE_BG[tone] : 'var(--surface-1)',
                    color: form.status === value ? TONE_FG[tone] : 'var(--text-2)',
                    border: `1px solid ${form.status === value ? 'transparent' : 'var(--border-1)'}`,
                  }}
                >
                  {text}
                </button>
              );
            })}
          </div>
        </Field>

        <Field label="שפת ברירת מחדל" hint="השפה שתוצג למבקר שטרם בחר שפה בעצמו.">
          <select style={inputStyle} value={form.default_locale} onChange={set('default_locale')}>
            {LOCALES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </Field>

        <Btn onClick={save} loading={saving} disabled={slugChanged && !confirmSlug}>
          שמור שינויים
        </Btn>
      </Section>

      <Section title="מטא-דאטה" desc="מידע לקריאה בלבד על המותג.">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <Pill tone="blue">{brand.origin === 'platform' ? 'מותג פלטפורמה' : 'מותג שותף'}</Pill>
          {brand.is_default && <Pill tone="green">ברירת מחדל</Pill>}
          <Pill tone="gray">Brand.id: {brand.id}</Pill>
        </div>
      </Section>
    </>
  );
}

const TONE_BG = { green: '#dcfce7', amber: '#fef3c7', red: '#fee2e2' };
const TONE_FG = { green: '#166534', amber: '#92400e', red: '#991b1b' };