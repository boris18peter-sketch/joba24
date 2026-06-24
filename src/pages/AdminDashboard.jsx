import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { format } from 'date-fns';
import { Users, ClipboardList, Flag, Shield, ShieldOff, Search, RefreshCw, ChevronDown, ChevronUp, Star, Ban, CheckCircle2, X, Loader2, UserCheck, Copy, Check, Headphones, Send } from 'lucide-react';
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

function SetAgentModal({ user, onClose, onSave }) {
  const [rate, setRate] = useState(user.commission_rate || 10);
  const [loading, setLoading] = useState(false);
  const isAgent = user.role === 'agent';

  const handleSave = async () => {
    setLoading(true);
    const agentCode = user.agent_code || `AGENT_${user.id.slice(-6).toUpperCase()}`;
    await onSave(user, { role: 'agent', commission_rate: Number(rate), agent_code: agentCode });
    setLoading(false);
    onClose();
  };

  const handleRemove = async () => {
    setLoading(true);
    await onSave(user, { role: 'user', commission_rate: 0, agent_code: null });
    setLoading(false);
    onClose();
  };

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(5,15,40,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--surface-2)', borderRadius: 20, padding: 24, width: '100%', maxWidth: 360 }} dir="rtl">
        <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--text-1)', marginBottom: 4 }}>הגדרת סוכן</div>
        <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 20 }}>{user.full_name} · {user.email}</div>
        <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-2)', display: 'block', marginBottom: 6 }}>אחוז עמלה (%)</label>
        <input type="number" value={rate} onChange={e => setRate(e.target.value)} min={0} max={100}
          style={{ width: '100%', height: 42, borderRadius: 10, border: '1px solid var(--border-1)', paddingRight: 12, paddingLeft: 12, fontSize: 16, outline: 'none', boxSizing: 'border-box', background: 'var(--surface-3)', color: 'var(--text-1)', marginBottom: 16 }} />
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={handleSave} disabled={loading} style={{ flex: 1, height: 42, borderRadius: 12, background: '#1a6fd4', color: 'white', border: 'none', fontWeight: 800, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            {loading ? <Loader2 size={14} className="animate-spin" /> : <><UserCheck size={14} /> {isAgent ? 'עדכן סוכן' : 'הגדר כסוכן'}</>}
          </button>
          {isAgent && (
            <button onClick={handleRemove} disabled={loading} style={{ height: 42, padding: '0 14px', borderRadius: 12, background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
              הסר סוכן
            </button>
          )}
          <button onClick={onClose} style={{ height: 42, padding: '0 14px', borderRadius: 12, background: 'var(--surface-3)', color: 'var(--text-2)', border: '1px solid var(--border-1)', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
            ביטול
          </button>
        </div>
      </div>
    </div>
  );
}

function UserRow({ user, onToggleBlock, onSetAgent }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showAgentModal, setShowAgentModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const isAgent = user.role === 'agent';

  const handleBlock = async (e) => {
    e.stopPropagation();
    setLoading(true);
    await onToggleBlock(user);
    setLoading(false);
  };

  const handleCopyLink = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(`${window.location.origin}/?ref=${user.agent_code}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
    <div style={{ background: user.is_blocked ? '#fef2f2' : isAgent ? '#f5f3ff' : 'var(--surface-2)', borderRadius: 14, border: `1px solid ${user.is_blocked ? '#fecaca' : isAgent ? '#ddd6fe' : 'var(--border-1)'}` , marginBottom: 8, overflow: 'hidden' }}>
      <div onClick={() => setOpen(v => !v)} style={{ padding: '12px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: isAgent ? 'linear-gradient(135deg,#7c3aed,#a855f7)' : 'linear-gradient(135deg,#1a6fd4,#3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 14, flexShrink: 0, overflow: 'hidden' }}>
          {user.profile_photo ? <img src={user.profile_photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : user.full_name?.[0] || '?'}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, color: 'var(--text-1)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
            {user.full_name}
            {isAgent && <span style={{ fontSize: 9, fontWeight: 800, background: '#7c3aed', color: 'white', padding: '1px 6px', borderRadius: 10 }}>סוכן</span>}
          </div>
          <div style={{ fontSize: 11, color: '#94a3b8' }}>{user.email} · {user.created_date ? format(new Date(user.created_date), 'dd/MM/yyyy') : ''}</div>
        </div>
        {user.is_blocked && <span style={{ fontSize: 10, fontWeight: 700, color: '#dc2626', background: '#fee2e2', padding: '2px 8px', borderRadius: 20, flexShrink: 0 }}>חסום</span>}
        {user.rating > 0 && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: '#d97706', fontWeight: 700, flexShrink: 0 }}>
            <Star size={11} style={{ fill: '#fbbf24' }} /> {user.rating?.toFixed(1)}
          </span>
        )}
        <button onClick={e => { e.stopPropagation(); setShowAgentModal(true); }} style={{
          padding: '5px 10px', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700,
          background: isAgent ? '#f5f3ff' : '#f0fdf4',
          color: isAgent ? '#7c3aed' : '#16a34a',
          display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0,
          border: `1px solid ${isAgent ? '#ddd6fe' : '#bbf7d0'}`,
        }}>
          <UserCheck size={11} /> {isAgent ? `${user.commission_rate}%` : 'סוכן'}
        </button>
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
          {/* Full profile fields from /join */}
          {user.phone && <div><strong>טלפון:</strong> <a href={`tel:${user.phone}`} style={{ color: '#1a6fd4', textDecoration: 'none' }}>{user.phone}</a></div>}
          {user.profession && <div><strong>מקצוע:</strong> {user.profession}</div>}
          {user.bio && <div><strong>אודות:</strong> {user.bio}</div>}
          {user.preferred_cities?.length > 0 && <div><strong>ערים:</strong> {user.preferred_cities.join(', ')}</div>}
          {user.preferred_categories?.length > 0 && <div><strong>קטגוריות:</strong> {user.preferred_categories.join(', ')}</div>}
          {user.role && <div><strong>תפקיד:</strong> {user.role}</div>}
          {/* Approval status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
            <span style={{ fontWeight: 700 }}>סטטוס:</span>
            <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: user.is_approved ? '#dcfce7' : '#fef9c3', color: user.is_approved ? '#166534' : '#854d0e' }}>
              {user.is_approved ? '✓ מאושר' : '⏳ ממתין לאישור'}
            </span>
            {!user.is_approved && (
              <button
                onClick={async (e) => { e.stopPropagation(); await onSetAgent(user, { is_approved: true }); }}
                style={{ padding: '3px 10px', borderRadius: 10, background: '#1a6fd4', color: 'white', border: 'none', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
              >
                אשר גישה
              </button>
            )}
            {user.is_approved && (
              <button
                onClick={async (e) => { e.stopPropagation(); await onSetAgent(user, { is_approved: false }); }}
                style={{ padding: '3px 10px', borderRadius: 10, background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
              >
                בטל גישה
              </button>
            )}
          </div>
          {isAgent && user.agent_code && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f5f3ff', borderRadius: 8, padding: '6px 10px', marginTop: 4 }}>
              <div style={{ flex: 1, fontSize: 11, color: '#7c3aed', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {window.location.origin}/?ref={user.agent_code}
              </div>
              <button onClick={handleCopyLink} style={{ background: 'none', border: 'none', cursor: 'pointer', color: copied ? '#16a34a' : '#7c3aed', display: 'flex', padding: 2 }}>
                {copied ? <Check size={13} /> : <Copy size={13} />}
              </button>
            </div>
          )}
          {user.is_verified && <div style={{ color: '#16a34a', fontWeight: 700 }}>✓ משתמש מאומת</div>}
          {user.score_tasks > 0 && <div><strong>משימות הושלמו:</strong> {user.score_tasks}</div>}
          {user.rating_count > 0 && <div><strong>דירוגים שניתנו:</strong> {user.rating_count}</div>}
          <div style={{ fontSize: 10, color: '#cbd5e1' }}>ID: {user.id}</div>
        </div>
      )}
    </div>
    {showAgentModal && <SetAgentModal user={user} onClose={() => setShowAgentModal(false)} onSave={onSetAgent} />}
    </>
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
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

  const { data: allUsers = [], isLoading: loadingUsers, refetch: refetchUsers } = useQuery({
    queryKey: ['adminUsers'],
    queryFn: () => base44.entities.User.list('-created_date', 200),
    enabled: me?.role === 'admin',
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

  const { data: allReports = [], isLoading: loadingReports, refetch: refetchReports } = useQuery({
    queryKey: ['adminReports'],
    queryFn: () => base44.entities.Report.list('-created_date', 100),
    enabled: me?.role === 'admin',
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

  const { data: allReviews = [] } = useQuery({
    queryKey: ['adminReviews'],
    queryFn: () => base44.entities.Review.list('-created_date', 200),
    enabled: me?.role === 'admin' && tab === 'users',
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });

  const { data: supportMessages = [], refetch: refetchSupport } = useQuery({
    queryKey: ['adminSupport'],
    queryFn: () => base44.entities.SupportMessage.list('-created_date', 500),
    enabled: me?.role === 'admin' && tab === 'support',
    staleTime: 15000,
    refetchOnWindowFocus: false,
  });

  const [selectedSupportUser, setSelectedSupportUser] = useState(null);
  const [supportReply, setSupportReply] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  const kycUsers = allUsers.filter(u => u.id_number || u.id_photo_url);
  const fakeVerified = allUsers.filter(u => u.is_verified && !u.id_number);

  // Group support messages by user_id
  const supportConversations = useMemo(() => {
    const map = {};
    supportMessages.forEach(m => {
      if (!map[m.user_id]) {
        map[m.user_id] = { user_id: m.user_id, user_name: m.user_name, messages: [], unread: 0 };
      }
      map[m.user_id].messages.push(m);
      if (m.sender_role === 'user' && !m.read) map[m.user_id].unread++;
    });
    // Sort conversations by latest message
    return Object.values(map).sort((a, b) => {
      const aLast = a.messages[a.messages.length - 1]?.created_date || '';
      const bLast = b.messages[b.messages.length - 1]?.created_date || '';
      return bLast.localeCompare(aLast);
    });
  }, [supportMessages]);

  const unreadSupportCount = supportConversations.reduce((sum, c) => sum + c.unread, 0);

  const selectedConversation = supportConversations.find(c => c.user_id === selectedSupportUser);

  const handleSendReply = async () => {
    if (!supportReply.trim() || !selectedSupportUser) return;
    setSendingReply(true);
    try {
      await base44.entities.SupportMessage.create({
        user_id: selectedSupportUser,
        user_name: selectedConversation?.user_name || '',
        sender_role: 'admin',
        content: supportReply.trim(),
      });
      setSupportReply('');
      refetchSupport();
    } catch {}
    setSendingReply(false);
  };

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

  const handleSetAgent = async (user, updates) => {
    await base44.entities.User.update(user.id, updates);
    queryClient.setQueryData(['adminUsers'], (old = []) =>
      old.map(u => u.id === user.id ? { ...u, ...updates } : u)
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
    const q = taskSearch.toLowerCase().replace('#', '');
    const matchQ = !q ||
      t.title?.toLowerCase().includes(q) ||
      t.client_name?.toLowerCase().includes(q) ||
      t.worker_name?.toLowerCase().includes(q) ||
      t.location_name?.toLowerCase().includes(q) ||
      t.id?.toLowerCase().includes(q) ||
      t.id?.slice(-8).toLowerCase() === q;
    const matchStatus = !taskStatusFilter || t.status === taskStatusFilter;
    return matchQ && matchStatus;
  });

  const filteredUsers = allUsers.filter(u => {
    const q = userSearch.toLowerCase();
    return !q || u.full_name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q);
  });

  const pendingReports = allReports.filter(r => r.status === 'pending').length;

  const pendingApproval = allUsers.filter(u => !u.is_approved && u.role !== 'admin').length;

  const stats = [
    { label: 'משימות', value: allTasks.length, color: '#1a6fd4', bg: '#eff6ff' },
    { label: 'משתמשים', value: allUsers.length, color: '#7c3aed', bg: '#f5f3ff' },
    { label: 'ממתינים לאישור', value: pendingApproval, color: '#d97706', bg: '#fffbeb' },
    { label: 'דיווחים', value: pendingReports, color: '#dc2626', bg: '#fef2f2' },
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
        <TabButton active={tab === 'kyc'} onClick={() => setTab('kyc')}>
          <Shield size={13} style={{ display: 'inline', marginLeft: 4 }} /> KYC
          {kycUsers.length > 0 && <span style={{ marginRight: 4, background: '#7c3aed', color: 'white', fontSize: 10, padding: '1px 5px', borderRadius: 10, fontWeight: 800 }}>{kycUsers.length}</span>}
        </TabButton>
        <TabButton active={tab === 'support'} onClick={() => setTab('support')}>
          <Headphones size={13} style={{ display: 'inline', marginLeft: 4 }} /> תמיכה
          {unreadSupportCount > 0 && <span style={{ marginRight: 4, background: '#dc2626', color: 'white', fontSize: 10, padding: '1px 5px', borderRadius: 10, fontWeight: 800 }}>{unreadSupportCount}</span>}
        </TabButton>
      </div>

      <div style={{ padding: '12px 16px 80px' }}>

        {/* TASKS TAB */}
        {tab === 'tasks' && (
          <>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <Search size={13} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input value={taskSearch} onChange={e => setTaskSearch(e.target.value)} placeholder="חיפוש לפי שם, ID, עובד..."
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
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <Search size={13} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input value={userSearch} onChange={e => setUserSearch(e.target.value)} placeholder="חיפוש לפי שם או אימייל..."
                  style={{ width: '100%', height: 36, borderRadius: 10, border: '1px solid var(--border-1)', paddingRight: 30, paddingLeft: 10, fontSize: 13, outline: 'none', boxSizing: 'border-box', background: 'var(--surface-2)', color: 'var(--text-1)' }} />
              </div>
              {pendingApproval > 0 && (
                <button
                  onClick={async () => {
                    const unapproved = allUsers.filter(u => !u.is_approved && u.role !== 'admin');
                    for (const u of unapproved) { await base44.entities.User.update(u.id, { is_approved: true }); }
                    queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
                  }}
                  style={{ height: 36, padding: '0 12px', borderRadius: 10, background: '#1a6fd4', color: 'white', border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap' }}
                >
                  ✓ אשר הכל ({pendingApproval})
                </button>
              )}
            </div>
            {loadingUsers ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Loader2 size={24} className="animate-spin" color="#1a6fd4" /></div>
            ) : (
              <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 8 }}>{filteredUsers.length} משתמשים</div>
            )}
            {filteredUsers.map(user => (
              <UserRow key={user.id} user={user} onToggleBlock={handleToggleBlock} onSetAgent={handleSetAgent} />
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

        {/* KYC TAB */}
        {tab === 'kyc' && (
          <>
            <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 8 }}>{kycUsers.length} משתמשים עם נתוני KYC</div>
            {fakeVerified.length > 0 && (
              <div style={{ background: '#fef2f2', border: '1.5px solid #fecaca', borderRadius: 12, padding: '12px 14px', marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#dc2626' }}>⚠️ {fakeVerified.length} משתמשים מאומתים ללא KYC</div>
                  <div style={{ fontSize: 11, color: '#991b1b', marginTop: 2 }}>סימון אימות ללא תעודת זהות או צילום</div>
                </div>
                <button
                  onClick={async () => {
                    for (const u of fakeVerified) {
                      await base44.entities.User.update(u.id, { is_verified: false });
                    }
                    queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
                  }}
                  style={{ padding: '8px 14px', borderRadius: 10, background: '#dc2626', color: 'white', border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}
                >
                  אפס אימות
                </button>
              </div>
            )}
            {kycUsers.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>🛡️</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#0f2b6b' }}>אין נתוני KYC עדיין</div>
              </div>
            ) : kycUsers.map(user => (
              <div key={user.id} style={{ background: 'var(--surface-2)', borderRadius: 14, border: `1px solid ${user.is_verified ? '#bbf7d0' : '#fde68a'}`, marginBottom: 10, overflow: 'hidden' }}>
                <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg,#1a6fd4,#3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 15, flexShrink: 0, overflow: 'hidden' }}>
                    {user.profile_photo ? <img src={user.profile_photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : user.full_name?.[0] || '?'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 800, color: 'var(--text-1)', fontSize: 14 }}>{user.full_name}</div>
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>{user.email}</div>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: user.is_verified ? '#dcfce7' : '#fef9c3', color: user.is_verified ? '#166534' : '#854d0e', flexShrink: 0 }}>
                    {user.is_verified ? '✓ מאומת' : '⏳ ממתין'}
                  </span>
                </div>
                <div style={{ padding: '0 16px 14px', borderTop: '1px solid var(--border-1)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12 }}>
                  {user.phone && (
                    <div style={{ background: 'var(--surface-3)', borderRadius: 10, padding: '8px 10px' }}>
                      <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, marginBottom: 2 }}>📱 טלפון</div>
                      <div style={{ fontWeight: 700, color: 'var(--text-1)' }}>{user.phone}</div>
                    </div>
                  )}
                  {user.id_number && (
                    <div style={{ background: 'var(--surface-3)', borderRadius: 10, padding: '8px 10px' }}>
                      <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, marginBottom: 2 }}>🪪 ת.ז.</div>
                      <div style={{ fontWeight: 700, color: 'var(--text-1)', letterSpacing: 1 }}>{user.id_number}</div>
                    </div>
                  )}
                  {user.id_photo_url && (
                    <div style={{ gridColumn: '1 / -1' }}>
                      <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, marginBottom: 6 }}>📷 צילום תעודת זהות</div>
                      <img src={user.id_photo_url} alt="ת.ז." style={{ width: '100%', maxHeight: 140, objectFit: 'contain', borderRadius: 10, border: '1px solid var(--border-1)', background: '#f8faff' }} />
                    </div>
                  )}
                  <div style={{ gridColumn: '1 / -1', fontSize: 10, color: '#cbd5e1' }}>ID: {user.id} · {user.created_date ? format(new Date(user.created_date), 'dd/MM/yyyy HH:mm') : ''}</div>
                </div>
              </div>
            ))}
          </>
        )}

        {/* SUPPORT TAB */}
        {tab === 'support' && (
          <>
            {supportConversations.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>🎧</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#0f2b6b' }}>אין הודעות תמיכה</div>
              </div>
            ) : !selectedSupportUser ? (
              supportConversations.map(conv => {
                const lastMsg = conv.messages[conv.messages.length - 1];
                return (
                  <div key={conv.user_id} onClick={() => setSelectedSupportUser(conv.user_id)}
                    style={{ background: 'var(--surface-2)', borderRadius: 14, border: `1px solid ${conv.unread > 0 ? '#bfdbfe' : 'var(--border-1)'}`, padding: '12px 16px', marginBottom: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'linear-gradient(135deg,#1a6fd4,#3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
                      {conv.user_name?.[0] || '?'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontWeight: 700, color: 'var(--text-1)', fontSize: 13 }}>{conv.user_name || 'משתמש'}</span>
                        {conv.unread > 0 && <span style={{ background: '#dc2626', color: 'white', fontSize: 9, fontWeight: 800, padding: '1px 6px', borderRadius: 10 }}>{conv.unread}</span>}
                      </div>
                      <div style={{ fontSize: 11, color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>
                        {lastMsg?.sender_role === 'admin' ? 'אתה: ' : ''}{lastMsg?.content}
                      </div>
                    </div>
                    <div style={{ fontSize: 10, color: '#cbd5e1', flexShrink: 0 }}>
                      {lastMsg?.created_date ? format(new Date(lastMsg.created_date), 'dd/MM HH:mm') : ''}
                    </div>
                  </div>
                );
              })
            ) : (
              <div>
                {/* Back button */}
                <button onClick={() => setSelectedSupportUser(null)}
                  style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', color: '#1a6fd4', fontSize: 13, fontWeight: 700, cursor: 'pointer', marginBottom: 12, padding: 0 }}>
                  ← חזרה לרשימה
                </button>

                {/* Conversation header */}
                <div style={{ background: 'var(--surface-2)', borderRadius: 14, border: '1px solid var(--border-1)', padding: '12px 16px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'linear-gradient(135deg,#1a6fd4,#3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 14 }}>
                    {selectedConversation?.user_name?.[0] || '?'}
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, color: 'var(--text-1)', fontSize: 14 }}>{selectedConversation?.user_name || 'משתמש'}</div>
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>{selectedConversation?.messages.length} הודעות</div>
                  </div>
                </div>

                {/* Messages */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
                  {selectedConversation?.messages.map(msg => (
                    <div key={msg.id} style={{ display: 'flex', justifyContent: msg.sender_role === 'admin' ? 'flex-start' : 'flex-end' }}>
                      <div style={{
                        maxWidth: '80%', padding: '8px 12px', borderRadius: msg.sender_role === 'admin' ? '14px 14px 14px 4px' : '14px 14px 4px 14px',
                        background: msg.sender_role === 'admin' ? 'linear-gradient(135deg,#1a6fd4,#0a52b0)' : 'var(--surface-3)',
                        color: msg.sender_role === 'admin' ? 'white' : 'var(--text-1)',
                        fontSize: 13, lineHeight: 1.5, wordBreak: 'break-word',
                      }}>
                        {msg.content}
                        <div style={{ fontSize: 9, marginTop: 2, opacity: 0.6 }}>{msg.created_date ? format(new Date(msg.created_date), 'HH:mm') : ''}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Reply input */}
                <div style={{ display: 'flex', gap: 8, position: 'sticky', bottom: 0, background: 'var(--surface-1)', padding: '8px 0' }}>
                  <input
                    type="text"
                    value={supportReply}
                    onChange={e => setSupportReply(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleSendReply(); }}
                    placeholder="כתוב תשובה..."
                    dir="rtl"
                    style={{ flex: 1, height: 42, borderRadius: 12, border: '1.5px solid var(--border-1)', background: 'var(--surface-2)', color: 'var(--text-1)', padding: '0 14px', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
                  />
                  <button
                    onClick={handleSendReply}
                    disabled={!supportReply.trim() || sendingReply}
                    style={{ width: 42, height: 42, borderRadius: 12, background: supportReply.trim() ? '#1a6fd4' : 'var(--surface-3)', border: 'none', cursor: supportReply.trim() ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                  >
                    {sendingReply ? <Loader2 size={18} className="animate-spin" color="white" /> : <Send size={18} color={supportReply.trim() ? 'white' : 'var(--text-3)'} />}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}