import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { Bell, RefreshCw, Loader2, Power, Send, Plus, X, ChevronDown, ChevronUp, Mail, Zap, Trophy, HeartHandshake, Coins, ShieldCheck, AlertTriangle } from 'lucide-react';

const CATEGORY_META = {
  transactional: { label: 'טרנזקציוני', icon: Zap, color: '#1a6fd4', bg: '#eff6ff' },
  achievement: { label: 'הישגים', icon: Trophy, color: '#d97706', bg: '#fffbeb' },
  engagement: { label: 'מעורבות', icon: HeartHandshake, color: '#7c3aed', bg: '#f5f3ff' },
  retention: { label: 'שימור', icon: Bell, color: '#059669', bg: '#f0fdf4' },
  monetization: { label: 'מוניטיזציה', icon: Coins, color: '#dc2626', bg: '#fef2f2' },
  trust: { label: 'אמון', icon: ShieldCheck, color: '#0891b2', bg: '#ecfeff' },
};

const SEGMENT_LABELS = {
  all: 'כולם',
  verified_green: 'מאומת ירוק',
  verified_gold: 'מאומת זהב',
  unverified: 'לא מאומת',
  new_user: 'משתמש חדש',
  experienced_worker: 'עובד מנוסה',
  active_poster: 'מפרסם פעיל',
  low_balance: 'יתרה נמוכה',
  no_applications_approved: 'ללא אישורים',
};

export default function NotificationManagerTab() {
  const queryClient = useQueryClient();
  const [expandedId, setExpandedId] = useState(null);
  const [editingConfig, setEditingConfig] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [sendingTest, setSendingTest] = useState(null);
  const [seeding, setSeeding] = useState(false);
  const [testUserId, setTestUserId] = useState('');

  const { data: managerData, isLoading, refetch } = useQuery({
    queryKey: ['notificationManager'],
    queryFn: async () => {
      const res = await base44.functions.invoke('adminNotificationManager', { action: 'list' });
      return res.data;
    },
    staleTime: 15000,
    refetchOnWindowFocus: false,
  });

  const configs = managerData?.configs || [];
  const recentLogs = managerData?.recent_logs || [];
  const stats = managerData?.stats || { total_sent: 0, total_skipped: 0 };

  const handleSeed = async () => {
    setSeeding(true);
    try {
      const res = await base44.functions.invoke('adminNotificationManager', { action: 'seed' });
      if (res.data?.success) {
        toast.success(res.data.message || 'הגדרות נטענו בהצלחה');
        queryClient.invalidateQueries({ queryKey: ['notificationManager'] });
      } else {
        toast.error(res.data?.error || 'שגיאה בטעינה');
      }
    } catch (e) {
      toast.error('שגיאה בטעינת הגדרות');
    }
    setSeeding(false);
  };

  const handleToggle = async (config) => {
    try {
      const res = await base44.functions.invoke('adminNotificationManager', {
        action: 'toggle',
        config_id: config.id,
      });
      if (res.data?.success) {
        toast.success(res.data.is_active ? 'התראה הופעלה' : 'התראה כובתה');
        queryClient.invalidateQueries({ queryKey: ['notificationManager'] });
      }
    } catch (e) {
      toast.error('שגיאה בעדכון');
    }
  };

  const handleSaveConfig = async (configData) => {
    try {
      const action = editingConfig ? 'update' : 'create';
      const payload = editingConfig
        ? { action: 'update', config_id: editingConfig.id, config_data: configData }
        : { action: 'create', config_data: configData };
      const res = await base44.functions.invoke('adminNotificationManager', payload);
      if (res.data?.success) {
        toast.success(editingConfig ? 'הגדרה עודכנה' : 'הגדרה נוצרה');
        setEditingConfig(null);
        setShowCreateModal(false);
        queryClient.invalidateQueries({ queryKey: ['notificationManager'] });
      } else {
        toast.error(res.data?.error || 'שגיאה');
      }
    } catch (e) {
      toast.error('שגיאה בשמירה');
    }
  };

  const handleSendTest = async (eventKey) => {
    if (!testUserId.trim()) {
      toast.error('הזן מזהה משתמש לבדיקה');
      return;
    }
    setSendingTest(eventKey);
    try {
      const res = await base44.functions.invoke('adminNotificationManager', {
        action: 'send_test',
        event_key: eventKey,
        user_id: testUserId.trim(),
        variables: {},
      });
      if (res.data?.success) {
        toast.success('התראת בדיקה נשלחה');
        queryClient.invalidateQueries({ queryKey: ['notificationManager'] });
      } else {
        toast.error(res.data?.error || 'שגיאה בשליחה');
      }
    } catch (e) {
      toast.error('שגיאה בשליחת בדיקה');
    }
    setSendingTest(null);
  };

  const activeCount = configs.filter(c => c.is_active).length;

  return (
    <div>
      {/* Header stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 }}>
        <StatCard label="סה״כ התראות" value={configs.length} color="#1a6fd4" bg="#eff6ff" />
        <StatCard label="פעילות" value={activeCount} color="#059669" bg="#f0fdf4" />
        <StatCard label="נשלחו (סה״כ)" value={stats.total_sent || 0} color="#7c3aed" bg="#f5f3ff" />
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button onClick={handleSeed} disabled={seeding}
          style={{ flex: 1, height: 38, borderRadius: 10, background: '#1a6fd4', color: 'white', border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          {seeding ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} טען הגדרות ברירת מחדל
        </button>
        <button onClick={() => refetch()}
          style={{ height: 38, padding: '0 12px', borderRadius: 10, background: 'var(--surface-2)', border: '1px solid var(--border-1)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
          <RefreshCw size={14} color="#1a6fd4" />
        </button>
      </div>

      {/* Test user input */}
      <div style={{ marginBottom: 12, padding: '8px 10px', background: '#fffbeb', borderRadius: 10, border: '1px solid #fde68a' }}>
        <div style={{ fontSize: 11, color: '#92400e', fontWeight: 700, marginBottom: 4 }}>בדיקה ידנית — הזן מזהה משתמש:</div>
        <input value={testUserId} onChange={e => setTestUserId(e.target.value)} placeholder="הדבק מזהה משתמש (ID)..."
          style={{ width: '100%', height: 34, borderRadius: 8, border: '1px solid #fde68a', padding: '0 10px', fontSize: 12, outline: 'none', boxSizing: 'border-box', background: 'white', color: '#92400e' }} />
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
          <Loader2 size={24} className="animate-spin" color="#1a6fd4" />
        </div>
      ) : configs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <Bell size={40} color="#94a3b8" style={{ margin: '0 auto 12px' }} />
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)', marginBottom: 4 }}>אין הגדרות התראות עדיין</div>
          <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 16 }}>לחץ על "טען הגדרות ברירת מחדל" כדי להתחיל</div>
        </div>
      ) : (
        <>
          {/* Config cards */}
          {configs.map(config => {
            const cat = CATEGORY_META[config.category] || CATEGORY_META.transactional;
            const CatIcon = cat.icon;
            const isExpanded = expandedId === config.id;
            return (
              <div key={config.id} style={{
                background: config.is_active ? 'var(--surface-2)' : '#f8fafc',
                borderRadius: 14,
                border: `1px solid ${config.is_active ? 'var(--border-1)' : '#e2e8f0'}`,
                marginBottom: 8,
                overflow: 'hidden',
                opacity: config.is_active ? 1 : 0.7,
              }}>
                <div onClick={() => setExpandedId(isExpanded ? null : config.id)}
                  style={{ padding: '12px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 10, background: cat.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <CatIcon size={16} color={cat.color} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, color: 'var(--text-1)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                      {config.event_label}
                      {config.send_email && <Mail size={11} color="#1a6fd4" />}
                    </div>
                    <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {config.title_template}
                    </div>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: cat.bg, color: cat.color, flexShrink: 0 }}>
                    {cat.label}
                  </span>
                  <button onClick={(e) => { e.stopPropagation(); handleToggle(config); }}
                    style={{
                      width: 32, height: 20, borderRadius: 99, border: 'none', cursor: 'pointer',
                      background: config.is_active ? '#059669' : '#cbd5e1',
                      position: 'relative', flexShrink: 0, padding: 0,
                    }}>
                    <span style={{
                      position: 'absolute', top: 2, width: 16, height: 16, borderRadius: '50%', background: 'white',
                      transition: 'left 0.15s',
                      left: config.is_active ? 2 : 14,
                    }} />
                  </button>
                  {isExpanded ? <ChevronUp size={14} color="#94a3b8" /> : <ChevronDown size={14} color="#94a3b8" />}
                </div>

                {isExpanded && (
                  <div style={{ padding: '0 14px 14px', borderTop: '1px solid var(--border-1)', fontSize: 12, color: 'var(--text-2)' }}>
                    <ConfigDetail label="מזהה אירוע" value={config.event_key} mono />
                    <ConfigDetail label="כותרת" value={config.title_template} />
                    <ConfigDetail label="גוף" value={config.body_template} />
                    <ConfigDetail label="ניווט בלחיצה" value={config.deep_link} mono />
                    <ConfigDetail label="תגית" value={config.tag_template} mono />
                    <div style={{ marginTop: 8 }}>
                      <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, marginBottom: 4 }}>סגמנטים</div>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {(config.segments || ['all']).map(s => (
                          <span key={s} style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: 'var(--surface-3)', color: 'var(--text-2)' }}>
                            {SEGMENT_LABELS[s] || s}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                      <button onClick={() => setEditingConfig(config)}
                        style={{ flex: 1, height: 34, borderRadius: 10, background: 'var(--surface-3)', color: 'var(--text-1)', border: '1px solid var(--border-1)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                        ערוך
                      </button>
                      <button onClick={() => handleSendTest(config.event_key)} disabled={sendingTest === config.event_key || !testUserId.trim()}
                        style={{ flex: 1, height: 34, borderRadius: 10, background: '#1a6fd4', color: 'white', border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, opacity: (!testUserId.trim() || sendingTest === config.event_key) ? 0.5 : 1 }}>
                        {sendingTest === config.event_key ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />} שלח בדיקה
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Recent logs */}
          {recentLogs.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-1)', marginBottom: 8 }}>התראות אחרונות</div>
              {recentLogs.slice(0, 15).map(log => (
                <div key={log.id} style={{ background: 'var(--surface-2)', borderRadius: 10, border: '1px solid var(--border-1)', padding: '8px 10px', marginBottom: 4, fontSize: 11 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{
                      width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                      background: log.status === 'sent' ? '#059669' : log.status === 'skipped' ? '#fbbf24' : '#dc2626',
                    }} />
                    <span style={{ fontWeight: 700, color: 'var(--text-1)', flex: 1 }}>{log.title || log.event_key}</span>
                    <span style={{ color: '#94a3b8', fontSize: 10 }}>
                      {log.created_date ? new Date(log.created_date).toLocaleString('he-IL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : ''}
                    </span>
                  </div>
                  {log.skip_reason && (
                    <div style={{ fontSize: 10, color: '#d97706', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <AlertTriangle size={9} /> {log.skip_reason}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Edit/Create modal */}
      {(editingConfig || showCreateModal) && (
        <ConfigEditModal
          config={editingConfig}
          onClose={() => { setEditingConfig(null); setShowCreateModal(false); }}
          onSave={handleSaveConfig}
        />
      )}
    </div>
  );
}

function StatCard({ label, value, color, bg }) {
  return (
    <div style={{ background: bg, borderRadius: 12, padding: '10px 8px', textAlign: 'center' }}>
      <div style={{ fontSize: 18, fontWeight: 900, color }}>{value}</div>
      <div style={{ fontSize: 10, color, fontWeight: 600, opacity: 0.8 }}>{label}</div>
    </div>
  );
}

function ConfigDetail({ label, value, mono }) {
  return (
    <div style={{ marginTop: 6 }}>
      <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700 }}>{label}</div>
      <div style={{ fontSize: 12, color: 'var(--text-1)', fontFamily: mono ? 'monospace' : 'inherit', wordBreak: 'break-word' }}>{value}</div>
    </div>
  );
}

const EVENT_KEY_OPTIONS = [
  'application_created', 'application_approved', 'application_revoked',
  'new_chat_message', 'new_matching_task', 'no_show_report',
  'review_created', 'task_cancelled', 'task_completed', 'worker_left_task',
  'worker_status_on_the_way', 'worker_status_arrived', 'worker_status_done',
  'verification_approved_green', 'verification_approved_gold',
  'daily_earnings_summary', 'applications_rejected_unverified',
  'low_balance', 'retention_3days',
];

function ConfigEditModal({ config, onClose, onSave }) {
  const [form, setForm] = useState({
    event_key: config?.event_key || '',
    event_label: config?.event_label || '',
    category: config?.category || 'transactional',
    title_template: config?.title_template || '',
    body_template: config?.body_template || '',
    deep_link: config?.deep_link || '/',
    tag_template: config?.tag_template || 'joba24',
    segments: config?.segments || ['all'],
    is_active: config?.is_active ?? true,
    cooldown_minutes: config?.cooldown_minutes ?? 0,
    priority: config?.priority || 'normal',
    send_email: config?.send_email ?? false,
    email_subject_template: config?.email_subject_template || '',
    sort_order: config?.sort_order ?? 0,
  });

  const toggleSegment = (seg) => {
    setForm(f => {
      const has = f.segments.includes(seg);
      let segments;
      if (seg === 'all') {
        segments = has ? [] : ['all'];
      } else {
        segments = has ? f.segments.filter(s => s !== seg) : [...f.segments.filter(s => s !== 'all'), seg];
      }
      return { ...f, segments };
    });
  };

  const inputStyle = {
    width: '100%', height: 38, borderRadius: 10, border: '1px solid var(--border-1)',
    padding: '0 10px', fontSize: 13, outline: 'none', boxSizing: 'border-box',
    background: 'var(--surface-3)', color: 'var(--text-1)', fontFamily: 'inherit',
  };

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(5,15,40,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--surface-2)', borderRadius: 20, padding: 20, width: '100%', maxWidth: 420, maxHeight: '88vh', overflowY: 'auto' }} dir="rtl">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--text-1)' }}>{config ? 'עריכת התראה' : 'התראה חדשה'}</div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 10, background: 'var(--surface-3)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={14} color="#94a3b8" />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-2)', display: 'block', marginBottom: 4 }}>מזהה אירוע</label>
            {config ? (
              <div style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--text-3)', padding: '8px 10px', background: 'var(--surface-3)', borderRadius: 8 }}>{form.event_key}</div>
            ) : (
              <select value={form.event_key} onChange={e => setForm(f => ({ ...f, event_key: e.target.value }))} style={inputStyle}>
                <option value="">בחר אירוע...</option>
                {EVENT_KEY_OPTIONS.map(k => <option key={k} value={k}>{k}</option>)}
              </select>
            )}
          </div>

          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-2)', display: 'block', marginBottom: 4 }}>שם תצוגה</label>
            <input value={form.event_label} onChange={e => setForm(f => ({ ...f, event_label: e.target.value }))} style={inputStyle} placeholder="לדוגמה: בקשה חדשה למשימה" />
          </div>

          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-2)', display: 'block', marginBottom: 4 }}>קטגוריה</label>
            <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} style={inputStyle}>
              {Object.entries(CATEGORY_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>

          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-2)', display: 'block', marginBottom: 4 }}>כותרת (תומך במשתנים: {'{worker_name}, {task_title}, {amount}, {count}'})</label>
            <input value={form.title_template} onChange={e => setForm(f => ({ ...f, title_template: e.target.value }))} style={inputStyle} />
          </div>

          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-2)', display: 'block', marginBottom: 4 }}>גוף ההודעה</label>
            <textarea value={form.body_template} onChange={e => setForm(f => ({ ...f, body_template: e.target.value }))} style={{ ...inputStyle, height: 60, paddingTop: 8, resize: 'vertical' }} />
          </div>

          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-2)', display: 'block', marginBottom: 4 }}>ניווט בלחיצה (deep link)</label>
            <input value={form.deep_link} onChange={e => setForm(f => ({ ...f, deep_link: e.target.value }))} style={inputStyle} placeholder="/task/{task_id}" />
          </div>

          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-2)', display: 'block', marginBottom: 4 }}>סגמנטים</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {Object.entries(SEGMENT_LABELS).map(([key, label]) => {
                const active = form.segments.includes(key);
                return (
                  <button key={key} onClick={() => toggleSegment(key)} style={{
                    padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, cursor: 'pointer',
                    background: active ? '#1a6fd4' : 'var(--surface-3)', color: active ? 'white' : 'var(--text-2)',
                    border: `1px solid ${active ? '#1a6fd4' : 'var(--border-1)'}`,
                  }}>
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-2)', display: 'block', marginBottom: 4 }}>Cooldown (דקות)</label>
              <input type="number" value={form.cooldown_minutes} onChange={e => setForm(f => ({ ...f, cooldown_minutes: Number(e.target.value) }))} style={inputStyle} min={0} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-2)', display: 'block', marginBottom: 4 }}>עדיפות</label>
              <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))} style={inputStyle}>
                <option value="low">נמוכה</option>
                <option value="normal">רגילה</option>
                <option value="high">גבוהה</option>
              </select>
            </div>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 700, color: 'var(--text-2)', cursor: 'pointer' }}>
            <input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} />
            פעיל
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 700, color: 'var(--text-2)', cursor: 'pointer' }}>
            <input type="checkbox" checked={form.send_email} onChange={e => setForm(f => ({ ...f, send_email: e.target.checked }))} />
            שלח גם אימייל (למשתמשים רשומים)
          </label>

          {form.send_email && (
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-2)', display: 'block', marginBottom: 4 }}>נושא אימייל</label>
              <input value={form.email_subject_template} onChange={e => setForm(f => ({ ...f, email_subject_template: e.target.value }))} style={inputStyle} />
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <button onClick={() => onSave(form)} disabled={!form.event_key || !form.title_template}
            style={{ flex: 1, height: 42, borderRadius: 12, background: '#1a6fd4', color: 'white', border: 'none', fontWeight: 800, fontSize: 14, cursor: 'pointer', opacity: (!form.event_key || !form.title_template) ? 0.5 : 1 }}>
            שמור
          </button>
          <button onClick={onClose} style={{ height: 42, padding: '0 16px', borderRadius: 12, background: 'var(--surface-3)', color: 'var(--text-2)', border: '1px solid var(--border-1)', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
            ביטול
          </button>
        </div>
      </div>
    </div>
  );
}