import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Mail, Loader2, Send, RefreshCw, Check } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

/**
 * AdminEmailsTab — the app's email centre.
 *
 * Every notification event the app can fire already carries its own wording
 * (title + body) and a flag for whether it is also sent as an email. Until now
 * that flag was only reachable by editing the notification manager's own screen,
 * which is about pushes. This screen answers the email questions on their own:
 * which events send an email, what the subject line is, how many went out, and
 * what actually left — plus a test send to the admin's own inbox.
 *
 * Nothing here changes delivery logic: the toggle writes the same
 * `send_email` field notificationManager already reads, so the switch on this
 * screen IS the switch the sender uses.
 */

const CATEGORY_LABELS = {
  transactional: 'עסקאות',
  engagement: 'מעורבות',
  marketing: 'שיווק',
  system: 'מערכת',
};

function Switch({ on, busy, onClick }) {
  return (
    <button
      onClick={onClick}
      disabled={busy}
      aria-pressed={on}
      style={{
        width: 46, height: 26, borderRadius: 99, border: 'none', padding: 2,
        background: on ? 'var(--brand-primary)' : 'var(--border-2)',
        cursor: busy ? 'wait' : 'pointer', display: 'flex', alignItems: 'center',
        justifyContent: on ? 'flex-end' : 'flex-start', transition: 'background 0.15s',
        minHeight: 'unset', minWidth: 'unset', flexShrink: 0,
      }}
    >
      <span style={{
        width: 22, height: 22, borderRadius: '50%', background: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
      }}>
        {busy ? <Loader2 size={12} className="animate-spin" color="var(--brand-primary)" /> : on ? <Check size={12} color="var(--brand-primary)" strokeWidth={3} /> : null}
      </span>
    </button>
  );
}

export default function AdminEmailsTab() {
  const queryClient = useQueryClient();
  const [busyId, setBusyId] = useState(null);
  const [drafts, setDrafts] = useState({});

  const { data: configs = [], isLoading } = useQuery({
    queryKey: ['admin-email-configs'],
    queryFn: () => base44.entities.NotificationConfig.list('sort_order', 100),
  });

  // How many notifications each event has actually sent — one grouped query.
  const { data: counts = {} } = useQuery({
    queryKey: ['admin-email-counts'],
    queryFn: async () => {
      const res = await base44.entities.NotificationLog.aggregate({
        query: { status: 'sent' },
        groupBy: 'event_key',
      });
      return Object.fromEntries((res?.rows || []).map(r => [r.event_key, r.count]));
    },
  });

  const { data: recent = [] } = useQuery({
    queryKey: ['admin-email-recent'],
    queryFn: async () => {
      const page = await base44.entities.NotificationLog.filter(
        { status: 'sent' },
        { sort: '-created_date', limit: 12 }
      );
      return page.items || [];
    },
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-email-configs'] });
    queryClient.invalidateQueries({ queryKey: ['admin-email-counts'] });
    queryClient.invalidateQueries({ queryKey: ['admin-email-recent'] });
  };

  const call = (payload) => base44.functions.invoke('adminNotificationManager', payload);

  const toggleEmail = async (cfg) => {
    setBusyId(cfg.id);
    try {
      await call({ action: 'update', config_id: cfg.id, config_data: { send_email: !cfg.send_email } });
      refresh();
      toast.success(cfg.send_email ? 'המייל כובה לאירוע הזה' : 'המייל הופעל לאירוע הזה');
    } catch {
      toast.error('העדכון נכשל');
    } finally {
      setBusyId(null);
    }
  };

  const saveSubject = async (cfg) => {
    const value = (drafts[cfg.id] ?? cfg.email_subject_template ?? '').trim();
    if (!value) return toast.error('נושא המייל לא יכול להיות ריק');
    setBusyId(cfg.id);
    try {
      await call({ action: 'update', config_id: cfg.id, config_data: { email_subject_template: value } });
      setDrafts(d => { const n = { ...d }; delete n[cfg.id]; return n; });
      refresh();
      toast.success('נושא המייל נשמר');
    } catch {
      toast.error('השמירה נכשלה');
    } finally {
      setBusyId(null);
    }
  };

  const sendTest = async (cfg) => {
    setBusyId(cfg.id);
    try {
      const res = await call({ action: 'send_test_email', event_key: cfg.event_key });
      const to = res?.data?.sent_to;
      toast.success(to ? `נשלח מייל בדיקה אל ${to}` : 'נשלח מייל בדיקה');
    } catch {
      toast.error('שליחת המייל נכשלה');
    } finally {
      setBusyId(null);
    }
  };

  const ordered = [...configs].sort((a, b) => {
    if (!!b.send_email !== !!a.send_email) return (b.send_email ? 1 : 0) - (a.send_email ? 1 : 0);
    return (a.sort_order || 0) - (b.sort_order || 0);
  });
  const emailOn = ordered.filter(c => c.send_email).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Summary */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {[
          { label: 'אירועים עם מייל', value: emailOn },
          { label: 'סה״כ אירועים', value: ordered.length },
        ].map(s => (
          <div key={s.label} className="j-card" style={{ padding: '12px 16px', flex: '1 1 140px' }}>
            <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--text-1)' }}>{s.value}</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)', marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
        <button
          onClick={refresh}
          style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '0 16px',
            borderRadius: 'var(--r-md)', border: '1px solid var(--border-1)',
            background: 'var(--surface-2)', color: 'var(--text-2)',
            fontSize: 13, fontWeight: 700, cursor: 'pointer',
          }}
        >
          <RefreshCw size={14} /> רענון
        </button>
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
          <Loader2 size={22} className="animate-spin" color="var(--brand-primary)" />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {ordered.map(cfg => {
            const busy = busyId === cfg.id;
            const subject = drafts[cfg.id] ?? cfg.email_subject_template ?? '';
            return (
              <div key={cfg.id} className="j-card" style={{ padding: 14 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 14, fontWeight: 900, color: 'var(--text-1)' }}>{cfg.event_label || cfg.event_key}</span>
                      <span className="j-chip j-chip-gray">{CATEGORY_LABELS[cfg.category] || cfg.category || 'כללי'}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)' }}>
                        נשלחו {counts[cfg.event_key] || 0}
                      </span>
                    </div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 3, fontWeight: 600 }}>
                      {cfg.event_key}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <Switch on={!!cfg.send_email} busy={busy} onClick={() => toggleEmail(cfg)} />
                    <span style={{ fontSize: 10, fontWeight: 700, color: cfg.send_email ? 'var(--color-success)' : 'var(--text-3)' }}>
                      {cfg.send_email ? 'פעיל' : 'כבוי'}
                    </span>
                  </div>
                </div>

                {/* The subject line IS the email — editable in place */}
                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  <input
                    value={subject}
                    placeholder="נושא המייל"
                    onChange={e => setDrafts(d => ({ ...d, [cfg.id]: e.target.value }))}
                    onBlur={() => { if (drafts[cfg.id] !== undefined) saveSubject(cfg); }}
                    style={{
                      flex: 1, height: 38, borderRadius: 10, padding: '0 12px',
                      border: '1px solid var(--border-1)', background: 'var(--input-bg)',
                      color: 'var(--text-1)', fontSize: 13, outline: 'none',
                      boxSizing: 'border-box', fontFamily: 'inherit',
                    }}
                  />
                  <button
                    onClick={() => sendTest(cfg)}
                    disabled={busy}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 5, padding: '0 14px',
                      height: 38, borderRadius: 10, border: '1px solid var(--border-1)',
                      background: 'var(--surface-3)', color: 'var(--text-1)',
                      fontSize: 12.5, fontWeight: 800, cursor: busy ? 'wait' : 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {busy ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                    בדיקה
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* What actually went out */}
      <div className="j-card" style={{ padding: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
          <Mail size={15} color="var(--brand-primary)" />
          <span style={{ fontSize: 13.5, fontWeight: 900, color: 'var(--text-1)' }}>נשלח לאחרונה</span>
        </div>
        {recent.length === 0 ? (
          <div style={{ fontSize: 12.5, color: 'var(--text-3)', fontWeight: 600 }}>עוד לא נשלחו התראות.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {recent.map(log => (
              <div key={log.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0', borderTop: '1px solid var(--border-1)' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {log.title || log.event_key}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600 }}>{log.event_key}</div>
                </div>
                <span style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 700, flexShrink: 0 }}>
                  {log.created_date ? format(new Date(log.created_date), 'dd/MM HH:mm') : ''}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}