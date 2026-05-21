import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight, FlaskConical, Loader2, RefreshCw, Trash2,
  CheckCircle2, XCircle, AlertCircle, ChevronDown, ChevronUp,
  Play, Zap, Clock, User, Wallet, Star, MessageCircle, ShieldCheck, Sparkles, Coins
} from 'lucide-react';

/* ─── Reusable UI ─────────────────────────── */
function Section({ title, icon, children, danger, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ background: 'white', borderRadius: 18, border: `1.5px solid ${danger ? '#fecaca' : '#dce8f5'}`, marginBottom: 12, overflow: 'hidden' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ width: '100%', padding: '14px 16px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', textAlign: 'right' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {icon}
          <span style={{ fontSize: 14, fontWeight: 800, color: danger ? '#dc2626' : '#0f2b6b' }}>{title}</span>
        </div>
        {open ? <ChevronUp size={16} color="#94a3b8" /> : <ChevronDown size={16} color="#94a3b8" />}
      </button>
      {open && (
        <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {children}
        </div>
      )}
    </div>
  );
}

function Btn({ label, color = '#1a6fd4', onClick, disabled, small }) {
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
        width: '100%', height: small ? 38 : 44, borderRadius: 12, border: 'none',
        cursor: (disabled || localLoading) ? 'not-allowed' : 'pointer',
        background: disabled ? '#e5e7eb' : color,
        color: disabled ? '#9ca3af' : 'white',
        fontWeight: 700, fontSize: small ? 12 : 13,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        opacity: localLoading ? 0.7 : 1, transition: 'opacity 0.15s',
      }}
    >
      {localLoading ? <Loader2 size={15} className="animate-spin" /> : label}
    </button>
  );
}

function InfoBox({ label, value, accent }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', background: '#f8faff', borderRadius: 10, fontSize: 12 }}>
      <span style={{ color: '#64748b', fontWeight: 500 }}>{label}</span>
      <span style={{ color: accent || '#0f2b6b', fontWeight: 800 }}>{value ?? '—'}</span>
    </div>
  );
}

function TaskPill({ task, onClick }) {
  const colors = { OPEN: '#16a34a', TAKEN: '#b07020', COMPLETED: '#1a6fd4', CANCELLED: '#dc2626', EXPIRED: '#94a3b8', APPROVED_PENDING_DEPARTURE: '#7c3aed', ON_THE_WAY: '#0891b2', ARRIVED: '#0369a1', IN_PROGRESS: '#059669' };
  return (
    <button
      onClick={() => onClick(task)}
      style={{ width: '100%', padding: '8px 12px', borderRadius: 10, border: `1.5px solid ${(colors[task.status] || '#94a3b8')}22`, background: `${(colors[task.status] || '#94a3b8')}10`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', textAlign: 'right' }}
    >
      <span style={{ fontSize: 12, fontWeight: 700, color: '#1e293b', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.title}</span>
      <span style={{ fontSize: 11, fontWeight: 800, color: colors[task.status] || '#94a3b8', marginRight: 8, flexShrink: 0 }}>{task.status}</span>
    </button>
  );
}

function StatusBadge({ ok, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 20, background: ok ? '#f0fdf4' : '#fff7ed', border: `1px solid ${ok ? '#bbf7d0' : '#fed7aa'}` }}>
      {ok ? <CheckCircle2 size={13} color="#16a34a" /> : <AlertCircle size={13} color="#d97706" />}
      <span style={{ fontSize: 11, fontWeight: 700, color: ok ? '#15803d' : '#b45309' }}>{label}</span>
    </div>
  );
}

/* ─── Main ─────────────────────────── */
export default function SimulatorPanel() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: me, refetch: refetchMe } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });
  const { data: allTasks = [], refetch: refetchTasks } = useQuery({
    queryKey: ['sim_tasks'],
    queryFn: () => base44.entities.Task.list('-created_date', 50),
    refetchInterval: 3000,
  });
  const { data: myApps = [] } = useQuery({
    queryKey: ['sim_apps'],
    queryFn: () => me?.id ? base44.entities.TaskApplication.filter({ worker_id: me.id }, '-created_date', 50) : [],
    enabled: !!me?.id,
    refetchInterval: 3000,
  });
  const { data: creditTxs = [] } = useQuery({
    queryKey: ['sim_credit_txs'],
    queryFn: () => me?.id ? base44.entities.CreditTransaction.filter({ user_id: me.id }, '-created_date', 20) : [],
    enabled: !!me?.id,
    refetchInterval: 4000,
  });

  const myTasks = allTasks.filter(t => t.client_id === me?.id);
  const testTasks = myTasks.filter(t => t.title?.includes('🧪'));
  const openTasks = allTasks.filter(t => t.status === 'OPEN');
  const myOpenTasks = myTasks.filter(t => t.status === 'OPEN');
  const takenByMe = allTasks.filter(t => t.worker_id === me?.id && t.status === 'TAKEN');
  const myTakenAsClient = myTasks.filter(t => t.status === 'TAKEN');
  const completedUnconfirmed = myTasks.filter(t => t.status === 'COMPLETED' && !t.client_confirmed);
  const manualOpenTasks = openTasks.filter(t => t.approval_mode === 'manual' && t.client_id !== me?.id);

  const inv = () => {
    queryClient.invalidateQueries({ queryKey: ['sim_tasks'] });
    queryClient.invalidateQueries({ queryKey: ['sim_apps'] });
    queryClient.invalidateQueries({ queryKey: ['sim_credit_txs'] });
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
    queryClient.invalidateQueries({ queryKey: ['myTasks'] });
    queryClient.invalidateQueries({ queryKey: ['me'] });
    queryClient.invalidateQueries({ queryKey: ['allTasks'] });
  };

  const wrap = (fn) => async () => { await fn(); inv(); refetchMe(); };

  /* ── Helpers ── */
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
      user_id: me.id,
      amount,
      type,
      note: note || `🧪 בדיקה מסימולטור: +${amount} ג'ובות`,
      balance_after: newBalance,
    });
    toast.success(`✅ נוספו ${amount} ג'ובות | יתרה: ${newBalance}`);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f0f4fa', padding: '16px 16px 40px' }} dir="rtl">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <button onClick={() => navigate('/')} style={{ width: 38, height: 38, borderRadius: 12, background: 'white', border: '1px solid #dce8f5', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <ArrowRight size={17} color="#1a6fd4" />
        </button>
        <div>
          <h1 style={{ fontWeight: 900, fontSize: 20, color: '#0f2b6b', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
            <FlaskConical size={20} color="#7c3aed" /> QA סימולטור מתקדם
          </h1>
          <div style={{ fontSize: 11, color: '#94a3b8' }}>כיסוי מלא · Joba24 · מעודכן</div>
        </div>
        <button onClick={() => { inv(); refetchTasks(); refetchMe(); toast('🔄 מרענן...'); }}
          style={{ marginRight: 'auto', width: 36, height: 36, borderRadius: 10, background: 'white', border: '1px solid #dce8f5', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <RefreshCw size={15} color="#64748b" />
        </button>
      </div>

      {/* System Status */}
      <div style={{ background: 'white', borderRadius: 18, border: '1.5px solid #dce8f5', padding: '14px 16px', marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: '#0f2b6b', marginBottom: 10 }}>📊 סטטוס מערכת</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 8 }}>
          <InfoBox label="משתמש" value={me?.full_name?.split(' ')[0] || '—'} />
          <InfoBox label="ג'ובות (קרדיטים)" value={`${me?.worker_credits ?? 0} 🪙`} accent="#d97706" />
          <InfoBox label="משימות OPEN בפיד" value={openTasks.length} accent="#1a6fd4" />
          <InfoBox label="המשימות שלי" value={myTasks.length} />
          <InfoBox label="בביצוע כעובד" value={takenByMe.length} accent="#b07020" />
          <InfoBox label="עסקאות ג'ובות" value={creditTxs.length} />
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          <StatusBadge ok={!!me?.id} label="מחובר" />
          <StatusBadge ok={!!me?.is_verified} label="מאומת" />
          <StatusBadge ok={(me?.worker_credits ?? 0) >= 10} label={`מספיק ג'ובות לSstory (${me?.worker_credits ?? 0})`} />
          <StatusBadge ok={openTasks.length > 0} label="יש משימות בפיד" />
        </div>
      </div>

      {/* ── SCENARIO A: Instant flow ── */}
      <Section title="🟢 תרחיש א׳ — זרימה מיידית מלאה" icon={<Zap size={15} color="#1a6fd4" />} defaultOpen>
        <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4, padding: '6px 10px', background: '#f8faff', borderRadius: 8 }}>
          יצירה (instant) → לקיחה → עדכון סטטוס → סיום → אישור לקוח
        </div>
        <Btn label="1️⃣ צור משימה מיידית (instant, מזומן)" color="#1a6fd4"
          onClick={wrap(() => createTask({ title: 'מיידית', approval_mode: 'instant', price: 100, payment_method: 'Cash' }))} />
        <Btn label="1️⃣ צור משימה מיידית (Bit, ₪200)" color="#0891b2"
          onClick={wrap(() => createTask({ title: 'Bit תשלום', approval_mode: 'instant', price: 200, payment_method: 'Bit' }))} />
        {myOpenTasks.length > 0 && myOpenTasks.slice(0, 2).map(t => (
          <Btn key={t.id} label={`2️⃣ קח כעובד: "${t.title.slice(0, 25)}"`} color="#059669"
            onClick={wrap(() => base44.entities.Task.update(t.id, { status: 'TAKEN', worker_id: me?.id, worker_name: me?.full_name, worker_status: 'on_the_way', on_the_way_at: new Date().toISOString() }))} />
        ))}
        {takenByMe.map(t => (
          <div key={t.id}>
            <div style={{ fontSize: 11, color: '#b07020', fontWeight: 700, padding: '4px 8px', background: '#fffbeb', borderRadius: 8, marginBottom: 4 }}>בביצוע: {t.title} · {t.worker_status || '—'}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
              <Btn label="🚗 יצאתי" color="#3b82f6" small
                onClick={wrap(() => base44.entities.Task.update(t.id, { worker_status: 'on_the_way', on_the_way_at: new Date().toISOString() }))} />
              <Btn label="📍 הגעתי" color="#7c3aed" small
                onClick={wrap(() => base44.entities.Task.update(t.id, { worker_status: 'arrived', arrived_at: new Date().toISOString() }))} />
              <Btn label="✅ סיימתי" color="#059669" small
                onClick={wrap(() => base44.entities.Task.update(t.id, { worker_status: 'done', worker_confirmed: true, status: 'COMPLETED', completed_at: new Date().toISOString() }))} />
            </div>
          </div>
        ))}
        {completedUnconfirmed.map(t => (
          <Btn key={t.id} label={`💰 אשר ושחרר תשלום: ${t.title.slice(0, 20)}`} color="#b07020"
            onClick={wrap(async () => {
              await base44.entities.Task.update(t.id, { client_confirmed: true });
              toast.success(`💸 אושר תשלום ₪${t.price}`);
            })} />
        ))}
      </Section>

      {/* ── SCENARIO B: Manual approval ── */}
      <Section title="🟣 תרחיש ב׳ — אישור ידני + בקשות" icon={<User size={15} color="#7c3aed" />}>
        <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4, padding: '6px 10px', background: '#f8faff', borderRadius: 8 }}>
          יצירה ידנית → הגשת בקשה (עולה ג'ובות) → אישור/דחייה
        </div>
        <Btn label="1️⃣ צור משימה (אישור ידני, PayBox)" color="#7c3aed"
          onClick={wrap(() => createTask({ title: 'ידנית', approval_mode: 'manual', price: 250, category: 'cleaning', payment_method: 'PayBox' }))} />
        {manualOpenTasks.slice(0, 2).map(t => (
          <Btn key={t.id} label={`2️⃣ הגש בקשה: "${t.title.slice(0, 20)}"`} color="#7c3aed"
            onClick={wrap(async () => {
              const existing = await base44.entities.TaskApplication.filter({ task_id: t.id, worker_id: me.id });
              if (existing?.length) { toast.error('כבר הגשת בקשה'); return; }
              // Use the applyForTask function (charges credits)
              const res = await base44.functions.invoke('applyForTask', { taskId: t.id, message: '🧪 בקשת בדיקה מהסימולטור' });
              if (res.data?.error) { toast.error(res.data.error); return; }
              toast.success('בקשה הוגשה! (קרדיטים הופחתו)');
            })} />
        ))}
        {myApps.filter(a => a.status === 'pending').slice(0, 2).map(a => (
          <div key={a.id} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            <Btn label="✅ אשר בקשה" color="#059669" small
              onClick={wrap(async () => {
                await base44.functions.invoke('approveWorker', { applicationId: a.id });
                toast.success('בקשה אושרה!');
              })} />
            <Btn label="❌ דחה בקשה" color="#dc2626" small
              onClick={wrap(async () => {
                await base44.functions.invoke('refundApplicationCredits', { applicationId: a.id });
                await base44.entities.TaskApplication.update(a.id, { status: 'rejected' });
                toast.success('בקשה נדחתה + קרדיטים הוחזרו');
              })} />
          </div>
        ))}
      </Section>

      {/* ── SCENARIO C: Credits (ג'ובות) ── */}
      <Section title="🪙 תרחיש ג׳ — ניהול ג'ובות (קרדיטים)" icon={<Coins size={15} color="#d97706" />}>
        <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4, padding: '6px 10px', background: '#fffbeb', borderRadius: 8 }}>
          יתרה נוכחית: <strong style={{ color: '#b45309' }}>{me?.worker_credits ?? 0} ג'ובות</strong>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          <Btn label="➕ הוסף 10 ג'ובות (בונוס)" color="#16a34a"
            onClick={wrap(() => addCredits(10, 'Signup_Bonus', 'בונוס בדיקה מסימולטור'))} />
          <Btn label="➕ הוסף 50 ג'ובות" color="#059669"
            onClick={wrap(() => addCredits(50, 'Purchase', 'רכישה בדיקה מסימולטור'))} />
        </div>
        <Btn label="🔄 אפס ל-0 ג'ובות" color="#dc2626"
          onClick={wrap(async () => {
            await base44.auth.updateMe({ worker_credits: 0 });
            toast.success('יתרה אופסה ל-0');
          })} />
        <Btn label="🔄 קבל 5 ג'ובות (פחות מ-10, לבדיקת Story)" color="#d97706"
          onClick={wrap(async () => {
            await base44.auth.updateMe({ worker_credits: 5 });
            await base44.entities.CreditTransaction.create({ user_id: me.id, amount: -(me?.worker_credits ?? 0) + 5, type: 'Application_Fee', note: 'הגדרה לבדיקה: 5 ג\'ובות', balance_after: 5 });
            toast('יתרה הוגדרה ל-5 ג\'ובות (לבדיקת חסמת Story)');
          })} />
        {creditTxs.length > 0 && (
          <div style={{ background: '#f8faff', borderRadius: 10, padding: '8px 10px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 6 }}>היסטוריית עסקאות אחרונות:</div>
            {creditTxs.slice(0, 4).map(tx => (
              <div key={tx.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, padding: '3px 0', borderBottom: '1px solid #e8eef8' }}>
                <span style={{ color: '#475569' }}>{tx.note || tx.type}</span>
                <span style={{ fontWeight: 800, color: tx.amount > 0 ? '#16a34a' : '#dc2626' }}>{tx.amount > 0 ? '+' : ''}{tx.amount}</span>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* ── SCENARIO D: Stories ── */}
      <Section title="✨ תרחיש ד׳ — Story (עולה 10 ג'ובות)" icon={<Sparkles size={15} color="#a855f7" />}>
        <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4, padding: '6px 10px', background: '#fdf4ff', borderRadius: 8, border: '1px solid #e9d5ff' }}>
          Story עולה 10 ג'ובות. יתרה נוכחית: <strong style={{ color: '#7e22ce' }}>{me?.worker_credits ?? 0}</strong>
        </div>
        <Btn label="🧪 צור משימת Story (10 ג'ובות)" color="#a855f7"
          onClick={wrap(async () => {
            const credits = me?.worker_credits ?? 0;
            if (credits < 10) { toast.error(`אין מספיק ג'ובות! יש ${credits}, צריך 10`); return; }
            const newBalance = credits - 10;
            await base44.auth.updateMe({ worker_credits: newBalance });
            await base44.entities.CreditTransaction.create({
              user_id: me.id, amount: -10, type: 'Application_Fee',
              note: 'פרסום Story: 🧪 בדיקת Story מסימולטור',
              balance_after: newBalance,
            });
            await base44.entities.Task.create({
              title: '🧪 Story בדיקה', description: 'משימת Story לבדיקה',
              price: 100, base_price: 100, city: 'תל אביב',
              location_name: 'תל אביב, דיזנגוף 50',
              lat: 32.08, lng: 34.77,
              category: 'other', status: 'OPEN',
              payment_method: 'Cash', approval_mode: 'instant',
              is_story: true,
              story_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
              client_id: me.id, client_name: me.full_name,
            });
            toast.success(`✅ Story נוצרה! יתרה חדשה: ${newBalance}`);
          })} />
        <Btn label="🔍 נווט ל-HomeFeed לראות Story" color="#6366f1"
          onClick={async () => navigate('/')} />
      </Section>

      {/* ── SCENARIO E: Expiry & Cancel ── */}
      <Section title="⏰ תרחיש ה׳ — פקיעה וביטול" icon={<Clock size={15} color="#d97706" />}>
        <Btn label="🕐 צור משימה שתפקע בעוד דקה" color="#d97706"
          onClick={wrap(() => createTask({ title: 'פקיעה מהירה', expires_at: new Date(Date.now() + 60 * 1000).toISOString(), price: 80, expiry_duration_hours: 0.017 }))} />
        {myOpenTasks.slice(0, 2).map(t => (
          <Btn key={t.id} label={`❌ בטל: "${t.title.slice(0, 25)}"`} color="#dc2626"
            onClick={wrap(() => base44.functions.invoke('cancelTaskPayment', { taskId: t.id }))} />
        ))}
        {myOpenTasks.slice(0, 2).map(t => (
          <Btn key={`exp_${t.id}`} label={`⏰ סמן כ-EXPIRED: "${t.title.slice(0, 20)}"`} color="#94a3b8"
            onClick={wrap(() => base44.entities.Task.update(t.id, { status: 'EXPIRED' }))} />
        ))}
      </Section>

      {/* ── SCENARIO F: Worker Status Steps ── */}
      <Section title="📍 תרחיש ו׳ — עדכוני סטטוס עובד" icon={<Play size={15} color="#059669" />}>
        <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4, padding: '6px 10px', background: '#f8faff', borderRadius: 8 }}>
          בדוק שה-ActiveTaskBanner מתעדכן בזמן אמת
        </div>
        {takenByMe.length === 0 ? (
          <div style={{ fontSize: 12, color: '#94a3b8', textAlign: 'center', padding: 8 }}>אין TAKEN — תחילה קח משימה בתרחיש א׳</div>
        ) : takenByMe.map(t => (
          <div key={t.id} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#0f2b6b', padding: '4px 8px', background: '#f0f9ff', borderRadius: 8 }}>
              {t.title} · <span style={{ color: '#1a6fd4' }}>{t.worker_status || 'לא הוגדר'}</span>
            </div>
            {['on_the_way', 'arrived', 'done'].map(ws => (
              <Btn key={ws} label={`➡ עדכן ל: ${ws}`}
                color={t.worker_status === ws ? '#94a3b8' : '#1a6fd4'} small
                disabled={t.worker_status === ws}
                onClick={wrap(() => base44.entities.Task.update(t.id, {
                  worker_status: ws,
                  ...(ws === 'arrived' ? { arrived_at: new Date().toISOString() } : {}),
                  ...(ws === 'done' ? { worker_confirmed: true, status: 'COMPLETED', completed_at: new Date().toISOString() } : {}),
                }))} />
            ))}
          </div>
        ))}
      </Section>

      {/* ── SCENARIO G: Reviews ── */}
      <Section title="⭐ תרחיש ז׳ — ביקורות" icon={<Star size={15} color="#d97706" />}>
        <Btn label="⭐ ביקורת 5 כוכבים על עצמי (כעובד)" color="#d97706"
          onClick={wrap(async () => {
            const completedTask = myTasks.find(t => t.status === 'COMPLETED');
            if (!completedTask) { toast.error('אין משימה שהושלמה'); return; }
            await base44.entities.Review.create({ task_id: completedTask.id, reviewer_id: completedTask.worker_id || me.id, reviewee_id: me.id, rating: 5, comment: '🧪 ביקורת בדיקה מהסימולטור', role: 'worker' });
          })} />
        <Btn label="⭐ ביקורת 3 כוכבים (כלקוח)" color="#94a3b8"
          onClick={wrap(async () => {
            const completedTask = myTasks.find(t => t.status === 'COMPLETED');
            if (!completedTask) { toast.error('אין משימה שהושלמה'); return; }
            await base44.entities.Review.create({ task_id: completedTask.id, reviewer_id: me.id, reviewee_id: completedTask.worker_id || me.id, rating: 3, comment: '🧪 ביקורת בינונית', role: 'client' });
          })} />
      </Section>

      {/* ── SCENARIO H: Onboarding Tutorial ── */}
      <Section title="🎓 Onboarding — הדרכת משתמשים חדשים" icon={<Sparkles size={15} color="#f59e0b" />}>
        <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4, padding: '6px 10px', background: '#f8faff', borderRadius: 8 }}>
          הפעל את הטוטוריאל המודרך 3-שלבים עם Spotlight עבור משתמשים חדשים
        </div>
        <Btn label="🎓 הפעל טוטוריאל Onboarding"
          color="#f59e0b"
          onClick={wrap(async () => {
            await base44.auth.updateMe({ is_first_login: true });
            toast.success('is_first_login הוגדר ל-true, טוטוריאל יופעל בעמוד הבא');
            setTimeout(() => navigate('/'), 500);
          })} />
        <Btn label="✅ סמן כמשתמש ישן (דלג על הטוטוריאל)"
          color="#059669"
          onClick={wrap(async () => {
            await base44.auth.updateMe({ is_first_login: false });
            toast.success('is_first_login הוגדר ל-false');
          })} />
      </Section>

      {/* ── SCENARIO I: Chat ── */}
      <Section title="💬 תרחיש ח׳ — צ׳אט" icon={<MessageCircle size={15} color="#1a6fd4" />}>
        {takenByMe.concat(myTakenAsClient).slice(0, 2).map(t => (
          <Btn key={t.id} label={`📩 שלח הודעת בדיקה: ${t.title.slice(0, 20)}`} color="#1a6fd4"
            onClick={wrap(() => base44.entities.ChatMessage.create({ task_id: t.id, sender_id: me.id, sender_name: me.full_name, content: '🧪 הודעת בדיקה מסימולטור QA', read: false }))} />
        ))}
        {takenByMe.concat(myTakenAsClient).length === 0 && (
          <div style={{ fontSize: 12, color: '#94a3b8', textAlign: 'center', padding: 8 }}>צריך משימה TAKEN</div>
        )}
      </Section>

      {/* ── SCENARIO J: Verification ── */}
      <Section title="🛡️ תרחיש ט׳ — אימות זהות" icon={<ShieldCheck size={15} color="#7c3aed" />}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          <Btn label="✅ סמן כמאומת" color="#059669"
            onClick={wrap(async () => { await base44.auth.updateMe({ is_verified: true }); })} />
          <Btn label="❌ הסר אימות" color="#dc2626"
            onClick={wrap(async () => { await base44.auth.updateMe({ is_verified: false }); })} />
        </div>
        <div style={{ fontSize: 11, color: '#64748b', padding: '6px 10px', background: '#f8faff', borderRadius: 8 }}>
          בדוק: ניסיון לפרסם / לקחת משימה ← האם מופיע מודל אימות?
        </div>
      </Section>

      {/* ── Live Feed ── */}
      <Section title="🔍 פיד חי — משימות קיימות" icon={<Zap size={15} color="#1a6fd4" />}>
        {openTasks.slice(0, 6).map(t => (
          <TaskPill key={t.id} task={t} onClick={() => navigate(`/task/${t.id}`)} />
        ))}
        {openTasks.length === 0 && (
          <div style={{ fontSize: 12, color: '#94a3b8', textAlign: 'center', padding: 8 }}>אין OPEN</div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          <div style={{ textAlign: 'center', padding: '6px', background: '#f0fdf4', borderRadius: 10, fontSize: 12, fontWeight: 800, color: '#15803d' }}>{openTasks.filter(t => t.client_id !== me?.id).length} זמינות לך</div>
          <div style={{ textAlign: 'center', padding: '6px', background: '#fff7ed', borderRadius: 10, fontSize: 12, fontWeight: 800, color: '#b45309' }}>{openTasks.filter(t => t.client_id === me?.id).length} פרסמת</div>
        </div>
      </Section>

      {/* ── Cleanup ── */}
      <Section title="🗑️ ניקוי נתוני בדיקה" icon={<Trash2 size={15} color="#dc2626" />} danger>
        <Btn label={`🗑️ בטל ${testTasks.filter(t => t.status === 'OPEN').length} משימות בדיקה פתוחות`} color="#dc2626"
          onClick={wrap(async () => {
            const open = testTasks.filter(t => t.status === 'OPEN');
            for (const t of open) await base44.entities.Task.update(t.id, { status: 'CANCELLED' });
            toast.success(`בוטלו ${open.length} משימות`);
          })} />
        <Btn label="🗑️ בטל כל משימות הבדיקה שלי" color="#dc2626"
          onClick={wrap(async () => {
            for (const t of testTasks.filter(t => !['CANCELLED', 'COMPLETED'].includes(t.status))) {
              await base44.entities.Task.update(t.id, { status: 'CANCELLED' });
            }
          })} />
        <Btn label="🗑️ בטל בקשות ממתינות שלי" color="#7c3aed"
          onClick={wrap(async () => {
            for (const a of myApps.filter(a => a.status === 'pending')) {
              await base44.entities.TaskApplication.update(a.id, { status: 'cancelled' });
            }
          })} />
      </Section>

      {/* Quick nav */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginTop: 4 }}>
        {[
          { label: '🏠 פיד', path: '/' },
          { label: '👤 פרופיל', path: '/profile' },
          { label: '💳 ארנק', path: '/wallet' },
          { label: '📋 המשימות', path: '/my-tasks' },
          { label: '💬 צ׳אטים', path: '/chats' },
          { label: '🗺️ מפה', path: '/map' },
        ].map(({ label, path }) => (
          <button key={path} onClick={() => navigate(path)} style={{ padding: '10px 0', borderRadius: 12, background: 'white', border: '1px solid #dce8f5', fontSize: 12, fontWeight: 700, color: '#1a6fd4', cursor: 'pointer' }}>
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}