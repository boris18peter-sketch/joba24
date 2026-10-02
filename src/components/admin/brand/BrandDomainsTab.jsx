import { useState } from 'react';
import { Section, Btn } from '@/components/admin/brand/brandUi';
import BrandDomainCard from '@/components/admin/brand/BrandDomainCard';
import useDomainActions from '@/components/admin/brand/useDomainActions';
export default function BrandDomainsTab({ brand, domains = [] }) {
  const [hostname, setHostname] = useState(''), [adding, setAdding] = useState(false);
  const { run, busy, removal } = useDomainActions(brand);
  return <Section title="דומיינים" desc="רישום, חיבור אירוח, DNS ומיפוי מותג הם שלבים נפרדים." actions={<Btn disabled={!!busy} onClick={() => setAdding(v => !v)}>הוסף דומיין</Btn>}>
    <p className="text-sm text-jtext-2">הוספת שם כאן אינה מחברת אותו ל-Base44. יש להשלים את החיבור בעמוד Domains של Base44 ולבדוק מחדש כאן. כל תת-דומיין מתחבר בנפרד; wildcard אינו נתמך.</p>
    {adding && <div className="flex gap-2 flex-wrap">
      <input className="j-input flex-1 p-3" dir="ltr" aria-label="שם דומיין" value={hostname} onChange={e => setHostname(e.target.value)} placeholder="events.joba24.com / saveadate.co.il" />
      <Btn loading={busy?.action === 'add'} disabled={!!busy || !hostname.trim()} onClick={async () => { if (await run('add', null, hostname)) { setHostname(''); setAdding(false); } }}>רשום</Btn>
    </div>}
    {removal && <p role="status" className="rounded-lg border border-jborder-1 p-3 text-sm text-jtext-2">{removal}</p>}
    {!domains.length && <p className="text-sm text-jtext-3">אין דומיינים רשומים; המותג אינו נגיש דרך דומיין מותאם.</p>}
    {domains.map(d => <BrandDomainCard key={d.id} domain={d} brand={brand} busy={busy ? busy.id === d.id ? busy.action : 'other' : null} onAction={a => run(a, d)} />)}
  </Section>;
}