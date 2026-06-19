import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { format } from 'date-fns';
import { Users, TrendingUp, Loader2, Copy, CheckCircle2 } from 'lucide-react';
import PageHeader from '@/components/PageHeader';

export default function AgentDashboard() {
  const { user: me } = useAuth();
  const [copied, setCopied] = useState(false);

  const { data: allUsers = [], isLoading: loadingUsers } = useQuery({
    queryKey: ['agentUsers', me?.agent_code],
    queryFn: () => base44.entities.User.filter({ referred_by_agent_code: me.agent_code }),
    enabled: !!me?.agent_code,
    staleTime: 60000,
  });

  const workerIds = allUsers.map(u => u.id);

  const { data: allTasks = [], isLoading: loadingTasks } = useQuery({
    queryKey: ['agentTasks', me?.agent_code, workerIds.join(',')],
    queryFn: async () => {
      if (!workerIds.length) return [];
      const results = await Promise.all(
        workerIds.map(wid => base44.entities.Task.filter({ worker_id: wid, status: 'COMPLETED' }, '-completed_at', 100))
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

  const totalTurnover = allTasks.reduce((sum, t) => sum + (t.price || 0), 0);
  const commission = totalTurnover * ((me.commission_rate || 0) / 100);
  const referralLink = `${window.location.origin}/?ref=${me.agent_code}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isLoading = loadingUsers || loadingTasks;

  const stats = [
    { label: 'עובדים שגויסו', value: allUsers.length, color: '#7c3aed' },
    { label: 'משימות הושלמו', value: allTasks.length, color: '#1a6fd4' },
    { label: 'מחזור כולל', value: `₪${Math.round(totalTurnover).toLocaleString()}`, color: '#059669' },
    { label: `עמלה (${me.commission_rate || 0}%)`, value: `₪${Math.round(commission).toLocaleString()}`, color: '#d97706' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--surface-1)' }} dir="rtl">
      <PageHeader title="דשבורד סוכן" />

      {/* Stats Header */}
      <div style={{ background: 'linear-gradient(135deg, #0f2b6b, #1a6fd4)', padding: '12px 16px 20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
          {stats.map(s => (
            <div key={s.label} style={{ background: 'rgba(255,255,255,0.12)', borderRadius: 12, padding: '10px 8px', textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 900, color: 'white' }}>{s.value}</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>{s.label}</div>
            </div>
          ))}
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

        {/* Workers List */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <Users size={15} color="#7c3aed" />
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>עובדים שגויסו</span>
            <span style={{ fontSize: 11, color: '#94a3b8', background: 'var(--surface-3)', padding: '1px 8px', borderRadius: 20 }}>{allUsers.length}</span>
          </div>
          {isLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 30 }}><Loader2 size={22} className="animate-spin" color="#1a6fd4" /></div>
          ) : allUsers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px 20px', background: 'var(--surface-2)', borderRadius: 14, border: '1px solid var(--border-1)' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>👥</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>אין עובדים עדיין</div>
              <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>שתף את הלינק שלך כדי להביא עובדים</div>
            </div>
          ) : allUsers.map(user => {
            const userTasks = allTasks.filter(t => t.worker_id === user.id);
            const userTurnover = userTasks.reduce((s, t) => s + (t.price || 0), 0);
            const joinDate = user.created_date ? format(new Date(user.created_date), 'dd/MM/yy') : '';
            return (
              <div key={user.id} style={{ background: 'var(--surface-2)', borderRadius: 14, border: '1px solid var(--border-1)', padding: '12px 16px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#7c3aed,#a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 14, flexShrink: 0, overflow: 'hidden' }}>
                  {user.profile_photo ? <img src={user.profile_photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : user.full_name?.[0] || '?'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, color: 'var(--text-1)', fontSize: 13 }}>{user.full_name || user.email}</div>
                  <div style={{ fontSize: 11, color: '#94a3b8' }}>{userTasks.length} משימות הושלמו · הצטרף {joinDate}</div>
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: 14, fontWeight: 900, color: '#059669' }}>₪{Math.round(userTurnover).toLocaleString()}</div>
                  <div style={{ fontSize: 10, color: '#94a3b8' }}>מחזור</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Completed Tasks */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <TrendingUp size={15} color="#059669" />
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>משימות שהושלמו</span>
            <span style={{ fontSize: 11, color: '#94a3b8', background: 'var(--surface-3)', padding: '1px 8px', borderRadius: 20 }}>{allTasks.length}</span>
          </div>
          {!isLoading && allTasks.length === 0 && (
            <div style={{ textAlign: 'center', padding: '30px 20px', background: 'var(--surface-2)', borderRadius: 14, border: '1px solid var(--border-1)' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>אין משימות עדיין</div>
            </div>
          )}
          {allTasks.map(task => {
            const worker = allUsers.find(u => u.id === task.worker_id);
            return (
              <div key={task.id} style={{ background: 'var(--surface-2)', borderRadius: 14, border: '1px solid var(--border-1)', padding: '12px 16px', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, color: 'var(--text-1)', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.title}</div>
                    <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                      {worker?.full_name || task.worker_name} · {task.completed_at ? format(new Date(task.completed_at), 'dd/MM/yy') : task.created_date ? format(new Date(task.created_date), 'dd/MM/yy') : ''}
                    </div>
                  </div>
                  <div style={{ textAlign: 'left', flexShrink: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 900, color: '#059669' }}>₪{task.price}</div>
                    <div style={{ fontSize: 10, color: '#94a3b8' }}>עמלה: ₪{((task.price || 0) * (me.commission_rate || 0) / 100).toFixed(0)}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}