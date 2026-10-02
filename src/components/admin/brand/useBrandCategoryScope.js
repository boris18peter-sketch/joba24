import { useEffect, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
const scopeOf = b => ({ assigned_parent_keys: b.assigned_parent_keys || [], excluded_child_keys: b.excluded_child_keys || [] });
export default function useBrandCategoryScope(brand) {
  const cache = useQueryClient(), [scope,setScope] = useState(() => scopeOf(brand));
  const current = useRef(scope), saved = useRef(scope), version = useRef(0), outstanding = useRef(0);
  useEffect(() => { if (!outstanding.current) { const next=scopeOf(brand); saved.current=next; current.current=next; setScope(next); } }, [brand]);
  const mutation = useMutation({
    scope: { id: `brand-category-scope:${brand.id}` },
    mutationFn: async payload => {
      const res = await base44.functions.invoke('adminManageCategory', { action:'set_scope', brand_id:brand.id, ...payload.value });
      if (!res.data?.success) throw new Error(res.data?.error);
      return res.data.brand;
    },
    onSuccess: (updated,payload) => {
      saved.current=scopeOf(updated);
      if (payload.version !== version.current) return;
      cache.setQueryData(['adminBrand',brand.id],old => old ? { ...old,brand:updated } : old);
      cache.setQueryData(['brandScope',brand.id],updated);
      cache.invalidateQueries({ queryKey:['brandDashboard',brand.id] });
      cache.invalidateQueries({ queryKey:['adminBrands'] });
    },
    onError: (_,payload) => { if (payload.version === version.current) { current.current=saved.current; setScope(saved.current); toast.error('השמירה נכשלה; חזרנו להגדרה האחרונה שנשמרה'); } },
    onSettled: () => { outstanding.current--; },
  });
  const change = (field,key,enabled) => {
    const value = { ...current.current, [field]: enabled ? [...new Set([...current.current[field],key])] : current.current[field].filter(k => k !== key) };
    current.current=value; setScope(value); outstanding.current++;
    mutation.mutate({ value,version:++version.current });
  };
  return { scope, saving:mutation.isPending, parent:(key,on) => change('assigned_parent_keys',key,on), child:(key,on) => change('excluded_child_keys',key,!on) };
}