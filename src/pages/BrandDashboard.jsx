import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  ArrowRight, Loader2, ShieldAlert, TrendingUp, ClipboardList, Users, Flag, Headphones,
} from 'lucide-react';
import { useBrandAccess } from '@/hooks/useBrandAccess';
import BrandTabButton from '@/components/brand/dashboard/BrandTabButton';
import BrandTasksTab from '@/components/brand/dashboard/BrandTasksTab';
import BrandUsersTab from '@/components/brand/dashboard/BrandUsersTab';
import BrandReportsTab from '@/components/brand/dashboard/BrandReportsTab';
import BrandSupportTab from '@/components/brand/dashboard/BrandSupportTab';
import BrandDashboardTab from '@/components/admin/brand/BrandDashboardTab';

/**
 * BrandDashboard — a Brand's own dashboard, for the people granted access to it.
 *
 * Same shell, same components and same visual language as the platform Admin
 * dashboard, with only the tabs that make sense for ONE Brand: analytics, tasks,
 * users, reports and support.
 *
 * Every figure and every row is attributed to this Brand's id — nothing is
 * inferred. Access is decided by an explicit brand_admin grant, so the page
 * asks useBrandAccess() before it shows anything.
 */
export default function BrandDashboard() {
  const { brandId } = useParams();
  const navigate = useNavigate();
  const { brands, isLoading: accessLoading } = useBrandAccess();
  const [tab, setTab] = useState('analytics');

  const { data: brand, isLoading } = useQuery({
    queryKey: ['brandForDashboard', brandId],
    enabled: !!brandId,
    queryFn: async () => {
      const res = await base44.entities.Brand.filter({ id: brandId }, { limit: 1 });
      return (res.items || [])[0] || null;
    },
  });

  const allowed = brands.some((b) => b.brand_id === brandId);

  const { data: panel } = useQuery({
    queryKey: ['brandPanel', brandId],
    enabled: !!brandId && allowed,
    queryFn: async () => {
      const res = await base44.functions.invoke('getBrandPanel', { brand_id: brandId });
      return res?.data?.success ? res.data : null;
    },
  });

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

  const counts = panel?.counts || {};
  const stats = [
    { label: 'משימות', value: counts.tasks_total ?? '—' },
    { label: 'פתוחות', value: counts.tasks_open ?? '—' },
    { label: 'משתמשים', value: counts.users_total ?? '—' },
    { label: 'דיווחים', value: counts.reports_pending ?? '—' },
  ];

  return (
    <div dir="rtl" style={{ flexShrink: 0, paddingBottom: 28 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px 10px' }}>
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

      {/* Stats strip */}
      <div style={{ background: 'linear-gradient(135deg, #0f2b6b, #1a6fd4)', padding: '12px 16px 18px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          {stats.map((s) => (
            <div key={s.label} style={{ background: 'rgba(255,255,255,0.12)', borderRadius: 12, padding: '10px 8px', textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 900, color: 'white' }}>{s.value}</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ padding: '16px 16px 0', display: 'flex', gap: 8, overflowX: 'auto', scrollbarWidth: 'none' }}>
        <BrandTabButton active={tab === 'analytics'} onClick={() => setTab('analytics')}>
          <TrendingUp size={13} style={{ display: 'inline', marginLeft: 4 }} /> אנליטיקה
        </BrandTabButton>
        <BrandTabButton active={tab === 'tasks'} onClick={() => setTab('tasks')}>
          <ClipboardList size={13} style={{ display: 'inline', marginLeft: 4 }} /> משימות
        </BrandTabButton>
        <BrandTabButton active={tab === 'users'} onClick={() => setTab('users')}>
          <Users size={13} style={{ display: 'inline', marginLeft: 4 }} /> משתמשים
        </BrandTabButton>
        <BrandTabButton active={tab === 'reports'} onClick={() => setTab('reports')}>
          <Flag size={13} style={{ display: 'inline', marginLeft: 4 }} /> דיווחים
          {counts.reports_pending > 0 && (
            <span style={{ marginRight: 4, background: '#dc2626', color: 'white', fontSize: 10, padding: '1px 5px', borderRadius: 10, fontWeight: 800 }}>
              {counts.reports_pending}
            </span>
          )}
        </BrandTabButton>
        <BrandTabButton active={tab === 'support'} onClick={() => setTab('support')}>
          <Headphones size={13} style={{ display: 'inline', marginLeft: 4 }} /> תמיכה
          {counts.support_unread > 0 && (
            <span style={{ marginRight: 4, background: '#dc2626', color: 'white', fontSize: 10, padding: '1px 5px', borderRadius: 10, fontWeight: 800 }}>
              {counts.support_unread}
            </span>
          )}
        </BrandTabButton>
      </div>

      {/* Tab content */}
      <div style={{ padding: '12px 16px 0' }}>
        {tab === 'analytics' && <BrandDashboardTab brand={brand} />}
        {tab === 'tasks' && <BrandTasksTab tasks={panel?.tasks || []} />}
        {tab === 'users' && <BrandUsersTab users={panel?.users || []} />}
        {tab === 'reports' && <BrandReportsTab reports={panel?.reports || []} />}
        {tab === 'support' && <BrandSupportTab messages={panel?.support || []} />}
      </div>
    </div>
  );
}