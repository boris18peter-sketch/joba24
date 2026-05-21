import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { format } from 'date-fns';
import { Users, ClipboardList, Flag, Shield, ShieldOff, Search, RefreshCw, ChevronDown, ChevronUp, Star, Ban, CheckCircle2, X, Loader2 } from 'lucide-react';
import BackButton from '@/components/BackButton';
import PageHeader from '@/components/PageHeader';

const STATUS_COLORS = {
  OPEN: { bg: '#dbeafe', text: '#1d4ed8', label: 'פתוח' },
  TAKEN: { bg: '#fef9ec', text: '#92700a', label: 'בעבודה' },
  COMPLETED: { bg: '#dcfce7', text: '#166534', label: 'הושלם' },
  CANCELLED: { bg: '#fee2e2', text: '#991b1b', label: 'בוטל' },
  EXPIRED: { bg: '#fef3ea', text: '#8a4a1a', label: 'פג תוקף' },
};

function TabButton({ active, onClick, children }) {
  return (
    <button onClick={onClick} style={{
      padding: '8px 16px', borderRadius: 20, fontWeight: 700, fontSize: 13,
      background: active ? '#0f2b6b' : 'var(--surface-2)',
      color: active ? 'white' : 'var(--text-2)',
      border: active ? 'none' : '1px solid var(--border-1)',
      cursor: 'pointer', flexShrink: 0,
    }}>
      {children}
    </button>
  );
}

function TaskRow({ task }) {
  const [open, setOpen] = useState(false);
  const sc = STATUS_COLORS[task.status] || STATUS_COLORS.OPEN;
  return (
    <div style={{ background: 'var(--surface-2)', borderRadius: 14, border: '1px solid var(--border-1)', marginBottom: 8, overflow: 'hidden' }}>
      <div onClick={() => setOpen(v => !v)} style={{ padding: '12px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, color: 'var(--text-1)', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.title}</div>
          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{task.client_name} · {task.created_date ? format(new Date(task.created_date), 'dd/MM/yyyy HH:mm') : ''}</div>
        </div>
        <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 20, background: sc.bg, color: sc.text, flexShrink: 0 }}>{sc.label}</span>
        <span style={{ fontSize: 14, fontWeight: 900, color: '#1a6fd4', flexShrink: 0 }}>₪{task.price}</span>
        {open ? <ChevronUp size={14} color="#94a3b8" /> : <ChevronDown size={14} color="#94a3b8" />}
      </div>
      {open && (
        <div style={{ padding: '0 16px 14px', borderTop: '1px solid var(--border-1)', display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, color: 'var(--text-2)' }}>
          {task.description && <div><strong>תיאור:</strong> {task.description}</div>}
          {task.location_name && <div><strong>מיקום:</strong> {task.location_name}</div>}
          {task.category && <div><strong>קטגוריה:</strong> {task.category}</div>}
          {task.worker_name && <div><strong>עובד:</strong> {task.worker_name}</div>}
          {task.expires_at && <div><strong>פג תוקף:</strong> {format(new Date(task.expires_at), 'dd/MM/yyyy HH:mm')}</div>}
          <div style={{ fontSize: 10, color: '#cbd5e1' }}>ID: {task.id}</div>
        </div>
      )}
    </div>
  );
}

function UserRow({ user, onToggleBlock }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleBlock = async (e) => {
    e.stopPropagation();
    setLoading(true);
    await onToggleBlock(user);
    setLoading(false);
  };

  return (
    <div style={{ background: user.is_blocked ? '#fef2f2' : 'var(--surface-2)', borderRadius: 14, border: `1px solid ${user.is_blocked ? '#fecaca' : 'var(--border-1)'}` , marginBottom: 8, overflow: 'hidden' }}>
      <div onClick={() => setOpen(v => !v)} style={{ padding: '12px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#1a6fd4,#3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 14, flexShrink: 0, overflow: 'hidden' }}>
          {user.profile_photo ? <img src={user.profile_photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : user.full_name?.[0] || '?'}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, color: 'var(--text-1)', fontSize: 13 }}>{user.full_name}</div>
          <div style={{ fontSize: 11, color: '#94a3b8' }}>{user.email} · {user.created_date ? format(new Date(user.created_date), 'dd/MM/yyyy') : ''}</div>
        </div>
        {user.is_blocked && <span style={{ fontSize: 10, fontWeight: 700, color: '#dc2626', background: '#fee2e2', padding: '2px 8px', borderRadius: 20, flexShrink: 0 }}>חסום</span>}
        {user.rating > 0 && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: '#d97706', fontWeight: 700, flexShrink: 0 }}>
            <Star size={11} style={{ fill: '#fbbf24' }} /> {user.rating?.toFixed(1)}
          </span>
        )}
        <button onClick={handleBlock} disabled={loading} style={{
          padding: '5px 10px', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700,
          background: user.is_blocked ? '#dcfce7' : '#fef2f2',
          color: user.is_blocked ? '#16a34a' : '#dc2626',
          display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0,
        }}>
          {loading ? <Loader2 size={10} className="animate-spin" /> : user.is_blocked ? <><CheckCircle2 size={11} /> בטל חסימה</> : <><Ban size={11} /> חסום</>}
        </button>
        {open ? <ChevronUp size={14} color="#94a3b8" /> : <ChevronDown size={14} color="#94a3b8" />}
      </div>
      {open && (
        <div style={{ padding: '0 16px 14px', borderTop: '1px solid var(--border-1)', fontSize: 12, color: 'var(--text-2)', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {user.phone && <div><strong>טלפון:</strong> {user.phone}</div>}
          {user.role && <div><strong>תפקיד:</strong> {user.role}</div>}
          {user.is_verified && <div style={{ color: '#16a34a', fontWeight: 700 }}>✓ משתמש מאומת</div>}
          {user.score_tasks > 0 && <div><strong>משימות הושלמו:</strong> {user.score_tasks}</div>}
          {user.rating_count > 0 && <div><strong>דירוגים שניתנו:</strong> {user.rating_count}</div>}
          <div style={{ fontSize: 10, color: '#cbd5e1' }}>ID: {user.id}</div>
        </div>
      )}
    </div>
  );
}

function ReportRow({ report, onDismiss, onReview }) {
  const STATUS_MAP = { pending: { label: 'ממתין', color: '#d97706', bg: '#fffbeb' }, reviewed: { label: 'נבדק', color: '#16a34a', bg: '#f0fdf4' }, dismissed: { label: 'נדחה', color: '#94a3b8', bg: '#f1f5f9' } };
  const s = STATUS_MAP[report.status] || STATUS_MAP.pending;
  const REASON_MAP = { spam: 'ספאם', fake: 'מידע כוזב', inappropriate: 'לא הולם', scam: 'הונאה', other: 'אחר' };

  return (
    <div style={{ background: 'var(--surface-2)', borderRadius: 14, border: '1px solid var(--border-1)', padding: '12px 16px', marginBottom: 8 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, color: 'var(--text-1)', fontSize: 13 }}>{report.task_title || report.task_id}</div>
          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
            דווח ע"י {report.reporter_name} · {report.created_date ? format(new Date(report.created_date), 'dd/MM HH:mm') : ''}
          </div>
          <div style={{ marginTop: 4, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, fontWeight: 700, background: '#fef2f2', color: '#dc2626', padding: '2px 8px', borderRadius: 20 }}>{REASON_MAP[report.reason] || report.reason}</span>
            <span style={{ fontSize: 11, fontWeight: 700, background: s.bg, color: s.color, padding: '2px 8px', borderRadius: 20 }}>{s.label}</span>
          </div>
          {report.description && <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 6, background: 'var(--surface-3)', borderRadius: 8, padding: '6px 10px' }}>{report.description}</div>}
        </div>
      </div>
      {report.status === 'pending' && (
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => onReview(report)} style={{ flex: 1, height: 34, borderRadius: 10, background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1a6fd4', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>סמן כנבדק</button>
          <button onClick={() => onDismiss(report)} style={{ flex: 1, height: 34, borderRadius: 10, background: '#f1f5f9', border: '1px solid #e5e7eb', color: '#64748b', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>דחה</button>
        </div>
      )}
    </div>
  );
}

export default function AdminDashboard() {
  const { user: me } = useAuth();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('tasks');
  const [taskSearch, setTaskSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [taskStatusFilter, setTaskStatusFilter] = useState('');

  const { data: allTasks = [], isLoading: loadingTasks, refetch: refetchTasks } = useQuery({
    queryKey: ['adminTasks'],
    queryFn: () => base44.entities.Task.list('-created_date', 200),
    enabled: me?.role === 'admin',
    staleTime: 0,
  });

  const { data: allUsers = [], isLoading: loadingUsers, refetch: refetchUsers } = useQuery({
    queryKey: ['adminUsers'],
    queryFn: () => base44.entities.User.list('-created_date', 200),
    enabled: me?.role === 'admin',
    staleTime: 0,
  });

  const { data: allReports = [], isLoading: loadingReports, refetch: refetchReports } = useQuery({
    queryKey: ['adminReports'],
    queryFn: () => base44.entities.Report.list('-created_date', 100),
    enabled: me?.role === 'admin',
    staleTime: 0,
  });

  const { data: allReviews = [] } = useQuery({
    queryKey: ['adminReviews'],
    queryFn: () => base44.entities.Review.list('-created_date', 200),
    enabled: me?.role === 'admin' && tab === 'users',
    staleTime: 60000,
  });

  // Guard: admin only — AFTER all hooks
  if (me && me.role !== 'admin') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: 12 }} dir="rtl">
        <Shield size={48} color="#dc2626" />
        <div style={{ fontSize: 18, fontWeight: 800, color: '#0f2b6b' }}>גישה נדחתה</div>
        <div style={{ fontSize: 13, color: '#64748b' }}>דף זה זמין למנהלים בלבד</div>
      </div>
    );
  }

  const handleToggleBlock = async (user) => {
    await base44.entities.User.update(user.id, { is_blocked: !user.is_blocked });
    queryClient.setQueryData(['adminUsers'], (old = []) =>
      old.map(u => u.id === user.id ? { ...u, is_blocked: !u.is_blocked } : u)
    );
  };

  const handleReviewReport = async (report) => {
    await base44.entities.Report.update(report.id, { status: 'reviewed' });
    queryClient.setQueryData(['adminReports'], (old = []) =>
      old.map(r => r.id === report.id ? { ...r, status: 'reviewed' } : r)
    );
  };

  const handleDismissReport = async (report) => {
    await base44.entities.Report.update(report.id, { status: 'dismissed' });
    queryClient.setQueryData(['adminReports'], (old = []) =>
      old.map(r => r.id === report.id ? { ...r, status: 'dismissed' } : r)
    );
  };

  const filteredTasks = allTasks.filter(t => {
    const q = taskSearch.toLowerCase();
    const matchQ = !q || t.title?.toLowerCase().includes(q) || t.client_name?.toLowerCase().includes(q);
    const matchStatus = !taskStatusFilter || t.status === taskStatusFilter;
    return matchQ && matchStatus;
  });

  const filteredUsers = allUsers.filter(u => {
    const q = userSearch.toLowerCase();
    return !q || u.full_name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q);
  });

  const pendingReports = allReports.filter(r => r.status === 'pending').length;

  const stats = [
    { label: 'משימות', value: allTasks.length, color: '#1a6fd4', bg: '#eff6ff' },
    { label: 'משתמשים', value: allUsers.length, color: '#7c3aed', bg: '#f5f3ff' },
    { label: 'חסומים', value: allUsers.filter(u => u.is_blocked).length, color: '#dc2626', bg: '#fef2f2' },
    { label: 'דיווחים', value: pendingReports, color: '#d97706', bg: '#fffbeb' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--surface-1)' }} dir="rtl">
      <PageHeader title="דשבורד מנהל" right={
        <button onClick={() => { refetchTasks(); refetchUsers(); refetchReports(); }}
          style={{ background: 'white', border: '1px solid #dce8f5', borderRadius: 10, padding: '6px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
          <RefreshCw size={14} color="#1a6fd4" />
        </button>
      } />
      {/* Header gradient */}
      <div style={{ background: 'linear-gradient(135deg, #0f2b6b, #1a6fd4)', padding: '12px 16px 20px' }}>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          {stats.map(s => (
            <div key={s.label} style={{ background: 'rgba(255,255,255,0.12)', borderRadius: 12, padding: '10px 8px', textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 900, color: 'white' }}>{s.value}</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ padding: '16px 16px 0', display: 'flex', gap: 8, overflowX: 'auto', scrollbarWidth: 'none' }}>
        <TabButton active={tab === 'tasks'} onClick={() => setTab('tasks')}>
          <ClipboardList size={13} style={{ display: 'inline', marginLeft: 4 }} /> משימות
        </TabButton>
        <TabButton active={tab === 'users'} onClick={() => setTab('users')}>
          <Users size={13} style={{ display: 'inline', marginLeft: 4 }} /> משתמשים
        </TabButton>
        <TabButton active={tab === 'reports'} onClick={() => setTab('reports')}>
          <Flag size={13} style={{ display: 'inline', marginLeft: 4 }} /> דיווחים
          {pendingReports > 0 && <span style={{ marginRight: 4, background: '#dc2626', color: 'white', fontSize: 10, padding: '1px 5px', borderRadius: 10, fontWeight: 800 }}>{pendingReports}</span>}
        </TabButton>
      </div>

      <div style={{ padding: '12px 16px 80px' }}>

        {/* TASKS TAB */}
        {tab === 'tasks' && (
          <>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <Search size={13} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input value={taskSearch} onChange={e => setTaskSearch(e.target.value)} placeholder="חיפוש..."
                  style={{ width: '100%', height: 36, borderRadius: 10, border: '1px solid var(--border-1)', paddingRight: 30, paddingLeft: 10, fontSize: 13, outline: 'none', boxSizing: 'border-box', background: 'var(--surface-2)', color: 'var(--text-1)' }} />
              </div>
              <select value={taskStatusFilter} onChange={e => setTaskStatusFilter(e.target.value)}
                style={{ height: 36, borderRadius: 10, border: '1px solid var(--border-1)', padding: '0 10px', fontSize: 12, color: 'var(--text-1)', outline: 'none', background: 'var(--surface-2)' }}>
                <option value="">כל הסטטוסים</option>
                {Object.entries(STATUS_COLORS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            {loadingTasks ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Loader2 size={24} className="animate-spin" color="#1a6fd4" /></div>
            ) : (
              <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 8 }}>{filteredTasks.length} משימות</div>
            )}
            {filteredTasks.map(task => <TaskRow key={task.id} task={task} />)}
          </>
        )}

        {/* USERS TAB */}
        {tab === 'users' && (
          <>
            <div style={{ position: 'relative', marginBottom: 12 }}>
              <Search size={13} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input value={userSearch} onChange={e => setUserSearch(e.target.value)} placeholder="חיפוש לפי שם או אימייל..."
                style={{ width: '100%', height: 36, borderRadius: 10, border: '1px solid var(--border-1)', paddingRight: 30, paddingLeft: 10, fontSize: 13, outline: 'none', boxSizing: 'border-box', background: 'var(--surface-2)', color: 'var(--text-1)' }} />
            </div>
            {loadingUsers ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Loader2 size={24} className="animate-spin" color="#1a6fd4" /></div>
            ) : (
              <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 8 }}>{filteredUsers.length} משתמשים</div>
            )}
            {filteredUsers.map(user => (
              <UserRow key={user.id} user={user} onToggleBlock={handleToggleBlock} />
            ))}
          </>
        )}

        {/* REPORTS TAB */}
        {tab === 'reports' && (
          <>
            {loadingReports ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Loader2 size={24} className="animate-spin" color="#1a6fd4" /></div>
            ) : allReports.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>🏳️</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#0f2b6b' }}>אין דיווחים</div>
              </div>
            ) : (
              allReports.map(report => (
                <ReportRow key={report.id} report={report} onReview={handleReviewReport} onDismiss={handleDismissReport} />
              ))
            )}
          </>
        )}
      </div>
    </div>
  );
}