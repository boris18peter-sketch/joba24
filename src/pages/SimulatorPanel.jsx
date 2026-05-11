import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight, FlaskConical, Loader2, RefreshCw, Trash2,
  CheckCircle2, XCircle, AlertCircle, ChevronDown, ChevronUp,
  Play, Zap, Clock, User, Wallet, Star, MessageCircle, ShieldCheck
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
  const colors = { OPEN: '#16a34a', TAKEN: '#b07020', COMPLETED: '#1a6fd4', CANCELLED: '#dc2626', EXPIRED: '#94a3b8' };
  return (
    <button
      onClick={() => onClick(task)}
      style={{ width: '100%', padding: '8px 12px', borderRadius: 10, border: `1.5px solid ${colors[task.status]}22`, background: `${colors[task.status]}10`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', textAlign: 'right' }}
    >
      <span style={{ fontSize: 12, fontWeight: 700, color: '#1e293b', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.title}</span>
      <span style={{ fontSize: 11, fontWeight: 800, color: colors[task.status], marginRight: 8, flexShrink: 0 }}>{task.status}</span>
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

  const { data: me } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });
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
  const { data: transactions = [] } = useQuery({
    queryKey: ['sim_tx'],
    queryFn: () => me?.id ? base44.entities.Transaction.filter({ user_id: me.id }, '-created_date', 20) : [],
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
    queryClient.invalidateQueries({ queryKey: ['sim_tx'] });
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
    queryClient.invalidateQueries({ queryKey: ['myTasks'] });
  };

  const wrap = (fn) => async () => { await fn(); inv(); };

  /* ── Scenario helpers ── */
  const createTask = async (overrides = {}) => {
    const t = await base44.entities.Task.create({
      title: '🧪 בדיקה — ' + (overrides.title || 'כללית'),
      description: 'משימת בדיקה אוטומטית מהסימולטור',
      price: 150, base_price: 150,
      city: 'תל אביב', location_name: 'תל אביב, רוטשילד 22',
      lat: 32.065, lng: 34.778,
      category: 'other', status: 'OPEN',
      payment_status: 'funded',
      estimated_time: '1h',
      client_id: me?.id, client_name: me?.full_name,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      ...overrides,
    });
    toast.success(`✅ נוצרה: ${t.title}`);
    return t;
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f0f4fa', padding: '56px 16px 40px' }} dir="rtl">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <button onClick={() => navigate('/')} style={{ width: 38, height: 38, borderRadius: 12, background: 'white', border: '1px solid #dce8f5', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <ArrowRight size={17} color="#1a6fd4" />
        </button>
        <div>
          <h1 style={{ fontWeight: 900, fontSize: 20, color: '#0f2b6b', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
            <FlaskConical size={20} color="#7c3aed" /> QA סימולטור מתקדם
          </h1>
          <div style={{ fontSize: 11, color: '#94a3b8' }}>כיסוי מלא לפני השקה · Joba24</div>
        </div>
        <button onClick={() => { inv(); refetchTasks(); toast('🔄 מרענן...'); }}
          style={{ marginRight: 'auto', width: 36, height: 36, borderRadius: 10, background: 'white', border: '1px solid #dce8f5', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <RefreshCw size={15} color="#64748b" />
        </button>
      </div>

      {/* System Status Dashboard */}
      <div style={{ background: 'white', borderRadius: 18, border: '1.5px solid #dce8f5', padding: '14px 16px', marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: '#0f2b6b', marginBottom: 10 }}>📊 סטטוס מערכת</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 8 }}>
          <InfoBox label="משתמש" value={me?.full_name?.split(' ')[0] || '—'} />
          <InfoBox label="יתרה" value={`₪${me?.wallet_balance || 0}`} accent="#16a34a" />
          <InfoBox label="משימות OPEN בפיד" value={openTasks.length} accent="#1a6fd4" />
          <InfoBox label="המשימות שלי" value={myTasks.length} />
          <InfoBox label="בביצוע כעובד" value={takenByMe.length} accent="#b07020" />
          <InfoBox label="עסקאות" value={transactions.length} />
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          <StatusBadge ok={!!me?.id} label="מחובר" />
          <StatusBadge ok={!!me?.is_verified} label="מאומת" />
          <StatusBadge ok={openTasks.length > 0} label="יש משימות בפיד" />
          <StatusBadge ok={takenByMe.length === 0 || takenByMe.length > 0} label={`TAKEN: ${takenByMe.length}`} />
        </div>
      </div>

      {/* ── SCENARIO A: Full instant flow ── */}
      <Section title="🟢 תרחיש א׳ — זרימה מיידית מלאה" icon={<Zap size={15} color="#1a6fd4" />} defaultOpen>
        <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4, padding: '6px 10px', background: '#f8faff', borderRadius: 8 }}>
          יצירה → לקיחה → סיום → אישור לקוח → תשלום
        </div>
        <Btn label="1️⃣ צור משימה מיידית (instant)" color="#1a6fd4"
          onClick={wrap(() => createTask({ title: 'מיידית', approval_mode: 'instant', price: 100 }))} />
        {myOpenTasks.length > 0 && myOpenTasks.map(t => (
          <Btn key={t.id} label={`2️⃣ קח כעובד: "${t.title.slice(0, 25)}"`} color="#059669"
            onClick={wrap(() => base44.entities.Task.update(t.id, { status: 'TAKEN', worker_id: me?.id, worker_name: me?.full_name, worker_status: 'on_the_way', on_the_way_at: new Date().toISOString() }))} />
        ))}
        {takenByMe.map(t => (
          <div key={t.id}>
            <div style={{ fontSize: 11, color: '#b07020', fontWeight: 700, padding: '4px 8px', background: '#fffbeb', borderRadius: 8, marginBottom: 4 }}>משימה בביצוע: {t.title}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
              <Btn label="🚗 יצאתי לדרך" color="#3b82f6" small
                onClick={wrap(() => base44.entities.Task.update(t.id, { worker_status: 'on_the_way' }))} />
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
              await base44.entities.Transaction.create({ user_id: t.worker_id, task_id: t.id, task_title: t.title, amount: t.price, type: 'earning', status: 'completed' });
              toast.success(`💸 תשלום ₪${t.price} שוחרר`);
            })} />
        ))}
      </Section>

      {/* ── SCENARIO B: Manual approval flow ── */}
      <Section title="🟣 תרחיש ב׳ — אישור ידני + בקשות" icon={<User size={15} color="#7c3aed" />}>
        <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4, padding: '6px 10px', background: '#f8faff', borderRadius: 8 }}>
          יצירת משימה ידנית → הגשת בקשה → אישור/דחייה
        </div>
        <Btn label="1️⃣ צור משימה (אישור ידני)" color="#7c3aed"
          onClick={wrap(() => createTask({ title: 'ידנית', approval_mode: 'manual', price: 250, category: 'cleaning' }))} />
        {manualOpenTasks.slice(0, 2).map(t => (
          <Btn key={t.id} label={`2️⃣ הגש בקשה: "${t.title.slice(0, 20)}"`} color="#7c3aed"
            onClick={wrap(async () => {
              const existing = await base44.entities.TaskApplication.filter({ task_id: t.id, worker_id: me.id });
              if (existing?.length) { toast.error('כבר הגשת בקשה למשימה זו'); return; }
              await base44.entities.TaskApplication.create({ task_id: t.id, worker_id: me.id, worker_name: me.full_name, message: '🧪 בקשת בדיקה מהסימולטור', status: 'pending' });
              toast.success('בקשה הוגשה!');
            })} />
        ))}
        {myApps.filter(a => a.status === 'pending').slice(0, 2).map(a => (
          <div key={a.id} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            <Btn label={`✅ אשר בקשה`} color="#059669" small
              onClick={wrap(async () => {
                await base44.entities.TaskApplication.update(a.id, { status: 'approved' });
                const task = allTasks.find(t => t.id === a.task_id);
                if (task) await base44.entities.Task.update(task.id, { status: 'TAKEN', worker_id: a.worker_id, worker_name: a.worker_name });
                toast.success('בקשה אושרה!');
              })} />
            <Btn label={`❌ דחה בקשה`} color="#dc2626" small
              onClick={wrap(() => base44.entities.TaskApplication.update(a.id, { status: 'rejected' }))} />
          </div>
        ))}
      </Section>

      {/* ── SCENARIO C: Expiry & Cancel ── */}
      <Section title="⏰ תרחיש ג׳ — פקיעה וביטול" icon={<Clock size={15} color="#d97706" />}>
        <Btn label="🕐 צור משימה שתפקע בעוד דקה" color="#d97706"
          onClick={wrap(() => createTask({ title: 'פקיעה מהירה', expires_at: new Date(Date.now() + 60 * 1000).toISOString(), price: 80, expiry_duration_hours: 0.017 }))} />
        {myOpenTasks.slice(0, 2).map(t => (
          <Btn key={t.id} label={`❌ בטל: "${t.title.slice(0, 25)}"`} color="#dc2626"
            onClick={wrap(() => base44.entities.Task.update(t.id, { status: 'CANCELLED' }))} />
        ))}
        {myOpenTasks.slice(0, 2).map(t => (
          <Btn key={t.id} label={`⏰ סמן כ-EXPIRED: "${t.title.slice(0, 20)}"`} color="#94a3b8"
            onClick={wrap(() => base44.entities.Task.update(t.id, { status: 'EXPIRED' }))} />
        ))}
      </Section>

      {/* ── SCENARIO D: Worker Status Steps ── */}
      <Section title="📍 תרחיש ד׳ — עדכוני מיקום עובד" icon={<Play size={15} color="#059669" />}>
        <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4, padding: '6px 10px', background: '#f8faff', borderRadius: 8 }}>
          בדוק שסטטוס העובד מתעדכן בזמן אמת ב-ActiveTaskBanner
        </div>
        {takenByMe.length === 0 ? (
          <div style={{ fontSize: 12, color: '#94a3b8', textAlign: 'center', padding: 8 }}>אין משימה TAKEN כרגע — תחילה קח משימה בתרחיש א׳</div>
        ) : takenByMe.map(t => (
          <div key={t.id} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#0f2b6b', padding: '4px 8px', background: '#f0f9ff', borderRadius: 8 }}>
              {t.title} · סטטוס נוכחי: <span style={{ color: '#1a6fd4' }}>{t.worker_status || 'לא הוגדר'}</span>
            </div>
            {['on_the_way', 'arrived', 'done'].map(ws => (
              <Btn key={ws} label={`➡ עדכן ל: ${ws}`} color={t.worker_status === ws ? '#94a3b8' : '#1a6fd4'} small
                disabled={t.worker_status === ws}
                onClick={wrap(() => base44.entities.Task.update(t.id, { worker_status: ws, ...(ws === 'arrived' ? { arrived_at: new Date().toISOString() } : {}), ...(ws === 'done' ? { worker_confirmed: true, status: 'COMPLETED', completed_at: new Date().toISOString() } : {}) }))} />
            ))}
          </div>
        ))}
      </Section>

      {/* ── SCENARIO E: Reviews ── */}
      <Section title="⭐ תרחיש ה׳ — ביקורות ודירוגים" icon={<Star size={15} color="#d97706" />}>
        <Btn label="⭐ הוסף ביקורת 5 כוכבים על עצמך" color="#d97706"
          onClick={wrap(async () => {
            const completedTask = myTasks.find(t => t.status === 'COMPLETED');
            if (!completedTask) { toast.error('אין משימה שהושלמה — תחילה השלם משימה'); return; }
            await base44.entities.Review.create({ task_id: completedTask.id, reviewer_id: completedTask.worker_id || me.id, reviewee_id: me.id, rating: 5, comment: '🧪 ביקורת בדיקה מהסימולטור — מצוין!', role: 'worker' });
            toast.success('⭐ ביקורת נוספה!');
          })} />
        <Btn label="⭐ ביקורת 3 כוכבים (בינוני)" color="#94a3b8"
          onClick={wrap(async () => {
            const completedTask = myTasks.find(t => t.status === 'COMPLETED');
            if (!completedTask) { toast.error('אין משימה שהושלמה'); return; }
            await base44.entities.Review.create({ task_id: completedTask.id, reviewer_id: me.id, reviewee_id: completedTask.worker_id || me.id, rating: 3, comment: '🧪 ביקורת בדיקה בינונית', role: 'client' });
          })} />
      </Section>

      {/* ── SCENARIO F: Chat ── */}
      <Section title="💬 תרחיש ו׳ — צ׳אט" icon={<MessageCircle size={15} color="#1a6fd4" />}>
        {takenByMe.concat(myTakenAsClient).slice(0, 2).map(t => (
          <Btn key={t.id} label={`📩 שלח הודעת בדיקה ב: ${t.title.slice(0, 20)}`} color="#1a6fd4"
            onClick={wrap(() => base44.entities.ChatMessage.create({ task_id: t.id, sender_id: me.id, sender_name: me.full_name, content: '🧪 הודעת בדיקה מהסימולטור — QA', read: false }))} />
        ))}
        {takenByMe.concat(myTakenAsClient).length === 0 && (
          <div style={{ fontSize: 12, color: '#94a3b8', textAlign: 'center', padding: 8 }}>צריך משימה TAKEN כדי לשלוח הודעה</div>
        )}
      </Section>

      {/* ── SCENARIO G: Wallet ── */}
      <Section title="💳 תרחיש ז׳ — ארנק ועסקאות" icon={<Wallet size={15} color="#059669" />}>
        <Btn label="💳 הוסף הכנסה ₪200" color="#16a34a"
          onClick={wrap(async () => {
            await base44.entities.Transaction.create({ user_id: me.id, task_title: '🧪 הכנסת בדיקה', amount: 200, type: 'earning', status: 'completed' });
            await base44.auth.updateMe({ wallet_balance: (me?.wallet_balance || 0) + 200 });
            queryClient.invalidateQueries({ queryKey: ['me'] });
          })} />
        <Btn label="💸 משיכה ₪50 (pending)" color="#d97706"
          onClick={wrap(() => base44.entities.Transaction.create({ user_id: me.id, task_title: '🏦 משיכה לבנק', amount: 50, type: 'withdrawal', status: 'pending' }))} />
        <Btn label="💸 סמן משיכה כ-completed" color="#7c3aed"
          onClick={wrap(async () => {
            const pending = transactions.find(t => t.type === 'withdrawal' && t.status === 'pending');
            if (!pending) { toast.error('אין משיכה ממתינה'); return; }
            await base44.entities.Transaction.update(pending.id, { status: 'completed' });
          })} />
        <Btn label="🔄 אפס יתרה ל-₪0" color="#dc2626"
          onClick={wrap(async () => {
            await base44.auth.updateMe({ wallet_balance: 0 });
            queryClient.invalidateQueries({ queryKey: ['me'] });
          })} />
      </Section>

      {/* ── SCENARIO H: Verification ── */}
      <Section title="🛡️ תרחיש ח׳ — אימות זהות" icon={<ShieldCheck size={15} color="#7c3aed" />}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          <Btn label="✅ סמן כמאומת" color="#059669"
            onClick={wrap(async () => { await base44.auth.updateMe({ is_verified: true }); queryClient.invalidateQueries({ queryKey: ['me'] }); })} />
          <Btn label="❌ הסר אימות" color="#dc2626"
            onClick={wrap(async () => { await base44.auth.updateMe({ is_verified: false }); queryClient.invalidateQueries({ queryKey: ['me'] }); })} />
        </div>
        <div style={{ fontSize: 11, color: '#64748b', padding: '6px 10px', background: '#f8faff', borderRadius: 8 }}>
          בדוק: ניסיון לפרסם משימה ולקחת משימה ← האם מופיע מודל אימות?
        </div>
      </Section>

      {/* ── Live Feed Inspection ── */}
      <Section title="🔍 בדיקת פיד חי — משימות קיימות" icon={<Zap size={15} color="#1a6fd4" />}>
        <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4, padding: '6px 10px', background: '#f8faff', borderRadius: 8 }}>
          לחץ על משימה כדי לנווט אליה ישירות
        </div>
        {openTasks.slice(0, 6).map(t => (
          <TaskPill key={t.id} task={t} onClick={() => navigate(`/task/${t.id}`)} />
        ))}
        {openTasks.length === 0 && (
          <div style={{ fontSize: 12, color: '#94a3b8', textAlign: 'center', padding: 8 }}>אין משימות OPEN בפיד כרגע</div>
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
        <Btn label="🗑️ בטל את כל משימות הבדיקה שלי" color="#dc2626"
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