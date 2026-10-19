import { useState, useMemo, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { format } from 'date-fns';
import { Users, ClipboardList, ListChecks, Flag, Shield, Search, RefreshCw, X, Loader2, UserCheck, Headphones, Send, Coins, Award, ShieldCheck, Bell, Trash2, TrendingUp, Download, UserX, Tag, Wallet, Store } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import NotificationManagerTab from '@/components/NotificationManagerTab';
import AgentReferralsTab from '@/components/AgentReferralsTab';
import JobaSettingsTab from '@/components/JobaSettingsTab';
import { isUserVerified, hasSocialVerified } from '@/lib/utils';
import { exportToCSV } from '@/lib/csvExport';
import AdminAnalyticsTab from '@/components/admin/AdminAnalyticsTab';
import BrandsTab from '@/components/admin/BrandsTab';
import GlobalCategoriesTab from '@/components/admin/GlobalCategoriesTab';
import TaskFormFieldsTab from '@/components/admin/TaskFormFieldsTab';
import KycImageLightbox from '@/components/admin/KycImageLightbox';
import AdminCreditsTab from '@/components/admin/AdminCreditsTab';
import AdminTaskRow, { STATUS_COLORS } from '@/components/admin/AdminTaskRow';
import AdminUserRow from '@/components/admin/AdminUserRow';
import AdminKycTab from '@/components/admin/AdminKycTab';
import CopyableId from '@/components/CopyableId';
import { toast } from 'sonner';
import ApproveAllModal from '@/components/ApproveAllModal';
import AssignAgentModal from '@/components/AssignAgentModal';
import { useJobaSettings } from '@/hooks/useJobaSettings';
import { resolveUserAccess } from '@/lib/userAccess';

// Tabs grouped by what they are for, so the dashboard reads as sections instead
// of one long undifferentiated row. `desc` is shown as the tab's own header.
const TAB_GROUPS = [
  { label: 'סקירה', tabs: [
    { key: 'analytics', label: 'אנליטיקה', icon: TrendingUp, desc: 'מגמות, התפלגויות וביצועי הפלטפורמה לאורך זמן' },
  ] },
  { label: 'תפעול', tabs: [
    { key: 'tasks', label: 'משימות', icon: ClipboardList, desc: 'כל המשימות, הביקוש שלהן ומי הגיש מועמדות' },
    { key: 'task_form', label: 'טופס משימה', icon: ListChecks, desc: 'שליטה בכל שדות טופס פרסום המשימה — הדלקה וכיבוי של כל שדה' },
    { key: 'users', label: 'משתמשים', icon: Users, desc: 'ניהול משתמשים, אישורי גישה, סוכנים והרשאות' },
    { key: 'kyc', label: 'KYC', icon: Shield, desc: 'אימותי זהות — בדיקה, אישור ודחייה' },
    { key: 'reports', label: 'דיווחים', icon: Flag, desc: 'דיווחי משתמשים על תוכן בעייתי' },
    { key: 'support', label: 'תמיכה', icon: Headphones, desc: 'שיחות תמיכה עם משתמשי הפלטפורמה' },
  ] },
  { label: 'כספים וצמיחה', tabs: [
    { key: 'credits', label: 'קרדיטים', icon: Wallet, desc: 'מצב הג׳ובות של כל משתמש — זמין, נעול, נרכש ונוצל' },
    { key: 'joba_settings', label: 'הגדרות ג׳ובות', icon: Coins, desc: 'בונוסים, עמלות ומחירי פעולות' },
    { key: 'referrals', label: 'הפניות סוכנים', icon: Award, desc: 'ביצועי סוכנים וההפניות שהביאו' },
  ] },
  { label: 'מערכת', tabs: [
    { key: 'notifications', label: 'התראות', icon: Bell, desc: 'ניהול התראות המערכת למשתמשים' },
    { key: 'brands', label: 'מותגים', icon: Store, desc: 'ניהול המותגים והסביבות במרקטפלייס' },
    { key: 'categories', label: 'קטגוריות', icon: Tag, desc: 'קטלוג הקטגוריות וטפסי המשימות הגלובליים' },
  ] },
];

function TabButton({ active, onClick, children, badge }) {
  return (
    <button onClick={onClick} style={{
      padding: '8px 16px', borderRadius: 20, fontWeight: 700, fontSize: 13,
      background: active ? '#0f2b6b' : 'var(--surface-2)',
      color: active ? 'white' : 'var(--text-2)',
      border: active ? 'none' : '1px solid var(--border-1)',
      cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center',
      gap: 4, whiteSpace: 'nowrap',
    }}>
      {children}
      {badge > 0 && (
        <span style={{ background: '#dc2626', color: 'white', fontSize: 10, padding: '1px 5px', borderRadius: 10, fontWeight: 800 }}>
          {badge}
        </span>
      )}
    </button>
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginTop: 6 }}>
            <CopyableId id={report.reporter_id} label="מזהה מדווח" />
            <CopyableId id={report.task_id} label="מזהה משימה" />
          </div>
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
  // The launch settings decide who the app actually lets in, so the dashboard
  // needs them to report each user's access truthfully.
  const { settings: jobaSettings } = useJobaSettings();
  const [tab, setTab] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('tab') || 'tasks';
  });
  const [taskSearch, setTaskSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [taskStatusFilter, setTaskStatusFilter] = useState('');
  const [userFilters, setUserFilters] = useState({ verified: false, social: false, profileFilled: false, viaAgent: false, noAgent: false, platform: '' });
  const [userDateFilter, setUserDateFilter] = useState('all');

  const { data: allTasks = [], isLoading: loadingTasks, refetch: refetchTasks } = useQuery({
    queryKey: ['adminTasks'],
    queryFn: () => base44.entities.Task.list('-created_date', 200),
    enabled: me?.role === 'admin',
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

  const { data: allUsers = [], isLoading: loadingUsers, refetch: refetchUsers } = useQuery({
    queryKey: ['adminUsers'],
    queryFn: () => base44.entities.User.list('-created_date', 500),
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

  // Authoritative applicant total per task. Task.applicants only holds the
  // still-active ones, so counting it would report 0 for a task whose
  // applicants were all rejected.
  const { data: applicantCounts = {} } = useQuery({
    queryKey: ['adminApplicantCounts'],
    queryFn: async () => {
      const res = await base44.entities.TaskApplication.aggregate({ groupBy: 'task_id', count: true });
      const map = {};
      (res.rows || []).forEach(r => { map[r.task_id] = r.count || 0; });
      return map;
    },
    enabled: me?.role === 'admin' && tab === 'tasks',
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

  const [selectedSupportUser, setSelectedSupportUser] = useState(null);
  const [supportReply, setSupportReply] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [kycLightbox, setKycLightbox] = useState(null);
  const [selectedUsers, setSelectedUsers] = useState(new Set());
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showBulkApproveModal, setShowBulkApproveModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignTarget, setAssignTarget] = useState(null);

  // KYC users = those with a KYC status OR submitted ID docs.
  // `is_verified` is the platform's email-verification flag (auto-set by Google/Apple/OTP),
  // NOT app-level KYC — it must NOT be used to decide KYC approval.
  const kycUsers = allUsers.filter(u => u.kyc_status || u.id_number || u.id_photo_url);
  const pendingKyc = allUsers.filter(u => u.kyc_status === 'pending' || (!u.kyc_status && (u.id_number || u.id_photo_url)));

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

  // Live task metrics. Views, clicks, applicants and the chosen worker all change
  // while the dashboard is open, and a stale number here is worse than no number:
  // Task events patch the cached row in place, while application changes only
  // invalidate the applicant-count aggregate (debounced — aggregates are limited).
  useEffect(() => {
    if (me?.role !== 'admin') return;

    const unsubTasks = base44.entities.Task.subscribe((event) => {
      if (event.type === 'delete') {
        queryClient.setQueryData(['adminTasks'], (old = []) => (old || []).filter(t => t.id !== event.id));
        return;
      }
      const next = event.data;
      if (!next?.id) return;
      queryClient.setQueryData(['adminTasks'], (old = []) => {
        const list = old || [];
        const idx = list.findIndex(t => t.id === next.id);
        if (idx === -1) return [next, ...list].slice(0, 200);
        const copy = [...list];
        copy[idx] = { ...copy[idx], ...next };
        return copy;
      });
    });

    let timer = null;
    const unsubApps = base44.entities.TaskApplication.subscribe(() => {
      clearTimeout(timer);
      timer = setTimeout(() => queryClient.invalidateQueries({ queryKey: ['adminApplicantCounts'] }), 1500);
    });

    return () => { unsubTasks(); unsubApps(); clearTimeout(timer); };
  }, [me?.role, queryClient]);

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
    try {
      // UH-4: access state is server/admin only.
      await base44.functions.invoke('adminSetUserFields', {
        userId: user.id,
        values: { is_blocked: !user.is_blocked },
      });
      queryClient.setQueryData(['adminUsers'], (old = []) =>
        old.map(u => u.id === user.id ? { ...u, is_blocked: !u.is_blocked } : u)
      );
    } catch (e) {
      toast.error(e.message?.includes('Rate limit') ? 'יותר מדי פעולות — נסה עוד רגע' : 'שגיאה: ' + (e.message || 'לא ניתן לעדכן'));
      throw e;
    }
  };

  const handleSendCredits = async (user, amount, note) => {
    const res = await base44.functions.invoke('sendCreditsToUser', {
      targetUserId: user.id, amount, note,
    });
    if (res.data?.error) throw new Error(res.data.error);
    queryClient.setQueryData(['adminUsers'], (old = []) =>
      old.map(u => u.id === user.id ? { ...u, worker_credits: res.data.newBalance } : u)
    );
  };

  const handleSetAgent = async (user, updates) => {
    try {
      // UH-4: role / commission / agent code / approval are server/admin only.
      await base44.functions.invoke('adminSetUserFields', {
        userId: user.id,
        values: updates,
      });
      queryClient.setQueryData(['adminUsers'], (old = []) =>
        old.map(u => u.id === user.id ? { ...u, ...updates } : u)
      );
      toast.success('המשתמש עודכן בהצלחה');
    } catch (e) {
      toast.error('שגיאה: ' + (e.message?.includes('Rate limit') ? 'יותר מדי פעולות — נסה עוד רגע' : (e.message || 'לא ניתן לעדכן')));
      throw e;
    }
  };

  const toggleSelectUser = (userId) => {
    setSelectedUsers(prev => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const handleBulkApprove = async (approve) => {
    const ids = Array.from(selectedUsers);
    if (ids.length === 0) return;
    try {
      // Must go through the backend: the built-in User entity silently ignores
      // client-side bulkUpdate, so the previous call never changed any record.
      const res = await base44.functions.invoke('adminBulkUpdateUsers', {
        userIds: ids,
        updates: { is_approved: approve },
      });
      if (res.data?.error) throw new Error(res.data.error);
      queryClient.setQueryData(['adminUsers'], (old = []) =>
        old.map(u => selectedUsers.has(u.id) ? { ...u, is_approved: approve } : u)
      );
      toast.success(`${ids.length} משתמשים ${approve ? 'אושרו' : 'בוטלה גישתם'}`);
      setSelectedUsers(new Set());
      refetchUsers();
    } catch (e) {
      toast.error('שגיאה: ' + (e.message || ''));
    }
  };

  const handleAssignAgent = async (agentCode, agentId) => {
    if (assignTarget === 'bulk') {
      const ids = Array.from(selectedUsers);
      if (ids.length === 0) return;
      try {
        const res = await base44.functions.invoke('adminBulkUpdateUsers', {
          userIds: ids,
          updates: { referred_by_agent_code: agentCode, agent_id: agentId },
        });
        if (res.data?.error) throw new Error(res.data.error);
        queryClient.setQueryData(['adminUsers'], (old = []) =>
          old.map(u => selectedUsers.has(u.id) ? { ...u, referred_by_agent_code: agentCode, agent_id: agentId } : u)
        );
        toast.success(`${ids.length} משתמשים שויכו לסוכן`);
        setSelectedUsers(new Set());
      } catch (e) {
        toast.error('שגיאה: ' + (e.message || ''));
      }
    } else if (assignTarget) {
      try {
        // UH-4: referral attribution is server/admin only.
        await base44.functions.invoke('adminSetUserFields', {
          userId: assignTarget,
          values: { referred_by_agent_code: agentCode, agent_id: agentId },
        });
        queryClient.setQueryData(['adminUsers'], (old = []) =>
          old.map(u => u.id === assignTarget ? { ...u, referred_by_agent_code: agentCode, agent_id: agentId } : u)
        );
        toast.success('המשתמש שויך לסוכן');
      } catch (e) {
        toast.error('שגיאה: ' + (e.message || ''));
      }
    }
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

  const handleTaskStatusChange = async (task, newStatus) => {
    try {
      await base44.entities.Task.update(task.id, { status: newStatus });
      queryClient.setQueryData(['adminTasks'], (old = []) =>
        old.map(t => t.id === task.id ? { ...t, status: newStatus } : t)
      );
      toast.success('סטטוס עודכן');
    } catch (e) {
      toast.error('שגיאה: ' + (e.message || 'לא ניתן לעדכן'));
    }
  };

  const handleTaskDelete = async (task) => {
    try {
      // Server-authoritative delete: settles and refunds every committed
      // application before the record is removed. Never delete client-side,
      // or applicants would lose their jobas silently.
      const res = await base44.functions.invoke('deleteTask', { taskId: task.id });
      if (!res.data?.success) throw new Error(res.data?.error || 'לא ניתן למחוק');
      queryClient.setQueryData(['adminTasks'], (old = []) => old.filter(t => t.id !== task.id));
      toast.success('המשימה נמחקה');
    } catch (e) {
      toast.error('שגיאה: ' + (e.message || 'לא ניתן למחוק'));
    }
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
    const matchQ = !q || u.full_name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q);
    if (!matchQ) return false;
    if (userFilters.verified && !isUserVerified(u)) return false;
    if (userFilters.social && !hasSocialVerified(u)) return false;
    if (userFilters.profileFilled && !(u.phone && u.preferred_categories?.length > 0)) return false;
    if (userFilters.viaAgent && !u.referred_by_agent_code) return false;
    if (userFilters.noAgent && u.referred_by_agent_code) return false;
    if (userFilters.platform) {
      const plat = u.registration_platform || (u.registration_source === 'native' ? 'native' : 'web');
      if (plat !== userFilters.platform) return false;
    }
    if (userDateFilter !== 'all' && u.created_date) {
      const created = new Date(u.created_date).getTime();
      const now = Date.now();
      const ranges = {
        today: 24 * 60 * 60 * 1000,
        '2days': 2 * 24 * 60 * 60 * 1000,
        week: 7 * 24 * 60 * 60 * 1000,
        '2weeks': 14 * 24 * 60 * 60 * 1000,
        month: 30 * 24 * 60 * 60 * 1000,
      };
      if (now - created > ranges[userDateFilter]) return false;
    }
    return true;
  });

  const pendingReports = allReports.filter(r => r.status === 'pending').length;

  // Counted by the SAME rule the app uses, so a user the launch settings
  // already release is not reported as waiting for approval.
  const pendingApproval = allUsers.filter(u => !resolveUserAccess(u, jobaSettings).hasAccess && u.role !== 'admin').length;

  const verifiedCount = allUsers.filter(u => isUserVerified(u)).length;
  const goldCount = allUsers.filter(u => isUserVerified(u) && hasSocialVerified(u)).length;

  const badges = { reports: pendingReports, kyc: kycUsers.length, support: unreadSupportCount };
  const activeTab = TAB_GROUPS.flatMap(g => g.tabs).find(t => t.key === tab);

  const stats = [
    { label: 'משימות', value: allTasks.length, color: '#1a6fd4', bg: '#eff6ff' },
    { label: 'משתמשים', value: allUsers.length, color: '#7c3aed', bg: '#f5f3ff' },
    { label: 'מאומתים', value: verifiedCount, color: '#16a34a', bg: '#f0fdf4' },
    { label: 'ווי זהב', value: goldCount, color: '#d97706', bg: '#fffbeb' },
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

      {/* Tabs — grouped by what they are for */}
      <div style={{ padding: '16px 16px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {TAB_GROUPS.map(group => (
          <div key={group.label}>
            <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-3)', letterSpacing: 0.6, marginBottom: 6 }}>{group.label}</div>
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', scrollbarWidth: 'none' }}>
              {group.tabs.map(t => (
                <TabButton key={t.key} active={tab === t.key} onClick={() => setTab(t.key)} badge={badges[t.key]}>
                  <t.icon size={13} /> {t.label}
                </TabButton>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div style={{ padding: '16px 16px 80px' }}>
        {/* Each tab states what it is for, so the panel below reads as its topic */}
        {activeTab && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <activeTab.icon size={17} color="#1a6fd4" />
              <span style={{ fontSize: 16, fontWeight: 900, color: 'var(--text-1)' }}>{activeTab.label}</span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 3 }}>{activeTab.desc}</div>
          </div>
        )}

        {/* ANALYTICS TAB */}
        {tab === 'analytics' && (
          <AdminAnalyticsTab allUsers={allUsers} />
        )}

        {/* BRANDS TAB — Platform Admin only (Package 4.5) */}
        {tab === 'brands' && (
          <BrandsTab />
        )}

        {/* GLOBAL CATEGORIES — the authoritative category + task-form catalogue */}
        {tab === 'categories' && (
          <GlobalCategoriesTab />
        )}

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
            {filteredTasks.map(task => (
              <AdminTaskRow
                key={task.id}
                task={task}
                applicantCount={applicantCounts[task.id]}
                onStatusChange={handleTaskStatusChange}
                onDelete={handleTaskDelete}
              />
            ))}
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
                  onClick={() => setShowApproveModal(true)}
                  style={{ height: 36, padding: '0 12px', borderRadius: 10, background: '#1a6fd4', color: 'white', border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap' }}
                >
                  ✓ אשר הכל ({pendingApproval})
                </button>
              )}
              <button
                onClick={() => {
                  exportToCSV(filteredUsers, [
                    { key: 'full_name', label: 'שם' },
                    { key: 'email', label: 'אימייל' },
                    { key: 'phone', label: 'טלפון' },
                    { key: 'role', label: 'תפקיד' },
                    { key: 'referred_by_agent_code', label: 'קוד סוכן' },
                    { key: 'registration_source', label: 'מקור הרשמה' },
                    { key: 'registration_platform', label: 'פלטפורמה' },
                    { key: 'is_approved', label: 'מאושר' },
                    { key: 'is_verified', label: 'מאומת (אימייל)' },
                    { key: 'kyc_status', label: 'סטטוס KYC' },
                    { key: 'id_number', label: 'ת.ז.' },
                    { key: 'instagram_username', label: 'אינסטגרם' },
                    { key: 'instagram_verified', label: 'אינסטגרם מאומת' },
                    { key: 'facebook_username', label: 'פייסבוק' },
                    { key: 'facebook_verified', label: 'פייסבוק מאומת' },
                    { key: 'tiktok_username', label: 'טיקטוק' },
                    { key: 'tiktok_verified', label: 'טיקטוק מאומת' },
                    { key: 'preferred_categories', label: 'קטגוריות' },
                    { key: 'preferred_cities', label: 'ערים' },
                    { key: 'worker_credits', label: 'יתרת ג\'ובות' },
                    { key: 'rating', label: 'דירוג' },
                    { key: 'tasks_completed', label: 'משימות שהושלמו' },
                    { key: 'fcm_tokens', label: 'התראות מופעלות' },
                    { key: 'created_date', label: 'תאריך הרשמה' },
                  ], 'joba24_users');
                }}
                style={{ height: 36, padding: '0 12px', borderRadius: 10, background: '#059669', color: 'white', border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 4 }}
              >
                <Download size={13} /> ייצא Excel
              </button>
            </div>

            {/* Filter chips */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
              {[
                { key: 'verified', label: 'מאומתים', icon: ShieldCheck, color: '#16a34a' },
                { key: 'social', label: 'רשת חברתית', icon: Award, color: '#d97706' },
                { key: 'profileFilled', label: 'מילאו פרטים', icon: UserCheck, color: '#1a6fd4' },
                { key: 'viaAgent', label: 'הגיעו על ידי סוכן', icon: Users, color: '#7c3aed' },
                { key: 'noAgent', label: 'ללא סוכן', icon: UserX, color: '#dc2626' },
              ].map(f => {
                const active = userFilters[f.key];
                return (
                  <button key={f.key} onClick={() => setUserFilters(prev => ({ ...prev, [f.key]: !prev[f.key] }))}
                    style={{
                      padding: '5px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                      background: active ? f.color : 'var(--surface-2)',
                      color: active ? 'white' : 'var(--text-2)',
                      border: `1px solid ${active ? f.color : 'var(--border-1)'}`,
                      cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                    }}>
                    <f.icon size={12} /> {f.label}
                  </button>
                );
              })}
              {['ios', 'android', 'web'].map(plat => {
                const labels = { ios: '🍎 אפל', android: '🤖 אנדרואיד', web: '🌐 דפדפן' };
                const active = userFilters.platform === plat;
                return (
                  <button key={plat} onClick={() => setUserFilters(prev => ({ ...prev, platform: active ? '' : plat }))}
                    style={{
                      padding: '5px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                      background: active ? '#0f2b6b' : 'var(--surface-2)',
                      color: active ? 'white' : 'var(--text-2)',
                      border: `1px solid ${active ? '#0f2b6b' : 'var(--border-1)'}`,
                      cursor: 'pointer',
                    }}>
                    {labels[plat]}
                  </button>
                );
              })}
              <select
                value={userDateFilter}
                onChange={e => setUserDateFilter(e.target.value)}
                style={{
                  padding: '5px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                  border: `1px solid ${userDateFilter !== 'all' ? '#0f2b6b' : 'var(--border-1)'}`,
                  background: userDateFilter !== 'all' ? '#0f2b6b' : 'var(--surface-2)',
                  color: userDateFilter !== 'all' ? 'white' : 'var(--text-2)',
                  cursor: 'pointer', outline: 'none',
                }}
              >
                <option value="all">כל הזמנים</option>
                <option value="today">24 שעות אחרונות</option>
                <option value="2days">יומיים אחרונים</option>
                <option value="week">שבוע אחרון</option>
                <option value="2weeks">שבועיים אחרונים</option>
                <option value="month">חודש אחרון</option>
              </select>
              {(userFilters.verified || userFilters.social || userFilters.profileFilled || userFilters.viaAgent || userFilters.platform || userDateFilter !== 'all') && (
                <button onClick={() => { setUserFilters({ verified: false, social: false, profileFilled: false, viaAgent: false, noAgent: false, platform: '' }); setUserDateFilter('all'); }}
                  style={{ padding: '5px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', cursor: 'pointer' }}>
                  נקה פילטרים
                </button>
              )}
            </div>

            {selectedUsers.size > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, padding: '8px 12px', background: '#eff6ff', borderRadius: 12, border: '1px solid #bfdbfe' }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: '#1a6fd4', flexShrink: 0 }}>{selectedUsers.size} נבחרו</span>
                <button onClick={() => setShowBulkApproveModal(true)} style={{ height: 32, padding: '0 12px', borderRadius: 8, background: '#1a6fd4', color: 'white', border: 'none', fontSize: 11, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>אשר נבחרים</button>
                <button onClick={() => handleBulkApprove(false)} style={{ height: 32, padding: '0 12px', borderRadius: 8, background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', fontSize: 11, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>בטל גישה לנבחרים</button>
                <button onClick={() => { setAssignTarget('bulk'); setShowAssignModal(true); }} style={{ height: 32, padding: '0 12px', borderRadius: 8, background: '#f5f3ff', color: '#7c3aed', border: '1px solid #ddd6fe', fontSize: 11, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 4 }}><UserCheck size={12} /> שייך לסוכן</button>
                <button onClick={() => setSelectedUsers(new Set())} style={{ height: 32, padding: '0 10px', borderRadius: 8, background: 'var(--surface-3)', color: 'var(--text-2)', border: '1px solid var(--border-1)', fontSize: 11, fontWeight: 700, cursor: 'pointer', marginLeft: 'auto' }}>ביטול</button>
              </div>
            )}

            {loadingUsers ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Loader2 size={24} className="animate-spin" color="#1a6fd4" /></div>
            ) : (
              <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                {filteredUsers.length} משתמשים
                {filteredUsers.length > 0 && <button onClick={() => setSelectedUsers(new Set(filteredUsers.map(u => u.id)))} style={{ background: 'none', border: 'none', color: '#1a6fd4', fontSize: 11, fontWeight: 700, cursor: 'pointer', padding: 0 }}>בחר הכל</button>}
                {selectedUsers.size > 0 && <button onClick={() => setSelectedUsers(new Set())} style={{ background: 'none', border: 'none', color: '#dc2626', fontSize: 11, fontWeight: 700, cursor: 'pointer', padding: 0 }}>נקה בחירה</button>}
              </div>
            )}
            {filteredUsers.map(user => (
              <AdminUserRow key={user.id} user={user} launchSettings={jobaSettings} onToggleBlock={handleToggleBlock} onSetAgent={handleSetAgent} onSendCredits={handleSendCredits} isSelected={selectedUsers.has(user.id)} onToggleSelect={() => toggleSelectUser(user.id)} onAssignAgent={(u) => { setAssignTarget(u.id); setShowAssignModal(true); }} />
            ))}
            {showApproveModal && (
              <ApproveAllModal
                count={pendingApproval}
                onClose={() => setShowApproveModal(false)}
                onConfirm={async () => {
                  const unapproved = allUsers.filter(u => !resolveUserAccess(u, jobaSettings).hasAccess && u.role !== 'admin');
                  if (unapproved.length === 0) return;
                  const res = await base44.functions.invoke('adminBulkUpdateUsers', {
                    userIds: unapproved.map(u => u.id),
                    updates: { is_approved: true },
                  });
                  if (res.data?.error) throw new Error(res.data.error);
                  queryClient.setQueryData(['adminUsers'], (old = []) =>
                    old.map(u => u.is_approved || u.role === 'admin' ? u : { ...u, is_approved: true })
                  );
                  toast.success(`${unapproved.length} משתמשים אושרו`);
                  refetchUsers();
                }}
              />
            )}
            {showBulkApproveModal && (
              <ApproveAllModal
                selectedCount={selectedUsers.size}
                onClose={() => setShowBulkApproveModal(false)}
                onConfirm={async () => { await handleBulkApprove(true); }}
              />
            )}
            {showAssignModal && (
              <AssignAgentModal
                agents={allUsers.filter(u => !!u.agent_code)}
                count={assignTarget === 'bulk' ? selectedUsers.size : 1}
                onClose={() => { setShowAssignModal(false); setAssignTarget(null); }}
                onAssign={handleAssignAgent}
              />
            )}
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
          <AdminKycTab
            kycUsers={kycUsers}
            pendingKyc={pendingKyc}
            onOpenLightbox={setKycLightbox}
            refetchUsers={refetchUsers}
          />
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
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2, flexShrink: 0 }}>
                      <CopyableId id={conv.user_id} label="" fontSize={9} />
                      <span style={{ fontSize: 10, color: '#cbd5e1' }}>
                        {lastMsg?.created_date ? format(new Date(lastMsg.created_date), 'dd/MM HH:mm') : ''}
                      </span>
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
                    <CopyableId id={selectedSupportUser} label="מזהה משתמש" fontSize={9} />
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

        {/* NOTIFICATIONS MANAGER TAB */}
        {tab === 'notifications' && (
          <NotificationManagerTab />
        )}

        {/* REFERRALS TAB */}
        {tab === 'referrals' && (
          <AgentReferralsTab />
        )}

        {/* CREDITS TAB — the credit position of every user */}
        {tab === 'credits' && (
          <AdminCreditsTab allUsers={allUsers} loadingUsers={loadingUsers} />
        )}

        {/* JOBA SETTINGS TAB */}
        {tab === 'joba_settings' && (
          <JobaSettingsTab />
        )}

        {/* TASK FORM TAB — one switch per field of the publish form */}
        {tab === 'task_form' && (
          <TaskFormFieldsTab />
        )}
      </div>

      {kycLightbox && (
        <KycImageLightbox
          imageUrl={kycLightbox.url}
          userName={kycLightbox.name}
          onClose={() => setKycLightbox(null)}
        />
      )}
    </div>
  );
}