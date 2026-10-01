import { useState } from 'react';
import { base44 } from '@/api/base44Client';

// ════════════════════════════════════════════════════════════════════════
// TEMPORARY — Package 4.1.1 field-level-security runtime verification.
//
// Not linked from anywhere. Reachable only by typing the route directly.
// DELETE THIS FILE AND ITS ROUTE once the verdict has been recorded in
// docs/MULTIBRAND_RESTORE_RUNBOOK.md.
//
// It operates on ONE throwaway user and nothing else. It never reads or
// writes any other User record, and it never touches Tasks,
// TaskApplications, credits, KYC, payments or any marketplace data.
// ════════════════════════════════════════════════════════════════════════

const THROWAWAY_EMAIL = 'boris18peter+joba24probe@gmail.com';
const THROWAWAY_ID = '6abecbd306d8b265edba72c5';
// The throwaway's own password. Embedded only because the app's login screen
// derives its password from the email address, so this account cannot be
// signed into through the UI. It is a throwaway with no privileges and is
// removed together with this page.
const THROWAWAY_PASSWORD = 'C3probe_9fA2x7Qm!';
const TEST_BRAND = 'UNAUTHORIZED_TEST_BRAND';
const TOKEN_KEY = 'base44_access_token';

const C = {
  ink: '#0f2b6b', body: '#334155', muted: '#64748b',
  line: '#e2e8f0', surface: '#ffffff', page: '#f2f5fb',
  ok: '#059669', okBg: '#f0fdf4', okLine: '#86efac',
  bad: '#dc2626', badBg: '#fff1f2', badLine: '#fecaca',
  warn: '#d97706', warnBg: '#fffbeb', warnLine: '#fde68a',
  blue: '#1a6fd4',
};

function Row({ label, value, tone }) {
  const color = tone === 'ok' ? C.ok : tone === 'bad' ? C.bad : C.ink;
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, padding: '8px 0', borderBottom: `1px solid ${C.line}` }}>
      <span style={{ fontSize: 13, color: C.muted, fontWeight: 600 }}>{label}</span>
      <span style={{ fontSize: 13, color, fontWeight: 800, textAlign: 'right', wordBreak: 'break-all' }}>{value}</span>
    </div>
  );
}

function Card({ title, children }) {
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 14, padding: 16, marginBottom: 12 }}>
      <div style={{ fontSize: 13, fontWeight: 900, color: C.ink, marginBottom: 8, letterSpacing: 0.2 }}>{title}</div>
      {children}
    </div>
  );
}

export default function FlsProbe411() {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  const restoreSession = (token) => {
    try {
      if (token) base44.auth.setToken(token, true);
      else {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem('token');
      }
    } catch {}
  };

  const run = async () => {
    setBusy(true);
    setResult(null);

    let originalToken = null;
    try { originalToken = localStorage.getItem(TOKEN_KEY); } catch {}
    const r = { identity: null, control: null, fls: null, cleanup: null, verdict: null, notes: [] };

    const finish = (verdict, notes) => {
      r.verdict = verdict;
      if (notes) r.notes = r.notes.concat(notes);
      setResult({ ...r });
    };

    try {
      // ── 1. Establish the throwaway session ────────────────────────────
      const login = await base44.auth.loginViaEmailPassword(THROWAWAY_EMAIL, THROWAWAY_PASSWORD);
      const lu = login?.user;
      if (!lu || lu.id !== THROWAWAY_ID || (lu.email || '').toLowerCase() !== THROWAWAY_EMAIL) {
        return finish('INCONCLUSIVE', ['Login did not return the throwaway account. Zero writes were performed.']);
      }

      // ── 2. Confirm the live session matches BOTH identifiers ──────────
      const me = await base44.auth.me();
      if (!me || me.id !== THROWAWAY_ID || (me.email || '').toLowerCase() !== THROWAWAY_EMAIL) {
        return finish('INCONCLUSIVE', ['The authenticated identity does not match the throwaway. Zero writes were performed.']);
      }
      r.identity = { id: me.id, email: me.email, role: me.role || null };

      // ── 3. Capture the throwaway's original values ────────────────────
      const bioBefore = me.bio ?? null;
      const brandBefore = Array.isArray(me.brand_ids) ? [...me.brand_ids] : null;

      // ── 4. CONTROL — a field that is legitimately client-writable ─────
      const testBio = 'FLS-PROBE-' + Date.now();
      let controlError = null;
      try { await base44.auth.updateMe({ bio: testBio }); }
      catch (e) { controlError = String(e?.message || e); }
      const afterControl = await base44.auth.me();
      const controlPersisted = (afterControl?.bio ?? null) === testBio;
      r.control = { error: controlError, persisted: controlPersisted };

      if (!controlPersisted) {
        try { await base44.auth.updateMe({ bio: bioBefore }); } catch {}
        const fin = await base44.auth.me().catch(() => null);
        r.cleanup = {
          bio_restored: (fin?.bio ?? null) === bioBefore,
          test_brand_absent: !(Array.isArray(fin?.brand_ids) && fin.brand_ids.includes(TEST_BRAND)),
        };
        return finish('INCONCLUSIVE', ['The normal-user write path could not be validated: the control write did not persist. The brand_ids result is therefore not interpretable.']);
      }

      // ── 5. FLS TEST — brand_ids is field-level rls.write:false ────────
      let flsError = null;
      try { await base44.auth.updateMe({ brand_ids: [TEST_BRAND] }); }
      catch (e) { flsError = String(e?.message || e); }
      const afterFls = await base44.auth.me();
      const brandAfter = Array.isArray(afterFls?.brand_ids) ? afterFls.brand_ids : null;
      const brandPersisted = Array.isArray(brandAfter) && brandAfter.includes(TEST_BRAND);
      r.fls = { error: flsError, brand_ids_after: brandAfter, persisted: brandPersisted };

      // ── 6. CLEANUP — mandatory ────────────────────────────────────────
      try { await base44.auth.updateMe({ bio: bioBefore }); } catch {}
      if (brandPersisted) {
        const cleaned = brandAfter.filter((b) => b !== TEST_BRAND);
        try { await base44.auth.updateMe({ brand_ids: cleaned }); } catch {}
      }
      const fin = await base44.auth.me().catch(() => null);
      r.cleanup = {
        bio_restored: (fin?.bio ?? null) === bioBefore,
        bio_value: fin?.bio ?? null,
        test_brand_absent: !(Array.isArray(fin?.brand_ids) && fin.brand_ids.includes(TEST_BRAND)),
        brand_ids_final: Array.isArray(fin?.brand_ids) ? fin.brand_ids : null,
        brand_ids_original: brandBefore,
      };

      // ── 7. VERDICT ────────────────────────────────────────────────────
      return finish(brandPersisted ? 'FAIL' : 'PASS');
    } catch (e) {
      return finish('INCONCLUSIVE', ['Unexpected error: ' + String(e?.message || e)]);
    } finally {
      restoreSession(originalToken);
      setBusy(false);
    }
  };

  const v = result?.verdict;
  const vc = v === 'PASS' ? { bg: C.okBg, line: C.okLine, fg: C.ok }
    : v === 'FAIL' ? { bg: C.badBg, line: C.badLine, fg: C.bad }
    : { bg: C.warnBg, line: C.warnLine, fg: C.warn };

  return (
    <div style={{ minHeight: '100dvh', background: C.page, padding: '28px 16px', fontFamily: 'var(--font-inter, Inter, sans-serif)', overflowY: 'auto' }}>
      <div style={{ maxWidth: 620, margin: '0 auto' }}>

        <div style={{ fontSize: 11, fontWeight: 800, color: C.muted, letterSpacing: 1.2, marginBottom: 6 }}>TEMPORARY · PACKAGE 4.1.1</div>
        <h1 style={{ fontSize: 22, fontWeight: 900, color: C.ink, margin: '0 0 6px' }}>Field-level security verification</h1>
        <p style={{ fontSize: 13, color: C.body, margin: '0 0 18px', lineHeight: 1.6 }}>
          Confirms that <strong>brand_ids</strong> cannot be written by a normal signed-in user, while an ordinary
          profile field still can. It runs entirely against the throwaway test account and restores it afterwards.
          Your own session is put back when it finishes.
        </p>

        <button
          onClick={run}
          disabled={busy}
          style={{
            width: '100%', height: 50, borderRadius: 14, border: 'none', cursor: busy ? 'not-allowed' : 'pointer',
            background: busy ? '#93b8e4' : `linear-gradient(135deg, ${C.blue}, #0a52b0)`,
            color: '#fff', fontSize: 15, fontWeight: 900, marginBottom: 18,
            boxShadow: '0 4px 14px rgba(26,111,212,0.28)',
          }}
        >
          {busy ? 'Running verification…' : 'Run verification'}
        </button>

        {result && (
          <>
            <div style={{ background: vc.bg, border: `1.5px solid ${vc.line}`, borderRadius: 16, padding: '18px 16px', marginBottom: 14, textAlign: 'center' }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: C.muted, letterSpacing: 1.2, marginBottom: 4 }}>VERDICT</div>
              <div style={{ fontSize: 30, fontWeight: 900, color: vc.fg, letterSpacing: 0.5 }}>{v}</div>
              {v === 'PASS' && <div style={{ fontSize: 12.5, color: C.body, marginTop: 6 }}>The control field persisted and brand_ids did not.</div>}
              {v === 'FAIL' && <div style={{ fontSize: 12.5, color: C.body, marginTop: 6 }}>brand_ids persisted from a normal user session.</div>}
              {v === 'INCONCLUSIVE' && <div style={{ fontSize: 12.5, color: C.body, marginTop: 6 }}>The normal-user write path itself could not be validated.</div>}
            </div>

            {result.identity && (
              <Card title="Authenticated identity">
                <Row label="User ID" value={result.identity.id} />
                <Row label="Email" value={result.identity.email} />
                <Row label="Role" value={result.identity.role} />
              </Card>
            )}

            {result.control && (
              <Card title="Control write — bio">
                <Row label="Persisted" value={result.control.persisted ? 'YES' : 'NO'} tone={result.control.persisted ? 'ok' : 'bad'} />
                {result.control.error && <Row label="Error" value={result.control.error} />}
              </Card>
            )}

            {result.fls && (
              <Card title={`FLS write — brand_ids → ${TEST_BRAND}`}>
                <Row label="Persisted" value={result.fls.persisted ? 'YES' : 'NO'} tone={result.fls.persisted ? 'bad' : 'ok'} />
                <Row label="Rejected with error" value={result.fls.error ? 'YES' : 'NO'} />
                {result.fls.error && <Row label="Error" value={result.fls.error} />}
                <Row label="brand_ids after write" value={result.fls.brand_ids_after === null ? 'absent' : JSON.stringify(result.fls.brand_ids_after)} />
              </Card>
            )}

            {result.cleanup && (
              <Card title="Cleanup">
                <Row label="bio restored to original" value={result.cleanup.bio_restored ? 'YES' : 'NO'} tone={result.cleanup.bio_restored ? 'ok' : 'bad'} />
                <Row label={`${TEST_BRAND} absent`} value={result.cleanup.test_brand_absent ? 'YES' : 'NO'} tone={result.cleanup.test_brand_absent ? 'ok' : 'bad'} />
                {result.cleanup.brand_ids_final !== undefined && (
                  <Row label="brand_ids final" value={result.cleanup.brand_ids_final === null ? 'absent' : JSON.stringify(result.cleanup.brand_ids_final)} />
                )}
              </Card>
            )}

            {result.notes?.length > 0 && (
              <Card title="Notes">
                {result.notes.map((n, i) => (
                  <div key={i} style={{ fontSize: 12.5, color: C.body, lineHeight: 1.6 }}>{n}</div>
                ))}
              </Card>
            )}

            <div style={{ fontSize: 11.5, color: C.muted, textAlign: 'center', lineHeight: 1.6, paddingBottom: 24 }}>
              Your session was restored automatically. Reload the app if anything looks off.
            </div>
          </>
        )}
      </div>
    </div>
  );
}