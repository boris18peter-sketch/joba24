import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { format, formatDistanceToNow } from 'date-fns';
import { he } from 'date-fns/locale';
import { Users, TrendingUp, Loader2, Copy, CheckCircle2, Clock, LogIn, Briefcase } from 'lucide-react';
import PageHeader from '@/components/PageHeader';

export default function AgentDashboard() {
  const { user: me } = useAuth();
  const [copied, setCopied] = useState(false);

  // Fetch all agent referral data via backend function (service-role).
  // Agents can't list other users directly — built-in security blocks it.
  const { data: referralData, isLoading: isLoadingReferrals } = useQuery({
    queryKey: ['agentReferrals', me?.agent_code],
    queryFn: () => base44.functions.invoke('getAgentReferrals', {}),
    enabled: !!me?.agent_code,
    staleTime: 60000,
  });

  const allUsers = referralData?.data?.users || [];
  const workerTasks = referralData?.data?.workerTasks || [];
  const clientTasks = referralData?.data?.clientTasks || [];
  const workerIds = allUsers.map(u => u.id);

  if (!me?.agent_code) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: 12 }} dir="rtl">
        <div style={{ fontSize: 40 }}>🚫</div>
        <div style={{ fontSize: 18, fontWeight: 800, color: '#0f2b6b' }}>אין גישה</div>
        <div style={{ fontSize: 13, color: '#64748b' }}>דף זה זמין לסוכנים בלבד</div>
      </div>
    );
  }

  // Deduplicate tasks (a user could be both worker and client on different tasks)
  const allTasksMap = {};
  [...workerTasks, ...clientTasks].forEach(t => { allTasksMap[t.id] = t; });
  const allTasks = Object.values(allTasksMap);

  const totalTurnover = workerTasks.reduce((sum, t) => sum + (t.price || 0), 0);
  const commission = totalTurnover * ((me.commission_rate || 0) / 100);
  const referralLink = `${window.location.origin}/?ref=${me.agent_code}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isLoading = isLoadingReferrals;

  // Count active users (logged in within last 7 days)
  const now = Date.now();
  const activeUsersCount = allUsers.filter(u => {
    if (!u.last_active_at) return false;
    const d = new Date(u.last_active_at);
    return (now - d.getTime()) < 7 * 24 * 60 * 60 * 1000;
  }).length;

  const stats = [
    { label: 'עובדים שגויסו', value: allUsers.length, color: '#7c3aed' },
    { label: 'פעילים (7 ימים)', value: activeUsersCount, color: '#059669' },
    { label: 'משימות הושלמו', value: allTasks.length, color: '#1a6fd4' },
    { label: `עמלה (${me.commission_rate || 0}%)`, value: `₪${Math.round(commission).toLocaleString()}`, color: '#d97706' },
  ];

  const formatLastActive = (dateStr) => {
    if (!dateStr) return 'מעולם לא התחבר';
    try {
      const d = new Date(dateStr);
      return formatDistanceToNow(d, { addSuffix: true, locale: he });
    } catch {
      return '—';
    }
  };

  const isRecentlyActive = (dateStr) => {
    if (!dateStr) return false;
    return (now - new Date(dateStr).getTime()) < 24 * 60 * 60 * 1000;
  };

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
            const userWorkerTasks = workerTasks.filter(t => t.worker_id === user.id);
            const userClientTasks = clientTasks.filter(t => t.client_id === user.id);
            const userTurnover = userWorkerTasks.reduce((s, t) => s + (t.price || 0), 0);
            const joinDate = user.created_date ? format(new Date(user.created_date), 'dd/MM/yy') : '';
            const lastActive = formatLastActive(user.last_active_at);
            const recentlyActive = isRecentlyActive(user.last_active_at);
            return (
              <div key={user.id} style={{ background: 'var(--surface-2)', borderRadius: 14, border: '1px solid var(--border-1)', padding: '12px 16px', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#7c3aed,#a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 14, flexShrink: 0, overflow: 'hidden' }}>
                    {user.profile_photo ? <img src={user.profile_photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : user.full_name?.[0] || '?'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontWeight: 700, color: 'var(--text-1)', fontSize: 13 }}>{user.full_name || user.email}</span>
                      {recentlyActive && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 9, fontWeight: 700, color: '#059669', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 20, padding: '1px 6px' }}>
                          <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#22c55e' }} /> אונליין
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                      <LogIn size={9} /> {lastActive}
                    </div>
                  </div>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: 14, fontWeight: 900, color: '#059669' }}>₪{Math.round(userTurnover).toLocaleString()}</div>
                    <div style={{ fontSize: 10, color: '#94a3b8' }}>מחזור</div>
                  </div>
                </div>
                {/* Activity stats */}
                <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                  <div style={{ flex: 1, background: 'var(--surface-3)', borderRadius: 8, padding: '5px 8px', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Briefcase size={10} color="#1a6fd4" />
                    <span style={{ fontSize: 10, color: 'var(--text-2)', fontWeight: 600 }}>{userWorkerTasks.length} כעובד</span>
                  </div>
                  <div style={{ flex: 1, background: 'var(--surface-3)', borderRadius: 8, padding: '5px 8px', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Users size={10} color="#7c3aed" />
                    <span style={{ fontSize: 10, color: 'var(--text-2)', fontWeight: 600 }}>{userClientTasks.length} כלקוח</span>
                  </div>
                  <div style={{ flex: 1, background: 'var(--surface-3)', borderRadius: 8, padding: '5px 8px', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Clock size={10} color="#94a3b8" />
                    <span style={{ fontSize: 10, color: 'var(--text-2)', fontWeight: 600 }}>הצטרף {joinDate}</span>
                  </div>
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
            const client = allUsers.find(u => u.id === task.client_id);
            const isWorkerReferred = workerIds.includes(task.worker_id);
            const roleLabel = isWorkerReferred ? 'עובד' : 'לקוח';
            const roleColor = isWorkerReferred ? '#059669' : '#7c3aed';
            return (
              <div key={task.id} style={{ background: 'var(--surface-2)', borderRadius: 14, border: '1px solid var(--border-1)', padding: '12px 16px', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, color: 'var(--text-1)', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.title}</div>
                    <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2, display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ fontWeight: 700, color: roleColor }}>{roleLabel}:</span>
                      {isWorkerReferred ? (worker?.full_name || task.worker_name) : (client?.full_name || task.client_name)}
                      <span>·</span>
                      {task.completed_at ? format(new Date(task.completed_at), 'dd/MM/yy') : ''}
                    </div>
                  </div>
                  <div style={{ textAlign: 'left', flexShrink: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 900, color: '#059669' }}>₪{task.price}</div>
                    {isWorkerReferred && <div style={{ fontSize: 10, color: '#94a3b8' }}>עמלה: ₪{((task.price || 0) * (me.commission_rate || 0) / 100).toFixed(0)}</div>}
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