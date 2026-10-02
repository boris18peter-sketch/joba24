import { useState } from 'react';
import { Btn } from '@/components/admin/brand/brandUi';
import DomainSetupGuide from '@/components/admin/brand/DomainSetupGuide';
export default function BrandDomainCard({ domain: d, brand, busy, onAction }) {
  const [expanded, setExpanded] = useState(false);
  const protectedHost = ['joba24.com','www.joba24.com','joba24.base44.app'].includes(d.hostname);
  const checked = d.verification_version === 2;
  const ready = checked && d.platform_status === 'observed_connected' && d.dns_status === 'verified' && !!d.verified_at;
  const active = d.status === 'active' && (ready || protectedHost) && brand.status === 'active';
  const dns = { verified: 'מאומת ב-DNS ו-HTTPS', resolved: 'DNS פותר, האפליקציה לא אומתה', failed: 'אין כתובת DNS ציבורית תקינה', unknown: 'לא אומת' };
  return <article className="rounded-lg border border-jborder-1 bg-surface-2 p-4 space-y-3">
    <h3 className="font-bold text-jtext-1 break-all" dir="ltr">{d.hostname} {d.is_primary ? '· ראשי' : ''}</h3>
    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
      <div><dt className="text-jtext-3">רישום במערכת המותגים</dt><dd>רשום</dd></div>
      <div><dt className="text-jtext-3">Platform connection</dt><dd>{ready ? 'האפליקציה נצפתה ב-HTTPS' : 'לא אושר בבדיקה'}</dd></div>
      <div><dt className="text-jtext-3">DNS verification</dt><dd>{checked ? dns[d.dns_status] || dns.unknown : 'לא אומת בבדיקה החדשה'}</dd></div>
      <div><dt className="text-jtext-3">Brand mapping</dt><dd>{brand.name} · {d.status === 'active' ? 'הפעלה מוגדרת' : d.status === 'disabled' ? 'מושבת' : 'ממתין להפעלה'}</dd></div>
      <div><dt className="text-jtext-3">Active / Inactive</dt><dd className={active ? 'text-success font-bold' : 'text-jtext-2'}>{active ? 'מיפוי פעיל' : 'מיפוי לא פעיל'}{protectedHost && !ready ? ' · מיפוי ייצור שמור, תשתית טרם נבדקה' : ''}</dd></div>
    </dl>
    <p className="text-xs text-jtext-3">סטטוס התשתית מבוסס על תצפית DNS/HTTPS, לא על גישה לעמוד Domains של Base44; רישום כאן אינו הוכחת חיבור.</p>
    {d.last_checked_at && <p className="text-xs text-jtext-2">נבדק: {new Date(d.last_checked_at).toLocaleString('he-IL')} · {d.check_details?.message}</p>}
    <div className="flex gap-2 flex-wrap">
      <Btn variant="soft" disabled={!!busy} onClick={() => setExpanded(v => !v)}>הוראות חיבור / הסרה</Btn>
      <Btn variant="soft" loading={busy === 'verify'} disabled={!!busy} onClick={() => onAction('verify')}>אימות / בדיקה מחדש</Btn>
      {!d.is_primary && <Btn variant="soft" disabled={!!busy || (!ready && !protectedHost)} onClick={() => onAction('set_primary')}>קבע כראשי</Btn>}
      {d.status !== 'active' || !active ? <Btn disabled={!!busy || !ready || brand.status !== 'active'} onClick={() => onAction('activate')}>הפעל מיפוי</Btn> : <Btn variant="soft" disabled={!!busy || protectedHost} onClick={() => onAction('deactivate')}>השבת מיפוי</Btn>}
      <Btn variant="danger" disabled={!!busy || protectedHost} onClick={() => onAction('remove')}>הסר מיפוי בלבד</Btn>
    </div>
    {protectedHost && <p className="text-xs text-jtext-3">דומיין Joba24 קנוני מוגן מהסרה ומהשבתה.</p>}
    {expanded && <DomainSetupGuide hostname={d.hostname} />}
  </article>;
}