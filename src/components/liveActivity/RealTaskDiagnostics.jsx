import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2, RefreshCw, Plus, X, Search } from 'lucide-react';

/** Shared card styling for this admin-only screen. */
const CARD = {
  background: 'var(--surface-2)',
  border: '1px solid var(--border-1)',
  borderRadius: 'var(--r-lg)',
  padding: 14,
};
const LABEL = { fontSize: 11, fontWeight: 800, color: 'var(--text-3)', letterSpacing: 0.3, marginBottom: 6 };
const ROW = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '6px 0' };
const BTN = {
  border: '1px solid var(--border-1)', background: 'var(--surface-3)', color: 'var(--text-1)',
  borderRadius: 10, fontWeight: 800, fontSize: 12.5, padding: '8px 12px', cursor: 'pointer',
  display: 'inline-flex', alignItems: 'center', gap: 6, minHeight: 38,
};
const INPUT = {
  flex: 1, minWidth: 0, height: 38, borderRadius: 10, border: '1px solid var(--border-1)',
  background: 'var(--input-bg)', color: 'var(--text-1)', padding: '0 10px', fontSize: 13, direction: 'ltr',
};

const FLAG = (on) => ({
  fontSize: 11, fontWeight: 900, padding: '2px 8px', borderRadius: 99,
  background: on ? 'var(--color-success-bg)' : 'var(--surface-3)',
  color: on ? 'var(--color-success)' : 'var(--text-3)',
  border: `1px solid ${on ? 'var(--color-success-border)' : 'var(--border-1)'}`,
});

/**
 * RealTaskDiagnostics — the admin view of the REAL-task Live Activity.
 *
 * ── TWO JOBS ───────────────────────────────────────────────────────────────
 * 1. The allowlist: exactly which users the real-task path may run for, and
 *    whether APNs delivery is on for them (and only them). These are the two
 *    fields `isTestUser` / `mayContactApnsFor` read, so editing them is the one
 *    controlled way to widen or narrow the test.
 * 2. The evidence, per task, per role: token registered? activity started (the
 *    device's own report)? updates dispatched and accepted by Apple? ended?
 *
 * Nothing here sends anything. The only writes are to the config row, by an
 * admin, and only the two test fields plus the environment.
 */
export default function RealTaskDiagnostics() {
  const [config, setConfig] = useState(null);
  const [draftId, setDraftId] = useState('');
  const [taskId, setTaskId] = useState('');
  const [report, setReport] = useState(null);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  const loadConfig = async () => {
    const page = await base44.entities.LiveActivityConfig.list({ sort: '-updated_date', limit: 1 }).catch(() => ({ items: [] }));
    setConfig((page?.items || [])[0] || null);
  };

  useEffect(() => { loadConfig(); }, []);

  /**
   * Persist a change to the config row. An admin may create the row, which is
   * how the allowlist is switched on for the very first time; every other field
   * keeps whatever it had, so this screen can never arm the global flags.
   */
  const patchConfig = async (patch) => {
    setBusy('config');
    setError('');
    try {
      const payload = { ...patch, updated_by: 'admin', note: 'real-task test mode (Live Activity)' };
      if (config?.id) {
        const updated = await base44.entities.LiveActivityConfig.update(config.id, payload);
        setConfig({ ...config, ...(updated || payload) });
      } else {
        const created = await base44.entities.LiveActivityConfig.create({
          enabled: false,
          dry_run: true,
          ...payload,
        });
        setConfig(created);
      }
    } catch (err) {
      setError(err?.message || 'שמירה נכשלה');
    } finally {
      setBusy('');
    }
  };

  const testIds = Array.isArray(config?.test_user_ids) ? config.test_user_ids : [];

  const addId = () => {
    const id = draftId.trim();
    if (!id || testIds.includes(id)) return;
    setDraftId('');
    patchConfig({ test_user_ids: [...testIds, id] });
  };

  const removeId = (id) => patchConfig({ test_user_ids: testIds.filter((v) => v !== id) });

  const check = async () => {
    const id = taskId.trim();
    if (!id) return;
    setBusy('report');
    setError('');
    try {
      const response = await base44.functions.invoke('liveActivityRealTaskStatus', { task_id: id });
      setReport(response?.data || null);
    } catch (err) {
      setReport(null);
      setError(err?.response?.data?.error || err?.message || 'הבדיקה נכשלה');
    } finally {
      setBusy('');
    }
  };

  return (
    <div dir="rtl" style={{ padding: '6px 16px 30px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <div style={{ fontSize: 17, fontWeight: 900, color: 'var(--text-1)' }}>משימה אמיתית — מצב בדיקה</div>
        <p style={{ margin: '4px 0 0', fontSize: 12.5, lineHeight: 1.6, color: 'var(--text-2)' }}>
          Live Activity נפתחת משימה אמיתית רק עבור המשתמשים ברשימה כאן. כיבוי גלובלי נשאר בתוקף לכל השאר.
        </p>
      </div>

      {error && (
        <div style={{ ...CARD, borderColor: 'var(--color-danger-border)', background: 'var(--color-danger-bg)', color: 'var(--color-danger)', fontSize: 12.5, fontWeight: 700 }}>
          {error}
        </div>
      )}

      {/* ── The allowlist + the APNs switch for those users only ── */}
      <div style={CARD}>
        <div style={LABEL}>משתמשי בדיקה מאושרים ({testIds.length})</div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
          {testIds.length === 0 && (
            <div style={{ fontSize: 12.5, color: 'var(--text-3)' }}>אין משתמשים — המצב כבוי לחלוטין</div>
          )}
          {testIds.map((id) => (
            <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <code style={{ flex: 1, minWidth: 0, fontSize: 11.5, color: 'var(--text-2)', overflow: 'hidden', textOverflow: 'ellipsis', direction: 'ltr', textAlign: 'left' }}>{id}</code>
              <button type="button" onClick={() => removeId(id)} disabled={busy === 'config'} aria-label="הסר" style={{ ...BTN, padding: '6px 8px', minHeight: 32, color: 'var(--color-danger)' }}>
                <X size={13} />
              </button>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={draftId}
            onChange={(e) => setDraftId(e.target.value)}
            placeholder="User ID"
            style={INPUT}
          />
          <button type="button" onClick={addId} disabled={busy === 'config' || !draftId.trim()} style={BTN}>
            {busy === 'config' ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />} הוסף
          </button>
        </div>

        <div style={{ ...ROW, marginTop: 12, borderTop: '1px solid var(--border-1)', paddingTop: 12 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-1)' }}>שליחת APNs אמיתית</div>
            <div style={{ fontSize: 11.5, color: 'var(--text-2)' }}>רק למשתמשים שברשימה. כבוי = חישוב בלבד</div>
          </div>
          <button
            type="button"
            onClick={() => patchConfig({ test_apns: config?.test_apns !== true })}
            disabled={busy === 'config'}
            style={{ ...BTN, background: config?.test_apns === true ? 'var(--color-success-bg)' : 'var(--surface-3)', color: config?.test_apns === true ? 'var(--color-success)' : 'var(--text-2)', borderColor: config?.test_apns === true ? 'var(--color-success-border)' : 'var(--border-1)' }}
          >
            {config?.test_apns === true ? 'פעיל' : 'כבוי'}
          </button>
        </div>

        <div style={ROW}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-1)' }}>סביבת APNs</div>
            <div style={{ fontSize: 11.5, color: 'var(--text-2)' }}>TestFlight = production, Xcode = development</div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {['development', 'production'].map((env) => (
              <button
                key={env}
                type="button"
                onClick={() => patchConfig({ environment: env })}
                disabled={busy === 'config'}
                style={{ ...BTN, fontSize: 11.5, padding: '6px 10px', minHeight: 32, background: config?.environment === env ? 'var(--brand-primary-light)' : 'var(--surface-3)', color: config?.environment === env ? 'var(--brand-primary)' : 'var(--text-2)' }}
              >
                {env}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10, borderTop: '1px solid var(--border-1)', paddingTop: 10 }}>
          <span style={FLAG(config?.enabled === true)}>enabled</span>
          <span style={FLAG(config?.dry_run === false)}>dry_run off</span>
          <span style={FLAG(config?.test_apns === true)}>test APNs</span>
          <button type="button" onClick={loadConfig} style={{ ...BTN, minHeight: 26, padding: '2px 8px', fontSize: 11 }}>
            <RefreshCw size={11} /> רענן
          </button>
        </div>
      </div>

      {/* ── The evidence for one real task ── */}
      <div style={CARD}>
        <div style={LABEL}>משימה אמיתית — מה קרה בפועל</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={taskId}
            onChange={(e) => setTaskId(e.target.value)}
            placeholder="Task ID"
            style={INPUT}
          />
          <button type="button" onClick={check} disabled={busy === 'report' || !taskId.trim()} style={BTN}>
            {busy === 'report' ? <Loader2 size={13} className="animate-spin" /> : <Search size={13} />} בדוק
          </button>
        </div>

        {!report && (
          <p style={{ margin: '10px 0 0', fontSize: 12, color: 'var(--text-3)' }}>
            הזן מזהה משימה כדי לראות אם נוצרה פעילות, אם רשום טוקן, אילו עדכונים נשלחו והאם הסתיימה.
          </p>
        )}

        {report?.ok && (
          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <span style={FLAG(report.totals?.started > 0)}>started {report.totals?.started || 0}</span>
              <span style={FLAG(report.totals?.sent > 0)}>sent {report.totals?.sent || 0}</span>
              <span style={FLAG(report.totals?.dry_run > 0)}>dry {report.totals?.dry_run || 0}</span>
              <span style={FLAG(report.totals?.failed > 0)}>failed {report.totals?.failed || 0}</span>
              <span style={FLAG(report.totals?.ended > 0)}>ended {report.totals?.ended || 0}</span>
            </div>

            <div style={{ fontSize: 11.5, color: 'var(--text-2)' }}>
              מצב: {report.task?.status || '—'} · worker_status: {report.task?.worker_status || '—'} · קטגוריה: {report.task?.category || '—'}
            </div>

            {(report.recipients || []).map((r) => (
              <div key={`${r.user_id}|${r.role}`} style={{ border: '1px solid var(--border-1)', borderRadius: 12, padding: 10, background: 'var(--surface-1)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 900, color: 'var(--text-1)' }}>
                    {r.role === 'worker' ? 'עובד' : 'מפרסם'}
                  </div>
                  <div style={{ display: 'flex', gap: 5 }}>
                    <span style={FLAG(r.allowlisted)}>{r.allowlisted ? 'ברשימה' : 'לא ברשימה'}</span>
                    <span style={FLAG(r.gate === 'armed')}>{r.gate}</span>
                  </div>
                </div>

                <div style={{ fontSize: 11.5, color: 'var(--text-2)', lineHeight: 1.7 }}>
                  <div>טוקן: {r.tokens?.active || 0} פעיל / {r.tokens?.total || 0} · {r.tokens?.environments?.join(', ') || '—'}</div>
                  <div>state: {r.state ? `rev ${r.state.revision} · ${r.state.phase || '—'} · ${r.state.terminal ? 'הסתיים' : 'פעיל'}` : 'אין עדיין'}</div>
                  {r.state?.last_decision && <div>החלטה אחרונה: {r.state.last_decision}</div>}
                  <div>מכשיר: {(r.device || []).map((d) => d.event).join(' → ') || '—'}</div>
                  <div>שליחות: {(r.dispatches || []).map((d) => `${d.status}${d.apns_status ? ` (${d.apns_status})` : ''}`).join(' · ') || '—'}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}