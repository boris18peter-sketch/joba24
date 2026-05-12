import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowDownLeft, ArrowUpRight, TrendingUp, Trophy, CreditCard, Lock, Briefcase, Clock, CheckCircle2, Zap, RotateCcw } from 'lucide-react';
import BackButton from '@/components/BackButton';
import { format } from 'date-fns';

const typeConfig = {
  earning: { label: 'הכנסה', color: '#16a34a', bg: '#f0fdf4', icon: ArrowDownLeft, sign: '+' },
  payment: { label: 'תשלום', color: '#dc2626', bg: '#fef2f2', icon: ArrowUpRight, sign: '-' },
  withdrawal: { label: 'משיכה', color: '#d97706', bg: '#fffbeb', icon: ArrowUpRight, sign: '-' },
};

const STATUS_TABS = [
  { key: 'inprogress', label: 'פעיל', icon: '🟣' },
  { key: 'awaiting_payment', label: 'ממתין לתשלום', icon: '💰' },
  { key: 'completed', label: 'הושלם', icon: '✅' },
  { key: 'cancelled', label: 'בוטל (פיצוי)', icon: '💸' },
];

function TaskRow({ task, badge, onRepost }) {
  const navigate = useNavigate();
  const badgeMap = {
    inprogress: { label: 'בביצוע', bg: '#ede9fe', color: '#6d28d9' },
    awaiting: { label: 'ממתין לתשלום', bg: '#fef3c7', color: '#92400e' },
    paid: { label: 'שולם', bg: '#dcfce7', color: '#166534' },
    cancelled: { label: 'בוטל — פיצוי 20%', bg: '#fef9ec', color: '#b45309' },
  };
  const b = badgeMap[badge] || badgeMap.inprogress;
  return (
    <div style={{ background: 'white', borderRadius: 14, border: '1px solid #dce8f5', padding: '13px 14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
        <div onClick={() => navigate(`/task/${task.id}`)} style={{ fontSize: 14, fontWeight: 700, color: '#0f2b6b', flex: 1, cursor: 'pointer', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.title}</div>
        <div style={{ fontSize: 15, fontWeight: 900, color: '#111', flexShrink: 0 }}>₪{task.price}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 20, background: b.bg, color: b.color }}>{b.label}</span>
        {onRepost && (
          <button onClick={() => onRepost(task)}
            style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700, color: '#1a6fd4', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '5px 11px', cursor: 'pointer' }}>
            <RotateCcw size={12} /> פרסם שוב
          </button>
        )}
      </div>
    </div>
  );
}

export default function Wallet() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('inprogress');

  const { data: me } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });
  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions', me?.id],
    queryFn: () => base44.entities.Transaction.filter({ user_id: me.id }, '-created_date', 50),
    enabled: !!me?.id,
  });
  const { data: workerTasks = [] } = useQuery({
    queryKey: ['walletWorkerTasks', me?.id],
    queryFn: () => base44.entities.Task.filter({ worker_id: me.id }, '-created_date', 50),
    enabled: !!me?.id,
    refetchInterval: 10000,
  });
  // Client tasks (for repost)
  const { data: myClientTasks = [] } = useQuery({
    queryKey: ['myClientTasks', me?.id],
    queryFn: () => base44.entities.Task.filter({ client_id: me.id }, '-created_date', 50),
    enabled: !!me?.id,
  });

  const balance = me?.wallet_balance || 0;
  const escrow = me?.escrow_balance || 0;
  const totalEarned = transactions.filter(t => t.type === 'earning').reduce((s, t) => s + t.amount, 0);
  const taskCount = transactions.filter(t => t.type === 'earning').length;

  const inProgressTasks = workerTasks.filter(t => t.status === 'TAKEN');
  const awaitingPaymentTasks = workerTasks.filter(t => t.status === 'COMPLETED' && !t.client_confirmed);
  const completedWorkerTasks = workerTasks.filter(t => t.status === 'COMPLETED');
  const cancelledWorkerTasks = workerTasks.filter(t => t.status === 'CANCELLED');

  // Client tasks that are done/cancelled/expired — can be reposted
  const repostableTasks = myClientTasks.filter(t => ['COMPLETED', 'CANCELLED', 'EXPIRED'].includes(t.status));

  const handleRepost = (task) => {
    const params = new URLSearchParams({
      repost: '1',
      title: task.title || '',
      description: task.description || '',
      price: task.price || '',
      city: task.city || '',
      location_name: task.location_name || '',
      category: task.category || '',
      estimated_time: task.estimated_time || '',
      approval_mode: task.approval_mode || 'instant',
    });
    navigate(`/create-task?${params.toString()}`);
  };

  const tabTasks = {
    inprogress: inProgressTasks,
    awaiting_payment: awaitingPaymentTasks,
    completed: completedWorkerTasks,
    cancelled: cancelledWorkerTasks,
  };

  const tabBadge = { inprogress: 'inprogress', awaiting_payment: 'awaiting', completed: 'paid', cancelled: 'cancelled' };

  return (
    <div className="min-h-screen" style={{ background: '#f4f7fb' }} dir="rtl">
      {/* Sticky header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(244,247,251,0.95)', backdropFilter: 'blur(8px)', padding: '44px 16px 10px', borderBottom: '1px solid #dce8f5', display: 'flex', alignItems: 'center', gap: 12 }}>
        <BackButton />
        <span style={{ fontWeight: 800, fontSize: 17, color: '#0f2b6b' }}>הארנק שלי</span>
      </div>

      {/* Balance hero */}
      <div style={{ background: 'linear-gradient(140deg, #0f2b6b 0%, #1a6fd4 100%)', padding: '28px 20px 24px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -40, left: -40, width: 140, height: 140, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 4 }}>
          <div>
            <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12, marginBottom: 2 }}>יתרה זמינה</div>
            <div style={{ color: 'white', fontSize: 42, fontWeight: 900, letterSpacing: -2, lineHeight: 1 }}>₪{balance.toLocaleString()}</div>
            {escrow > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 8, background: 'rgba(255,255,255,0.1)', borderRadius: 8, padding: '4px 10px', width: 'fit-content' }}>
                <Lock size={11} color="#fbbf24" />
                <span style={{ color: '#fbbf24', fontSize: 11, fontWeight: 700 }}>₪{escrow} בהחזקה</span>
              </div>
            )}
          </div>
          <button style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 14, padding: '10px 18px', color: 'white', fontWeight: 800, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Zap size={14} color="#fbbf24" /> משיכה לבנק
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 16 }}>
          {[
            { icon: TrendingUp, label: 'סה"כ הכנסות', value: `₪${totalEarned.toLocaleString()}` },
            { icon: Trophy, label: "ג'ובות שביצעת", value: taskCount },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: 10, border: '1px solid rgba(255,255,255,0.08)' }}>
              <Icon size={13} color="rgba(255,255,255,0.6)" style={{ marginBottom: 4 }} />
              <div style={{ color: 'white', fontSize: 15, fontWeight: 800 }}>{value}</div>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10 }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: '14px 16px 0', display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* My worker tasks */}
        <div style={{ background: 'white', borderRadius: 16, border: '1px solid #dce8f5', overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0f4fa', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Briefcase size={15} color="#0f2b6b" />
            <span style={{ fontWeight: 800, fontSize: 14, color: '#0f2b6b' }}>הג'ובות שלי (כעובד)</span>
            {inProgressTasks.length > 0 && (
              <span style={{ background: '#dc2626', color: 'white', fontSize: 10, fontWeight: 900, padding: '2px 7px', borderRadius: 20 }}>{inProgressTasks.length}</span>
            )}
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #f0f4fa' }}>
            {STATUS_TABS.map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                style={{ flex: 1, padding: '10px 4px', fontSize: 11, fontWeight: 700, cursor: 'pointer', background: 'none', border: 'none', borderBottom: activeTab === tab.key ? '2px solid #1a6fd4' : '2px solid transparent', color: activeTab === tab.key ? '#1a6fd4' : '#888', transition: 'all 0.15s' }}>
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {tabTasks[activeTab].length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 0', color: '#bbb', fontSize: 13 }}>
                {activeTab === 'inprogress' ? '💼 אין משימות פעילות' : activeTab === 'awaiting_payment' ? '⏳ אין ממתינות לתשלום' : activeTab === 'cancelled' ? '💸 אין משימות מבוטלות' : '🏆 אין משימות שהושלמו'}
              </div>
            ) : activeTab === 'cancelled' ? (
              tabTasks[activeTab].map(t => {
                const compensation = Math.round((t.price || 0) * 0.2);
                return (
                  <div key={t.id} style={{ background: '#fffbeb', borderRadius: 14, border: '1px solid #fde68a', padding: '13px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#0f2b6b', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</div>
                      <div style={{ flexShrink: 0, textAlign: 'left' }}>
                        <div style={{ fontSize: 11, color: '#92400e', fontWeight: 600 }}>עמלת טרחה</div>
                        <div style={{ fontSize: 16, fontWeight: 900, color: '#059669' }}>+₪{compensation}</div>
                      </div>
                    </div>
                    <div style={{ fontSize: 10, color: '#b45309', background: '#fef3c7', padding: '3px 8px', borderRadius: 20, display: 'inline-block', fontWeight: 600 }}>
                      20% מ-₪{t.price} — בוטל על ידי המפרסם
                    </div>
                  </div>
                );
              })
            ) : (
              tabTasks[activeTab].map(t => (
                <TaskRow key={t.id} task={t} badge={tabBadge[activeTab]} />
              ))
            )}
          </div>
        </div>

        {/* My posted tasks (client) — with repost */}
        {repostableTasks.length > 0 && (
          <div style={{ background: 'white', borderRadius: 16, border: '1px solid #dce8f5', overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0f4fa', display: 'flex', alignItems: 'center', gap: 8 }}>
              <RotateCcw size={15} color="#0f2b6b" />
              <span style={{ fontWeight: 800, fontSize: 14, color: '#0f2b6b' }}>ג'ובות שפרסמתי</span>
              <span style={{ fontSize: 11, color: '#999' }}>לחץ "פרסם שוב" לפרסום מחדש</span>
            </div>
            <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {repostableTasks.map(t => (
                <TaskRow key={t.id} task={t}
                  badge={t.status === 'COMPLETED' ? 'paid' : 'inprogress'}
                  onRepost={handleRepost}
                />
              ))}
            </div>
          </div>
        )}

        {/* Transactions */}
        <div style={{ background: 'white', borderRadius: 16, border: '1px solid #dce8f5', overflow: 'hidden', marginBottom: 24 }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0f4fa', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <CreditCard size={15} color="#0f2b6b" />
              <span style={{ fontWeight: 800, fontSize: 14, color: '#0f2b6b' }}>היסטוריית תשלומים</span>
            </div>
            <span style={{ fontSize: 11, color: '#999' }}>{transactions.length} פעולות</span>
          </div>
          <div style={{ padding: '8px 12px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {transactions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '28px 0', color: '#bbb', fontSize: 13 }}>💳 אין עסקאות עדיין</div>
            ) : (
              transactions.map(tx => {
                const cfg = typeConfig[tx.type] || typeConfig.earning;
                const Icon = cfg.icon;
                return (
                  <div key={tx.id} onClick={() => tx.task_id && navigate(`/task/${tx.task_id}`)}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 4px', borderBottom: '1px solid #f7f8fa', cursor: tx.task_id ? 'pointer' : 'default' }}>
                    <div style={{ width: 36, height: 36, borderRadius: 11, background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon size={15} color={cfg.color} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: '#0f2b6b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {tx.task_title || cfg.label}
                      </div>
                      <div style={{ fontSize: 10, color: '#bbb', marginTop: 1 }}>
                        {tx.created_date ? format(new Date(tx.created_date), 'dd/MM/yy HH:mm') : cfg.label}
                      </div>
                    </div>
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontSize: 14, fontWeight: 900, color: cfg.color }}>{cfg.sign}₪{tx.amount}</div>
                      {tx.status === 'pending' && (
                        <div style={{ fontSize: 10, color: '#d97706', fontWeight: 600, textAlign: 'center', marginTop: 1 }}>ממתין</div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}