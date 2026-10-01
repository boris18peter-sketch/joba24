import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import {
  Globe, Plus, Star, Power, PowerOff, Trash2, AlertTriangle, Info, RefreshCw, Loader2, ExternalLink,
} from 'lucide-react';
import { Section, Field, inputStyle, Pill, Btn, card, mono, refreshBrand } from '@/components/admin/brand/brandUi';

/**
 * Domains — the real BrandDomain lifecycle.
 *
 * TWO DIFFERENT THINGS, never blurred:
 *
 *   ROUTING (this app) — a hostname registered here with status 'active' makes
 *   the runtime serve THIS Brand on that hostname.
 *
 *   CONNECTION (the platform) — making the hostname actually resolve to this app
 *   requires adding it in the platform's Domains page and pointing DNS at it.
 *   That CANNOT be done from application code, so the exact external action is
 *   shown here and a domain is never shown as connected until a real server-side
 *   check confirms it serves the app.
 *
 * Lifecycle: add → pending setup → pending verification → verified → active
 */

const STATUS_META = {
  pending_setup: { tone: 'amber', text: 'ממתין להגדרה' },
  pending_verification: { tone: 'amber', text: 'ממתין לאימות' },
  verified: { tone: 'blue', text: 'מאומת' },
  active: { tone: 'green', text: 'פעיל' },
  disabled: { tone: 'gray', text: 'מושבת' },
};

function statusOf(d) {
  if (d.status === 'disabled') return 'disabled';
  if (d.status === 'active' && d.verified_at) return 'active';
  if (d.verified_at) return 'verified';
  return d.last_checked_at ? 'pending_verification' : 'pending_setup';
}

function isSubdomain(hostname) {
  return String(hostname || '').split('.').length > 2;
}

/** The real DNS records a human must create, per the platform's setup. */
function dnsRecordsFor(hostname) {
  const apex = String(hostname || '').split('.').slice(1).join('.');
  if (isSubdomain(hostname)) {
    return [
      { type: 'CNAME', name: String(hostname).split('.')[0], value: apex, note: `הצבע על ${apex}` },
      { type: 'CNAME', name: '*', value: apex, note: 'אופציונלי — wildcard לכל תת-דומיין' },
    ];
  }
  return [
    { type: 'ANAME / ALIAS', name: '@', value: 'היעד שמופיע בלוח הבקרה', note: 'מומלץ אם ספק הדומיין תומך' },
    { type: 'CNAME', name: 'www', value: 'היעד שמופיע בלוח הבקרה', note: 'עבור www' },
  ];
}

function ExternalStep({ hostname }) {
  const records = dnsRecordsFor(hostname);
  return (
    <div style={{
      background: 'var(--surface-1)', border: '1px solid var(--border-1)',
      borderRadius: 12, padding: 12, marginTop: 10,
    }}>
      <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-1)', marginBottom: 8 }}>
        הפעולה הנדרשת מחוץ לאפליקציה עבור <span style={mono}>{hostname}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {records.map((r, i) => (
          <div key={i} style={{
            display: 'grid', gridTemplateColumns: '104px 1fr', gap: 8, alignItems: 'center',
            background: 'var(--surface-2)', borderRadius: 9, padding: '8px 10px',
          }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-2)' }}>{r.type}</div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12, ...mono, color: 'var(--text-1)', wordBreak: 'break-all' }}>
                {r.name} → {r.value}
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2 }}>{r.note}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 8, lineHeight: 1.6 }}>
        שלבים: הוספת הדומיין ב-<b>Domains</b> בלוח הבקרה של הפלטפורמה → יצירת רשומות ה-DNS →
        הסרת רשומות AAAA/CAA חוסמות → המתנה להתפשטות → <b>אמת דומיין</b> כאן.
      </div>
    </div>
  );
}

function DomainRow({ domain, onAction, busy }) {
  const [showDns, setShowDns] = useState(false);
  const state = statusOf(domain);
  const meta = STATUS_META[state];
  const verified = !!domain.verified_at;

  return (
    <div style={{ ...card, padding: 13, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap' }}>
        <Globe size={15} color="var(--text-3)" />
        <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-1)', ...mono, wordBreak: 'break-all' }}>
          {domain.hostname}
        </span>
        <Pill tone={meta.tone}>{meta.text}</Pill>
        {domain.is_primary && <Pill tone="blue">ראשי</Pill>}
        <Pill tone="gray">{isSubdomain(domain.hostname) ? 'תת-דומיין' : 'דומיין מותאם'}</Pill>
      </div>

      {state !== 'active' && state !== 'verified' && (
        <div style={{
          background: 'var(--color-warning-bg)', border: '1px solid var(--color-warning-border)',
          borderRadius: 10, padding: 10, display: 'flex', gap: 8, alignItems: 'flex-start',
        }}>
          <AlertTriangle size={14} color="#d97706" style={{ flexShrink: 0, marginTop: 1 }} />
          <div style={{ fontSize: 12, color: '#92400e', lineHeight: 1.6 }}>
            <b>לא מחובר.</b> הדומיין רשום ב-Joba24 אך אינו מגיש את האפליקציה.
            {domain.last_checked_at
              ? ' בדיקת האימות נכשלה — בדוק את רשומות ה-DNS ולחץ שוב.'
              : ' יש להשלים את הפעולה החיצונית ואז לאמת.'}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <Btn variant="soft" onClick={() => setShowDns((v) => !v)} style={{ height: 34, fontSize: 12 }}>
          {showDns ? 'הסתר' : 'הצג'} פעולה נדרשת
        </Btn>
        <Btn variant="soft" loading={busy === 'verify'} onClick={() => onAction('verify')} style={{ height: 34, fontSize: 12 }}>
          <RefreshCw size={13} /> אמת דומיין
        </Btn>
        {!domain.is_primary && (
          <Btn variant="soft" loading={busy === 'set_primary'} onClick={() => onAction('set_primary')} style={{ height: 34, fontSize: 12 }}>
            <Star size={13} /> קבע כראשי
          </Btn>
        )}
        {state !== 'active' ? (
          <Btn variant="success" loading={busy === 'activate'} disabled={!verified}
            onClick={() => onAction('activate')} style={{ height: 34, fontSize: 12 }}>
            <Power size={13} /> הפעל ניתוב
          </Btn>
        ) : (
          <Btn variant="soft" loading={busy === 'deactivate'} onClick={() => onAction('deactivate')} style={{ height: 34, fontSize: 12 }}>
            <PowerOff size={13} /> השבת ניתוב
          </Btn>
        )}
        <Btn variant="danger" loading={busy === 'remove'} onClick={() => onAction('remove')} style={{ height: 34, fontSize: 12 }}>
          <Trash2 size={13} /> הסר
        </Btn>
      </div>

      {!verified && (
        <div style={{ fontSize: 11, color: 'var(--text-3)' }}>
          הפעלת הניתוב חסומה עד לאימות מוצלח.
        </div>
      )}

      {domain.last_checked_at && (
        <div style={{ fontSize: 11, color: 'var(--text-3)' }}>
          נבדק לאחרונה: {new Date(domain.last_checked_at).toLocaleString('he-IL')}
        </div>
      )}

      {showDns && <ExternalStep hostname={domain.hostname} />}
    </div>
  );
}

export default function BrandDomainsTab({ brand, domains }) {
  const queryClient = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [hostname, setHostname] = useState('');
  const [busy, setBusy] = useState(null);

  const { data: routing, isLoading: routingLoading } = useQuery({
    queryKey: ['adminBrandRouting', brand.id],
    queryFn: async () => {
      const res = await base44.functions.invoke('adminManageDomain', { brand_id: brand.id, action: 'routing' });
      return res?.data?.routing || [];
    },
    enabled: !brand.is_default && domains.length > 0,
  });

  const invoke = async (payload) => {
    const res = await base44.functions.invoke('adminManageDomain', { brand_id: brand.id, ...payload });
    return res?.data;
  };

  const errText = (code) =>
    code === 'hostname_invalid' ? 'דומיין לא תקין'
      : code === 'domain_taken' ? 'הדומיין כבר רשום למותג אחר'
      : code === 'not_verified' ? 'יש לאמת את הדומיין לפני הפעלת ניתוב'
      : code === 'last_domain' ? 'למותג חייב להישאר לפחות דומיין אחד'
      : code === 'cannot_remove_default_domain' ? 'לא ניתן להסיר דומיין של מותג הפלטפורמה'
      : code === 'cannot_disable_primary_default' ? 'לא ניתן להשבית את הדומיין הראשי של הפלטפורמה'
      : 'הפעולה נכשלה';

  const add = async () => {
    if (!hostname.trim()) { toast.error('יש להזין דומיין'); return; }
    setBusy('add');
    try {
      const data = await invoke({ action: 'add', hostname });
      if (!data?.success) { toast.error(errText(data?.error)); return; }
      setHostname('');
      setAdding(false);
      refreshBrand(queryClient, brand.id);
      queryClient.invalidateQueries({ queryKey: ['adminBrandRouting', brand.id] });
      toast.success('הדומיין נרשם — נדרשת פעולה חיצונית ואימות');
    } catch (e) {
      toast.error('הוספת הדומיין נכשלה');
    } finally {
      setBusy(null);
    }
  };

  const action = (domain, act) => async () => {
    if (act === 'remove' && !window.confirm(`להסיר את ${domain.hostname}? הניתוב למותג יוסר.`)) return;
    setBusy(`${act}:${domain.id}`);
    try {
      const data = await invoke({ action: act, domain_id: domain.id });
      if (!data?.success) { toast.error(errText(data?.error)); return; }
      if (act === 'verify') {
        if (data.serves_app) toast.success('הדומיין אומת — הוא מגיש את האפליקציה');
        else if (data.reachable) toast.error(`הדומיין מגיב (${data.status}) אך אינו מגיש את האפליקציה`);
        else toast.error('לא ניתן להגיע לדומיין — בדוק את רשומות ה-DNS');
      } else if (act === 'remove') {
        toast.success('הדומיין הוסר');
      } else {
        toast.success('הפעולה בוצעה');
      }
      refreshBrand(queryClient, brand.id);
      queryClient.invalidateQueries({ queryKey: ['adminBrandRouting', brand.id] });
    } catch (e) {
      toast.error('הפעולה נכשלה');
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <Section
        title="דומיינים"
        desc="כל דומיין שממופה למותג הזה. דומיין פעיל קובע איזה מותג יוצג לגולש."
        actions={
          !adding && (
            <Btn onClick={() => setAdding(true)} style={{ height: 36, fontSize: 13 }}>
              <Plus size={15} /> הוסף דומיין
            </Btn>
          )
        }
      >
        <div style={{
          background: 'var(--surface-1)', border: '1px solid var(--border-1)',
          borderRadius: 12, padding: 12, display: 'flex', gap: 9, alignItems: 'flex-start',
        }}>
          <Info size={15} color="var(--text-3)" style={{ flexShrink: 0, marginTop: 1 }} />
          <div style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.65 }}>
            רישום כאן קובע לאיזה מותג הדומיין שייך בתוך האפליקציה.
            חיבור הדומיין בפועל מתבצע בלוח הבקרה של הפלטפורמה ובספק ה-DNS, ואינו ניתן לביצוע מתוך האפליקציה.
            לכן דומיין לא יוצג כמחובר לפני שיאומת בבדיקה אמיתית.
          </div>
        </div>

        {adding && (
          <div style={{ ...card, padding: 13, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Field label="דומיין" hint="לדוגמה: events.joba24.com או saveadate.co.il">
              <input
                style={{ ...inputStyle, ...mono }}
                value={hostname}
                onChange={(e) => setHostname(e.target.value)}
                placeholder="events.joba24.com"
                autoFocus
              />
            </Field>
            <div style={{ display: 'flex', gap: 8 }}>
              <Btn onClick={add} loading={busy === 'add'}>הוסף</Btn>
              <Btn variant="soft" onClick={() => { setAdding(false); setHostname(''); }}>ביטול</Btn>
            </div>
          </div>
        )}

        {domains.length === 0 && !adding && (
          <div style={{ fontSize: 13, color: 'var(--text-3)', textAlign: 'center', padding: 20 }}>
            לא הוגדרו דומיינים למותג זה
          </div>
        )}

        {domains.map((d) => (
          <DomainRow
            key={d.id}
            domain={d}
            busy={busy && busy.endsWith(d.id) ? busy.split(':')[0] : null}
            onAction={(act) => action(d, act)()}
          />
        ))}
      </Section>

      {!brand.is_default && domains.length > 0 && (
        <Section
          title="מה נדרש מחוץ לאפליקציה"
          desc="הפעולות המדויקות שיש לבצע כדי שהדומיינים יתחברו בפועל."
          actions={routingLoading ? <Loader2 size={16} className="animate-spin" /> : null}
        >
          {(routing || []).map((r) => (
            <div key={r.id} style={{ ...card, padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 13, fontWeight: 800, ...mono, color: 'var(--text-1)' }}>{r.hostname}</span>
                <Pill tone={r.kind === 'subdomain' ? 'blue' : 'gray'}>
                  {r.kind === 'subdomain' ? 'תת-דומיין' : 'דומיין מותאם'}
                </Pill>
              </div>
              <ol style={{ margin: 0, paddingInlineStart: 18, fontSize: 12, color: 'var(--text-2)', lineHeight: 1.75 }}>
                {(r.steps || []).map((s, i) => <li key={i}>{s}</li>)}
              </ol>
              <a
                href={`https://${r.hostname}`} target="_blank" rel="noreferrer"
                style={{ fontSize: 12, fontWeight: 800, color: 'var(--brand-primary)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 5 }}
              >
                <ExternalLink size={12} /> בדוק את {r.hostname}
              </a>
            </div>
          ))}
        </Section>
      )}
    </>
  );
}