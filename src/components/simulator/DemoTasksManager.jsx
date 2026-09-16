import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { useTaskSheet } from '@/lib/TaskSheetContext';
import {
  Loader2, Trash2, Edit3, X, Check, MapPin, Tag, DollarSign,
  RefreshCw, Eye, ChevronDown, ChevronUp, User
} from 'lucide-react';
import { getCategoryLabel } from '@/lib/categories';

const CATEGORY_OPTIONS = [
  { value: 'plumbing', label: 'אינסטלציה' },
  { value: 'electricity', label: 'חשמל' },
  { value: 'handyman', label: 'יד אמן' },
  { value: 'cleaning', label: 'ניקיון' },
  { value: 'moving', label: 'הובלות' },
  { value: 'heavy_lifting', label: 'הרמה כבדה' },
  { value: 'painting', label: 'צבעות' },
  { value: 'carpentry', label: 'נגרות' },
  { value: 'ac', label: 'מזגנים' },
  { value: 'locksmith', label: 'מנעולים' },
  { value: 'gardening', label: 'גינון' },
  { value: 'home_maintenance', label: 'תחזוקת בית' },
  { value: 'car', label: 'רכב' },
  { value: 'delivery', label: 'משלוחים' },
  { value: 'shopping', label: 'קניות' },
  { value: 'pets', label: 'חיות מחמד' },
  { value: 'other', label: 'אחר' },
];

const STATUS_COLORS = {
  OPEN: '#16a34a', TAKEN: '#b07020', COMPLETED: '#1a6fd4', CANCELLED: '#dc2626',
  EXPIRED: '#94a3b8',
};

function EditTaskModal({ task, onClose, onSave }) {
  const [title, setTitle] = useState(task.title || '');
  const [description, setDescription] = useState(task.description || '');
  const [price, setPrice] = useState(task.price || 0);
  const [category, setCategory] = useState(task.category || 'other');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      await onSave({ title, description, price: Number(price), category });
    } catch {}
    setLoading(false);
  };

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 999999, background: 'rgba(5,15,40,0.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div onClick={e => e.stopPropagation()} dir="rtl" style={{ background: 'var(--surface-2)', borderRadius: '24px 24px 0 0', width: '100%', maxWidth: 480, maxHeight: '85dvh', overflow: 'auto', paddingBottom: 'max(20px, env(safe-area-inset-bottom))' }}>
        <div style={{ width: 40, height: 4, borderRadius: 99, background: 'var(--border-1)', margin: '14px auto 0' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px 0' }}>
          <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--text-1)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Edit3 size={16} color="#1a6fd4" /> עריכת משימת דמו
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--surface-3)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={16} color="var(--text-3)" />
          </button>
        </div>
        <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-2)', display: 'block', marginBottom: 4 }}>כותרת</label>
            <input value={title} onChange={e => setTitle(e.target.value)} style={{ width: '100%', height: 40, borderRadius: 10, border: '1px solid var(--border-1)', padding: '0 12px', fontSize: 13, outline: 'none', boxSizing: 'border-box', background: 'var(--surface-3)', color: 'var(--text-1)' }} />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-2)', display: 'block', marginBottom: 4 }}>תיאור</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={4} style={{ width: '100%', borderRadius: 10, border: '1px solid var(--border-1)', padding: '8px 12px', fontSize: 13, outline: 'none', boxSizing: 'border-box', background: 'var(--surface-3)', color: 'var(--text-1)', resize: 'vertical' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-2)', display: 'block', marginBottom: 4 }}>מחיר (₪)</label>
              <input type="number" value={price} onChange={e => setPrice(e.target.value)} step={50} style={{ width: '100%', height: 40, borderRadius: 10, border: '1px solid var(--border-1)', padding: '0 12px', fontSize: 13, outline: 'none', boxSizing: 'border-box', background: 'var(--surface-3)', color: 'var(--text-1)' }} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-2)', display: 'block', marginBottom: 4 }}>קטגוריה</label>
              <select value={category} onChange={e => setCategory(e.target.value)} style={{ width: '100%', height: 40, borderRadius: 10, border: '1px solid var(--border-1)', padding: '0 8px', fontSize: 13, outline: 'none', boxSizing: 'border-box', background: 'var(--surface-3)', color: 'var(--text-1)' }}>
                {CATEGORY_OPTIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
          </div>
          <button onClick={handleSave} disabled={loading || !title.trim()} style={{ width: '100%', height: 46, borderRadius: 12, background: title.trim() ? 'linear-gradient(135deg,#1a6fd4,#0a52b0)' : 'var(--surface-3)', color: title.trim() ? 'white' : 'var(--text-3)', border: 'none', fontWeight: 800, fontSize: 14, cursor: title.trim() && !loading ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            {loading ? <Loader2 size={18} className="animate-spin" /> : <><Check size={16} /> שמור שינויים</>}
          </button>
        </div>
      </div>
    </div>
  );
}

function DemoTaskRow({ task, onEdit, onDelete }) {
  const [open, setOpen] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [busy, setBusy] = useState(false);
  const { openTaskSheet } = useTaskSheet();
  const catLabel = getCategoryLabel(task.category);

  const handleDelete = async () => {
    setBusy(true);
    try { await onDelete(task); } catch {}
    setBusy(false);
    setConfirmDel(false);
  };

  return (
    <div style={{ background: 'var(--surface-2)', borderRadius: 12, border: '1px solid var(--border-1)', marginBottom: 6, overflow: 'hidden' }}>
      <div onClick={() => setOpen(v => !v)} style={{ padding: '10px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#1a6fd4,#3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 12, flexShrink: 0 }}>
          {task.client_name?.[0] || '?'}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.title}</div>
          <div style={{ fontSize: 10, color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 1 }}>
            <User size={9} /> {task.client_name}
            <span style={{ margin: '0 2px' }}>·</span>
            <Tag size={9} /> {catLabel}
            <span style={{ margin: '0 2px' }}>·</span>
            <MapPin size={9} /> {task.city}
          </div>
        </div>
        <span style={{ fontSize: 13, fontWeight: 900, color: '#1a6fd4', flexShrink: 0 }}>₪{task.price}</span>
        <span style={{ fontSize: 9, fontWeight: 800, color: STATUS_COLORS[task.status] || '#94a3b8', flexShrink: 0, background: `${STATUS_COLORS[task.status] || '#94a3b8'}15`, padding: '2px 6px', borderRadius: 6 }}>{task.status}</span>
        {open ? <ChevronUp size={13} color="var(--text-3)" /> : <ChevronDown size={13} color="var(--text-3)" />}
      </div>
      {open && (
        <div style={{ padding: '0 12px 10px', borderTop: '1px solid var(--border-1)', fontSize: 11, color: 'var(--text-2)' }}>
          {task.description && <div style={{ marginTop: 6, lineHeight: 1.6, color: 'var(--text-2)' }}>{task.description}</div>}
          <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 4 }}>מיקום: {task.location_name} · תשלום: {task.payment_method}</div>
          <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
            <button onClick={() => openTaskSheet(task.id)} style={{ flex: 1, height: 32, borderRadius: 8, background: '#eff6ff', color: '#1a6fd4', border: '1px solid #bfdbfe', fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
              <Eye size={12} /> צפה בפיד
            </button>
            <button onClick={() => onEdit(task)} style={{ height: 32, padding: '0 12px', borderRadius: 8, background: '#f5f3ff', color: '#7c3aed', border: '1px solid #ddd6fe', fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Edit3 size={12} /> ערוך
            </button>
            {confirmDel ? (
              <>
                <button onClick={handleDelete} disabled={busy} style={{ height: 32, padding: '0 10px', borderRadius: 8, background: '#dc2626', color: 'white', border: 'none', fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                  {busy ? <Loader2 size={12} className="animate-spin" /> : 'אשר'}
                </button>
                <button onClick={() => setConfirmDel(false)} style={{ height: 32, padding: '0 10px', borderRadius: 8, background: 'var(--surface-3)', color: 'var(--text-2)', border: '1px solid var(--border-1)', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>ביטול</button>
              </>
            ) : (
              <button onClick={() => setConfirmDel(true)} style={{ height: 32, padding: '0 12px', borderRadius: 8, background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Trash2 size={12} /> מחק
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function DemoTasksManager() {
  const queryClient = useQueryClient();
  const { openTaskSheet } = useTaskSheet();
  const [editingTask, setEditingTask] = useState(null);
  const [filter, setFilter] = useState('');

  const { data: allTasks = [], isLoading, refetch } = useQuery({
    queryKey: ['sim_demo_tasks'],
    queryFn: () => base44.entities.Task.list('-created_date', 200),
    staleTime: 15000,
    refetchOnWindowFocus: false,
  });

  const demoTasks = allTasks.filter(t => t.client_id?.startsWith('demo_'));
  const filteredTasks = filter
    ? demoTasks.filter(t => t.title?.includes(filter) || t.client_name?.includes(filter) || t.city?.includes(filter))
    : demoTasks;

  const handleEditSave = async (task, updates) => {
    await base44.entities.Task.update(task.id, updates);
    toast.success('המשימה עודכנה');
    setEditingTask(null);
    queryClient.invalidateQueries({ queryKey: ['sim_demo_tasks'] });
    queryClient.invalidateQueries({ queryKey: ['sim_tasks'] });
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
  };

  const handleDelete = async (task) => {
    await base44.entities.Task.delete(task.id);
    toast.success('המשימה נמחקה');
    queryClient.invalidateQueries({ queryKey: ['sim_demo_tasks'] });
    queryClient.invalidateQueries({ queryKey: ['sim_tasks'] });
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="חיפוש לפי כותרת, שם או עיר..." dir="rtl"
          style={{ flex: 1, height: 36, borderRadius: 10, border: '1px solid var(--border-1)', paddingRight: 12, paddingLeft: 10, fontSize: 12, outline: 'none', boxSizing: 'border-box', background: 'var(--surface-2)', color: 'var(--text-1)' }} />
        <button onClick={() => refetch()} style={{ width: 36, height: 36, borderRadius: 10, background: 'white', border: '1px solid var(--border-1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
          <RefreshCw size={14} color="#64748b" />
        </button>
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 30 }}>
          <Loader2 size={22} className="animate-spin" color="#1a6fd4" />
        </div>
      ) : (
        <>
          <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            {demoTasks.length} משימות דמו ({demoTasks.filter(t => t.status === 'OPEN').length} פתוחות)
          </div>
          {filteredTasks.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px 20px', color: 'var(--text-3)', fontSize: 12 }}>
              {demoTasks.length === 0 ? 'אין משימות דמו עדיין. צור משימות באמצעות המחולל למעלה.' : 'אין תוצאות לחיפוש'}
            </div>
          ) : (
            filteredTasks.slice(0, 50).map(task => (
              <DemoTaskRow key={task.id} task={task} onEdit={setEditingTask} onDelete={handleDelete} />
            ))
          )}
        </>
      )}

      {editingTask && (
        <EditTaskModal task={editingTask} onClose={() => setEditingTask(null)} onSave={(updates) => handleEditSave(editingTask, updates)} />
      )}
    </div>
  );
}