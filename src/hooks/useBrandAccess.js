import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

/**
 * useBrandAccess — which Brands' dashboards may THIS user open?
 *
 * Access is a grant, not a guess: a user sees a Brand only when they hold an
 * active `brand_admin` membership for it. A platform admin sees every active
 * Brand. Ordinary membership (created by posting or applying on a Brand) does
 * NOT grant a dashboard — otherwise every worker would see every Brand's numbers.
 */
export function useBrandAccess() {
  const { data, isLoading } = useQuery({
    queryKey: ['myBrandAccess'],
    staleTime: 60000,
    queryFn: async () => {
      let me = null;
      try {
        me = await base44.auth.me();
      } catch {
        return { me: null, brands: [] };
      }
      if (!me) return { me: null, brands: [] };

      // Platform admins already have the full admin console.
      if (me.role === 'admin') {
        const all = await base44.entities.Brand.filter({ status: 'active' }, { limit: 50 });
        return {
          me,
          brands: (all.items || []).map((b) => ({
            brand_id: b.id, name: b.name, slug: b.slug, role: 'platform_admin',
          })),
        };
      }

      const memberships = await base44.entities.BrandMembership.filter(
        { user_id: me.id }, { limit: 50 }
      );
      const granted = (memberships.items || []).filter(
        (m) => m.role === 'brand_admin' && m.status !== 'suspended'
      );
      if (!granted.length) return { me, brands: [] };

      const res = await base44.entities.Brand.filter(
        { id: { $in: granted.map((m) => m.brand_id) } }, { limit: 50 }
      );
      const byId = new Map((res.items || []).map((b) => [b.id, b]));

      return {
        me,
        brands: granted.map((m) => ({
          brand_id: m.brand_id,
          name: byId.get(m.brand_id)?.name || 'מותג',
          slug: byId.get(m.brand_id)?.slug || '',
          role: 'brand_admin',
        })),
      };
    },
  });

  return { me: data?.me || null, brands: data?.brands || [], isLoading };
}

export default useBrandAccess;