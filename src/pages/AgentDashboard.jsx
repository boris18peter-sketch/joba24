import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { format } from 'date-fns';
import { Users, TrendingUp, Loader2, Copy, CheckCircle2, Briefcase, ShoppingBag } from 'lucide-react';
import PageHeader from '@/components/PageHeader';

export default function AgentDashboard() {
  const { user: me } = useAuth();
  const [copied, setCopied] = useState(false);

  // All users referred by this agent
  const { data: allUsers = [], isLoading: loadingUsers } = useQuery({
    queryKey: ['agentUsers', me?.agent_code],
    queryFn: () => base44.entities.User.filter({ referred_by_agent_code: me.agent_code }),
    enabled: !!me?.agent_code,
    staleTime: 60000,
  });

  const userIds = allUsers.map(u => u.id);

  // Tasks completed BY referred users as WORKERS
  const { data: workerTasks = [], isLoading: loadingWorkerTasks } = useQuery({
    queryKey: ['agentWorkerTasks', me?.agent_code, userIds.join(',')],
    queryFn: async () => {
      if (!userIds.length) return [];
      const results = await Promise.all(
        userIds.map(uid => base44.entities.Task.filter({ worker_id: uid, status: 'COMPLETED' }, '-completed_at', 100))
      );
      return results.flat();
    },
    enabled: !!me?.agent_code && !loadingUsers,
    staleTime: 60000,
  });

  // Tasks published BY referred users as CLIENTS (payments they made)
  const { data: clientTasks = [], isLoading: loadingClientTasks } = useQuery({
    queryKey: ['agentClientTasks', me?.agent_code, userIds.join(',')],
    queryFn: async () => {
      if (!userIds.length) return [];
      const results = await Promise.all(
        userIds.map(uid => base44.entities.Task.filter({ client_id: uid, status: 'COMPLETED' }, '-completed_at', 100))
      );
      return results.flat();
    },
    enabled: !!me?.agent_code && !loadingUsers,
    staleTime: 60000,
  });

  if (!me?.agent_code) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: 12 }} dir="rtl">
        <div style={{ fontSize: 40 }}>🚫</div>
        <div style={{ fontSize: 18, fontWeight: 800, color: '#0f2b6b' }}>אין גישה</div>
        <div style={{ fontSize: 13, color: '#64748b' }}>דף זה זמין לסוכנים בלבד</div>
      </div>
    );
  }

  const totalWorkerRevenue = workerTasks.reduce((sum, t) => sum + (t.price || 0), 0);
  const totalClientSpend = clientTasks.reduce((sum, t) => sum + (t.price || 0), 0);
  const totalTurnover = totalWorkerRevenue + totalClientSpend;
  const commission = totalTurnover * ((me.commission_rate || 0) / 100);
  const referralLink = `${window.location.origin}/?ref=${me.agent_code}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isLoading = loadingUsers || loadingWorkerTasks || loadingClientTasks;

  const stats = [
    { label: 'משתמשים שגויסו', value: allUsers.length, color: '#7c3aed' },
    { label: 'משימות הושלמו (עובד)', value: workerTasks.length, color: '#1a6fd4' },
    { label: 'משימות שפורסמו (לקוח)', value: clientTasks.length, color: '#0891b2' },
    { label: `עמלה (${me.commission_rate || 0}%)`, value: `₪${Math.round(commission).toLocaleString()}`, color: '#d97706' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--surface-1)' }} dir="rtl">
      <PageHeader title="דשבורד סוכן" />

      {/* Stats Header */}
      <div style={{ background: 'linear-gradient(135deg, #0f2b6b, #1a6fd4)', padding: '12px 16px 20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 10 }}>
          {stats.map(s => (
            <div key={s.label} style={{ background: 'rgba(255,255,255,0.12)', borderRadius: 12, padding: '10px 8px', textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 900, color: 'white' }}>{s.value}</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>{s.label}</div>
            </div>
          ))}
        </div>
        {/* Total Turnover — full width */}
        <div style={{ background: 'rgba(255,255,255,0.18)', borderRadius: 12, padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', fontWeight: 700 }}>מחזור כולל (עובד + לקוח)</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: 'white' }}>₪{Math.round(totalTurnover).toLocaleString()}</div>
        </div>
      </div>

      <div style={{ padding: '16px 16px 80px' }}>

        {/* Referral Link */}
        <div style={{ background: 'var(--surface-2)', borderRadius: 14, border: '1px solid var(--border-1)', padding: '14px 16px', marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-2)', marginBottom: 8 }}>🔗 לינק ההפניה שלך</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ flex: 1, background: 'var(--surface-3)', borderRadius: 10, padding: '8px 12px', fontSize: 12, color: 'var(--text-1)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {referralLink}
            </div>
            <button onClick={handleCopy} style={{ padding: '8px 14px', borderRadius: 10, background: copied ? '#dcfce7' : '#eff6ff', border: `1px solid ${copied ? '#bbf7d0' : '#bfdbfe'}`, color: copied ? '#16a34a' : '#1a6fd4', fontWeight: 700, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
              {copied ? <><CheckCircle2 size={13} /> הועתק!</> : <><Copy size={13} /> העתק</>}
            </button>
          </div>
          <div style={{ marginTop: 8, fontSize: 11, color: '#94a3b8' }}>
            כל מי שנרשם דרך הלינק הזה מיוחס אליך אוטומטית
          </div>
        </div>

        {/* Users List */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <Users size={15} color="#7c3aed" />
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>משתמשים שגויסו</span>
            <span style={{ fontSize: 11, color: '#94a3b8', background: 'var(--surface-3)', padding: '1px 8px', borderRadius: 20 }}>{allUsers.length}</span>
          </div>

          {isLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 30 }}><Loader2 size={22} className="animate-spin" color="#1a6fd4" /></div>
          ) : allUsers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px 20px', background: 'var(--surface-2)', borderRadius: 14, border: '1px solid var(--border-1)' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>👥</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>אין משתמשים עדיין</div>
              <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>שתף את הלינק שלך כדי להביא משתמשים</div>
            </div>
          ) : allUsers.map(user => {
            const asWorker = workerTasks.filter(t => t.worker_id === user.id);
            const asClient = clientTasks.filter(t => t.client_id === user.id);
            const workerRevenue = asWorker.reduce((s, t) => s + (t.price || 0), 0);
            const clientSpend = asClient.reduce((s, t) => s + (t.price || 0), 0);
            const joinDate = user.created_date ? format(new Date(user.created_date), 'dd/MM/yy') : '';

            return (
              <div key={user.id} style={{ background: 'var(--surface-2)', borderRadius: 14, border: '1px solid var(--border-1)', padding: '12px 16px', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: asWorker.length + asClient.length > 0 ? 10 : 0 }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#7c3aed,#a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 14, flexShrink: 0, overflow: 'hidden' }}>
                    {user.profile_photo ? <img src={user.profile_photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : user.full_name?.[0] || '?'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, color: 'var(--text-1)', fontSize: 13 }}>{user.full_name || user.email}</div>
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>הצטרף {joinDate}</div>
                  </div>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: 14, fontWeight: 900, color: '#059669' }}>₪{Math.round(workerRevenue + clientSpend).toLocaleString()}</div>
                    <div style={{ fontSize: 10, color: '#94a3b8' }}>סה״כ פעילות</div>
                  </div>
                </div>

                {/* Activity breakdown */}
                {(asWorker.length > 0 || asClient.length > 0) && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    {asWorker.length > 0 && (
                      <div style={{ flex: 1, background: '#eff6ff', borderRadius: 8, padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 5 }}>
                        <Briefcase size={11} color="#1a6fd4" />
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 800, color: '#1a6fd4' }}>{asWorker.length} משימות</div>
                          <div style={{ fontSize: 10, color: '#64748b' }}>כעובד · ₪{Math.round(workerRevenue).toLocaleString()}</div>
                        </div>
                      </div>
                    )}
                    {asClient.length > 0 && (
                      <div style={{ flex: 1, background: '#f0fdf4', borderRadius: 8, padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 5 }}>
                        <ShoppingBag size={11} color="#059669" />
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 800, color: '#059669' }}>{asClient.length} משימות</div>
                          <div style={{ fontSize: 10, color: '#64748b' }}>כלקוח · ₪{Math.round(clientSpend).toLocaleString()}</div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Recent Completed Tasks (all types) */}
        {(() => {
          const allTasksCombined = [
            ...workerTasks.map(t => ({ ...t, _type: 'worker' })),
            ...clientTasks.map(t => ({ ...t, _type: 'client' })),
          ].sort((a, b) => new Date(b.completed_at || b.created_date) - new Date(a.completed_at || a.created_date)).slice(0, 30);

          if (isLoading || allTasksCombined.length === 0) return null;

          return (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                <TrendingUp size={15} color="#059669" />
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>פעילות אחרונה</span>
                <span style={{ fontSize: 11, color: '#94a3b8', background: 'var(--surface-3)', padding: '1px 8px', borderRadius: 20 }}>{allTasksCombined.length}</span>
              </div>
              {allTasksCombined.map(task => {
                const user = allUsers.find(u => task._type === 'worker' ? u.id === task.worker_id : u.id === task.client_id);
                const isWorkerTask = task._type === 'worker';
                return (
                  <div key={`${task._type}-${task.id}`} style={{ background: 'var(--surface-2)', borderRadius: 14, border: '1px solid var(--border-1)', padding: '12px 16px', marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 28, height: 28, borderRadius: 8, background: isWorkerTask ? '#eff6ff' : '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {isWorkerTask ? <Briefcase size={13} color="#1a6fd4" /> : <ShoppingBag size={13} color="#059669" />}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, color: 'var(--text-1)', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.title}</div>
                        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                          {user?.full_name || (isWorkerTask ? task.worker_name : task.client_name)} · {isWorkerTask ? 'עובד' : 'לקוח'} · {task.completed_at ? format(new Date(task.completed_at), 'dd/MM/yy') : task.created_date ? format(new Date(task.created_date), 'dd/MM/yy') : ''}
                        </div>
                      </div>
                      <div style={{ textAlign: 'left', flexShrink: 0 }}>
                        <div style={{ fontSize: 15, fontWeight: 900, color: isWorkerTask ? '#1a6fd4' : '#059669' }}>₪{task.price}</div>
                        <div style={{ fontSize: 10, color: '#94a3b8' }}>עמלה: ₪{((task.price || 0) * (me.commission_rate || 0) / 100).toFixed(0)}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>
    </div>
  );
}