import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
export default function useDomainActions(brand) {
  const cache = useQueryClient(), [busy, setBusy] = useState(null), [removal, setRemoval] = useState('');
  const run = async (action, domain, hostname) => {
    if (busy) return false;
    if (action === 'remove' && !window.confirm(`להסיר את מיפוי ${domain.hostname}? חיבור האירוח ב-Base44 ורשומות DNS לא יוסרו. לאחר מכן יש לבצע Unlink Domain בעמוד Domains של Base44.`)) return false;
    setBusy({ action, id: domain?.id });
    try {
      const res = await base44.functions.invoke('adminManageDomain', { brand_id: brand.id, action, domain_id: domain?.id, hostname });
      const data = res.data;
      if (!data?.success) throw new Error(data?.message || data?.error);
      cache.setQueryData(['adminBrand', brand.id], old => old ? { ...old, domains: data.domains } : old);
      cache.invalidateQueries({ queryKey: ['adminBrands'] });
      if (action === 'remove') { setRemoval(data.external_step); toast.success('מיפוי המותג בלבד הוסר'); }
      else if (action === 'verify') { data.evidence?.serves_app ? toast.success('DNS ו-HTTPS אומתו; ניתן להפעיל את המיפוי') : toast.error(data.message); }
      else if (action === 'activate' && !data.activated) toast.error(data.message);
      else toast.success(action === 'add' ? 'נרשם בלבד; יש לחבר ב-Base44 וב-DNS לפני האימות' : 'המיפוי עודכן');
      return true;
    } catch (error) {
      const code = error?.response?.data?.error || error.message;
      toast.error(({ domain_taken: 'השם כבר ממופה למותג', hostname_invalid: 'שם דומיין לא תקין; wildcard אינו נתמך', not_verified: 'נדרש אימות חדש', canonical_domain_protected: 'דומיין Joba24 קנוני מוגן' })[code] || 'הפעולה נכשלה');
      return false;
    } finally { setBusy(null); }
  };
  return { run, busy, removal };
}