import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { ArrowRight, Loader2, ExternalLink } from 'lucide-react';
import { useBrand } from '@/lib/brand/BrandProvider';
import BrandGeneralTab from '@/components/admin/brand/BrandGeneralTab';
import BrandDesignTab from '@/components/admin/brand/BrandDesignTab';
import BrandDomainsTab from '@/components/admin/brand/BrandDomainsTab';
import BrandCategoriesTab from '@/components/admin/brand/BrandCategoriesTab';
import BrandMarketplaceTab from '@/components/admin/brand/BrandMarketplaceTab';
import BrandDashboardTab from '@/components/admin/brand/BrandDashboardTab';
import BrandDangerTab from '@/components/admin/brand/BrandDangerTab';
import { Pill } from '@/components/admin/brand/brandUi';
import { fetchGlobalCategories } from '@/lib/brand/globalCategories';

/**
 * Brand Studio — everything about one Brand in one place.
 *
 * Sections: overview · design system · domains · categories · marketplace ·
 * dashboard · danger zone. Each section owns its own save state; nothing waits
 * on a full page reload.
 */

const TABS = [
  ['overview', 'סקירה'],
  ['identity', 'זהות'],
  ['design', 'מערכת עיצוב'],
  ['categories', 'קטגוריות'],
  ['marketplace', 'שוק'],
  ['domains', 'דומיינים'],
  ['dashboard', 'דשבורד'],
  ['danger', 'אזור מסוכן'],
];

const STATUS = {
  active: { tone: 'green', text: 'פעיל' },
  suspended: { tone: 'amber', text: 'מושהה' },
  archived: { tone: 'red', text: 'ארכיון' },
};

export default function BrandManager() {
  const { brandId } = useParams();
  const navigate = useNavigate();
  const { brandId: surfaceBrandId } = useBrand();
  const [tab, setTab] = useState('overview');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['adminBrand', brandId],
    queryFn: async () => {
      const [brands, configs, domains, categories] = await Promise.all([
        base44.entities.Brand.filter({ id: brandId }),
        base44.entities.BrandConfig.filter({ brand_id: brandId }),
        base44.entities.BrandDomain.filter({ brand_id: brandId }, 'created_date', 100),
        base44.entities.BrandCategory.filter({ brand_id: brandId }, 'sort_order', 300),
      ]);
      return {
        brand: brands?.[0] || null,
        config: configs?.[0] || null,
        domains: domains || [],
        categories: categories || [],
      };
    },
    enabled: !!brandId,
  });

  // The global catalogue — shared by every Brand, so it is cached once.
  const { data: globalCategories = [] } = useQuery({
    queryKey: ['globalCategories'],
    queryFn: fetchGlobalCategories,
    enabled: !!brandId,
  });

  const brand = data?.brand;
  const config = data?.config;
  const domains = data?.domains || [];
  const categories = data?.categories || [];
  const onSaved = () => refetch();

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
        <Loader2 size={26} className="animate-spin" color="#1a6fd4" />
      </div>
    );
  }

  if (!brand) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)' }}>
        המותג לא נמצא
      </div>
    );
  }

  const primary = domains.find((d) => d.is_primary) || domains[0];
  const status = STATUS[brand.status] || STATUS.suspended;
  const isSurfaceBrand = surfaceBrandId === brand.id;
  const themeTokens = config?.theme ? Object.keys(config.theme).length : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Header */}
      <div style={{
        background: 'var(--surface-2)', border: '1px solid var(--border-1)',
        borderRadius: 16, padding: 16, display: 'flex', flexDirection: 'column', gap: 12,
      }}>
        <button
          onClick={() => navigate('/admin?tab=brands')}
          style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: 0,
            display: 'inline-flex', alignItems: 'center', gap: 6,
            fontSize: 12, fontWeight: 800, color: 'var(--text-2)', alignSelf: 'flex-start',
          }}
        >
          <ArrowRight size={14} /> חזרה למותגים
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          {config?.logo_url ? (
            <img src={config.logo_url} alt="" style={{ width: 52, height: 52, borderRadius: 14, objectFit: 'contain', background: 'var(--surface-1)' }} />
          ) : (
            <div style={{
              width: 52, height: 52, borderRadius: 14, flexShrink: 0,
              background: config?.theme?.primary || config?.primary_color || '#1a6fd4',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontWeight: 900, fontSize: 22,
            }}>
              {(brand.name || '?').charAt(0)}
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 20, fontWeight: 900, color: 'var(--text-1)' }}>
                {config?.display_name || brand.name}
              </span>
              <Pill tone={status.tone}>{status.text}</Pill>
              {brand.is_default && <Pill tone="blue">פלטפורמה</Pill>}
              {isSurfaceBrand && <Pill tone="green">המותג הנוכחי</Pill>}
              {themeTokens > 0 && <Pill tone="gray">{themeTokens} ערכי עיצוב</Pill>}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-3)', fontFamily: 'ui-monospace, monospace', marginTop: 3 }}>
              {brand.slug}
            </div>
          </div>
          {primary && (
            <a
              href={`https://${primary.hostname}`}
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6, height: 38, padding: '0 14px',
                borderRadius: 11, background: 'var(--surface-1)', border: '1px solid var(--border-1)',
                color: 'var(--text-1)', fontSize: 12, fontWeight: 800, textDecoration: 'none',
              }}
            >
              <ExternalLink size={14} /> {primary.hostname}
            </a>
          )}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
          {TABS.map(([key, label]) => {
            const active = tab === key;
            return (
              <button
                key={key}
                onClick={() => setTab(key)}
                style={{
                  height: 38, padding: '0 15px', borderRadius: 11, fontSize: 13, fontWeight: 800,
                  whiteSpace: 'nowrap', cursor: 'pointer',
                  border: active ? 'none' : '1px solid var(--border-1)',
                  background: active
                    ? 'linear-gradient(135deg, var(--brand-btn-primary-bg, #1a6fd4), var(--brand-primary-dark, #0a52b0))'
                    : 'var(--surface-1)',
                  color: active ? 'var(--brand-btn-primary-text, white)' : 'var(--text-2)',
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {tab === 'overview' && <BrandDashboardTab brand={brand} />}
      {tab === 'identity' && <BrandGeneralTab brand={brand} config={config} onSaved={onSaved} />}
      {tab === 'design' && <BrandDesignTab brand={brand} config={config} onSaved={onSaved} />}
      {tab === 'domains' && <BrandDomainsTab brand={brand} domains={domains} />}
      {tab === 'categories' && (
        <BrandCategoriesTab brand={brand} rows={categories} globalRows={globalCategories} />
      )}
      {tab === 'marketplace' && <BrandMarketplaceTab brand={brand} config={config} onSaved={onSaved} />}
      {tab === 'dashboard' && <BrandDashboardTab brand={brand} />}
      {tab === 'danger' && <BrandDangerTab brand={brand} />}
    </div>
  );
}