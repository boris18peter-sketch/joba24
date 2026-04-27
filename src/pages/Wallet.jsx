import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { ArrowDownLeft, ArrowUpRight, TrendingUp, Trophy, CreditCard, Lock, Briefcase, Zap, Clock, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import TaskCard from '@/components/TaskCard';

const typeConfig = {
  earning: { label: 'הכנסה', color: '#16a34a', bg: '#f0fdf4', icon: ArrowDownLeft, sign: '+' },
  payment: { label: 'תשלום', color: '#dc2626', bg: '#fef2f2', icon: ArrowUpRight, sign: '-' },
  withdrawal: { label: 'משיכה', color: '#d97706', bg: '#fffbeb', icon: ArrowUpRight, sign: '-' },
};

const TABS = [
  { key: 'inprogress', label: '🟣 בתהליך', desc: 'משימות שנלקחו ובביצוע' },
  { key: 'awaiting_approval', label: '⏳ ממתין לאישור', desc: 'בקשות שהגשת' },
  { key: 'awaiting_payment', label: '💰 ממתין לתשלום', desc: 'הושלם - ממתין לשחרור כסף' },
  { key: 'completed', label: '✅ הושלם', desc: 'תשלום התקבל' },
];

export default function Wallet() {
  const navigate = useNavigate();
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
  // Applications I submitted (pending approval)
  const { data: myApplications = [] } = useQuery({
    queryKey: ['myApplications', me?.id],
    queryFn: () => base44.entities.TaskApplication.filter({ worker_id: me.id }, '-created_date', 50),
    enabled: !!me?.id,
    refetchInterval: 10000,
  });

  const balance = me?.wallet_balance || 0;
  const escrow = me?.escrow_balance || 0;
  const totalEarned = transactions.filter(t => t.type === 'earning').reduce((s, t) => s + t.amount, 0);
  const taskCount = transactions.filter(t => t.type === 'earning').length;

  // Categorize tasks
  const inProgressTasks = workerTasks.filter(t => t.status === 'TAKEN');
  const awaitingPaymentTasks = workerTasks.filter(t => t.status === 'COMPLETED' && !t.client_confirmed);
  const completedTasks = workerTasks.filter(t => t.status === 'COMPLETED' && t.client_confirmed);
  // Pending applications - tasks I applied to but not yet approved
  const pendingApps = myApplications.filter(a => a.status === 'pending');
  const approvedApps = myApplications.filter(a => a.status === 'approved');

  const tabTasks = {
    inprogress: inProgressTasks,
    awaiting_approval: pendingApps,
    awaiting_payment: awaitingPaymentTasks,
    completed: completedTasks,
  };

  const tabCount = {
    inprogress: inProgressTasks.length,
    awaiting_approval: pendingApps.length,
    awaiting_payment: awaitingPaymentTasks.length,
    completed: completedTasks.length,
  };

  return (
    <div className="min-h-screen" style={{ background: '#f4f7fb' }} dir="rtl">
      {/* Back Button */}
      <div style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(244,247,251,0.95)', padding: '8px 16px', borderBottom: '1px solid #dce8f5', display: 'flex', alignItems: 'center' }}>
        <button onClick={() => window.history.back()} style={{ width: 36, height: 36, borderRadius: 10, background: 'white', border: '1px solid #dce8f5', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 18 }}>
          ← חזור
        </button>
      </div>

      {/* Hero Card */}
      <div style={{
        background: 'linear-gradient(135deg, #0f2b6b, #1a6fd4, #0a52b0)',
        padding: '48px 20px 20px',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: -40, left: -40, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 12, width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CreditCard size={20} color="white" />
          </div>
          <div>
            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: 500 }}>הארנק שלי</div>
            <div style={{ color: 'white', fontSize: 13, fontWeight: 600 }}>{me?.full_name || 'משתמש'}</div>
          </div>
        </div>

        {/* Balance + Withdraw side by side */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 12 }}>
          <div>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginBottom: 2 }}>יתרה זמינה</div>
            <div style={{ color: 'white', fontSize: 40, fontWeight: 900, letterSpacing: -2 }}>₪{balance.toLocaleString()}</div>
            {escrow > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 8, padding: '4px 10px', width: 'fit-content' }}>
                <Lock size={11} color="#fbbf24" />
                <span style={{ color: '#fbbf24', fontSize: 11, fontWeight: 700 }}>₪{escrow} בהחזקה</span>
              </div>
            )}
          </div>
          <button style={{
            background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)',
            borderRadius: 14, padding: '10px 18px', color: 'white', fontWeight: 800, fontSize: 13,
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <Zap size={14} color="#fbbf24" /> משיכה לבנק
          </button>
        </div>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {[
            { icon: TrendingUp, label: 'סה"כ הכנסות', value: `₪${totalEarned.toLocaleString()}` },
            { icon: Trophy, label: "ג'ובות שביצעת", value: taskCount },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: '10px', backdropFilter: 'blur(4px)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <Icon size={13} color="rgba(255,255,255,0.7)" style={{ marginBottom: 4 }} />
              <div style={{ color: 'white', fontSize: 15, fontWeight: 800 }}>{value}</div>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10 }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Escrow explanation - compact */}
      <div style={{ padding: '12px 16px 0' }}>
        <div style={{ background: 'white', border: '1px solid #dce8f5', borderRadius: 14, padding: '10px 14px', display: 'flex', gap: 8, alignItems: 'center' }}>
          <Lock size={14} color="#1a6fd4" style={{ flexShrink: 0 }} />
          <div style={{ fontSize: 11, color: '#666', lineHeight: 1.6 }}>
            📤 לקוח משלם → כסף בהחזקה ← ✅ אישור → כסף אליך ← 🏦 משיכה לבנק
          </div>
        </div>
      </div>

      {/* My Jobs section with tabs */}
      <div style={{ padding: '16px 16px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <Briefcase size={16} color="#0f2b6b" />
          <h2 style={{ fontWeight: 800, fontSize: 16, color: '#0f2b6b' }}>הג'ובות שלי</h2>
          {inProgressTasks.length > 0 && (
            <span style={{ background: '#dc2626', color: 'white', fontSize: 10, fontWeight: 900, padding: '2px 7px', borderRadius: 20 }}>
              {inProgressTasks.length} פעילות
            </span>
          )}
        </div>

        {/* Tab bar */}
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 8, scrollbarWidth: 'none' }}>
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                flexShrink: 0, padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                background: activeTab === tab.key ? '#0f2b6b' : 'white',
                color: activeTab === tab.key ? 'white' : '#555',
                border: activeTab === tab.key ? '1px solid #0f2b6b' : '1px solid #dce8f5',
                position: 'relative',
              }}
            >
              {tab.label}
              {tabCount[tab.key] > 0 && (
                <span style={{
                  marginRight: 4, background: activeTab === tab.key ? 'rgba(255,255,255,0.3)' : '#1a6fd4',
                  color: 'white', fontSize: 10, fontWeight: 900, padding: '1px 5px', borderRadius: 10,
                }}>{tabCount[tab.key]}</span>
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
          {activeTab === 'awaiting_approval' ? (
            pendingApps.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 0', color: '#999' }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
                <div style={{ fontWeight: 600 }}>אין בקשות ממתינות</div>
              </div>
            ) : (
              pendingApps.map(app => (
                <div key={app.id} onClick={() => navigate(`/task/${app.task_id}`)}
                  style={{ background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 16, padding: '14px 16px', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Clock size={16} color="#d97706" />
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 14, color: '#92400e' }}>בקשה ממתינה לאישור</div>
                      <div style={{ fontSize: 12, color: '#b45309', marginTop: 2 }}>לחץ לצפייה במשימה</div>
                    </div>
                  </div>
                </div>
              ))
            )
          ) : activeTab === 'awaiting_payment' ? (
            awaitingPaymentTasks.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 0', color: '#999' }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>⏳</div>
                <div style={{ fontWeight: 600 }}>אין משימות ממתינות לתשלום</div>
              </div>
            ) : (
              awaitingPaymentTasks.map(t => <TaskCard key={t.id} task={t} workerBadge="awaiting" />)
            )
          ) : activeTab === 'completed' ? (
            completedTasks.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 0', color: '#999' }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>🏆</div>
                <div style={{ fontWeight: 600 }}>עדיין לא הושלמו משימות</div>
              </div>
            ) : (
              completedTasks.map(t => <TaskCard key={t.id} task={t} workerBadge="paid" />)
            )
          ) : (
            // inprogress tab
            inProgressTasks.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 0', color: '#999' }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>💼</div>
                <div style={{ fontWeight: 600 }}>אין משימות פעילות כרגע</div>
              </div>
            ) : (
              inProgressTasks.map(t => <TaskCard key={t.id} task={t} workerBadge="inprogress" />)
            )
          )}
        </div>
      </div>

      {/* Transactions */}
      <div style={{ padding: '20px 16px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <h2 style={{ fontWeight: 800, fontSize: 16, color: '#0f2b6b' }}>היסטוריית עסקאות</h2>
          <span style={{ fontSize: 12, color: '#999' }}>{transactions.length} עסקאות</span>
        </div>

        {transactions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '36px 0' }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>💳</div>
            <p style={{ color: '#0f2b6b', fontWeight: 600 }}>אין עסקאות עדיין</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {transactions.map(tx => {
              const cfg = typeConfig[tx.type] || typeConfig.earning;
              const Icon = cfg.icon;
              return (
                <div key={tx.id} onClick={() => tx.task_id && navigate(`/task/${tx.task_id}`)}
                  style={{
                    background: 'white', borderRadius: 14, padding: '12px',
                    display: 'flex', alignItems: 'center', gap: 10,
                    boxShadow: '0 1px 6px rgba(26,111,212,0.05)',
                    border: '1px solid #dce8f5', cursor: tx.task_id ? 'pointer' : 'default',
                  }}
                >
                  <div style={{ width: 38, height: 38, borderRadius: 12, background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={16} color={cfg.color} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: '#0f2b6b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {tx.task_title || cfg.label}
                    </div>
                    <div style={{ display: 'flex', gap: 6, marginTop: 1, alignItems: 'center' }}>
                      <span style={{ fontSize: 11, color: '#999' }}>{cfg.label}</span>
                      {tx.status === 'pending' && (
                        <span style={{ fontSize: 10, background: '#fef3c7', color: '#d97706', padding: '1px 6px', borderRadius: 20, fontWeight: 600 }}>ממתין</span>
                      )}
                    </div>
                    {tx.created_date && (
                      <div style={{ fontSize: 10, color: '#bbb', marginTop: 1 }}>
                        {format(new Date(tx.created_date), 'dd/MM/yy HH:mm')}
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 900, color: cfg.color, flexShrink: 0 }}>
                    {cfg.sign}₪{tx.amount}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}