import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, Cell } from 'recharts';
import { TrendingUp, Wallet, Loader2, Target, Calendar, Coins } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { useLanguage } from '@/lib/LanguageContext';

const CHART_COLORS = ['#1a6fd4'];

export default function EarningsDashboard() {
  const { t, isRTL } = useLanguage();
  const [period, setPeriod] = useState('daily'); // daily | weekly | monthly

  const { data: me } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['earningsTasks', me?.id],
    queryFn: () => base44.entities.Task.filter({ worker_id: me.id, status: 'COMPLETED' }, '-completed_at', 200),
    enabled: !!me?.id,
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });

  // Fetch credit transactions for credits-used summary
  const { data: creditTxns = [] } = useQuery({
    queryKey: ['earningsCredits', me?.id],
    queryFn: () => base44.entities.CreditTransaction.filter({ user_id: me.id }, '-created_date', 100),
    enabled: !!me?.id,
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });

  const creditsData = useMemo(() => {
    const completedTaskIds = new Set(tasks.map(t => t.id));
    const fees = creditTxns.filter(tx => tx.type === 'Application_Fee' && tx.amount < 0 && completedTaskIds.has(tx.task_id));
    const refunds = creditTxns.filter(tx => (tx.type === 'Refund_Rejection' || tx.type === 'Refund_Expiration') && completedTaskIds.has(tx.task_id));
    const totalUsed = fees.reduce((s, tx) => s + Math.abs(tx.amount), 0);
    const totalRefunded = refunds.reduce((s, tx) => s + tx.amount, 0);
    const netUsed = totalUsed - totalRefunded;
    return { totalUsed, totalRefunded, netUsed, fees, count: fees.length };
  }, [creditTxns, tasks]);

  const earningsData = useMemo(() => {
    return tasks
      .filter(task => task.price > 0 && task.completed_at)
      .map(task => {
        const dateStr = task.completed_at + (task.completed_at.endsWith('Z') || task.completed_at.includes('+') ? '' : 'Z');
        return { ...task, amount: task.price, date: new Date(dateStr) };
      })
      .sort((a, b) => b.date - a.date);
  }, [tasks]);

  const stats = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dayOfWeek = (now.getDay() + 6) % 7; // Monday = 0
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfToday.getDate() - dayOfWeek);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    let today = 0, week = 0, month = 0, total = 0;
    earningsData.forEach(e => {
      total += e.amount;
      if (e.date >= startOfToday) today += e.amount;
      if (e.date >= startOfWeek) week += e.amount;
      if (e.date >= startOfMonth) month += e.amount;
    });
    const avg = earningsData.length > 0 ? total / earningsData.length : 0;
    return { today, week, month, total, avg, count: earningsData.length };
  }, [earningsData]);

  const chartData = useMemo(() => {
    const now = new Date();
    const buckets = [];

    if (period === 'daily') {
      // Last 7 days
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(now.getDate() - i);
        d.setHours(0, 0, 0, 0);
        const next = new Date(d);
        next.setDate(d.getDate() + 1);
        const sum = earningsData
          .filter(e => e.date >= d && e.date < next)
          .reduce((s, e) => s + e.amount, 0);
        const label = d.toLocaleDateString('he-IL', { weekday: 'short' });
        buckets.push({ label, value: sum, date: d });
      }
    } else if (period === 'weekly') {
      // Last 6 weeks
      const dayOfWeek = (now.getDay() + 6) % 7;
      for (let i = 5; i >= 0; i--) {
        const start = new Date(now);
        start.setDate(now.getDate() - dayOfWeek - i * 7);
        start.setHours(0, 0, 0, 0);
        const end = new Date(start);
        end.setDate(start.getDate() + 7);
        const sum = earningsData
          .filter(e => e.date >= start && e.date < end)
          .reduce((s, e) => s + e.amount, 0);
        const weekNum = i === 0 ? t('this_week') : `${t('weekly')} ${6 - i}`;
        buckets.push({ label: weekNum, value: sum, date: start });
      }
    } else {
      // Last 6 months
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const next = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
        const sum = earningsData
          .filter(e => e.date >= d && e.date < next)
          .reduce((s, e) => s + e.amount, 0);
        const label = i === 0 ? t('this_month') : d.toLocaleDateString('he-IL', { month: 'short' });
        buckets.push({ label, value: sum, date: d });
      }
    }
    return buckets;
  }, [earningsData, period, t]);

  const summaryCards = [
    { label: t('today_earnings'), value: stats.today, icon: Calendar, bg: '#eff6ff', color: '#1a6fd4' },
    { label: t('this_week'), value: stats.week, icon: TrendingUp, bg: '#f0fdf4', color: '#059669' },
    { label: t('this_month'), value: stats.month, icon: Wallet, bg: '#fffbeb', color: '#d97706' },
    { label: t('avg_per_task'), value: stats.avg, icon: Target, bg: '#f5f3ff', color: '#7c3aed' },
  ];

  return (
    <div style={{ background: 'var(--surface-1)', minHeight: '100dvh', paddingBottom: 40 }} dir={isRTL ? 'rtl' : 'ltr'}>
      <PageHeader title={t('earnings_dashboard')} />

      {/* Hero — total earnings */}
      <div style={{ background: 'linear-gradient(135deg, #0f2b6b, #1a6fd4)', padding: '28px 20px 24px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -40, left: -40, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>{t('total_earnings')}</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontSize: 16, color: 'rgba(255,255,255,0.8)', fontWeight: 700 }}>₪</span>
            <span style={{ fontSize: 40, fontWeight: 900, color: 'white', lineHeight: 1 }}>{stats.total.toLocaleString()}</span>
          </div>
          <div style={{ display: 'flex', gap: 16, marginTop: 16 }}>
            <div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>{t('tasks_completed')}</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: 'white' }}>{stats.count}</div>
            </div>
            <div style={{ width: 1, background: 'rgba(255,255,255,0.2)' }} />
            <div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>{t('avg_per_task')}</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: 'white' }}>₪{Math.round(stats.avg).toLocaleString()}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div style={{ padding: '16px 16px 0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {summaryCards.map(card => {
          const Icon = card.icon;
          return (
            <div key={card.label} style={{ background: 'var(--surface-2)', borderRadius: 16, padding: 14, border: '1px solid var(--border-1)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 38, height: 38, borderRadius: 12, background: card.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={18} color={card.color} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600 }}>{card.label}</div>
                <div style={{ fontSize: 17, fontWeight: 900, color: 'var(--text-1)' }}>₪{Math.round(card.value).toLocaleString()}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Chart section */}
      <div style={{ padding: '16px' }}>
        <div style={{ background: 'var(--surface-2)', borderRadius: 20, padding: 18, border: '1px solid var(--border-1)', boxShadow: 'var(--shadow-xs)' }}>
          {/* Period selector */}
          <div style={{ display: 'flex', background: 'var(--surface-3)', borderRadius: 12, padding: 3, marginBottom: 18 }}>
            {[
              { key: 'daily', label: t('daily') },
              { key: 'weekly', label: t('weekly') },
              { key: 'monthly', label: t('monthly') },
            ].map(p => (
              <button key={p.key} onClick={() => setPeriod(p.key)}
                style={{ flex: 1, height: 34, borderRadius: 10, fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer', transition: 'all 0.15s',
                  background: period === p.key ? 'linear-gradient(135deg,#1a6fd4,#0a52b0)' : 'transparent',
                  color: period === p.key ? 'white' : 'var(--text-2)' }}>
                {p.label}
              </button>
            ))}
          </div>

          {isLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
              <Loader2 size={24} className="animate-spin" color="#1a6fd4" />
            </div>
          ) : chartData.every(d => d.value === 0) ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>📊</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-2)' }}>{t('no_earnings_period')}</div>
              <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>{t('earnings_will_appear')}</div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} margin={{ top: 6, right: 6, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-1)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--text-3)' }} axisLine={{ stroke: 'var(--border-1)' }} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-3)' }} axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={{ fill: 'rgba(26,111,212,0.06)' }}
                  contentStyle={{ borderRadius: 12, border: '1px solid var(--border-1)', background: 'var(--surface-2)', fontSize: 13 }}
                  formatter={v => [`₪${Math.round(v).toLocaleString()}`, t('earnings')]}
                />
                <Bar dataKey="value" radius={[8, 8, 0, 0]} maxBarSize={50}>
                  {chartData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.value > 0 ? '#1a6fd4' : '#dbe4f0'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Credits used section */}
      <div style={{ padding: '0 16px' }}>
        <div style={{ background: 'linear-gradient(135deg, #fffbeb, #fef3c7)', borderRadius: 20, padding: 18, border: '1px solid #fde68a', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
            <div style={{ width: 42, height: 42, borderRadius: 13, background: 'linear-gradient(135deg, #fbbf24, #f59e0b)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 4px 14px rgba(251,191,36,0.3)' }}>
              <Coins size={20} color="white" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#92400e' }}>ג'ובות ששומשו</div>
              <div style={{ fontSize: 11, color: '#b45309', marginTop: 1 }}>לפי משימות שבוצעו</div>
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: 24, fontWeight: 900, color: '#92400e', lineHeight: 1 }}>{creditsData.netUsed}</div>
              <div style={{ fontSize: 10, color: '#b45309', fontWeight: 600 }}>ג'ובות</div>
            </div>
          </div>
          {creditsData.totalRefunded > 0 && (
            <div style={{ display: 'flex', gap: 10, fontSize: 11, color: '#92400e', fontWeight: 600 }}>
              <span>הופרדו: <strong>{creditsData.totalUsed}</strong></span>
              <span style={{ color: '#059669' }}>הוחזרו: <strong>{creditsData.totalRefunded}</strong></span>
            </div>
          )}
        </div>

        {creditsData.fees.length > 0 && (
          <>
            <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-1)', marginBottom: 10, padding: '0 4px' }}>פירוט ג'ובות שהופרדו</div>
            <div style={{ background: 'var(--surface-2)', borderRadius: 16, border: '1px solid var(--border-1)', overflow: 'hidden', marginBottom: 16 }}>
              {creditsData.fees.slice(0, 10).map((tx, idx, arr) => {
                const diffDays = Math.floor((Date.now() - new Date(tx.created_date + (tx.created_date?.endsWith('Z') || tx.created_date?.includes('+') ? '' : 'Z')).getTime()) / 86400000);
                const dateLabel = diffDays === 0 ? t('today_label') : diffDays === 1 ? t('yesterday') : new Date(tx.created_date).toLocaleDateString('he-IL', { day: 'numeric', month: 'short' });
                return (
                  <div key={tx.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderTop: idx > 0 ? '1px solid var(--border-1)' : 'none' }}>
                    <div style={{ width: 34, height: 34, borderRadius: 10, background: '#fffbeb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Coins size={16} color="#d97706" />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tx.task_title || 'משימה'}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 1 }}>{dateLabel}</div>
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 900, color: '#d97706', flexShrink: 0 }}>{tx.amount}</div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Recent earnings list */}
      <div style={{ padding: '0 16px' }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-1)', marginBottom: 10, padding: '0 4px' }}>{t('recent_earnings')}</div>
        {earningsData.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>💸</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-2)' }}>{t('no_earnings_yet')}</div>
            <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>{t('earnings_will_appear')}</div>
          </div>
        ) : (
          <div style={{ background: 'var(--surface-2)', borderRadius: 16, border: '1px solid var(--border-1)', overflow: 'hidden' }}>
            {earningsData.slice(0, 15).map((e, idx, arr) => {
              const diffDays = Math.floor((Date.now() - e.date.getTime()) / 86400000);
              const dateLabel = diffDays === 0 ? t('today_label') : diffDays === 1 ? t('yesterday') : e.date.toLocaleDateString('he-IL', { day: 'numeric', month: 'short' });
              return (
                <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderTop: idx > 0 ? '1px solid var(--border-1)' : 'none' }}>
                  <div style={{ width: 34, height: 34, borderRadius: 10, background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <TrendingUp size={16} color="#059669" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.title}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 1 }}>{dateLabel}</div>
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 900, color: '#059669', flexShrink: 0 }}>₪{e.amount.toLocaleString()}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}