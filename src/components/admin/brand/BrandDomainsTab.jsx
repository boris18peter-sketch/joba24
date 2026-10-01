import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import {
  Globe, Plus, CheckCircle2, Star, Power, PowerOff, Trash2,
  Loader2, AlertTriangle, Info, RefreshCw,
} from 'lucide-react';
import { Section, Field, inputStyle, Pill, Btn, card, mono } from '@/components/admin/brand/brandUi';

/**
 * Domains — real domain management over BrandDomain.
 *
 * WHAT THIS SECTION DOES AND DOES NOT DO
 *
 * Registering a hostname here tells the APP RUNTIME which Brand owns that
 * hostname (hostname → BrandDomain → Brand → BrandConfig). It does NOT connect
 * the domain at the platform/network level.
 *
 * The platform step — adding the domain in the Base44 dashboard's Domains page,
 * pointing DNS at Base44, and verifying there — cannot be performed from
 * application code. So a domain is only ever shown as connected after a real
 * server-side check confirms the hostname serves this app.
 *
 * Flow:  Add → pending (DNS shown) → platform step + DNS → Verify → verified
 *        → Activate → runtime resolves this Brand on that hostname
 */

const DNS_TARGET = 'base44.onrender.com';
const ROOT_A = '216.24.57.1';

function isSubdomain(hostname, brandSlug) {
  const parts = String(hostname || '').split('.');
  if (parts.length <= 2) return false;
  return true;
}

/** The REAL DNS records for this hostname, per the platform's documented setup. */
function dnsRecordsFor(hostname) {
  const sub = isSubdomain(hostname);
  const firstLabel = String(hostname || '').split('.')[0];
  if (sub) {
    return [
      { type: 'CNAME', name: firstLabel, value: DNS_TARGET, note: 'רשומת CNAME לתת-הדומיין' },
    ];
  }
  return [
    { type: 'ANAME / ALIAS', name: '@', value: DNS_TARGET, note: 'מומלץ אם ספק הדומיין תומך' },
    { type: 'או A', name: '@', value: ROOT_A, note: 'אם ANAME/ALIAS אינו נתמך' },
    { type: 'CNAME', name: 'www', value: DNS_TARGET, note: 'עבור www' },
  ];
}

const STATUS_META = {
  active: { tone: 'green', text: 'פעיל' },
  pending: { tone: 'amber', text: 'ממתין' },
  disabled: { tone: 'gray', text: 'מושבת' },
};

function DnsInstructions({ hostname }) {
  const records = dnsRecordsFor(hostname);
  return (
    <div style={{
      background: 'var(--surface-1)', border: '1px solid var(--border-1)',
      borderRadius: 12, padding: 12, marginTop: 10,
    }}>
      <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-1)', marginBottom: 8 }}>
        רשומות DNS נדרשות עבור <span style={mono}>{hostname}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {records.map((r, i) => (
          <div key={i} style={{
            display: 'grid', gridTemplateColumns: '92px 1fr', gap: 8, alignItems: 'center',
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
        יש להסיר רשומות AAAA (IPv6) ורשומות CAA שחוסמות רשויות אישורים.
        התפשטות DNS עשויה לקחת עד 48 שעות.
      </div>
    </div>
  );
}

function DomainRow({ domain, brand, onAction, busy }) {
  const [showDns, setShowDns] = useState(false);
  const meta = STATUS_META[domain.status] || STATUS_META.pending;
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
        <Pill tone={verified ? 'green' : 'amber'}>
          {verified ? 'מאומת' : 'לא מאומת'}
        </Pill>
      </div>

      {!verified && (
        <div style={{
          background: 'var(--color-warning-bg)', border: '1px solid var(--color-warning-border)',
          borderRadius: 10, padding: 10, display: 'flex', gap: 8, alignItems: 'flex-start',
        }}>
          <AlertTriangle size={14} color="#d97706" style={{ flexShrink: 0, marginTop: 1 }} />
          <div style={{ fontSize: 12, color: '#92400e', lineHeight: 1.6 }}>
            <b>נדרש חיבור פלטפורמה.</b> הדומיין רשום ב-Joba24 אך טרם מחובר לרשת.
            יש להוסיף אותו בעמוד <b>Domains</b> בלוח הבקרה של Base44, להפנות את רשומות ה-DNS,
            ולאמת שם. רק לאחר מכן ניתן לאמת ולהפעיל כאן.
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <Btn variant="soft" onClick={() => setShowDns((v) => !v)} style={{ height: 34, fontSize: 12 }}>
          {showDns ? 'הסתר' : 'הצג'} רשומות DNS
        </Btn>
        <Btn variant="soft" loading={busy === 'verify'} onClick={() => onAction('verify')} style={{ height: 34, fontSize: 12 }}>
          <RefreshCw size={13} /> אמת דומיין
        </Btn>
        {!domain.is_primary && (
          <Btn variant="soft" loading={busy === 'set_primary'} onClick={() => onAction('set_primary')} style={{ height: 34, fontSize: 12 }}>
            <Star size={13} /> קבע כראשי
          </Btn>
        )}
        {domain.status !== 'active' ? (
          <Btn variant="success" loading={busy === 'activate'} disabled={!verified} onClick={() => onAction('activate')} style={{ height: 34, fontSize: 12 }}>
            <Power size={13} /> הפעל
          </Btn>
        ) : (
          <Btn variant="soft" loading={busy === 'deactivate'} onClick={() => onAction('deactivate')} style={{ height: 34, fontSize: 12 }}>
            <PowerOff size={13} /> השבת
          </Btn>
        )}
        <Btn variant="danger" loading={busy === 'remove'} onClick={() => onAction('remove')} style={{ height: 34, fontSize: 12 }}>
          <Trash2 size={13} /> הסר
        </Btn>
      </div>

      {!verified && domain.status !== 'active' && (
        <div style={{ fontSize: 11, color: 'var(--text-3)' }}>
          הפעלה חסומה עד לאימות מוצלח.
        </div>
      )}

      {showDns && <DnsInstructions hostname={domain.hostname} />}
    </div>
  );
}

export default function BrandDomainsTab({ brand, domains }) {
  const queryClient = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [hostname, setHostname] = useState('');
  const [busy, setBusy] = useState(null);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['adminBrandDomains', brand.id] });

  const invoke = async (payload) => {
    const res = await base44.functions.invoke('adminManageDomain', { brand_id: brand.id, ...payload });
    return res?.data;
  };

  const add = async () => {
    if (!hostname.trim()) { toast.error('יש להזין דומיין'); return; }
    setBusy('add');
    try {
      const data = await invoke({ action: 'add', hostname });
      if (!data?.success) {
        toast.error(
          data?.error === 'hostname_invalid' ? 'דומיין לא תקין'
            : data?.error === 'domain_taken' ? `הדומיין כבר רשום למותג אחר`
            : 'הוספת הדומיין נכשלה'
        );
        return;
      }
      setHostname('');
      setAdding(false);
      refresh();
      toast.success('הדומיין נרשם — נדרש חיבור פלטפורמה ואימות');
    } catch (e) {
      toast.error('הוספת הדומיין נכשלה');
    } finally {
      setBusy(null);
    }
  };

  const action = (domain, act) => async () => {
    if (act === 'remove' && !window.confirm(`להסיר את ${domain.hostname}?`)) return;
    setBusy(`${act}:${domain.id}`);
    try {
      const data = await invoke({ action: act, domain_id: domain.id });
      if (!data?.success) {
        toast.error(
          data?.error === 'not_verified' ? 'יש לאמת את הדומיין לפני הפעלה'
            : data?.error === 'last_domain' ? 'לא ניתן להסיר את הדומיין היחיד'
            : data?.error === 'reassign_primary_first' ? 'יש לקבוע דומיין ראשי אחר לפני הסרה'
            : data?.error === 'cannot_remove_default_domain' ? 'לא ניתן להסיר דומיין של מותג הפלטפורמה'
            : data?.error === 'cannot_disable_primary_default' ? 'לא ניתן להשבית את הדומיין הראשי של הפלטפורמה'
            : 'הפעולה נכשלה'
        );
        return;
      }
      if (act === 'verify') {
        if (data.serves_app) toast.success('הדומיין אומת — הוא מגיש את האפליקציה');
        else if (data.reachable) toast.error(`הדומיין מגיב (${data.status}) אך אינו מגיש את האפליקציה`);
        else toast.error('לא ניתן להגיע לדומיין — בדוק את רשומות ה-DNS');
      } else {
        toast.success('הפעולה בוצעה');
      }
      refresh();
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
        desc="כל דומיין שממופה למותג הזה. הדומיין קובע איזה מותג יוצג לגולש."
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
            רישום הדומיין כאן קובע לאיזה מותג הוא שייך בתוך האפליקציה.
            חיבור הדומיין בפועל לרשת מתבצע בלוח הבקרה של Base44 (עמוד Domains) ואינו ניתן לביצוע מתוך האפליקציה.
            דומיין לא יוצג כמחובר לפני שיאומת בפועל.
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
            brand={brand}
            busy={busy && busy.endsWith(d.id) ? busy.split(':')[0] : null}
            onAction={(act) => action(d, act)()}
          />
        ))}
      </Section>
    </>
  );
}