import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { ArrowRight, Loader2, ShieldAlert } from 'lucide-react';
import { useBrandAccess } from '@/hooks/useBrandAccess';
import BrandDashboardTab from '@/components/admin/brand/BrandDashboardTab';

/**
 * BrandDashboard — a Brand's own dashboard, for the people granted access to it.
 *
 * It renders the SAME view the platform admin sees, because the numbers are the
 * Brand's numbers: every figure is attributed to this Brand's id and nothing is
 * inferred. Access is decided by the grant, so the page asks useBrandAccess()
 * before it shows anything.
 */
export default function BrandDashboard() {
  const { brandId } = useParams();
  const navigate = useNavigate();
  const { brands, isLoading: accessLoading } = useBrandAccess();

  const { data: brand, isLoading } = useQuery({
    queryKey: ['brandForDashboard', brandId],
    enabled: !!brandId,
    queryFn: async () => {
      const res = await base44.entities.Brand.filter({ id: brandId }, { limit: 1 });
      return (res.items || [])[0] || null;
    },
  });

  const allowed = brands.some((b) => b.brand_id === brandId);

  if (accessLoading || isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
        <Loader2 size={26} className="animate-spin" color="var(--brand-primary)" />
      </div>
    );
  }

  if (!allowed) {
    return (
      <div dir="rtl" style={{ padding: '48px 20px', textAlign: 'center' }}>
        <ShieldAlert size={34} color="var(--text-3)" style={{ margin: '0 auto 12px' }} />
        <div style={{ fontSize: 17, fontWeight: 900, color: 'var(--text-1)', marginBottom: 6 }}>
          אין לך גישה לדשבורד הזה
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-3)', lineHeight: 1.6, maxWidth: 340, margin: '0 auto 20px' }}>
          הגישה ניתנת על ידי מנהל הפלטפורמה. אם לדעתך זו טעות — פנה אלינו דרך הצ׳אט.
        </div>
        <button
          onClick={() => navigate('/')}
          style={{
            height: 42, padding: '0 20px', borderRadius: 12, cursor: 'pointer',
            background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-primary-dark))',
            border: 'none', color: 'white', fontSize: 14, fontWeight: 900,
          }}
        >
          חזרה לדף הבית
        </button>
      </div>
    );
  }

  return (
    <div dir="rtl" style={{ padding: '12px 16px 28px', flexShrink: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <button
          onClick={() => navigate(-1)}
          aria-label="חזרה"
          className="j-icon-btn"
          style={{
            width: 34, height: 34, borderRadius: 11, flexShrink: 0, cursor: 'pointer',
            background: 'var(--surface-3)', border: '1px solid var(--border-1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <ArrowRight size={17} color="var(--text-2)" />
        </button>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--text-1)', lineHeight: 1.15 }}>
            דשבורד {brand?.name || 'מותג'}
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 2 }}>
            כל המספרים משויכים למותג הזה בלבד
          </div>
        </div>
      </div>

      <BrandDashboardTab brand={brand} />
    </div>
  );
}