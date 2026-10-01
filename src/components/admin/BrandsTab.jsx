import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import {
  Loader2, Plus, Globe, Palette, Tag, PauseCircle, PlayCircle,
  Pencil, X, Check, ExternalLink,
} from 'lucide-react';

/**
 * BrandsTab — Platform Admin → Brands (Package 4.5).
 *
 * Lists, views, creates, edits and activates/suspends Brands.
 * Creation goes through the trusted `adminCreateBrand` backend function so a
 * Brand is never assembled piecemeal by the client.
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

// ── Create form ───────────────────────────────────────────────────────────────
function CreateBrandForm({ onDone, onCancel }) {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '', slug: '', hostname: '', custom_domain: '',
    logo_url: '', primary_color: '#1a6fd4', primary_dark_color: '#0a52b0',
    accent_color: '#fbbf24', default_locale: 'he', support_email: '',
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
        custom_domain: form.custom_domain.trim().toLowerCase() || undefined,
        logo_url: form.logo_url.trim(),
        primary_color: form.primary_color,
        primary_dark_color: form.primary_dark_color,
        accent_color: form.accent_color,
        default_locale: form.default_locale,
        support_email: form.support_email.trim(),
      });
      const data = res?.data;
      if (!data?.success) {
        const code = data?.error;
        const msg = code === 'slug_taken' ? 'המזהה כבר תפוס'
          : code === 'domain_taken' ? `הדומיין ${data?.hostname} כבר רשום`
          : code === 'slug_invalid' ? 'מזהה לא תקין — אותיות קטנות, ספרות ומקף בלבד'
          : code === 'validation_failed' ? 'חסרים שדות חובה'
          : code === 'forbidden' ? 'אין הרשאה'
          : 'יצירת המותג נכשלה';
        toast.error(msg);
        return;
      }
      queryClient.invalidateQueries({ queryKey: ['adminBrands'] });
      toast.success(`המותג "${data.brand?.name}" נוצר בהצלחה`);
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
        <div style={{ fontSize: 15, fontWeight: 900, color: 'var(--text-1)' }}>יצירת מותג חדש</div>
        <button onClick={onCancel} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
          <X size={18} color="var(--text-3)" />
        </button>
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
        <span style={label}>דומיין * (תת-דומיין או דומיין מותאם)</span>
        <input style={input} value={form.hostname} placeholder="events.joba24.com"
          onChange={(e) => setForm((f) => ({ ...f, hostname: e.target.value }))} />
      </div>

      <div>
        <span style={label}>דומיין נוסף (אופציונלי)</span>
        <input style={input} value={form.custom_domain} placeholder="saveadate.co.il"
          onChange={(e) => setForm((f) => ({ ...f, custom_domain: e.target.value }))} />
      </div>

      <div>
        <span style={label}>לוגו (URL)</span>
        <input style={input} value={form.logo_url} placeholder="https://..."
          onChange={set('logo_url')} />
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

      <div>
        <span style={label}>שפת ברירת מחדל</span>
        <select style={input} value={form.default_locale} onChange={set('default_locale')}>
          <option value="he">עברית</option>
          <option value="en">English</option>
        </select>
      </div>

      <div style={{ fontSize: 12, color: 'var(--text-3)', lineHeight: 1.5 }}>
        הקטגוריות, הגדרות השוק ותנאי השימוש עוברים בירושה מ-Joba24. ניתן לשנות לאחר היצירה.
      </div>

      <button onClick={submit} disabled={saving}
        style={{
          height: 46, borderRadius: 12, border: 'none', color: 'white', fontWeight: 900, fontSize: 15,
          background: saving ? '#94a3b8' : 'linear-gradient(135deg,#1a6fd4,#0a52b0)',
          cursor: saving ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
        {saving ? <><Loader2 size={17} className="animate-spin" /> יוצר מותג…</> : <><Plus size={17} /> צור מותג</>}
      </button>
    </div>
  );
}

// ── Brand detail / edit ───────────────────────────────────────────────────────
function BrandDetail({ brand, domains, config, onClose }) {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: brand.name || '',
    display_name: config?.display_name || brand.name || '',
    logo_url: config?.logo_url || '',
    primary_color: config?.primary_color || '#1a6fd4',
    primary_dark_color: config?.primary_dark_color || '#0a52b0',
    accent_color: config?.accent_color || '#fbbf24',
    default_locale: config?.default_locale || 'he',
    support_email: config?.support_email || '',
  });

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = async () => {
    setSaving(true);
    try {
      await base44.entities.Brand.update(brand.id, { name: form.name.trim() });
      if (config?.id) {
        await base44.entities.BrandConfig.update(config.id, {
          display_name: form.display_name.trim(),
          logo_url: form.logo_url.trim(),
          primary_color: form.primary_color,
          primary_dark_color: form.primary_dark_color,
          accent_color: form.accent_color,
          default_locale: form.default_locale,
          support_email: form.support_email.trim(),
        });
      }
      queryClient.invalidateQueries({ queryKey: ['adminBrands'] });
      queryClient.invalidateQueries({ queryKey: ['adminBrandConfigs'] });
      toast.success('המותג עודכן');
    } catch (e) {
      toast.error('העדכון נכשל');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ fontSize: 15, fontWeight: 900, color: 'var(--text-1)' }}>{brand.name}</div>
          <StatusPill status={brand.status} />
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
          <X size={18} color="var(--text-3)" />
        </button>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        <span style={{ fontSize: 11, background: 'var(--surface-3)', borderRadius: 8, padding: '3px 8px', color: 'var(--text-2)', fontFamily: 'monospace' }}>
          slug: {brand.slug}
        </span>
        <span style={{ fontSize: 11, background: 'var(--surface-3)', borderRadius: 8, padding: '3px 8px', color: 'var(--text-2)' }}>
          {brand.origin === 'platform' ? 'מותג פלטפורמה' : 'מותג שותף'}
        </span>
        {brand.is_default && (
          <span style={{ fontSize: 11, background: '#dbeafe', color: '#1d4ed8', borderRadius: 8, padding: '3px 8px', fontWeight: 800 }}>
            ברירת מחדל
          </span>
        )}
      </div>

      <div>
        <span style={label}><Globe size={11} style={{ display: 'inline', marginLeft: 4 }} /> דומיינים</span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {domains.map((d) => (
            <a key={d.id} href={`https://${d.hostname}`} target="_blank" rel="noreferrer"
              style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#1a6fd4', textDecoration: 'none', fontWeight: 600 }}>
              <ExternalLink size={12} /> {d.hostname}
              <span style={{ fontSize: 10, color: d.status === 'active' ? '#166534' : '#92400e' }}>
                ({d.status === 'active' ? 'פעיל' : d.status})
              </span>
              {d.is_primary && <span style={{ fontSize: 10, color: 'var(--text-3)' }}>· ראשי</span>}
            </a>
          ))}
          {!domains.length && <div style={{ fontSize: 12, color: 'var(--text-3)' }}>לא הוגדרו דומיינים</div>}
        </div>
      </div>

      <div>
        <span style={label}>שם תצוגה</span>
        <input style={input} value={form.display_name} onChange={set('display_name')} />
      </div>

      <div>
        <span style={label}>לוגו (URL)</span>
        <input style={input} value={form.logo_url} onChange={set('logo_url')} placeholder="https://..." />
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

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <div>
          <span style={label}>שפת ברירת מחדל</span>
          <select style={input} value={form.default_locale} onChange={set('default_locale')}>
            <option value="he">עברית</option>
            <option value="en">English</option>
          </select>
        </div>
        <div>
          <span style={label}>אימייל תמיכה</span>
          <input style={input} value={form.support_email} onChange={set('support_email')} />
        </div>
      </div>

      <button onClick={save} disabled={saving}
        style={{
          height: 44, borderRadius: 12, border: 'none', color: 'white', fontWeight: 800, fontSize: 14,
          background: saving ? '#94a3b8' : '#1a6fd4', cursor: saving ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        }}>
        {saving ? <Loader2 size={16} className="animate-spin" /> : <><Check size={16} /> שמור שינויים</>}
      </button>
    </div>
  );
}

// ── Tab ───────────────────────────────────────────────────────────────────────
export default function BrandsTab() {
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [openId, setOpenId] = useState(null);
  const [busyId, setBusyId] = useState(null);

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

  const toggleStatus = async (brand) => {
    setBusyId(brand.id);
    try {
      const next = brand.status === 'active' ? 'suspended' : 'active';
      await base44.entities.Brand.update(brand.id, { status: next });
      await queryClient.invalidateQueries({ queryKey: ['adminBrands'] });
      toast.success(next === 'active' ? 'המותג הופעל' : 'המותג הושהה');
    } catch (e) {
      toast.error('העדכון נכשל');
    } finally {
      setBusyId(null);
    }
  };

  if (isLoading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Loader2 size={24} className="animate-spin" color="#1a6fd4" /></div>;
  }

  const open = brands.find((b) => b.id === openId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 13, color: 'var(--text-3)', fontWeight: 700 }}>
          {brands.length} מותגים
        </div>
        {!creating && (
          <button onClick={() => { setCreating(true); setOpenId(null); }}
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
        <CreateBrandForm onCancel={() => setCreating(false)} onDone={() => setCreating(false)} />
      )}

      {open && !creating && (
        <BrandDetail
          brand={open}
          domains={domainsByBrand[open.id] || []}
          config={configByBrand[open.id]}
          onClose={() => setOpenId(null)}
        />
      )}

      {!creating && brands.map((b) => {
        const ds = domainsByBrand[b.id] || [];
        const cfg = configByBrand[b.id];
        return (
          <div key={b.id} style={{ ...card, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {cfg?.logo_url ? (
                <img src={cfg.logo_url} alt="" style={{ width: 40, height: 40, borderRadius: 12, objectFit: 'cover', flexShrink: 0 }} />
              ) : (
                <div style={{ width: 40, height: 40, borderRadius: 12, background: cfg?.primary_color || '#1a6fd4', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 900, flexShrink: 0 }}>
                  {(b.name || '?').charAt(0)}
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ fontSize: 14, fontWeight: 900, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {b.name}
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

            <div style={{ display: 'flex', gap: 6, fontSize: 11, color: 'var(--text-3)', flexWrap: 'wrap' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}><Tag size={11} /> {categoryCount[b.id] || 0} קטגוריות</span>
              {cfg?.primary_color && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}><Palette size={11} /> {cfg.primary_color}</span>}
              {cfg?.default_locale && <span>· {cfg.default_locale}</span>}
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setOpenId(b.id)}
                style={{ flex: 1, height: 38, borderRadius: 10, border: '1px solid var(--border-1)', background: 'var(--surface-1)', color: 'var(--text-1)', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                <Pencil size={13} /> עריכה
              </button>
              <button onClick={() => toggleStatus(b)} disabled={busyId === b.id}
                style={{
                  flex: 1, height: 38, borderRadius: 10, border: 'none', fontWeight: 700, fontSize: 13, cursor: busyId === b.id ? 'wait' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                  background: b.status === 'active' ? '#fef3c7' : '#dcfce7',
                  color: b.status === 'active' ? '#92400e' : '#166534',
                }}>
                {busyId === b.id ? <Loader2 size={13} className="animate-spin" />
                  : b.status === 'active' ? <><PauseCircle size={13} /> השהה</> : <><PlayCircle size={13} /> הפעל</>}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}