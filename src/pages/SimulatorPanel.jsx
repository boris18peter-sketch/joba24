import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import SignupGiftModal from '@/components/SignupGiftModal';
import BuyCreditsModal from '@/components/BuyCreditsModal';
import LoginPromptModal from '@/components/LoginPromptModal';
import ApprovedPopup from '@/components/ApprovedPopup';
import WorkerCancelledPopup from '@/components/WorkerCancelledPopup';
import ApprovalRevokedPopup from '@/components/ApprovalRevokedPopup';
import CancelSuccessPopup from '@/components/CancelSuccessPopup';
import InstantMatchPopup from '@/components/InstantMatchPopup';
import RatingModal from '@/components/RatingModal';
import {
  ArrowRight, FlaskConical, Loader2, RefreshCw, Trash2,
  CheckCircle2, XCircle, AlertCircle, ChevronDown, ChevronUp,
  Play, Zap, Clock, User, Wallet, Star, MessageCircle, ShieldCheck,
  Sparkles, Bell, Map, List, CreditCard, Flag, Navigation,
  Eye, AlertTriangle, Gift, Phone, BarChart3, Layers, Building2
} from 'lucide-react';
import { ISRAELI_CITIES } from '@/lib/israeliCities';

/* ─── Reusable UI ─────────────────────────── */
function Section({ title, icon, children, danger, defaultOpen = false, badge }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ background: 'white', borderRadius: 18, border: `1.5px solid ${danger ? '#fecaca' : '#dce8f5'}`, marginBottom: 10, overflow: 'hidden' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ width: '100%', padding: '13px 16px', background: danger ? '#fff5f5' : 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', textAlign: 'right' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {icon}
          <span style={{ fontSize: 13, fontWeight: 800, color: danger ? '#dc2626' : '#0f2b6b' }}>{title}</span>
          {badge != null && (
            <span style={{ fontSize: 10, fontWeight: 900, background: danger ? '#fecaca' : '#dbeafe', color: danger ? '#dc2626' : '#1a6fd4', borderRadius: 99, padding: '1px 7px' }}>{badge}</span>
          )}
        </div>
        {open ? <ChevronUp size={15} color="#94a3b8" /> : <ChevronDown size={15} color="#94a3b8" />}
      </button>
      {open && (
        <div style={{ padding: '0 14px 14px', display: 'flex', flexDirection: 'column', gap: 7 }}>
          {children}
        </div>
      )}
    </div>
  );
}

function Btn({ label, color = '#1a6fd4', onClick, disabled, small, outline }) {
  const [localLoading, setLocalLoading] = useState(false);
  const handle = async () => {
    setLocalLoading(true);
    try { await onClick(); } catch (e) { toast.error(`שגיאה: ${e.message}`); }
    setLocalLoading(false);
  };
  return (
    <button
      onClick={handle}
      disabled={disabled || localLoading}
      style={{
        width: '100%', height: small ? 36 : 42, borderRadius: 11, border: outline ? `1.5px solid ${color}` : 'none',
        cursor: (disabled || localLoading) ? 'not-allowed' : 'pointer',
        background: disabled ? '#e5e7eb' : outline ? 'transparent' : color,
        color: disabled ? '#9ca3af' : outline ? color : 'white',
        fontWeight: 700, fontSize: small ? 11 : 13,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        opacity: localLoading ? 0.7 : 1,
      }}
    >
      {localLoading ? <Loader2 size={14} className="animate-spin" /> : label}
    </button>
  );
}

function InfoBox({ label, value, accent, warn }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', background: warn ? '#fff7ed' : '#f8faff', borderRadius: 9, fontSize: 12, border: warn ? '1px solid #fed7aa' : 'none' }}>
      <span style={{ color: '#64748b', fontWeight: 500 }}>{label}</span>
      <span style={{ color: accent || (warn ? '#d97706' : '#0f2b6b'), fontWeight: 800 }}>{value ?? '—'}</span>
    </div>
  );
}

function TaskPill({ task, onClick }) {
  const colors = {
    OPEN: '#16a34a', TAKEN: '#b07020', COMPLETED: '#1a6fd4', CANCELLED: '#dc2626',
    EXPIRED: '#94a3b8', APPROVED_PENDING_DEPARTURE: '#7c3aed', ON_THE_WAY: '#0891b2',
    ARRIVED: '#0369a1', IN_PROGRESS: '#059669'
  };
  return (
    <button
      onClick={() => onClick(task)}
      style={{ width: '100%', padding: '7px 11px', borderRadius: 9, border: `1.5px solid ${(colors[task.status] || '#94a3b8')}30`, background: `${(colors[task.status] || '#94a3b8')}10`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', textAlign: 'right' }}
    >
      <span style={{ fontSize: 11, fontWeight: 700, color: '#1e293b', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.title}</span>
      <span style={{ fontSize: 10, fontWeight: 800, color: colors[task.status] || '#94a3b8', marginRight: 8, flexShrink: 0 }}>{task.status}</span>
    </button>
  );
}

function StatusBadge({ ok, warn, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 9px', borderRadius: 20, background: ok ? '#f0fdf4' : warn ? '#fff7ed' : '#fef2f2', border: `1px solid ${ok ? '#bbf7d0' : warn ? '#fed7aa' : '#fecaca'}` }}>
      {ok ? <CheckCircle2 size={12} color="#16a34a" /> : warn ? <AlertCircle size={12} color="#d97706" /> : <XCircle size={12} color="#dc2626" />}
      <span style={{ fontSize: 10, fontWeight: 700, color: ok ? '#15803d' : warn ? '#b45309' : '#dc2626' }}>{label}</span>
    </div>
  );
}

function ChecklistItem({ label, done, warn }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', borderBottom: '1px solid #f1f5f9' }}>
      {done ? <CheckCircle2 size={14} color="#16a34a" /> : warn ? <AlertCircle size={14} color="#d97706" /> : <XCircle size={14} color="#dc2626" />}
      <span style={{ fontSize: 12, color: done ? '#374151' : warn ? '#92400e' : '#991b1b', fontWeight: done ? 500 : 700 }}>{label}</span>
    </div>
  );
}

const STATUS_COLORS = {
  OPEN: '#16a34a', TAKEN: '#b07020', COMPLETED: '#1a6fd4', CANCELLED: '#dc2626',
  EXPIRED: '#94a3b8', APPROVED_PENDING_DEPARTURE: '#7c3aed', ON_THE_WAY: '#0891b2',
  ARRIVED: '#0369a1', IN_PROGRESS: '#059669'
};

/* ─── Main ─────────────────────────── */
export default function SimulatorPanel() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: me, refetch: refetchMe } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me(), staleTime: 30000, refetchOnWindowFocus: false });
  const { data: allTasks = [], refetch: refetchTasks } = useQuery({
    queryKey: ['sim_tasks'],
    queryFn: () => base44.entities.Task.list('-created_date', 100),
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });
  const { data: myApps = [] } = useQuery({
    queryKey: ['sim_apps'],
    queryFn: () => me?.id ? base44.entities.TaskApplication.filter({ worker_id: me.id }, '-created_date', 50) : [],
    enabled: !!me?.id,
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });
  const { data: creditTxs = [] } = useQuery({
    queryKey: ['sim_credit_txs'],
    queryFn: () => me?.id ? base44.entities.CreditTransaction.filter({ user_id: me.id }, '-created_date', 20) : [],
    enabled: !!me?.id,
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });
  const { data: allReviews = [] } = useQuery({
    queryKey: ['sim_reviews'],
    queryFn: () => me?.id ? base44.entities.Review.filter({ reviewee_id: me.id }, '-created_date', 20) : [],
    enabled: !!me?.id,
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });

  const [popup, setPopup] = useState(null);
  const closePopup = () => setPopup(null);

  // Bulk task generator state
  const [bulkCity, setBulkCity] = useState('תל אביב');
  const [bulkCount, setBulkCount] = useState(20);
  const [bulkMinPrice, setBulkMinPrice] = useState(100);
  const [bulkMaxPrice, setBulkMaxPrice] = useState(2000);
  const bulkTasks = myTasks.filter(t => t.title?.startsWith('🧪🏙️'));

  const myTasks = allTasks.filter(t => t.client_id === me?.id);
  const testTasks = myTasks.filter(t => t.title?.includes('🧪'));
  const openTasks = allTasks.filter(t => t.status === 'OPEN');
  const myOpenTasks = myTasks.filter(t => t.status === 'OPEN');
  const takenByMe = allTasks.filter(t => t.worker_id === me?.id && ['TAKEN', 'ON_THE_WAY', 'ARRIVED', 'IN_PROGRESS', 'APPROVED_PENDING_DEPARTURE'].includes(t.status));
  const myTakenAsClient = myTasks.filter(t => ['TAKEN', 'ON_THE_WAY', 'ARRIVED', 'IN_PROGRESS'].includes(t.status));
  const completedUnconfirmed = myTasks.filter(t => t.status === 'COMPLETED' && !t.client_confirmed);
  const manualOpenTasks = openTasks.filter(t => t.approval_mode === 'manual' && t.client_id !== me?.id);
  const approvedApp = myApps.find(a => a.status === 'approved');

  // Status breakdown
  const statusCounts = Object.fromEntries(
    Object.keys(STATUS_COLORS).map(s => [s, allTasks.filter(t => t.status === s).length])
  );

  const inv = () => {
    ['sim_tasks', 'sim_apps', 'sim_credit_txs', 'sim_reviews', 'tasks', 'myTasks', 'me', 'allTasks', 'myApp'].forEach(k =>
      queryClient.invalidateQueries({ queryKey: [k] })
    );
  };
  const wrap = (fn) => async () => { await fn(); inv(); refetchMe(); };

  const mockTask = myTasks[0] || allTasks[0] || {
    id: 'demo', title: '🧪 משימת בדיקה', price: 150,
    worker_id: me?.id, worker_name: me?.full_name,
    client_id: me?.id, client_name: me?.full_name,
    status: 'COMPLETED', payment_method: 'Cash',
  };

  const createTask = async (overrides = {}) => {
    const t = await base44.entities.Task.create({
      title: '🧪 בדיקה — ' + (overrides.title || 'כללית'),
      description: 'משימת בדיקה אוטומטית מהסימולטור',
      price: 150, base_price: 150,
      city: 'תל אביב', location_name: 'תל אביב, רוטשילד 22',
      lat: 32.065, lng: 34.778,
      category: 'other', status: 'OPEN',
      payment_status: 'funded',
      payment_method: 'Cash',
      estimated_time: '1h',
      client_id: me?.id, client_name: me?.full_name,
      approval_mode: 'instant',
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      ...overrides,
    });
    toast.success(`✅ נוצרה: ${t.title}`);
    return t;
  };

  const addCredits = async (amount, type = 'Signup_Bonus', note = '') => {
    const current = me?.worker_credits ?? 0;
    const newBalance = current + amount;
    await base44.auth.updateMe({ worker_credits: newBalance });
    await base44.entities.CreditTransaction.create({
      user_id: me.id, amount, type,
      note: note || `🧪 סימולטור: +${amount}`,
      balance_after: newBalance,
    });
    toast.success(`✅ נוספו ${amount} ג'ובות | יתרה: ${newBalance}`);
  };

  const advanceWorkerStatus = async (task, ws) => {
    const updates = { worker_status: ws };
    if (ws === 'on_the_way') { updates.status = 'ON_THE_WAY'; updates.on_the_way_at = new Date().toISOString(); }
    if (ws === 'arrived') { updates.status = 'ARRIVED'; updates.arrived_at = new Date().toISOString(); }
    if (ws === 'done') { updates.status = 'IN_PROGRESS'; updates.worker_confirmed = true; updates.completed_at = new Date().toISOString(); }
    await base44.entities.Task.update(task.id, updates);
    toast.success(`📍 סטטוס עודכן: ${ws}`);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f0f4fa', padding: '14px 14px 48px' }} dir="rtl">

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <button onClick={() => navigate('/')} style={{ width: 38, height: 38, borderRadius: 12, background: 'white', border: '1px solid #dce8f5', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
          <ArrowRight size={17} color="#1a6fd4" />
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 900, fontSize: 18, color: '#0f2b6b', display: 'flex', alignItems: 'center', gap: 6 }}>
            <FlaskConical size={18} color="#7c3aed" /> QA סימולטור — השקה
          </div>
          <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 1 }}>כיסוי מלא · כל הזרימות · Joba24</div>
        </div>
        <button onClick={() => { inv(); refetchTasks(); refetchMe(); toast('🔄 מרענן...'); }}
          style={{ width: 36, height: 36, borderRadius: 10, background: 'white', border: '1px solid #dce8f5', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <RefreshCw size={14} color="#64748b" />
        </button>
      </div>

      {/* ── PRE-LAUNCH CHECKLIST ── */}
      <div style={{ background: 'white', borderRadius: 18, border: '2px solid #a5b4fc', padding: '14px 16px', marginBottom: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 900, color: '#3730a3', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
          <BarChart3 size={15} color="#6366f1" /> צ'קליסט לפני השקה
        </div>
        <ChecklistItem label="משתמש מחובר" done={!!me?.id} />
        <ChecklistItem label="זהות מאומתת" done={!!me?.is_verified} warn={!me?.is_verified} />
        <ChecklistItem label="יש ג'ובות (קרדיטים)" done={(me?.worker_credits ?? 0) >= 10} warn={(me?.worker_credits ?? 0) > 0 && (me?.worker_credits ?? 0) < 10} />
        <ChecklistItem label="יש משימות פתוחות בפיד" done={openTasks.length > 0} />
        <ChecklistItem label="יש משימות OPEN שניתן לקחת" done={openTasks.filter(t => t.client_id !== me?.id).length > 0} />
        <ChecklistItem label="סיימת לפחות משימה אחת" done={allTasks.some(t => t.status === 'COMPLETED')} warn={!allTasks.some(t => t.status === 'COMPLETED')} />
        <ChecklistItem label="יש ביקורת/דירוג" done={allReviews.length > 0} warn={allReviews.length === 0} />
        <ChecklistItem label="בונוס הרשמה נשלח" done={(me?.worker_credits ?? 0) > 0} warn={(me?.worker_credits ?? 0) === 0} />
      </div>

      {/* ── SYSTEM STATUS ── */}
      <div style={{ background: 'white', borderRadius: 18, border: '1.5px solid #dce8f5', padding: '14px 16px', marginBottom: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: '#0f2b6b', marginBottom: 10 }}>📊 סטטוס מערכת</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 8 }}>
          <InfoBox label="שם" value={me?.full_name?.split(' ')[0] || '—'} />
          <InfoBox label="ג'ובות" value={`${me?.worker_credits ?? 0} 🪙`} accent="#d97706" warn={(me?.worker_credits ?? 0) < 5} />
          <InfoBox label="OPEN בפיד" value={openTasks.length} accent="#16a34a" />
          <InfoBox label="המשימות שלי" value={myTasks.length} />
          <InfoBox label="כעובד" value={takenByMe.length} accent="#b07020" />
          <InfoBox label="ביקורות" value={allReviews.length} accent="#d97706" />
        </div>

        {/* Status breakdown */}
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 6 }}>התפלגות סטטוסים:</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {Object.entries(statusCounts).filter(([, v]) => v > 0).map(([s, c]) => (
              <div key={s} style={{ fontSize: 10, fontWeight: 800, background: `${STATUS_COLORS[s]}18`, color: STATUS_COLORS[s], borderRadius: 8, padding: '2px 8px', border: `1px solid ${STATUS_COLORS[s]}40` }}>
                {s.replace('_', ' ')}: {c}
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          <StatusBadge ok={!!me?.id} label="מחובר" />
          <StatusBadge ok={!!me?.is_verified} warn={!me?.is_verified} label="מאומת" />
          <StatusBadge ok={(me?.worker_credits ?? 0) >= 10} warn={(me?.worker_credits ?? 0) > 0} label={`${me?.worker_credits ?? 0} ג'ובות`} />
          <StatusBadge ok={openTasks.length > 0} label={`${openTasks.length} OPEN`} />
        </div>
      </div>

      {/* ── SCENARIO A: Full Instant Flow ── */}
      <Section title="🟢 זרימה מלאה — Instant" icon={<Zap size={14} color="#1a6fd4" />} defaultOpen badge={myOpenTasks.length + takenByMe.length}>
        <div style={{ fontSize: 11, color: '#64748b', padding: '5px 9px', background: '#f0f9ff', borderRadius: 8, border: '1px solid #bae6fd' }}>
          יצירה (instant) → לקיחה → on_the_way → arrived → done → COMPLETED → אישור לקוח
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          <Btn label="1️⃣ צור (מזומן ₪100)" color="#1a6fd4"
            onClick={wrap(() => createTask({ title: 'מיידית מזומן', approval_mode: 'instant', price: 100, payment_method: 'Cash' }))} />
          <Btn label="1️⃣ צור (Bit ₪200)" color="#0891b2"
            onClick={wrap(() => createTask({ title: 'מיידית Bit', approval_mode: 'instant', price: 200, payment_method: 'Bit' }))} />
        </div>

        {myOpenTasks.slice(0, 3).map(t => (
          <Btn key={t.id} label={`2️⃣ קח כעובד: "${t.title.slice(0, 22)}"`} color="#059669"
            onClick={wrap(() => base44.entities.Task.update(t.id, {
              status: 'TAKEN', worker_id: me?.id, worker_name: me?.full_name,
              worker_status: null,
            }))} />
        ))}

        {takenByMe.map(t => (
          <div key={t.id} style={{ border: '1px solid #e0f2fe', borderRadius: 12, padding: '10px 10px 6px', background: '#f0f9ff' }}>
            <div style={{ fontSize: 11, color: '#0369a1', fontWeight: 700, marginBottom: 6 }}>
              📋 {t.title.slice(0, 28)} · <span style={{ color: STATUS_COLORS[t.status] || '#1a6fd4' }}>{t.status}</span> · {t.worker_status || 'ממתין'}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 5 }}>
              <Btn label="🚗 יצאתי" color="#3b82f6" small disabled={t.worker_status === 'on_the_way'}
                onClick={wrap(() => advanceWorkerStatus(t, 'on_the_way'))} />
              <Btn label="📍 הגעתי" color="#7c3aed" small disabled={t.worker_status === 'arrived'}
                onClick={wrap(() => advanceWorkerStatus(t, 'arrived'))} />
              <Btn label="✅ סיימתי" color="#059669" small
                onClick={wrap(() => base44.entities.Task.update(t.id, {
                  worker_status: 'done', status: 'COMPLETED',
                  worker_confirmed: true, completed_at: new Date().toISOString(),
                }))} />
            </div>
          </div>
        ))}

        {completedUnconfirmed.map(t => (
          <Btn key={t.id} label={`💰 אשר ושחרר תשלום: ${t.title.slice(0, 20)}`} color="#b07020"
            onClick={wrap(() => base44.entities.Task.update(t.id, { client_confirmed: true }))} />
        ))}

        {takenByMe.length === 0 && myOpenTasks.length === 0 && (
          <div style={{ fontSize: 11, color: '#94a3b8', textAlign: 'center', padding: 6 }}>צור משימה תחילה ↑</div>
        )}
      </Section>

      {/* ── SCENARIO B: Manual Approval ── */}
      <Section title="🟣 אישור ידני + בקשות" icon={<User size={14} color="#7c3aed" />} badge={manualOpenTasks.length}>
        <div style={{ fontSize: 11, color: '#64748b', padding: '5px 9px', background: '#faf5ff', borderRadius: 8, border: '1px solid #e9d5ff' }}>
          יצירה (manual) → הגשת בקשה (עולה ג'ובות) → אישור / דחייה → זרימה
        </div>
        <Btn label="1️⃣ צור משימה (אישור ידני, PayBox ₪250)" color="#7c3aed"
          onClick={wrap(() => createTask({ title: 'ידנית ניקיון', approval_mode: 'manual', price: 250, category: 'cleaning', payment_method: 'PayBox' }))} />
        {manualOpenTasks.slice(0, 3).map(t => (
          <Btn key={t.id} label={`2️⃣ הגש בקשה: "${t.title.slice(0, 22)}"`} color="#7c3aed"
            onClick={wrap(async () => {
              const existing = await base44.entities.TaskApplication.filter({ task_id: t.id, worker_id: me.id });
              if (existing?.length) { toast.error('כבר הגשת בקשה'); return; }
              const res = await base44.functions.invoke('applyForTask', { taskId: t.id, message: '🧪 בקשת בדיקה' });
              if (res.data?.error) { toast.error(res.data.error); return; }
              toast.success('בקשה הוגשה!');
            })} />
        ))}
        {myApps.filter(a => a.status === 'pending').slice(0, 3).map(a => (
          <div key={a.id} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
            <Btn label="✅ אשר בקשה" color="#059669" small
              onClick={wrap(async () => {
                const task = allTasks.find(t => t.id === a.task_id);
                await base44.functions.invoke('approveWorker', {
                  taskId: a.task_id, applicationId: a.id,
                  workerId: a.worker_id, workerName: a.worker_name,
                });
              })} />
            <Btn label="❌ דחה + החזר" color="#dc2626" small
              onClick={wrap(async () => {
                await base44.functions.invoke('refundApplicationCredits', { applicationId: a.id });
                await base44.entities.TaskApplication.update(a.id, { status: 'rejected' });
                toast.success('נדחה + הוחזרו קרדיטים');
              })} />
          </div>
        ))}
        {approvedApp && (
          <Btn label="🚫 בטל עובד שאושר" color="#f97316" outline
            onClick={wrap(async () => {
              const res = await base44.functions.invoke('cancelApprovedWorker', { taskId: approvedApp.task_id });
              toast.success('עובד בוטל');
            })} />
        )}
      </Section>

      {/* ── SCENARIO C: Credits ── */}
      <Section title="🪙 ניהול ג'ובות (קרדיטים)" icon={<CreditCard size={14} color="#d97706" />}>
        <div style={{ fontSize: 11, color: '#b45309', padding: '5px 9px', background: '#fffbeb', borderRadius: 8, border: '1px solid #fde68a', fontWeight: 700 }}>
          יתרה נוכחית: {me?.worker_credits ?? 0} ג'ובות
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
          <Btn label="➕ +10 (בונוס)" color="#16a34a"
            onClick={wrap(() => addCredits(10, 'Signup_Bonus', 'בונוס בדיקה'))} />
          <Btn label="➕ +50 (רכישה)" color="#059669"
            onClick={wrap(() => addCredits(50, 'Purchase', 'רכישה בדיקה'))} />
          <Btn label="➕ +100" color="#0891b2"
            onClick={wrap(() => addCredits(100, 'Purchase', 'רכישה גדולה'))} />
          <Btn label="➕ +5 (לבדיקת חסמת Story)" color="#d97706"
            onClick={wrap(async () => {
              await base44.auth.updateMe({ worker_credits: 5 });
              toast('יתרה = 5 (פחות מ-10 לבדיקת חסמת Story)');
            })} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
          <Btn label="🔄 אפס ל-0" color="#dc2626"
            onClick={wrap(() => base44.auth.updateMe({ worker_credits: 0 }))} />
          <Btn label="💰 בונוס לויאלטי" color="#8b5cf6"
            onClick={wrap(async () => {
              await base44.functions.invoke('grantLoyaltyReward', { userId: me?.id });
              toast.success('בונוס לויאלטי נשלח!');
            })} />
        </div>
        {creditTxs.length > 0 && (
          <div style={{ background: '#f8faff', borderRadius: 10, padding: '8px 10px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 5 }}>4 עסקאות אחרונות:</div>
            {creditTxs.slice(0, 4).map(tx => (
              <div key={tx.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, padding: '3px 0', borderBottom: '1px solid #e8eef8' }}>
                <span style={{ color: '#475569', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }}>{tx.note || tx.type}</span>
                <span style={{ fontWeight: 800, color: tx.amount > 0 ? '#16a34a' : '#dc2626', flexShrink: 0 }}>{tx.amount > 0 ? '+' : ''}{tx.amount}</span>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* ── SCENARIO D: Stories ── */}
      <Section title="✨ Story — עולה 10 ג'ובות" icon={<Sparkles size={14} color="#a855f7" />}>
        <div style={{ fontSize: 11, color: '#7e22ce', padding: '5px 9px', background: '#fdf4ff', borderRadius: 8, border: '1px solid #e9d5ff' }}>
          Story מופיע בסרגל עליון. עולה 10 ג'ובות. יתרה: <strong>{me?.worker_credits ?? 0}</strong>
        </div>
        <Btn label="🧪 צור Story (מנכה 10 ג'ובות)" color="#a855f7"
          onClick={wrap(async () => {
            const credits = me?.worker_credits ?? 0;
            if (credits < 10) { toast.error(`צריך 10, יש ${credits}`); return; }
            const newBalance = credits - 10;
            await base44.auth.updateMe({ worker_credits: newBalance });
            await base44.entities.CreditTransaction.create({ user_id: me.id, amount: -10, type: 'Application_Fee', note: 'Story בדיקה', balance_after: newBalance });
            await base44.entities.Task.create({
              title: '🧪 Story בדיקה', description: 'Story לבדיקה', price: 100, base_price: 100,
              city: 'תל אביב', location_name: 'תל אביב, דיזנגוף 50', lat: 32.08, lng: 34.77,
              category: 'other', status: 'OPEN', payment_method: 'Cash', approval_mode: 'instant',
              is_story: true, story_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
              client_id: me.id, client_name: me.full_name,
            });
            toast.success(`Story נוצרה! יתרה: ${newBalance}`);
          })} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
          <Btn label="🔍 ראה בפיד" color="#6366f1" onClick={async () => navigate('/')} />
          <Btn label="🗺️ ראה במפה" color="#0891b2" onClick={async () => navigate('/map')} />
        </div>
      </Section>

      {/* ── SCENARIO E: Expiry & Cancel ── */}
      <Section title="⏰ פקיעה וביטול" icon={<Clock size={14} color="#d97706" />}>
        <Btn label="🕐 משימה שתפקע בדקה" color="#d97706"
          onClick={wrap(() => createTask({ title: 'פקיעה מהירה', expires_at: new Date(Date.now() + 60 * 1000).toISOString(), price: 80, expiry_duration_hours: 0.017 }))} />
        {myOpenTasks.slice(0, 2).map(t => (
          <div key={t.id} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
            <Btn label={`❌ בטל: "${t.title.slice(0, 16)}"`} color="#dc2626" small
              onClick={wrap(() => base44.functions.invoke('cancelTaskPayment', { taskId: t.id }))} />
            <Btn label={`⏰ EXPIRED`} color="#94a3b8" small
              onClick={wrap(() => base44.entities.Task.update(t.id, { status: 'EXPIRED' }))} />
          </div>
        ))}
        {myOpenTasks.length === 0 && <div style={{ fontSize: 11, color: '#94a3b8', textAlign: 'center', padding: 6 }}>צור משימה תחילה</div>}
      </Section>

      {/* ── SCENARIO F: Worker Status Steps ── */}
      <Section title="📍 עדכוני סטטוס עובד (כל הצעדים)" icon={<Navigation size={14} color="#059669" />} badge={takenByMe.length}>
        <div style={{ fontSize: 11, color: '#064e3b', padding: '5px 9px', background: '#ecfdf5', borderRadius: 8, border: '1px solid #a7f3d0' }}>
          TAKEN → ON_THE_WAY → ARRIVED → IN_PROGRESS → COMPLETED
        </div>
        {takenByMe.length === 0 ? (
          <div style={{ fontSize: 11, color: '#94a3b8', textAlign: 'center', padding: 6 }}>אין TAKEN — קח משימה בזרימה המלאה ↑</div>
        ) : takenByMe.map(t => (
          <div key={t.id} style={{ border: '1px solid #d1fae5', borderRadius: 11, padding: '9px', background: '#f0fdf4' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#065f46', marginBottom: 6 }}>
              {t.title.slice(0, 28)} · <span style={{ color: STATUS_COLORS[t.status] }}>{t.status}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
              {[
                { ws: 'on_the_way', label: '🚗 יצאתי', color: '#3b82f6', newStatus: 'ON_THE_WAY' },
                { ws: 'arrived', label: '📍 הגעתי', color: '#7c3aed', newStatus: 'ARRIVED' },
                { ws: 'done', label: '🔧 מבצע', color: '#f59e0b', newStatus: 'IN_PROGRESS' },
                { ws: 'completed', label: '✅ סיים', color: '#059669', newStatus: 'COMPLETED' },
              ].map(({ ws, label, color, newStatus }) => (
                <Btn key={ws} label={label} color={color} small
                  disabled={t.status === newStatus}
                  onClick={wrap(async () => {
                    if (ws === 'completed') {
                      await base44.entities.Task.update(t.id, { status: 'COMPLETED', worker_confirmed: true, worker_status: 'done', completed_at: new Date().toISOString() });
                    } else {
                      await advanceWorkerStatus(t, ws);
                    }
                  })} />
              ))}
            </div>
          </div>
        ))}
      </Section>

      {/* ── SCENARIO G: Verification ── */}
      <Section title="🛡️ אימות זהות" icon={<ShieldCheck size={14} color="#7c3aed" />}>
        <div style={{ fontSize: 11, color: '#64748b', padding: '5px 9px', background: '#f8faff', borderRadius: 8 }}>
          בדוק: ניסיון לפרסם / לקחת ← האם מופיע מודל אימות? | מצב נוכחי: {me?.is_verified ? '✅ מאומת' : '❌ לא מאומת'}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
          <Btn label="✅ סמן כמאומת" color="#059669"
            onClick={wrap(() => base44.auth.updateMe({ is_verified: true }))} />
          <Btn label="❌ הסר אימות" color="#dc2626"
            onClick={wrap(() => base44.auth.updateMe({ is_verified: false }))} />
        </div>
        <Btn label="🔐 פתח מודל אימות" color="#7c3aed" outline
          onClick={async () => navigate('/?open_verify=1')} />
      </Section>

      {/* ── SCENARIO H: Reviews & Ratings ── */}
      <Section title="⭐ ביקורות ודירוגים" icon={<Star size={14} color="#d97706" />} badge={allReviews.length}>
        <div style={{ fontSize: 11, color: '#64748b', padding: '5px 9px', background: '#fffbeb', borderRadius: 8 }}>
          ביקורות משפיעות על דירוג המשתמש בפיד ובליידרבורד
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
          {[5, 4, 3, 2].map(stars => (
            <Btn key={stars} label={`${'⭐'.repeat(Math.min(stars, 3))} ${stars} כוכבים (עובד)`} color={stars >= 4 ? '#d97706' : stars === 3 ? '#94a3b8' : '#dc2626'} small
              onClick={wrap(async () => {
                const completed = myTasks.find(t => t.status === 'COMPLETED') || allTasks.find(t => t.status === 'COMPLETED');
                if (!completed) { toast.error('אין COMPLETED'); return; }
                await base44.entities.Review.create({ task_id: completed.id, reviewer_id: completed.client_id || me.id, reviewee_id: me.id, rating: stars, comment: `🧪 ביקורת ${stars}★ מסימולטור`, role: 'worker' });
                toast.success(`ביקורת ${stars}★ נוצרה`);
              })} />
          ))}
        </div>
        <Btn label="⭐ ביקורת 5★ כלקוח (עלי)" color="#059669"
          onClick={wrap(async () => {
            const completed = myTasks.find(t => t.status === 'COMPLETED');
            if (!completed) { toast.error('אין COMPLETED'); return; }
            await base44.entities.Review.create({ task_id: completed.id, reviewer_id: me.id, reviewee_id: completed.worker_id || me.id, rating: 5, comment: '🧪 כלקוח 5★', role: 'client' });
          })} />
        {allReviews.length > 0 && (
          <div style={{ fontSize: 11, color: '#64748b', padding: '5px 9px', background: '#f8faff', borderRadius: 8 }}>
            ממוצע שלי: {(allReviews.reduce((s, r) => s + r.rating, 0) / allReviews.length).toFixed(1)} ⭐ מתוך {allReviews.length} ביקורות
          </div>
        )}
      </Section>

      {/* ── BOT SIMULATOR ── */}
      <Section title="🤖 בוט QA — עובד וירטואלי" icon={<FlaskConical size={14} color="#6366f1" />} defaultOpen badge={myOpenTasks.length}>
        <div style={{ fontSize: 11, color: '#3730a3', padding: '7px 10px', background: '#eef2ff', borderRadius: 8, border: '1px solid #c7d2fe', lineHeight: 1.6 }}>
          <strong>בוט מדמה עובד שני</strong> — מגיש בקשות, לוקח ומבצע משימות ללא מכשיר שני.<br />
          בחר משימה → לחץ על הפעולות בסדר, או "זרימה מלאה" להרצה אוטומטית.
        </div>

        {/* Full flow — one click per task */}
        <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', marginTop: 4 }}>⚡ זרימה מלאה (לחיצה אחת):</div>
        {myOpenTasks.length === 0 && (
          <div style={{ fontSize: 11, color: '#94a3b8', textAlign: 'center', padding: 6 }}>צור משימה OPEN תחילה ↓</div>
        )}
        {myOpenTasks.slice(0, 4).map(t => (
          <Btn key={t.id} label={`🤖 הרץ הכל: "${t.title.slice(0, 24)}"`} color="#6366f1"
            onClick={wrap(async () => {
              const res = await base44.functions.invoke('qaBot', { action: 'full_flow', taskId: t.id });
              if (!res.data?.success) { toast.error(res.data?.error || 'שגיאה'); return; }
              toast.success('✅ זרימה מלאה הושלמה! ' + (res.data.log?.slice(-1)[0] || ''));
            })} />
        ))}

        {/* Step by step */}
        {myOpenTasks.length > 0 && <>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', marginTop: 6 }}>🔢 שלב-שלב (על משימה ראשונה):</div>
          {(() => {
            const t = myOpenTasks[0];
            const taken = allTasks.find(x => x.worker_id === `bot_${me?.id}` && x.status === 'TAKEN');
            const targetTask = taken || t;
            return (
              <div style={{ border: '1px solid #c7d2fe', borderRadius: 11, padding: 10, background: '#f5f3ff', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                <Btn label="1️⃣ בוט מגיש בקשה" color="#7c3aed" small
                  onClick={wrap(async () => {
                    const res = await base44.functions.invoke('qaBot', { action: 'apply', taskId: t.id });
                    if (!res.data?.success) { toast.error(res.data?.error || 'שגיאה'); return; }
                    toast.success('בוט הגיש בקשה!');
                  })} />
                <Btn label="2️⃣ אשר את הבוט" color="#059669" small
                  onClick={wrap(async () => {
                    const res = await base44.functions.invoke('qaBot', { action: 'approve', taskId: t.id });
                    if (!res.data?.success) { toast.error(res.data?.error || 'שגיאה'); return; }
                    toast.success('בוט אושר!');
                  })} />
                <Btn label="3️⃣ בוט לוקח משימה" color="#0891b2" small
                  onClick={wrap(async () => {
                    const res = await base44.functions.invoke('qaBot', { action: 'take', taskId: t.id });
                    if (!res.data?.success) { toast.error(res.data?.error || 'שגיאה'); return; }
                    toast.success('בוט לקח!');
                  })} />
                <Btn label="4️⃣ בוט מתקדם" color="#3b82f6" small
                  onClick={wrap(async () => {
                    const res = await base44.functions.invoke('qaBot', { action: 'advance', taskId: targetTask.id });
                    if (!res.data?.success) { toast.error(res.data?.error || 'שגיאה'); return; }
                    toast.success('סטטוס: ' + res.data.nextStatus);
                  })} />
                <Btn label="5️⃣ בוט מסיים (COMPLETED)" color="#16a34a" small
                  onClick={wrap(async () => {
                    const res = await base44.functions.invoke('qaBot', { action: 'complete', taskId: targetTask.id });
                    if (!res.data?.success) { toast.error(res.data?.error || 'שגיאה'); return; }
                    toast.success('הושלם!');
                  })} />
                <Btn label="❌ בטל בקשת בוט" color="#dc2626" small
                  onClick={wrap(async () => {
                    const res = await base44.functions.invoke('qaBot', { action: 'cancel_app', taskId: t.id });
                    if (!res.data?.success) { toast.error(res.data?.error || 'שגיאה'); return; }
                    toast.success('בוטל!');
                  })} />
                <Btn label="🛑 בטל משימה (כלקוח)" color="#f97316" small
                  onClick={wrap(async () => {
                    const res = await base44.functions.invoke('qaBot', { action: 'cancel_task', taskId: targetTask.id });
                    if (!res.data?.success) { toast.error(res.data?.error || 'שגיאה'); return; }
                    toast.success('משימה בוטלה!');
                  })} />
              </div>
            );
          })()}
        </>}

        {/* Bot tasks status */}
        {allTasks.filter(t => t.worker_id === `bot_${me?.id}`).length > 0 && (
          <div style={{ background: '#f0fdf4', borderRadius: 9, padding: '8px 12px', border: '1px solid #bbf7d0' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#15803d', marginBottom: 4 }}>משימות הבוט שלי:</div>
            {allTasks.filter(t => t.worker_id === `bot_${me?.id}`).slice(0, 5).map(t => (
              <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, padding: '2px 0' }}>
                <span style={{ color: '#374151', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title.slice(0, 24)}</span>
                <span style={{ fontWeight: 800, color: STATUS_COLORS[t.status] || '#64748b', flexShrink: 0 }}>{t.status} · {t.worker_status || '—'}</span>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* ── SCENARIO QA: Application Flow (no real task taking) ── */}
      <Section title="🧪 QA — ביטול בקשות וקרדיטים" icon={<FlaskConical size={14} color="#6366f1" />} defaultOpen badge={myApps.filter(a => a.status === 'pending' || a.status === 'approved').length}>
        <div style={{ fontSize: 11, color: '#3730a3', padding: '5px 9px', background: '#eef2ff', borderRadius: 8, border: '1px solid #c7d2fe', marginBottom: 2 }}>
          בדיקת cancelMyApplication ו-applyForTask ללא לקיחת משימה בפועל
        </div>

        {/* Step 1: create a manual task as "another user" — we apply to our own task for testing */}
        <Btn label="1️⃣ צור משימת QA (ידנית, 250₪)" color="#6366f1"
          onClick={wrap(() => createTask({ title: 'QA בקשות בדיקה', approval_mode: 'manual', price: 250, category: 'other' }))} />

        {/* Step 2: apply via backend function */}
        {myTasks.filter(t => t.status === 'OPEN' && t.approval_mode === 'manual').slice(0, 3).map(t => {
          const alreadyApplied = myApps.some(a => a.task_id === t.id && (a.status === 'pending' || a.status === 'approved'));
          return (
            <div key={t.id} style={{ border: '1px solid #c7d2fe', borderRadius: 11, padding: '9px', background: '#eef2ff' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#3730a3', marginBottom: 6 }}>"{t.title.slice(0, 28)}"</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
                <Btn label={alreadyApplied ? '✅ הגשת' : '2️⃣ הגש בקשה (applyForTask)'} color="#6366f1" small disabled={alreadyApplied}
                  onClick={wrap(async () => {
                    const res = await base44.functions.invoke('applyForTask', { taskId: t.id, message: '🧪 בקשת QA' });
                    if (res.data?.error) { toast.error(res.data.error); return; }
                    toast.success(`הוגשה! ${res.data.credits_charged} קרדיטים נוכו`);
                  })} />
                <Btn label="3️⃣ אשר בקשה (approveWorker)" color="#059669" small disabled={!alreadyApplied}
                  onClick={wrap(async () => {
                    const app = myApps.find(a => a.task_id === t.id && a.status === 'pending');
                    if (!app) { toast.error('אין בקשה ממתינה'); return; }
                    await base44.functions.invoke('approveWorker', { taskId: t.id, applicationId: app.id, workerId: app.worker_id, workerName: app.worker_name });
                    toast.success('אושרה!');
                  })} />
              </div>
            </div>
          );
        })}

        {/* Step 3: cancel pending/approved application via cancelMyApplication */}
        {myApps.filter(a => a.status === 'pending' || a.status === 'approved').length > 0 && (
          <div style={{ border: '1px solid #fde68a', borderRadius: 11, padding: '9px', background: '#fffbeb' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#92400e', marginBottom: 6 }}>בקשות פעילות שלי ({myApps.filter(a => a.status === 'pending' || a.status === 'approved').length})</div>
            {myApps.filter(a => a.status === 'pending' || a.status === 'approved').slice(0, 3).map(a => (
              <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                <span style={{ fontSize: 10, flex: 1, color: '#78350f', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  [{a.status}] {a.task_title || a.task_id?.slice(-8)}
                </span>
                <Btn label="4️⃣ בטל (cancelMyApplication)" color="#dc2626" small
                  onClick={wrap(async () => {
                    const res = await base44.functions.invoke('cancelMyApplication', { applicationId: a.id, taskId: a.task_id });
                    if (!res.data?.success) { toast.error(res.data?.error || 'שגיאה'); return; }
                    toast.success(`בוטל! ${res.data.credits_refunded ?? 0} קרדיטים הוחזרו`);
                  })} />
              </div>
            ))}
          </div>
        )}

        {/* Credit balance sanity check */}
        <div style={{ background: '#f0fdf4', borderRadius: 9, padding: '8px 12px', border: '1px solid #bbf7d0' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#15803d', marginBottom: 4 }}>✅ בדיקת שלמות קרדיטים</div>
          {creditTxs.slice(0, 5).map(tx => (
            <div key={tx.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, padding: '2px 0' }}>
              <span style={{ color: '#475569', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tx.note || tx.type}</span>
              <span style={{ fontWeight: 800, color: tx.amount > 0 ? '#16a34a' : '#dc2626', flexShrink: 0, marginRight: 8 }}>{tx.amount > 0 ? '+' : ''}{tx.amount}</span>
              <span style={{ fontSize: 10, color: '#94a3b8', flexShrink: 0 }}>יתרה: {tx.balance_after}</span>
            </div>
          ))}
          <div style={{ fontSize: 12, fontWeight: 900, color: '#0f2b6b', marginTop: 6 }}>
            יתרה נוכחית: {me?.worker_credits ?? 0} ג'ובות
          </div>
        </div>
      </Section>

      {/* ── SCENARIO I: Notifications & Reports ── */}
      <Section title="🔔 דיווחים ואירועים" icon={<Flag size={14} color="#ef4444" />}>
        <Btn label="📋 דווח על No-Show (לא הגיע)" color="#dc2626"
          onClick={wrap(async () => {
            if (!takenByMe[0] && !myTakenAsClient[0]) { toast.error('צריך TAKEN'); return; }
            const t = takenByMe[0] || myTakenAsClient[0];
            await base44.functions.invoke('reportNoShow', { taskId: t.id });
            toast.success('דיווח no-show נשלח');
          })} />
        {(takenByMe[0] || allTasks.find(t => t.status !== 'CANCELLED'))?.id && (
          <Btn label="🚩 דווח על משימה (ספאם/מזויף)" color="#f97316"
            onClick={wrap(async () => {
              const t = allTasks.find(t => t.client_id !== me?.id && t.status === 'OPEN');
              if (!t) { toast.error('אין משימה זמינה לדיווח'); return; }
              await base44.entities.Report.create({ task_id: t.id, task_title: t.title, reporter_id: me.id, reporter_name: me.full_name, reason: 'spam', description: '🧪 בדיקת דיווח מסימולטור', status: 'pending' });
              toast.success('דיווח נשלח');
            })} />
        )}
      </Section>

      {/* ── SCENARIO J: Chat ── */}
      <Section title="💬 צ'אט" icon={<MessageCircle size={14} color="#1a6fd4" />} badge={takenByMe.concat(myTakenAsClient).length}>
        {takenByMe.concat(myTakenAsClient).slice(0, 3).map(t => (
          <div key={t.id} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
            <Btn label={`📩 שלח הודעה`} color="#1a6fd4" small
              onClick={wrap(() => base44.entities.ChatMessage.create({ task_id: t.id, sender_id: me.id, sender_name: me.full_name, content: '🧪 הודעת בדיקה QA', read: false }))} />
            <Btn label="🔗 פתח צ'אט" color="#6366f1" small onClick={async () => navigate(`/chat/${t.id}`)} />
          </div>
        ))}
        {takenByMe.concat(myTakenAsClient).length === 0 && (
          <div style={{ fontSize: 11, color: '#94a3b8', textAlign: 'center', padding: 6 }}>צריך משימה TAKEN</div>
        )}
      </Section>

      {/* ── SCENARIO K: Onboarding ── */}
      <Section title="🎓 Onboarding — משתמשים חדשים" icon={<Gift size={14} color="#f59e0b" />}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
          <Btn label="🎓 הפעל טוטוריאל" color="#f59e0b"
            onClick={wrap(async () => {
              await base44.auth.updateMe({ is_first_login: true });
              toast.success('is_first_login=true');
              setTimeout(() => navigate('/'), 500);
            })} />
          <Btn label="✅ דלג טוטוריאל" color="#059669"
            onClick={wrap(() => base44.auth.updateMe({ is_first_login: false }))} />
        </div>
        <Btn label="🎁 טריגר מתנת הצטרפות" color="#d97706"
          onClick={async () => {
            await base44.functions.invoke('grantSignupBonus', { userId: me?.id });
            inv(); refetchMe();
            toast.success('בונוס הרשמה נשלח!');
          }} />
      </Section>

      {/* ── POPUPS SECTION ── */}
      <Section title="🎭 פופאפים ומודלים" icon={<Eye size={14} color="#db2777" />} defaultOpen={false}>
        <div style={{ fontSize: 11, color: '#64748b', padding: '5px 9px', background: '#fdf2f8', borderRadius: 8, border: '1px solid #fbcfe8', marginBottom: 2 }}>
          בדוק כל פופאפ — z-index, עיצוב, כפתורים
        </div>
        {([
          { key: 'gift', label: '🎁 מתנת הצטרפות', color: '#d97706', desc: 'כניסה ראשונה' },
          { key: 'buyCredits', label: '🪙 רכישת קרדיטים', color: '#1a6fd4', desc: 'חסר ג\'ובות' },
          { key: 'login', label: '🔐 כניסה / הרשמה', color: '#6366f1', desc: 'גולש לא מחובר' },
          { key: 'approved', label: '🎉 עובד אושר', color: '#059669', desc: 'קיבלת אישור' },
          { key: 'workerCancelled', label: '😔 עובד בוטל', color: '#dc2626', desc: 'המשימה בוטלה' },
          { key: 'approvalRevoked', label: '⚠️ אישור בוטל', color: '#f97316', desc: 'לקוח חזר בו' },
          { key: 'cancelSuccess', label: '✅ ביטול הצליח', color: '#7c3aed', desc: 'הלקוח ביטל' },
          { key: 'instantMatch', label: '⚡ עובד נמצא', color: '#0891b2', desc: 'Instant match' },
          { key: 'rating', label: '⭐ דירוג וביקורת', color: '#d97706', desc: 'לאחר השלמה' },
        ]).map(({ key, label, color, desc }) => (
          <div key={key} style={{ display: 'flex', gap: 8, alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: 6 }}>
            <button
              onClick={() => setPopup(key)}
              style={{ flex: 1, height: 38, borderRadius: 10, border: 'none', background: color, color: 'white', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}
            >
              {label}
            </button>
            <span style={{ fontSize: 10, color: '#9ca3af', minWidth: 70, textAlign: 'center' }}>{desc}</span>
          </div>
        ))}
      </Section>

      {/* ── Live Tasks Feed ── */}
      <Section title="🔍 פיד חי — כל המשימות" icon={<List size={14} color="#1a6fd4" />} badge={allTasks.length}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5, marginBottom: 6 }}>
          <div style={{ textAlign: 'center', padding: '6px', background: '#f0fdf4', borderRadius: 9, fontSize: 12, fontWeight: 800, color: '#15803d' }}>{openTasks.filter(t => t.client_id !== me?.id).length} זמינות לך</div>
          <div style={{ textAlign: 'center', padding: '6px', background: '#fff7ed', borderRadius: 9, fontSize: 12, fontWeight: 800, color: '#b45309' }}>{myTasks.length} פרסמת</div>
        </div>
        {allTasks.slice(0, 8).map(t => (
          <TaskPill key={t.id} task={t} onClick={() => navigate(`/task/${t.id}`)} />
        ))}
      </Section>

      {/* ── Bulk Task Generator ── */}
      <Section title="🏙️ מחולל משימות בכמות" icon={<Building2 size={14} color="#0891b2" />} defaultOpen badge={bulkTasks.length}>
        <div style={{ fontSize: 11, color: '#0e7490', padding: '6px 10px', background: '#ecfeff', borderRadius: 8, border: '1px solid #a5f3fc', lineHeight: 1.5 }}>
          צור משימות רנדומליות בעיר נבחרת, במיקומים רנדומליים ובמחירים בטווח שתבחר. ניתן למחוק הכל בכפתור אחד.
        </div>

        {/* City selector */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>עיר</label>
          <select value={bulkCity} onChange={e => setBulkCity(e.target.value)}
            style={{ height: 38, borderRadius: 10, border: '1px solid #dce8f5', padding: '0 10px', fontSize: 13, outline: 'none', background: 'white', color: '#0f2b6b' }}>
            {ISRAELI_CITIES.filter(c => c !== 'אחר').map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* Count */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>מספר משימות (1-100)</label>
          <input type="number" value={bulkCount} onChange={e => setBulkCount(Math.min(100, Math.max(1, Number(e.target.value) || 1)))} min={1} max={100}
            style={{ height: 38, borderRadius: 10, border: '1px solid #dce8f5', padding: '0 10px', fontSize: 13, outline: 'none', background: 'white', color: '#0f2b6b', boxSizing: 'border-box' }} />
        </div>

        {/* Price range */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>מחיר מינ\' (₪)</label>
            <input type="number" value={bulkMinPrice} onChange={e => setBulkMinPrice(Number(e.target.value) || 0)} min={0}
              style={{ height: 38, borderRadius: 10, border: '1px solid #dce8f5', padding: '0 10px', fontSize: 13, outline: 'none', background: 'white', color: '#0f2b6b', boxSizing: 'border-box' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>מחיר מקס\' (₪)</label>
            <input type="number" value={bulkMaxPrice} onChange={e => setBulkMaxPrice(Number(e.target.value) || 0)} min={0}
              style={{ height: 38, borderRadius: 10, border: '1px solid #dce8f5', padding: '0 10px', fontSize: 13, outline: 'none', background: 'white', color: '#0f2b6b', boxSizing: 'border-box' }} />
          </div>
        </div>

        {/* Generate */}
        <Btn label="🚀 צור משימות" color="#0891b2"
          onClick={async () => {
            if (bulkMinPrice > bulkMaxPrice) { toast.error('מחיר מינימום גבוה ממקסימום'); return; }
            const res = await base44.functions.invoke('bulkSimulatorTasks', {
              action: 'generate', city: bulkCity, count: bulkCount,
              minPrice: bulkMinPrice, maxPrice: bulkMaxPrice,
            });
            if (res.data?.error) throw new Error(res.data.error);
            toast.success(`✅ נוצרו ${res.data.count} משימות ב${bulkCity}`);
          }} />

        {/* Stats */}
        {bulkTasks.length > 0 && (
          <div style={{ fontSize: 11, color: '#0e7490', padding: '5px 10px', background: '#ecfeff', borderRadius: 8, border: '1px solid #a5f3fc' }}>
            נוצרו עד כה: <strong>{bulkTasks.length}</strong> משימות סימולציה ({bulkTasks.filter(t => t.status === 'OPEN').length} פתוחות)
          </div>
        )}

        {/* Delete all bulk tasks */}
        {bulkTasks.length > 0 && (
          <Btn label={`🗑️ מחק את כל ${bulkTasks.length} המשימות`} color="#dc2626"
            onClick={async () => {
              const res = await base44.functions.invoke('bulkSimulatorTasks', { action: 'cleanup' });
              if (res.data?.error) throw new Error(res.data.error);
              toast.success(`🗑️ נמחקו ${res.data.deleted} משימות`);
            }} />
        )}
      </Section>

      {/* ── Cleanup ── */}
      <Section title="🗑️ ניקוי נתוני בדיקה" icon={<Trash2 size={14} color="#dc2626" />} danger badge={testTasks.filter(t => !['CANCELLED', 'COMPLETED'].includes(t.status)).length}>
        <Btn label={`🗑️ בטל ${testTasks.filter(t => t.status === 'OPEN').length} בדיקות פתוחות`} color="#dc2626"
          onClick={wrap(async () => {
            const open = testTasks.filter(t => t.status === 'OPEN');
            for (const t of open) await base44.entities.Task.update(t.id, { status: 'CANCELLED' });
            toast.success(`בוטלו ${open.length}`);
          })} />
        <Btn label="🗑️ בטל כל בדיקות שלי" color="#dc2626"
          onClick={wrap(async () => {
            for (const t of testTasks.filter(t => !['CANCELLED', 'COMPLETED'].includes(t.status))) {
              await base44.entities.Task.update(t.id, { status: 'CANCELLED' });
            }
          })} />
        <Btn label="🗑️ בטל בקשות ממתינות" color="#7c3aed"
          onClick={wrap(async () => {
            for (const a of myApps.filter(a => a.status === 'pending')) {
              await base44.entities.TaskApplication.update(a.id, { status: 'cancelled' });
            }
          })} />
      </Section>

      {/* ── Popup renders ── */}
      {popup === 'gift' && <SignupGiftModal onClose={closePopup} />}
      {popup === 'buyCredits' && <BuyCreditsModal onClose={closePopup} creditsNeeded={3} />}
      {popup === 'login' && <LoginPromptModal onClose={closePopup} onLogin={closePopup} />}
      {popup === 'approved' && <ApprovedPopup task={{ ...mockTask, status: 'TAKEN', worker_id: me?.id, worker_name: me?.full_name }} onClose={closePopup} />}
      {popup === 'workerCancelled' && <WorkerCancelledPopup task={mockTask} onClose={closePopup} />}
      {popup === 'approvalRevoked' && <ApprovalRevokedPopup task={mockTask} onClose={closePopup} />}
      {popup === 'cancelSuccess' && <CancelSuccessPopup task={mockTask} onClose={closePopup} />}
      {popup === 'instantMatch' && <InstantMatchPopup task={{ ...mockTask, status: 'TAKEN', worker_name: me?.full_name || 'עובד בדיקה' }} onClose={closePopup} />}
      {popup === 'rating' && <RatingModal task={{ ...mockTask, status: 'COMPLETED', worker_id: me?.id, client_id: me?.id }} currentUserId={me?.id} onClose={closePopup} onDone={closePopup} />}

      {/* Quick nav */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 7, marginTop: 6 }}>
        {[
          { label: '🏠 פיד', path: '/' },
          { label: '👤 פרופיל', path: '/profile' },
          { label: '💳 ארנק', path: '/wallet' },
          { label: '📋 משימות', path: '/my-tasks' },
          { label: '💬 צ\'אטים', path: '/chats' },
          { label: '🗺️ מפה', path: '/map' },
          { label: '🏆 ליידרבורד', path: '/leaderboard' },
          { label: '🔔 התראות', path: '/notifications' },
          { label: '❓ FAQ', path: '/faq' },
        ].map(({ label, path }) => (
          <button key={path} onClick={() => navigate(path)} style={{ padding: '9px 0', borderRadius: 11, background: 'white', border: '1px solid #dce8f5', fontSize: 11, fontWeight: 700, color: '#1a6fd4', cursor: 'pointer' }}>
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}