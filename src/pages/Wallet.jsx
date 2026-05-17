import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, Trophy, Briefcase, CheckCircle2, RotateCcw } from 'lucide-react';
import BackButton from '@/components/BackButton';

const STATUS_TABS = [
{ key: 'inprogress', label: 'משימות פעילות', icon: '🟣' },
{ key: 'completed', label: 'הושלמו', icon: '✅' }];


function TaskRow({ task, badge, onRepost }) {
  const navigate = useNavigate();
  const badgeMap = {
    inprogress: { label: 'בביצוע', bg: '#ede9fe', color: '#6d28d9' },
    awaiting: { label: 'ממתין לתשלום', bg: '#fef3c7', color: '#92400e' },
    paid: { label: 'שולם', bg: '#dcfce7', color: '#166534' },
    cancelled: { label: 'בוטל — פיצוי 20%', bg: '#fef9ec', color: '#b45309' }
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
        {onRepost &&
        <button onClick={() => onRepost(task)}
        style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700, color: '#1a6fd4', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '5px 11px', cursor: 'pointer' }}>
            <RotateCcw size={12} /> פרסם שוב
          </button>
        }
      </div>
    </div>);

}

export default function Wallet() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('inprogress');

  const { data: me } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });
  const { data: workerTasks = [] } = useQuery({
    queryKey: ['walletWorkerTasks', me?.id],
    queryFn: () => base44.entities.Task.filter({ worker_id: me.id }, '-created_date', 50),
    enabled: !!me?.id,
    staleTime: 30000,
  });

  const completedCount = workerTasks.filter((t) => t.status === 'COMPLETED').length;

  const inProgressTasks = workerTasks.filter((t) => t.status === 'TAKEN');
  const completedWorkerTasks = workerTasks.filter((t) => t.status === 'COMPLETED');

  const tabTasks = {
    inprogress: inProgressTasks,
    completed: completedWorkerTasks,
  };

  const tabBadge = { inprogress: 'inprogress', completed: 'paid' };

  return (
    <div className="min-h-screen" style={{ background: '#f4f7fb' }} dir="rtl">
      {/* Sticky header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(244,247,251,0.95)', backdropFilter: 'blur(8px)', padding: '44px 16px 10px', borderBottom: '1px solid #dce8f5', display: 'flex', alignItems: 'center', gap: 12 }}>
        <BackButton />
        <span style={{ fontWeight: 800, fontSize: 17, color: '#0f2b6b' }}>הג'ובות שלי</span>
      </div>

      {/* Stats hero */}
      <div style={{ background: 'linear-gradient(140deg, #0f2b6b 0%, #1a6fd4 100%)', padding: '28px 20px 24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {[
            { icon: Trophy, label: "ג'ובות שהושלמו", value: completedCount },
            { icon: TrendingUp, label: 'פעיל כרגע', value: inProgressTasks.length },
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
            {STATUS_TABS.map((tab) => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                style={{ flex: 1, padding: '10px 4px', fontSize: 12, fontWeight: 700, cursor: 'pointer', background: 'none', border: 'none', borderBottom: activeTab === tab.key ? '2px solid #1a6fd4' : '2px solid transparent', color: activeTab === tab.key ? '#1a6fd4' : '#888', transition: 'all 0.15s' }}>
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {tabTasks[activeTab].length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 0', color: '#bbb', fontSize: 13 }}>
                {activeTab === 'inprogress' ? '💼 אין משימות פעילות' : '🏆 אין משימות שהושלמו'}
              </div>
            ) : (
              tabTasks[activeTab].map((t) => (
                <TaskRow key={t.id} task={t} badge={tabBadge[activeTab]} />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );

}