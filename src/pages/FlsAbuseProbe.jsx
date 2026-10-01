import { useState } from 'react';
import { base44 } from '@/api/base44Client';

// ════════════════════════════════════════════════════════════════════════════
// TEMPORARY — User Field Hardening (UH-5) FLS abuse probe.
//
// Runs the security abuse suite defined in the User Field Hardening audit.
// It operates ONLY on the dedicated throwaway test account and nothing else.
// It never reads or writes any other User record, and never touches Tasks,
// TaskApplications, payments or any marketplace data.
//
// Removed together with this page once the verdict is recorded.
// ════════════════════════════════════════════════════════════════════════════

const THROWAWAY_EMAIL = 'boris18peter+joba24probe@gmail.com';
const THROWAWAY_ID = '6abecbd306d8b265edba72c5';
const THROWAWAY_PASSWORD = 'C3probe_9fA2x7Qm!';

// Control field — legitimately user-writable. MUST persist, otherwise the
// write path itself is unproven and no result can be interpreted.
const CONTROL_FIELD = 'bio';
const CONTROL_VALUE = 'UH-FLS-CONTROL-DO-NOT-KEEP';

// Every protected field, with a value that would be a clear breach if stored.
const PROBES = [
  { field: 'worker_credits', value: 999999 },
  { field: 'is_verified', value: false },
  { field: 'kyc_status', value: 'approved' },
  { field: 'role', value: 'admin' },
  { field: 'is_blocked', value: true },
  { field: 'is_approved', value: true },
  { field: 'referred_by_agent_code', value: 'AGENT_FAKE' },
  { field: 'agent_code', value: 'AGENT_FAKE' },
  { field: 'agent_id', value: 'fake_agent_id' },
  { field: 'commission_rate', value: 99 },
  { field: 'referral_clicks', value: 999 },
  { field: 'instagram_verified', value: true },
  { field: 'facebook_verified', value: true },
  { field: 'tiktok_verified', value: true },
  { field: 'instagram_verify_code', value: 'HACKED' },
  { field: 'rating', value: 5 },
  { field: 'rating_count', value: 999 },
  { field: 'tasks_completed', value: 999 },
  { field: 'repeat_hires', value: 99 },
  { field: 'on_time_rate', value: 99 },
  { field: 'score_tasks', value: 999 },
  { field: 'avg_response_minutes', value: 1 },
  { field: 'trust_score', value: 999 },
  { field: 'id_number', value: '000000000' },
  { field: 'id_photo_url', value: 'https://evil.example/x.png' },
  { field: 'brand_ids', value: ['UNAUTHORIZED_TEST_BRAND'] },
];

const C = {
  ink: '#0f2b6b', body: '#334155', muted: '#64748b',
  line: '#e2e8f0', surface: '#ffffff', page: '#f2f5fb',
  ok: '#059669', okBg: '#f0fdf4', okLine: '#86efac',
  bad: '#dc2626', badBg: '#fff1f2', badLine: '#fecaca',
  blue: '#1a6fd4',
};

const same = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

function readUser(uid) {
  return (async () => {
    try { const list = await base44.entities.User.filter({ id: uid }); return list?.[0] ?? null; }
    catch { /* fall through */ }
    try { return await base44.entities.User.get(uid); }
    catch { /* fall through */ }
    return await base44.auth.me();
  })();
}

export default function FlsAbuseProbe() {
  const [status, setStatus] = useState('idle');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const run = async () => {
    setStatus('running');
    setError(null);
    setResult(null);

    const out = { identity: null, control: null, probes: [], notes: [] };

    try {
      // ── 1. Authenticate as the throwaway ──
      await base44.auth.loginViaEmailPassword(THROWAWAY_EMAIL, THROWAWAY_PASSWORD);

      const me = await base44.auth.me();
      out.identity = { email: me?.email ?? null, id: me?.id ?? null, role: me?.role ?? null };

      // ── 2. Hard identity gate — abort with ZERO writes ──
      if (!me || (me.email || '').toLowerCase() !== THROWAWAY_EMAIL || me.id !== THROWAWAY_ID) {
        setError('ABORTED — the authenticated identity is not the throwaway. Zero writes performed.');
        setResult(out);
        setStatus('done');
        return;
      }
      if (me.role === 'admin') {
        setError('ABORTED — the throwaway unexpectedly has admin role. Zero writes performed.');
        setResult(out);
        setStatus('done');
        return;
      }

      const uid = me.id;

      // ── 3. Capture the original state of every field we will touch ──
      const before = await readUser(uid);
      if (!before) {
        setError('INCONCLUSIVE — could not read the throwaway record.');
        setStatus('done');
        return;
      }
      const original = {};
      [CONTROL_FIELD, ...PROBES.map((p) => p.field)].forEach((f) => {
        original[f] = Object.prototype.hasOwnProperty.call(before, f) ? before[f] : null;
      });

      // ── 4. CONTROL — a legitimate user write MUST persist ──
      let controlWriteError = null;
      try { await base44.auth.updateMe({ [CONTROL_FIELD]: CONTROL_VALUE }); }
      catch (e) { controlWriteError = String(e?.message || e); }
      const afterControl = await readUser(uid);
      const controlPersisted = same(afterControl?.[CONTROL_FIELD], CONTROL_VALUE);
      out.control = {
        field: CONTROL_FIELD,
        writeError: controlWriteError,
        persisted: controlPersisted,
        value: afterControl?.[CONTROL_FIELD] ?? null,
      };

      // ── 5. ABUSE PROBES — one write attempt per protected field ──
      for (const probe of PROBES) {
        let writeError = null;
        try { await base44.auth.updateMe({ [probe.field]: probe.value }); }
        catch (e) { writeError = String(e?.message || e); }
        out.probes.push({ field: probe.field, attempted: probe.value, writeError });
      }

      // ── 6. Read back once and check persistence ──
      const after = await readUser(uid);
      out.probes = out.probes.map((p) => {
        const stored = Object.prototype.hasOwnProperty.call(after || {}, p.field) ? after[p.field] : null;
        const leaked = same(stored, p.attempted) && !same(stored, original[p.field]);
        return { ...p, stored, original: original[p.field], leaked };
      });

      // ── 7. Cleanup — restore anything that changed ──
      const restore = {};
      if (!same(after?.[CONTROL_FIELD], original[CONTROL_FIELD])) {
        restore[CONTROL_FIELD] = original[CONTROL_FIELD];
      }
      out.probes.forEach((p) => {
        if (p.leaked) restore[p.field] = p.original;
      });
      if (Object.keys(restore).length > 0) {
        try { await base44.auth.updateMe(restore); }
        catch (e) { out.notes.push('cleanup error: ' + String(e?.message || e)); }
      }
      const finalState = await readUser(uid);
      out.cleanup = {
        restoredFields: Object.keys(restore),
        bioRestored: same(finalState?.[CONTROL_FIELD], original[CONTROL_FIELD]),
        brandIdsClean: !(finalState?.brand_ids || []).includes('UNAUTHORIZED_TEST_BRAND'),
      };

      // ── 8. Verdict ──
      const leaked = out.probes.filter((p) => p.leaked);
      out.verdict =
        !controlPersisted ? 'INCONCLUSIVE'
        : leaked.length > 0 ? 'FAIL'
        : 'PASS';
      out.leakedFields = leaked.map((p) => p.field);

      setResult(out);
      setStatus('done');
    } catch (e) {
      setError(String(e?.message || e));
      setResult(out);
      setStatus('done');
    }
  };

  const Row = ({ label, value, tone }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, padding: '7px 0', borderBottom: `1px solid ${C.line}` }}>
      <span style={{ fontSize: 12.5, color: C.muted, fontWeight: 600 }}>{label}</span>
      <span style={{ fontSize: 12.5, fontWeight: 800, color: tone === 'ok' ? C.ok : tone === 'bad' ? C.bad : C.ink, textAlign: 'right', wordBreak: 'break-all' }}>{String(value)}</span>
    </div>
  );

  const Card = ({ title, children }) => (
    <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 14, padding: 16, marginBottom: 12 }}>
      <div style={{ fontSize: 13, fontWeight: 900, color: C.ink, marginBottom: 8 }}>{title}</div>
      {children}
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: C.page, padding: 20, fontFamily: 'Inter, system-ui, sans-serif' }} dir="ltr">
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <div style={{ fontSize: 20, fontWeight: 900, color: C.ink, marginBottom: 4 }}>
          User Field Hardening — FLS abuse probe
        </div>
        <div style={{ fontSize: 12.5, color: C.muted, marginBottom: 16 }}>
          Temporary. Runs the abuse suite against the dedicated throwaway account only.
        </div>

        {status !== 'done' && (
          <button
            onClick={run}
            disabled={status === 'running'}
            style={{
              padding: '14px 28px', borderRadius: 12, border: 'none', cursor: 'pointer',
              background: status === 'running' ? '#94a3b8' : `linear-gradient(135deg, ${C.blue}, #0a52b0)`,
              color: 'white', fontWeight: 800, fontSize: 14, marginBottom: 16,
            }}
          >
            {status === 'running' ? 'Running…' : 'Run abuse suite'}
          </button>
        )}

        {error && (
          <Card title="⚠️ Error">
            <div style={{ fontSize: 13, color: C.bad, fontWeight: 700 }}>{error}</div>
          </Card>
        )}

        {result && (
          <>
            {result.verdict && (
              <Card title="Verdict">
                <div style={{
                  fontSize: 22, fontWeight: 900,
                  color: result.verdict === 'PASS' ? C.ok : result.verdict === 'FAIL' ? C.bad : '#d97706',
                }}>
                  {result.verdict}
                </div>
                {result.verdict === 'FAIL' && (
                  <div style={{ fontSize: 13, color: C.bad, marginTop: 6 }}>
                    Leaked fields: {result.leakedFields.join(', ')}
                  </div>
                )}
              </Card>
            )}

            {result.identity && (
              <Card title="Authenticated identity">
                <Row label="email" value={result.identity.email} />
                <Row label="user id" value={result.identity.id} />
                <Row label="role" value={result.identity.role} tone={result.identity.role === 'user' ? 'ok' : 'bad'} />
              </Card>
            )}

            {result.control && (
              <Card title="Control — legitimate write must persist">
                <Row label={`updateMe({ ${result.control.field} })`} value={result.control.writeError ? 'threw: ' + result.control.writeError : 'no error'} />
                <Row label="persisted" value={result.control.persisted ? 'YES ✅' : 'NO ❌'} tone={result.control.persisted ? 'ok' : 'bad'} />
              </Card>
            )}

            {result.probes?.length > 0 && (
              <Card title={`Abuse probes — ${result.probes.length} protected fields`}>
                {result.probes.map((p) => (
                  <div key={p.field} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '6px 0', borderBottom: `1px solid ${C.line}` }}>
                    <span style={{ fontSize: 12.5, fontWeight: 700, color: C.ink, minWidth: 190 }}>{p.field}</span>
                    <span style={{ fontSize: 12, color: C.muted, flex: 1, textAlign: 'right' }}>
                      {p.writeError ? 'rejected by API' : 'accepted (no error)'}
                    </span>
                    <span style={{ fontSize: 12.5, fontWeight: 800, color: p.leaked ? C.bad : C.ok, minWidth: 110, textAlign: 'right' }}>
                      {p.leaked ? 'LEAKED ❌' : 'blocked ✅'}
                    </span>
                  </div>
                ))}
              </Card>
            )}

            {result.cleanup && (
              <Card title="Cleanup">
                <Row label="fields restored" value={result.cleanup.restoredFields.length === 0 ? 'none needed' : result.cleanup.restoredFields.join(', ')} />
                <Row label="bio restored" value={result.cleanup.bioRestored ? 'YES ✅' : 'NO ❌'} tone={result.cleanup.bioRestored ? 'ok' : 'bad'} />
                <Row label="brand_ids clean" value={result.cleanup.brandIdsClean ? 'YES ✅' : 'NO ❌'} tone={result.cleanup.brandIdsClean ? 'ok' : 'bad'} />
              </Card>
            )}

            <details style={{ marginTop: 8 }}>
              <summary style={{ fontSize: 12, color: C.muted, cursor: 'pointer' }}>Raw result</summary>
              <pre style={{ fontSize: 11, background: '#0f172a', color: '#e2e8f0', padding: 12, borderRadius: 10, overflow: 'auto' }}>
                {JSON.stringify(result, null, 2)}
              </pre>
            </details>
          </>
        )}
      </div>
    </div>
  );
}