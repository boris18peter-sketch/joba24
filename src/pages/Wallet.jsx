import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { useTaskSheet } from '@/lib/TaskSheetContext';
import { TrendingUp, Trophy, Briefcase, RotateCcw, Coins, Clock, CheckCircle2, XCircle, Ban } from 'lucide-react';
import CreditIcon from '@/components/CreditIcon';
import BackButton from '@/components/BackButton';
import PageHeader from '@/components/PageHeader';
import SubscriptionManager from '@/components/credits/SubscriptionManager';
import { useLanguage } from '@/lib/LanguageContext';

// STATUS_TABS defined inside component to use translations


function TaskRow({ task, badge, onRepost, badgeMap, repostLabel }) {
  const navigate = useNavigate();
  const { openTaskSheet } = useTaskSheet();
  const b = badgeMap[badge] || badgeMap.inprogress;
  return (
    <div style={{ background: 'var(--surface-2)', borderRadius: 14, border: '1px solid var(--border-1)', padding: '13px 14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
        <div onClick={() => openTaskSheet(task.id)} style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)', flex: 1, cursor: 'pointer', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.title}</div>
        <div style={{ fontSize: 15, fontWeight: 900, color: '#111', flexShrink: 0 }}>₪{task.price}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 20, background: b.bg, color: b.color }}>{b.label}</span>
        {onRepost &&
        <button onClick={() => onRepost(task)}
        style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700, color: '#1a6fd4', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '5px 11px', cursor: 'pointer' }}>
            <RotateCcw size={12} /> {repostLabel}
          </button>
        }
      </div>
    </div>);

}

export default function Wallet() {
  const navigate = useNavigate();
  const { openTaskSheet } = useTaskSheet();
  const { t, isRTL } = useLanguage();
  const [activeTab, setActiveTab] = useState('inprogress');

  const STATUS_TABS = [
    { key: 'inprogress', label: t('active'), icon: '🟣' },
    { key: 'completed', label: t('completed'), icon: '✅' },
    { key: 'applications', label: t('applications'), icon: '📋' },
  ];

  const { data: me } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });
  const { data: workerTasks = [] } = useQuery({
    queryKey: ['walletWorkerTasks', me?.id],
    queryFn: () => base44.entities.Task.filter({ worker_id: me.id }, '-created_date', 50),
    enabled: !!me?.id,
    staleTime: 30000,
  });
  const { data: creditTxns = [] } = useQuery({
    queryKey: ['creditTxns', me?.id],
    queryFn: () => base44.entities.CreditTransaction.filter({ user_id: me.id }, '-created_date', 30),
    enabled: !!me?.id,
  });

  const { data: myApplications = [] } = useQuery({
    queryKey: ['myApplications', me?.id],
    // task_title is already denormalized on TaskApplication at creation time — no N+1 needed
    queryFn: () => base44.entities.TaskApplication.filter({ worker_id: me.id }, '-created_date', 50),
    enabled: !!me?.id,
  });

  const completedCount = workerTasks.filter((t) => t.status === 'COMPLETED').length;

  const inProgressTasks = workerTasks.filter((t) => t.status === 'TAKEN');
  const completedWorkerTasks = workerTasks.filter((t) => t.status === 'COMPLETED');

  const tabTasks = {
    inprogress: inProgressTasks,
    completed: completedWorkerTasks,
  };

  const tabBadge = { inprogress: 'inprogress', completed: 'paid' };

  const badgeMap = {
    inprogress: { label: t('in_progress'), bg: '#ede9fe', color: '#6d28d9' },
    awaiting: { label: t('awaiting_payment'), bg: '#fef3c7', color: '#92400e' },
    paid: { label: t('paid'), bg: '#dcfce7', color: '#166534' },
    cancelled: { label: t('cancelled_refund'), bg: '#fef9ec', color: '#b45309' }
  };

  const appStatusConfig = {
    pending:  { label: t('waiting_approval_short'), bg: '#fef3c7', color: '#92400e', icon: Clock },
    approved: { label: `${t('approved') || 'אושר'} ✅`, bg: '#dcfce7', color: '#166534', icon: CheckCircle2 },
    rejected: { label: t('notif_app_rejected') || 'נדחה', bg: '#fee2e2', color: '#991b1b', icon: XCircle },
    cancelled:{ label: t('cancel') || 'בוטל', bg: '#f3f4f6', color: '#6b7280', icon: Ban },
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--surface-1)' }} dir={isRTL ? 'rtl' : 'ltr'}>
      <PageHeader title={t('wallet_title')} />

      {/* Stats hero */}
      <div style={{ background: 'linear-gradient(140deg, #0f2b6b 0%, #1a6fd4 100%)', padding: '28px 20px 24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          {[
            { icon: Trophy, label: t('completed_count'), value: completedCount },
            { icon: TrendingUp, label: t('active_now'), value: inProgressTasks.length },
            { icon: Coins, label: t('credits'), value: me?.worker_credits ?? 100 },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: 14, border: '1px solid rgba(255,255,255,0.08)' }}>
              <Icon size={13} color="rgba(255,255,255,0.6)" style={{ marginBottom: 4 }} />
              <div style={{ color: 'white', fontSize: 22, fontWeight: 900 }}>{value}</div>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: '14px 16px 0', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Active subscriptions */}
        <SubscriptionManager />

        {/* Credits History */}
        {creditTxns.length > 0 && (
          <div style={{ background: 'var(--surface-2)', borderRadius: 16, border: '1px solid var(--border-1)', overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-1)', display: 'flex', alignItems: 'center', gap: 8 }}>
               <Coins size={15} color="#1a6fd4" />
               <span style={{ fontWeight: 800, fontSize: 14, color: 'var(--text-1)' }}>{t('credit_history')}</span>
             </div>
            <div style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 2 }}>
              {creditTxns.map((txn) => {
                const typeLabels = {
                  Signup_Bonus: t('tx_signup_bonus') || 'Signup Bonus',
                  Application_Fee: t('tx_application_fee') || 'Application Fee',
                  Refund_Rejection: t('tx_refund_rejection') || 'Refund — Rejected',
                  Refund_Expiration: t('tx_refund_expiration') || 'Refund — Expired',
                  Loyalty_Reward: t('tx_loyalty_reward') || 'Loyalty Reward',
                  Purchase: t('tx_purchase') || 'Credit Purchase',
                  Story_Publication: 'פרסום סטורי',
                };
                const isPositive = txn.amount > 0;
                return (
                  <div key={txn.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 4px', borderBottom: '1px solid var(--border-1)' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>{typeLabels[txn.type] || txn.type}</div>
                      {txn.task_title && <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 1 }}>{txn.task_title}</div>}
                    </div>
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontSize: 15, fontWeight: 900, color: isPositive ? '#16a34a' : '#dc2626', display: 'flex', alignItems: 'center', gap: 4 }}>
                        {isPositive ? '+' : ''}{txn.amount} <CreditIcon size={15} />
                      </div>
                      {txn.balance_after !== undefined && (
                        <div style={{ fontSize: 10, color: '#aaa', textAlign: 'left' }}>{t('balance_after') || 'Balance'}: {txn.balance_after}</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* My worker tasks */}
        <div style={{ background: 'var(--surface-2)', borderRadius: 16, border: '1px solid var(--border-1)', overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-1)', display: 'flex', alignItems: 'center', gap: 8 }}>
             <Briefcase size={15} color="#0f2b6b" />
             <span style={{ fontWeight: 800, fontSize: 14, color: 'var(--text-1)' }}>{t('my_tasks_worker')}</span>
            {inProgressTasks.length > 0 && (
              <span style={{ background: '#dc2626', color: 'white', fontSize: 10, fontWeight: 900, padding: '2px 7px', borderRadius: 20 }}>{inProgressTasks.length}</span>
            )}
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border-1)' }}>
            {STATUS_TABS.map((tab) => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                style={{ flex: 1, padding: '10px 4px', fontSize: 12, fontWeight: 700, cursor: 'pointer', background: 'none', border: 'none', borderBottom: activeTab === tab.key ? '2px solid #1a6fd4' : '2px solid transparent', color: activeTab === tab.key ? '#1a6fd4' : 'var(--text-2)', transition: 'all 0.15s' }}>
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {activeTab === 'applications' ? (
              myApplications.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px 0', color: '#bbb', fontSize: 13 }}>📋 {t('no_tasks_here')}</div>
              ) : (
                myApplications.map((app) => {
                  const cfg = appStatusConfig[app.status] || appStatusConfig.pending;
                  const StatusIcon = cfg.icon;
                  return (
                    <div key={app.id} onClick={() => openTaskSheet(app.task_id)}
                      style={{ background: 'var(--surface-2)', borderRadius: 14, border: '1px solid var(--border-1)', padding: '12px 14px', cursor: 'pointer' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {app.task_title || app.task_id}
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 20, background: cfg.bg, color: cfg.color, display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                          <StatusIcon size={11} /> {cfg.label}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: '#9ca3af' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><CreditIcon size={13} /> {app.credits_charged}</span>
                        {(app.status === 'rejected' || app.status === 'cancelled') && app.credits_charged > 0 && (
                          <span style={{ color: '#16a34a', fontWeight: 700 }}>← {t('notif_credits_returned')}</span>
                        )}
                      </div>
                    </div>
                  );
                })
              )
            ) : tabTasks[activeTab].length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 0', color: '#bbb', fontSize: 13 }}>
                {activeTab === 'inprogress' ? `💼 ${t('no_tasks_here')}` : `🏆 ${t('no_completed_tasks_yet')}`}
              </div>
            ) : (
              tabTasks[activeTab].map((task) => (
                <TaskRow key={task.id} task={task} badge={tabBadge[activeTab]} badgeMap={badgeMap} repostLabel={t('repost')} />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );

}