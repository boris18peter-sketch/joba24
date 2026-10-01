import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { Section, Field, ColorField, BrandAssetUpload, Btn } from '@/components/admin/brand/brandUi';

const JOBA24 = {
  primary: '#1a6fd4',
  dark: '#0a52b0',
  accent: '#fbbf24',
  name: 'Joba24',
};

/**
 * Branding — logo, favicon and colours, with a live preview.
 *
 * These values are consumed by the runtime through `BrandTheme`, which applies
 * them to the --brand-* tokens, the favicon and the document title on every
 * surface that resolves to this Brand. They are not decorative.
 */
export default function BrandBrandingTab({ brand, config, onSaved }) {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    logo_url: config?.logo_url || '',
    favicon_url: config?.favicon_url || '',
    primary_color: config?.primary_color || '',
    primary_dark_color: config?.primary_dark_color || '',
    accent_color: config?.accent_color || '',
  });

  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      const res = await base44.functions.invoke('adminUpdateBrand', {
        brand_id: brand.id,
        ...form,
      });
      const data = res?.data;
      if (!data?.success) {
        toast.error(data?.error === 'update_failed' ? 'השמירה נכשלה' : 'ערך צבע לא תקין (נדרש HEX)');
        return;
      }
      queryClient.invalidateQueries({ queryKey: ['adminBrand', brand.id] });
      toast.success('המיתוג נשמר');
      onSaved?.(data);
    } catch (e) {
      toast.error('השמירה נכשלה');
    } finally {
      setSaving(false);
    }
  };

  const p = form.primary_color || JOBA24.primary;
  const d = form.primary_dark_color || JOBA24.dark;
  const a = form.accent_color || JOBA24.accent;

  return (
    <>
      <Section title="נכסים" desc="לוגו ו-favicon של המותג. הקבצים נשמרים באחסון ציבורי עם כתובת קבועה, כדי שייטענו לכל מבקר ללא התחברות.">
        <BrandAssetUpload
          label="לוגו המותג"
          value={form.logo_url}
          onChange={set('logo_url')}
          hint="מוצג בכותרת האפליקציה. PNG/SVG עם רקע שקוף מומלץ."
        />
        <BrandAssetUpload
          label="Favicon"
          value={form.favicon_url}
          onChange={set('favicon_url')}
          height={48}
          hint="הסמל שמוצג בלשונית הדפדפן ובמסך הבית."
        />
      </Section>

      <Section title="צבעים" desc="ריק = ברירת המחדל של Joba24. ערך שהוגדר כאן מוחל בפועל על המותג.">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
          <ColorField label="צבע ראשי" value={form.primary_color} onChange={set('primary_color')} fallback={JOBA24.primary} />
          <ColorField label="צבע ראשי כהה" value={form.primary_dark_color} onChange={set('primary_dark_color')} fallback={JOBA24.dark} />
          <ColorField label="צבע הדגשה" value={form.accent_color} onChange={set('accent_color')} fallback={JOBA24.accent} />
        </div>

        {/* Live preview — exactly how the tokens will render. */}
        <div style={{
          border: '1px solid var(--border-1)', borderRadius: 14, overflow: 'hidden', background: '#f2f5fb',
        }}>
          <div style={{
            height: 54, background: '#ffffff', borderBottom: '1px solid #e4eaf5',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 14px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              {form.logo_url
                ? <img src={form.logo_url} alt="" style={{ width: 32, height: 32, objectFit: 'contain', borderRadius: 8 }} />
                : <div style={{ width: 32, height: 32, borderRadius: 8, background: p }} />}
              <span style={{ fontWeight: 900, fontSize: 17, color: '#0d1e40', letterSpacing: -0.5 }}>
                {config?.display_name || brand.name}
              </span>
            </div>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: p, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: 15, height: 2.5, background: 'white', boxShadow: '0 5px 0 white, 0 -5px 0 white' }} />
            </div>
          </div>

          <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ background: '#ffffff', border: '1px solid #e4eaf5', borderRadius: 12, padding: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#0d1e40', marginBottom: 3 }}>
                דוגמת משימה
              </div>
              <div style={{ fontSize: 12, color: '#4b6083' }}>תיאור קצר של המשימה</div>
              <div style={{ fontSize: 17, fontWeight: 900, color: p, marginTop: 6 }}>₪250</div>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <div style={{
                background: `linear-gradient(135deg, ${p}, ${d})`, color: 'white',
                fontWeight: 800, fontSize: 13, padding: '11px 20px', borderRadius: 12,
              }}>
                פרסם משימה
              </div>
              <div style={{
                background: a, color: '#1a3a6b',
                fontWeight: 800, fontSize: 13, padding: '11px 20px', borderRadius: 12,
              }}>
                הצטרף עכשיו
              </div>
              <div style={{
                background: '#ffffff', border: '1px solid #e4eaf5', color: '#4b6083',
                fontWeight: 800, fontSize: 13, padding: '11px 20px', borderRadius: 12,
              }}>
                ביטול
              </div>
            </div>
          </div>
        </div>
      </Section>

      <Btn onClick={save} loading={saving}>שמור מיתוג</Btn>
    </>
  );
}