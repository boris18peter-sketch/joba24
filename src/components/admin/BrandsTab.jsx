import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { Loader2, Plus, Globe, Tag, Settings2, X } from 'lucide-react';

/**
 * BrandsTab — Platform Admin → Brands.
 *
 * The list is a launcher: every Brand opens its own Brand Manager page where
 * branding, domains, categories, form configuration and settings are managed.
 * Creation is deliberately minimal and hands straight over to the manager.
 */

const card = {
  background: 'var(--surface-2)',
  border: '1px solid var(--border-1)',
  borderRadius: 16,
  padding: 14,
};

const label = { fontSize: 11, fontWeight: 800, color: 'var(--text-3)', marginBottom: 4, display: 'block' };
const input = {
  width: '100%', height: 40, borderRadius: 10, border: '1px solid var(--border-1)',
  padding: '0 10px', fontSize: 14, outline: 'none', boxSizing: 'border-box',
  background: 'var(--surface-1)', color: 'var(--text-1)',
};

const STATUS_STYLE = {
  active: { bg: '#dcfce7', color: '#166534', label: 'פעיל' },
  suspended: { bg: '#fef3c7', color: '#92400e', label: 'מושהה' },
  archived: { bg: '#fee2e2', color: '#991b1b', label: 'ארכיון' },
};

function StatusPill({ status }) {
  const s = STATUS_STYLE[status] || STATUS_STYLE.suspended;
  return (
    <span style={{ background: s.bg, color: s.color, fontSize: 11, fontWeight: 800, padding: '3px 9px', borderRadius: 20 }}>
      {s.label}
    </span>
  );
}

/** Minimal creation: name, slug, first domain, language, basic branding. */
function CreateBrandForm({ onDone, onCancel }) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '', slug: '', hostname: '', default_locale: 'he',
    primary_color: '#1a6fd4', primary_dark_color: '#0a52b0', accent_color: '#fbbf24',
  });

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const autoSlug = (name) => name
    .toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 32);

  const submit = async () => {
    if (saving) return;
    if (!form.name.trim() || !form.slug.trim() || !form.hostname.trim()) {
      toast.error('שם, מזהה ודומיין הם שדות חובה');
      return;
    }
    setSaving(true);
    try {
      const res = await base44.functions.invoke('adminCreateBrand', {
        name: form.name.trim(),
        slug: form.slug.trim().toLowerCase(),
        hostname: form.hostname.trim().toLowerCase(),
        default_locale: form.default_locale,
        primary_color: form.primary_color,
        primary_dark_color: form.primary_dark_color,
        accent_color: form.accent_color,
      });
      const data = res?.data;
      if (!data?.success) {
        const code = data?.error;
        toast.error(
          code === 'slug_taken' ? 'המזהה כבר תפוס'
            : code === 'domain_taken' ? `הדומיין ${data?.hostname} כבר רשום`
            : code === 'slug_invalid' ? 'מזהה לא תקין — אותיות קטנות, ספרות ומקף בלבד'
            : code === 'validation_failed' ? 'חסרים שדות חובה'
            : code === 'forbidden' ? 'אין הרשאה'
            : 'יצירת המותג נכשלה'
        );
        return;
      }
      toast.success(`המותג "${data.brand?.name}" נוצר — ממשיכים להגדרה`);
      onDone?.(data);
    } catch (e) {
      toast.error('יצירת המותג נכשלה');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 15, fontWeight: 900, color: 'var(--text-1)' }}>מותג חדש</div>
        <button onClick={onCancel} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
          <X size={18} color="var(--text-3)" />
        </button>
      </div>

      <div style={{ fontSize: 12, color: 'var(--text-3)', lineHeight: 1.6 }}>
        נדרשים רק הפרטים הבסיסיים. מיתוג מלא, דומיינים, קטגוריות, שדות טופס והגדרות שוק
        ימשיכו בעמוד הניהול של המותג מיד לאחר היצירה.
      </div>

      <div>
        <span style={label}>שם המותג *</span>
        <input style={input} value={form.name} placeholder="למשל: Save A Date"
          onChange={(e) => {
            const v = e.target.value;
            setForm((f) => ({ ...f, name: v, slug: f.slug || autoSlug(v) }));
          }} />
      </div>

      <div>
        <span style={label}>מזהה (slug) * — לא ניתן לשינוי לאחר היצירה</span>
        <input style={input} value={form.slug} placeholder="save-a-date"
          onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))} />
      </div>

      <div>
        <span style={label}>דומיין ראשי * (תת-דומיין או דומיין מותאם)</span>
        <input style={input} value={form.hostname} placeholder="events.joba24.com"
          onChange={(e) => setForm((f) => ({ ...f, hostname: e.target.value }))} />
      </div>

      <div>
        <span style={label}>שפת ברירת מחדל</span>
        <select style={input} value={form.default_locale} onChange={set('default_locale')}>
          <option value="he">עברית</option>
          <option value="en">English</option>
        </select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        {[['primary_color', 'צבע ראשי'], ['primary_dark_color', 'כהה'], ['accent_color', 'הדגשה']].map(([k, l]) => (
          <div key={k}>
            <span style={label}>{l}</span>
            <input type="color" value={form[k]} onChange={set(k)}
              style={{ width: '100%', height: 40, borderRadius: 10, border: '1px solid var(--border-1)', background: 'var(--surface-1)', cursor: 'pointer' }} />
          </div>
        ))}
      </div>

      <button onClick={submit} disabled={saving}
        style={{
          height: 46, borderRadius: 12, border: 'none', color: 'white', fontWeight: 900, fontSize: 15,
          background: saving ? '#94a3b8' : 'linear-gradient(135deg,#1a6fd4,#0a52b0)',
          cursor: saving ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
        {saving ? <><Loader2 size={17} className="animate-spin" /> יוצר מותג…</> : <><Plus size={17} /> צור מותג והמשך להגדרה</>}
      </button>
    </div>
  );
}

export default function BrandsTab() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);

  const { data: brands = [], isLoading } = useQuery({
    queryKey: ['adminBrands'],
    queryFn: () => base44.entities.Brand.list('created_date', 100),
  });
  const { data: domains = [] } = useQuery({
    queryKey: ['adminBrandDomains'],
    queryFn: () => base44.entities.BrandDomain.list('created_date', 200),
  });
  const { data: configs = [] } = useQuery({
    queryKey: ['adminBrandConfigs'],
    queryFn: () => base44.entities.BrandConfig.list('created_date', 100),
  });
  const { data: categories = [] } = useQuery({
    queryKey: ['adminBrandCategories'],
    queryFn: () => base44.entities.BrandCategory.list('created_date', 500),
  });

  const domainsByBrand = useMemo(() => {
    const m = {};
    for (const d of domains) (m[d.brand_id] ||= []).push(d);
    return m;
  }, [domains]);
  const configByBrand = useMemo(() => {
    const m = {};
    for (const c of configs) m[c.brand_id] = c;
    return m;
  }, [configs]);
  const categoryCount = useMemo(() => {
    const m = {};
    for (const c of categories) m[c.brand_id] = (m[c.brand_id] || 0) + 1;
    return m;
  }, [categories]);

  if (isLoading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Loader2 size={24} className="animate-spin" color="#1a6fd4" /></div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 13, color: 'var(--text-3)', fontWeight: 700 }}>{brands.length} מותגים</div>
        {!creating && (
          <button onClick={() => setCreating(true)}
            style={{
              height: 38, padding: '0 16px', borderRadius: 12, border: 'none', color: 'white',
              fontWeight: 800, fontSize: 13, cursor: 'pointer',
              background: 'linear-gradient(135deg,#1a6fd4,#0a52b0)',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
            <Plus size={15} /> מותג חדש
          </button>
        )}
      </div>

      {creating && (
        <CreateBrandForm
          onCancel={() => setCreating(false)}
          onDone={(data) => {
            setCreating(false);
            queryClient.invalidateQueries({ queryKey: ['adminBrands'] });
            if (data?.brand?.id) navigate(`/admin/brands/${data.brand.id}`);
          }}
        />
      )}

      {!creating && brands.map((b) => {
        const ds = domainsByBrand[b.id] || [];
        const cfg = configByBrand[b.id];
        return (
          <div key={b.id} style={{ ...card, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {cfg?.logo_url ? (
                <img src={cfg.logo_url} alt="" style={{ width: 40, height: 40, borderRadius: 12, objectFit: 'contain', background: 'var(--surface-1)', flexShrink: 0 }} />
              ) : (
                <div style={{ width: 40, height: 40, borderRadius: 12, background: cfg?.primary_color || '#1a6fd4', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 900, flexShrink: 0 }}>
                  {(b.name || '?').charAt(0)}
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ fontSize: 14, fontWeight: 900, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {cfg?.display_name || b.name}
                  </div>
                  <StatusPill status={b.status} />
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'monospace' }}>{b.slug}</div>
              </div>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {ds.length ? ds.map((d) => (
                <span key={d.id} style={{ fontSize: 11, background: 'var(--surface-3)', borderRadius: 8, padding: '3px 8px', color: 'var(--text-2)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <Globe size={10} /> {d.hostname}
                </span>
              )) : (
                <span style={{ fontSize: 11, color: 'var(--text-3)' }}>אין דומיין</span>
              )}
            </div>

            <div style={{ display: 'flex', gap: 10, fontSize: 11, color: 'var(--text-3)', flexWrap: 'wrap' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}><Tag size={11} /> {categoryCount[b.id] || 0} קטגוריות</span>
              {cfg?.default_locale && <span>· {cfg.default_locale}</span>}
            </div>

            <button onClick={() => navigate(`/admin/brands/${b.id}`)}
              style={{
                height: 40, borderRadius: 10, border: 'none', color: 'white', fontWeight: 800, fontSize: 13,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                background: 'linear-gradient(135deg,#1a6fd4,#0a52b0)',
              }}>
              <Settings2 size={14} /> ניהול מותג
            </button>
          </div>
        );
      })}
    </div>
  );
}