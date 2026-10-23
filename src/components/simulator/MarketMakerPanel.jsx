import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { Loader2, Play, Save, Factory, Clock, AlertTriangle } from 'lucide-react';
import { ISRAELI_CITIES } from '@/lib/israeliCities';
import useTaskCategoryOptions from '@/hooks/useTaskCategoryOptions';
import ChipMultiSelect from '@/components/simulator/ChipMultiSelect';

/**
 * Market Maker — the automaton that keeps the marketplace looking alive.
 *
 * ── WHAT IT CONTROLS ────────────────────────────────────────────────────────
 * One hourly workflow runs the cycle; everything about HOW MUCH that cycle does
 * is set here and stored in the app's own data, so the cadence can be changed
 * at any time without touching the schedule:
 *
 *   • how many demo tasks are published per cycle (and every how many hours)
 *   • how many of the oldest open tasks are closed each cycle
 *   • how many views / clicks / applicants every open listing gains
 *
 * The same demo profiles and the same content library as the manual generator,
 * so a task from the automaton is indistinguishable from one published by hand.
 */

const DEFAULTS = {
  enabled: false,
  interval_hours: 1,
  tasks_min: 5, tasks_max: 10,
  close_min: 1, close_max: 3,
  views_min: 5, views_max: 10,
  clicks_min: 1, clicks_max: 3,
  applicants_min: 1, applicants_max: 2,
  max_open_tasks: 60,
  min_price: 100, max_price: 2000,
  cities: [], categories: [], brand_ids: [],
};

function Num({ label, value, onChange, min = 0, max = 9999, width = 74 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: 1, minWidth: 0 }}>
      <span style={{ fontSize: 10, fontWeight: 700, color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
      <input
        type="number"
        value={value ?? ''}
        min={min}
        max={max}
        onChange={(e) => onChange(Math.max(min, Math.min(max, Number(e.target.value) || 0)))}
        style={{
          width: '100%', minWidth: width, height: 34, borderRadius: 9,
          border: '1px solid #dce8f5', padding: '0 8px', fontSize: 13,
          outline: 'none', boxSizing: 'border-box', background: 'white', color: '#0f2b6b',
        }}
      />
    </div>
  );
}

function Row({ title, hint, children }) {
  return (
    <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: '9px 10px', background: '#fbfdff' }}>
      <div style={{ fontSize: 11, fontWeight: 800, color: '#0f2b6b', marginBottom: 6 }}>{title}</div>
      <div style={{ display: 'flex', gap: 6 }}>{children}</div>
      {hint && <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 5, lineHeight: 1.5 }}>{hint}</div>}
    </div>
  );
}

export default function MarketMakerPanel() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const { options: categoryOptions } = useTaskCategoryOptions();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['market_maker_config'],
    queryFn: async () => {
      const res = await base44.functions.invoke('marketMaker', { action: 'get_config' });
      if (res.data?.error) throw new Error(res.data.error);
      return res.data;
    },
    staleTime: 15000,
    refetchOnWindowFocus: false,
  });

  const { data: brands = [] } = useQuery({
    queryKey: ['sim_brands'],
    queryFn: () => base44.entities.Brand.list('created_date', 100),
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (data?.config && !form) setForm({ ...DEFAULTS, ...data.config });
  }, [data, form]);

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  const invalidateFeed = () => {
    ['sim_tasks', 'sim_demo_tasks', 'sim_apps', 'allTasks', 'tasks'].forEach((k) =>
      queryClient.invalidateQueries({ queryKey: [k] }),
    );
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await base44.functions.invoke('marketMaker', { action: 'save_config', config: form });
      if (res.data?.error) throw new Error(res.data.error);
      setForm({ ...DEFAULTS, ...res.data.config });
      toast.success(form.enabled ? 'האוטומט נשמר ופעיל' : 'ההגדרות נשמרו (האוטומט כבוי)');
      refetch();
    } catch (e) {
      toast.error(`שמירה נכשלה: ${e.message}`);
    }
    setSaving(false);
  };

  const runNow = async () => {
    setRunning(true);
    try {
      const res = await base44.functions.invoke('marketMaker', { action: 'run_cycle', force: true });
      if (res.data?.error) throw new Error(res.data.error);
      const s = res.data.summary || {};
      toast.success(`מחזור הושלם: פורסמו ${s.published || 0}, נסגרו ${s.closed || 0}, נוספו ${s.new_applicants || 0} פניות`);
      invalidateFeed();
      refetch();
    } catch (e) {
      toast.error(`הרצה נכשלה: ${e.message}`);
    }
    setRunning(false);
  };

  if (isLoading || !form) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
        <Loader2 size={20} className="animate-spin" color="#7c3aed" />
      </div>
    );
  }

  const lastRun = data?.config?.last_run_at ? new Date(data.config.last_run_at) : null;
  const nextRun = lastRun
    ? new Date(lastRun.getTime() + (form.interval_hours || 1) * 3600 * 1000)
    : null;
  const summary = data?.config?.last_run_summary;
  const openDemo = data?.open_demo_tasks ?? 0;
  const atCap = openDemo >= (form.max_open_tasks || 0);

  const cityOptions = ISRAELI_CITIES.filter((c) => c !== 'אחר').map((c) => ({ value: c, label: c }));
  const brandOptions = brands.map((b) => ({ value: b.id, label: b.name || b.slug || b.id.slice(-6) }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>

      {/* ── State ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 12,
        background: form.enabled ? '#f0fdf4' : '#f8faff',
        border: `1.5px solid ${form.enabled ? '#bbf7d0' : '#dce8f5'}`,
      }}>
        <button
          type="button"
          onClick={() => set({ enabled: !form.enabled })}
          aria-pressed={form.enabled}
          style={{
            width: 48, height: 28, borderRadius: 99, border: 'none', cursor: 'pointer',
            background: form.enabled ? '#16a34a' : '#cbd5e1', position: 'relative',
            flexShrink: 0, transition: 'background 0.15s',
          }}
        >
          <span style={{
            position: 'absolute', top: 3, right: form.enabled ? 3 : 23,
            width: 22, height: 22, borderRadius: '50%', background: 'white',
            boxShadow: '0 1px 4px rgba(0,0,0,0.2)', transition: 'right 0.15s',
          }} />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: form.enabled ? '#15803d' : '#475569' }}>
            {form.enabled ? 'האוטומט פעיל' : 'האוטומט כבוי'}
          </div>
          <div style={{ fontSize: 10, color: '#64748b', marginTop: 1 }}>
            {form.enabled
              ? `מחזור כל ${form.interval_hours} שע' · ${openDemo} משימות דמו פתוחות`
              : 'ההגדרות נשמרות — המחזור לא יתבצע עד שתדליק'}
          </div>
        </div>
      </div>

      {atCap && form.enabled && (
        <div style={{ display: 'flex', gap: 7, alignItems: 'center', padding: '7px 10px', background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 10 }}>
          <AlertTriangle size={13} color="#d97706" style={{ flexShrink: 0 }} />
          <span style={{ fontSize: 10.5, color: '#b45309', lineHeight: 1.5 }}>
            הגעת לתקרה של {form.max_open_tasks} משימות פתוחות — המחזור יסגור משימות ישנות אבל לא יפרסם חדשות.
          </span>
        </div>
      )}

      {/* ── Cadence ── */}
      <Row title="קצב" hint="ה-workflow רץ כל שעה; המחזור מתבצע רק כשעבר פרק הזמן הזה.">
        <Num label="כל כמה שעות" value={form.interval_hours} min={1} max={168} onChange={(v) => set({ interval_hours: v })} />
        <Num label="תקרת משימות פתוחות" value={form.max_open_tasks} min={5} max={500} onChange={(v) => set({ max_open_tasks: v })} />
      </Row>

      {/* ── Publish ── */}
      <Row title="פרסום במחזור">
        <Num label="מינימום משימות" value={form.tasks_min} min={1} max={100} onChange={(v) => set({ tasks_min: v })} />
        <Num label="מקסימום משימות" value={form.tasks_max} min={1} max={100} onChange={(v) => set({ tasks_max: v })} />
      </Row>
      <Row title="סגירת משימות ישנות במחזור" hint="נסגרות המשימות הוותיקות ביותר — חלקן הושלמו, חלקן נלקחו וחלקן פגו.">
        <Num label="מינימום" value={form.close_min} min={0} max={50} onChange={(v) => set({ close_min: v })} />
        <Num label="מקסימום" value={form.close_max} min={0} max={50} onChange={(v) => set({ close_max: v })} />
      </Row>

      {/* ── Engagement ── */}
      <Row title="צפיות לכל משימה פתוחה" hint="נוסף לכל משימה דמו פתוחה בכל מחזור.">
        <Num label="מינימום" value={form.views_min} min={0} max={500} onChange={(v) => set({ views_min: v })} />
        <Num label="מקסימום" value={form.views_max} min={0} max={500} onChange={(v) => set({ views_max: v })} />
      </Row>
      <Row title="כניסות לכל משימה פתוחה">
        <Num label="מינימום" value={form.clicks_min} min={0} max={200} onChange={(v) => set({ clicks_min: v })} />
        <Num label="מקסימום" value={form.clicks_max} min={0} max={200} onChange={(v) => set({ clicks_max: v })} />
      </Row>
      <Row title="מועמדים למשימה נבחרת" hint="בכל מחזור נבחרות עד 3 משימות שכל אחת מקבלת פניות חדשות.">
        <Num label="מינימום" value={form.applicants_min} min={0} max={20} onChange={(v) => set({ applicants_min: v })} />
        <Num label="מקסימום" value={form.applicants_max} min={0} max={20} onChange={(v) => set({ applicants_max: v })} />
      </Row>

      {/* ── Prices ── */}
      <Row title="טווח מחירים (₪)">
        <Num label="מינימום" value={form.min_price} min={0} max={100000} onChange={(v) => set({ min_price: v })} />
        <Num label="מקסימום" value={form.max_price} min={0} max={100000} onChange={(v) => set({ max_price: v })} />
      </Row>

      {/* ── Scope ── */}
      <ChipMultiSelect
        label="ערים"
        options={cityOptions}
        value={form.cities || []}
        onChange={(v) => set({ cities: v })}
        hint="ריק = תל אביב בלבד."
      />
      <ChipMultiSelect
        label="קטגוריות"
        options={categoryOptions}
        value={form.categories || []}
        onChange={(v) => set({ categories: v })}
        hint="ריק = כל הקטגוריות הפעילות בקטלוג."
      />
      <ChipMultiSelect
        label="מותגים"
        options={brandOptions}
        value={form.brand_ids || []}
        onChange={(v) => set({ brand_ids: v })}
        color="#0f2b6b"
        hint="ריק = המותג המובלע של הפלטפורמה."
      />

      {/* ── Actions ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
        <button
          type="button"
          onClick={save}
          disabled={saving}
          style={{
            height: 40, borderRadius: 11, border: 'none', cursor: saving ? 'not-allowed' : 'pointer',
            background: 'linear-gradient(135deg,#1a6fd4,#0a52b0)', color: 'white',
            fontWeight: 800, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <><Save size={14} /> שמור הגדרות</>}
        </button>
        <button
          type="button"
          onClick={runNow}
          disabled={running}
          style={{
            height: 40, borderRadius: 11, cursor: running ? 'not-allowed' : 'pointer',
            background: '#7c3aed', color: 'white', border: 'none',
            fontWeight: 800, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            opacity: running ? 0.7 : 1,
          }}
        >
          {running ? <Loader2 size={14} className="animate-spin" /> : <><Play size={14} /> הרץ מחזור עכשיו</>}
        </button>
      </div>

      {/* ── Last run ── */}
      <div style={{ background: '#f8faff', borderRadius: 11, padding: '9px 11px', border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 800, color: '#0f2b6b', marginBottom: 5 }}>
          <Clock size={12} color="#64748b" /> מצב המחזור
        </div>
        {!lastRun ? (
          <div style={{ fontSize: 10.5, color: '#94a3b8' }}>המחזור עוד לא רץ. אפשר להריץ ידנית למעלה.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3, fontSize: 10.5, color: '#475569' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>ריצה אחרונה</span>
              <strong style={{ color: '#0f2b6b' }}>{lastRun.toLocaleString('he-IL')}</strong>
            </div>
            {nextRun && form.enabled && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>מחזור הבא</span>
                <strong style={{ color: '#0f2b6b' }}>{nextRun.toLocaleString('he-IL')}</strong>
              </div>
            )}
            {summary && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>פורסמו / נסגרו</span>
                  <strong style={{ color: '#0f2b6b' }}>{summary.published ?? 0} / {summary.closed ?? 0}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>פניות חדשות</span>
                  <strong style={{ color: '#0f2b6b' }}>{summary.new_applicants ?? 0}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>משימות שעודכנו</span>
                  <strong style={{ color: '#0f2b6b' }}>{summary.aged_tasks ?? 0}</strong>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}