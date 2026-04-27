import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { Zap, CheckCircle2, XCircle, RefreshCw, Loader2, ArrowRight, FlaskConical } from 'lucide-react';

export default function SimulatorPanel() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState('');

  const { data: me } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });
  const { data: tasks = [] } = useQuery({ queryKey: ['tasks'], queryFn: () => base44.entities.Task.list('-created_date', 20) });
  const myTasks = tasks.filter(t => t.client_id === me?.id);
  const workerTasks = tasks.filter(t => t.worker_id === me?.id);

  const run = async (label, fn) => {
    setLoading(label);
    try {
      await fn();
      queryClient.invalidateQueries();
      toast.success(`✅ ${label} — בוצע!`);
    } catch (e) {
      toast.error(`שגיאה: ${e.message}`);
    }
    setLoading('');
  };

  const isLoading = (label) => loading === label;

  const Btn = ({ label, color = '#1a6fd4', onClick, disabled }) => (
    <button
      onClick={onClick}
      disabled={disabled || !!loading}
      style={{
        width: '100%', height: 44, borderRadius: 12, border: 'none', cursor: (disabled || loading) ? 'not-allowed' : 'pointer',
        background: disabled ? '#e5e7eb' : color, color: disabled ? '#9ca3af' : 'white',
        fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        opacity: (loading && !isLoading(label)) ? 0.5 : 1, transition: 'opacity 0.15s',
      }}
    >
      {isLoading(label) ? <Loader2 size={16} className="animate-spin" /> : label}
    </button>
  );

  const openTasks = myTasks.filter(t => t.status === 'OPEN');
  const takenTask = tasks.find(t => t.worker_id === me?.id && t.status === 'TAKEN');
  const completedUnconfirmed = tasks.find(t => t.client_id === me?.id && t.status === 'COMPLETED' && !t.client_confirmed);

  return (
    <div style={{ minHeight: '100vh', background: '#f4f7fb', padding: '56px 16px 32px' }} dir="rtl">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button onClick={() => navigate('/')} style={{ width: 36, height: 36, borderRadius: 10, background: 'white', border: '1px solid #dce8f5', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <ArrowRight size={16} color="#1a6fd4" />
        </button>
        <div>
          <h1 style={{ fontWeight: 900, fontSize: 20, color: '#0f2b6b', margin: 0 }}>🧪 סימולטור בדיקות</h1>
          <div style={{ fontSize: 12, color: '#999' }}>בדוק את כל תהליכי הפלטפורמה</div>
        </div>
      </div>

      {/* User info */}
      <div style={{ background: 'white', borderRadius: 16, padding: '14px 16px', border: '1px solid #dce8f5', marginBottom: 16 }}>
        <div style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>משתמש נוכחי</div>
        <div style={{ fontWeight: 800, fontSize: 15, color: '#0f2b6b' }}>{me?.full_name || '—'}</div>
        <div style={{ fontSize: 12, color: '#666' }}>{me?.email} · יתרה: ₪{me?.wallet_balance || 0}</div>
      </div>

      {/* Section 1: Create task */}
      <Section title="1. יצירת משימה">
        <Btn label="✏️ צור משימת בדיקה (מיידית)" color="#1a6fd4" onClick={() => run('✏️ צור משימת בדיקה (מיידית)', async () => {
          await base44.entities.Task.create({
            title: '🧪 משימת בדיקה — מיידית',
            description: 'זוהי משימת בדיקה שנוצרה מהסימולטור',
            price: 100,
            base_price: 100,
            city: 'תל אביב',
            location_name: 'תל אביב, דיזנגוף',
            category: 'other',
            status: 'OPEN',
            approval_mode: 'instant',
            client_id: me?.id,
            client_name: me?.full_name,
            expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          });
        })} />
        <Btn label="✋ צור משימת בדיקה (אישור ידני)" color="#7c3aed" onClick={() => run('✋ צור משימת בדיקה (אישור ידני)', async () => {
          await base44.entities.Task.create({
            title: '🧪 משימת בדיקה — אישור ידני',
            description: 'זוהי משימת בדיקה עם אישור ידני',
            price: 200,
            base_price: 200,
            city: 'תל אביב',
            location_name: 'תל אביב, רוטשילד',
            category: 'cleaning',
            status: 'OPEN',
            approval_mode: 'manual',
            client_id: me?.id,
            client_name: me?.full_name,
            expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          });
        })} />
      </Section>

      {/* Section 2: Take task */}
      <Section title="2. לקיחת משימה כעובד">
        {openTasks.length === 0 ? (
          <div style={{ fontSize: 13, color: '#aaa', textAlign: 'center', padding: '8px 0' }}>אין משימות פתוחות שיצרת</div>
        ) : (
          openTasks.slice(0, 3).map(t => (
            <Btn key={t.id} label={`⚡ קח: ${t.title.slice(0, 30)}`} color="#059669" onClick={() => run(`⚡ קח: ${t.title.slice(0, 30)}`, async () => {
              await base44.entities.Task.update(t.id, {
                status: 'TAKEN',
                worker_id: me?.id,
                worker_name: me?.full_name,
              });
            })} />
          ))
        )}
      </Section>

      {/* Section 3: Complete & confirm */}
      <Section title="3. סיום ואישור משימה">
        {takenTask ? (
          <>
            <div style={{ fontSize: 12, color: '#666', padding: '4px 8px', background: '#f4f7fb', borderRadius: 8, marginBottom: 6 }}>
              משימה פעילה: {takenTask.title}
            </div>
            <Btn label="✅ סמן כ'הושלם' (בתור עובד)" color="#059669" onClick={() => run("✅ סמן כ'הושלם' (בתור עובד)", async () => {
              await base44.entities.Task.update(takenTask.id, { worker_confirmed: true, status: 'COMPLETED' });
            })} />
          </>
        ) : (
          <div style={{ fontSize: 13, color: '#aaa', textAlign: 'center', padding: '8px 0' }}>אין משימה פעילה כרגע (TAKEN)</div>
        )}
        {completedUnconfirmed ? (
          <>
            <div style={{ fontSize: 12, color: '#666', padding: '4px 8px', background: '#f4f7fb', borderRadius: 8, marginBottom: 6 }}>
              ממתין לאישורך: {completedUnconfirmed.title}
            </div>
            <Btn label="💰 אשר ושחרר כסף (בתור לקוח)" color="#d97706" onClick={() => run('💰 אשר ושחרר כסף (בתור לקוח)', async () => {
              await base44.entities.Task.update(completedUnconfirmed.id, { client_confirmed: true });
              await base44.entities.Transaction.create({
                user_id: completedUnconfirmed.worker_id,
                task_id: completedUnconfirmed.id,
                task_title: completedUnconfirmed.title,
                amount: completedUnconfirmed.price,
                type: 'earning',
                status: 'completed',
              });
            })} />
          </>
        ) : null}
      </Section>

      {/* Section 4: Wallet test */}
      <Section title="4. ארנק ועסקאות">
        <Btn label="💳 הוסף הכנסת בדיקה (₪150)" color="#16a34a" onClick={() => run('💳 הוסף הכנסת בדיקה (₪150)', async () => {
          await base44.entities.Transaction.create({
            user_id: me?.id,
            task_title: '🧪 הכנסת בדיקה',
            amount: 150,
            type: 'earning',
            status: 'completed',
          });
          await base44.auth.updateMe({ wallet_balance: (me?.wallet_balance || 0) + 150 });
        })} />
        <Btn label="🏦 סמולציית משיכה (₪50)" color="#d97706" onClick={() => run('🏦 סמולציית משיכה (₪50)', async () => {
          await base44.entities.Transaction.create({
            user_id: me?.id,
            task_title: 'משיכה לבנק',
            amount: 50,
            type: 'withdrawal',
            status: 'pending',
          });
        })} />
      </Section>

      {/* Section 5: Cleanup */}
      <Section title="5. ניקוי נתוני בדיקה" danger>
        <Btn label="🗑️ בטל את כל משימות הבדיקה שלי" color="#dc2626" onClick={() => run('🗑️ בטל את כל משימות הבדיקה שלי', async () => {
          const testTasks = myTasks.filter(t => t.title?.includes('🧪'));
          for (const t of testTasks) {
            await base44.entities.Task.update(t.id, { status: 'CANCELLED' });
          }
        })} />
      </Section>
    </div>
  );
}

function Section({ title, children, danger }) {
  return (
    <div style={{ background: 'white', borderRadius: 16, padding: '16px', border: `1px solid ${danger ? '#fecaca' : '#dce8f5'}`, marginBottom: 12 }}>
      <div style={{ fontSize: 13, fontWeight: 800, color: danger ? '#dc2626' : '#0f2b6b', marginBottom: 10 }}>{title}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {children}
      </div>
    </div>
  );
}