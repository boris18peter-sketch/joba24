import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Users, ShieldCheck, Loader2, Download, LogIn, TrendingUp, ChevronLeft } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { he } from 'date-fns/locale';
import { useLanguage } from '@/lib/LanguageContext';

// Reusable agent-referrals report body — embedded inside the Admin Dashboard.
export default function AgentReferralsTab() {
  const { user: me } = useAuth();
  const { isRTL } = useLanguage();
  const [expanded, setExpanded] = useState(null);

  const { data: allUsers = [], isLoading } = useQuery({
    queryKey: ['adminAgentReferrals'],
    queryFn: () => base44.entities.User.list('-created_date', 500),
    enabled: me?.role === 'admin',
    staleTime: 60000,
  });

  if (me && me.role !== 'admin') {
    return (
      <div dir="rtl" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', flexDirection: 'column', gap: 10 }}>
        <div style={{ fontSize: 36 }}>🚫</div>
        <div style={{ fontSize: 15, fontWeight: 800, color: '#0f2b6b' }}>אין גישה</div>
        <div style={{ fontSize: 12, color: '#64748b' }}>דף זה זמין למנהלים בלבד</div>
      </div>
    );
  }

  const agents = allUsers.filter(u => !!u.agent_code);
  const byAgent = {};
  allUsers.forEach(u => {
    const code = u.referred_by_agent_code;
    if (!code) return;
    if (!byAgent[code]) byAgent[code] = [];
    byAgent[code].push(u);
  });

  const rows = agents
    .map(a => {
      const referred = byAgent[a.agent_code] || [];
      return { agent: a, registered: referred.length, clicks: a.referral_clicks || 0, referredUsers: referred };
    })
    .sort((x, y) => y.registered - x.registered);

  const totalRegistered = rows.reduce((s, r) => s + r.registered, 0);
  const totalClicks = rows.reduce((s, r) => s + r.clicks, 0);
  const conversion = totalClicks > 0 ? Math.round((totalRegistered / totalClicks) * 100) : 0;

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Summary stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 14 }}>
        <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border-1)', borderRadius: 14, padding: '12px 8px', textAlign: 'center' }}>
          <Users size={16} color="#1a6fd4" style={{ marginBottom: 4 }} />
          <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--text-1)' }}>{totalRegistered}</div>
          <div style={{ fontSize: 10, color: 'var(--text-3)', fontWeight: 700 }}>נרשמו דרך סוכנים</div>
        </div>
        <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border-1)', borderRadius: 14, padding: '12px 8px', textAlign: 'center' }}>
          <TrendingUp size={16} color="#7c3aed" style={{ marginBottom: 4 }} />
          <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--text-1)' }}>{agents.length}</div>
          <div style={{ fontSize: 10, color: 'var(--text-3)', fontWeight: 700 }}>סוכנים פעילים</div>
        </div>
        <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border-1)', borderRadius: 14, padding: '12px 8px', textAlign: 'center' }}>
          <Download size={16} color="#d97706" style={{ marginBottom: 4 }} />
          <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--text-1)' }}>{totalClicks}</div>
          <div style={{ fontSize: 10, color: 'var(--text-3)', fontWeight: 700 }}>לחיצות על לינק</div>
        </div>
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-3)', textAlign: 'center', marginBottom: 14 }}>
        אחוז המרה: <strong style={{ color: 'var(--text-1)' }}>{conversion}%</strong> (נרשמו מתוך לחיצות)
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
        <ShieldCheck size={15} color="#1a6fd4" />
        <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-1)' }}>סוכנים</span>
        <span style={{ fontSize: 11, color: '#94a3b8', background: 'var(--surface-3)', padding: '1px 8px', borderRadius: 20 }}>{rows.length}</span>
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Loader2 size={24} className="animate-spin" color="#1a6fd4" /></div>
      ) : rows.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', background: 'var(--surface-2)', borderRadius: 14, border: '1px solid var(--border-1)' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🤝</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>אין סוכנים עדיין</div>
        </div>
      ) : (
        rows.map(r => {
          const isOpen = expanded === r.agent.id;
          return (
            <div key={r.agent.id} style={{ background: 'var(--surface-2)', border: '1px solid var(--border-1)', borderRadius: 14, marginBottom: 8, overflow: 'hidden' }}>
              <button onClick={() => setExpanded(isOpen ? null : r.agent.id)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'right' }}>
                <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'linear-gradient(135deg,#1a6fd4,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: 14, flexShrink: 0, overflow: 'hidden' }}>
                  {r.agent.profile_photo ? <img src={r.agent.profile_photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (r.agent.full_name?.[0] || '?')}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.agent.full_name || r.agent.email}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>קוד: {r.agent.agent_code}</div>
                </div>
                <div style={{ textAlign: 'center', flexShrink: 0 }}>
                  <div style={{ fontSize: 18, fontWeight: 900, color: r.registered > 0 ? '#059669' : 'var(--text-3)' }}>{r.registered}</div>
                  <div style={{ fontSize: 9, color: 'var(--text-3)', fontWeight: 700 }}>נרשמו</div>
                </div>
                <ChevronLeft size={16} color="var(--text-3)" style={{ transform: isOpen ? 'rotate(90deg)' : 'rotate(0)', transition: 'transform 0.2s', flexShrink: 0 }} />
              </button>

              <div style={{ display: 'flex', gap: 6, padding: '0 14px 10px' }}>
                <div style={{ flex: 1, background: 'var(--surface-3)', borderRadius: 8, padding: '6px 8px', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Download size={11} color="#d97706" />
                  <span style={{ fontSize: 10, color: 'var(--text-2)', fontWeight: 700 }}>{r.clicks} לחיצות</span>
                </div>
                <div style={{ flex: 1, background: 'var(--surface-3)', borderRadius: 8, padding: '6px 8px', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <TrendingUp size={11} color="#059669" />
                  <span style={{ fontSize: 10, color: 'var(--text-2)', fontWeight: 700 }}>{r.clicks > 0 ? Math.round((r.registered / r.clicks) * 100) : 0}% המרה</span>
                </div>
              </div>

              {isOpen && (
                <div style={{ borderTop: '1px solid var(--border-1)', padding: '10px 14px 12px', background: 'var(--surface-1)' }}>
                  {r.referredUsers.length === 0 ? (
                    <div style={{ fontSize: 12, color: 'var(--text-3)', textAlign: 'center', padding: '10px 0' }}>אין משתמשים שנרשמו דרך סוכן זה עדיין</div>
                  ) : (
                    r.referredUsers.map(u => (
                      <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border-1)' }}>
                        <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--surface-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-2)', fontWeight: 700, fontSize: 12, flexShrink: 0, overflow: 'hidden' }}>
                          {u.profile_photo ? <img src={u.profile_photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (u.full_name?.[0] || '?')}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.full_name || u.email}</div>
                          <div style={{ fontSize: 10, color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 1 }}>
                            <LogIn size={9} /> {u.created_date ? formatDistanceToNow(new Date(u.created_date), { addSuffix: true, locale: he }) : '—'}
                          </div>
                        </div>
                        {u.created_date && <span style={{ fontSize: 10, color: 'var(--text-3)', fontWeight: 700 }}>{format(new Date(u.created_date), 'dd/MM/yy')}</span>}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}