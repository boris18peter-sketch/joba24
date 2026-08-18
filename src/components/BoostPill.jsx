import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Zap, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useLanguage } from '@/lib/LanguageContext';

const BOOST_COST = 5;
const HOUR_MS = 60 * 60 * 1000;

/**
 * Normalize a date string to a UTC timestamp.
 * Base44 stores dates without Z suffix — treat them as UTC.
 */
function toUTCMs(str) {
  if (!str) return null;
  const s = String(str);
  // If already has timezone info, parse as-is
  if (s.endsWith('Z') || s.includes('+')) return new Date(s).getTime();
  // Otherwise append Z to treat as UTC
  return new Date(s + 'Z').getTime();
}

/**
 * BoostPill — fills over 1 hour since last boost (or task creation).
 * When full (charged), clicking opens a confirm sheet → calls boostTask backend function.
 *
 * Props:
 *   task        — full task object (needs id, title, price, category, last_boost_at, created_date)
 *   size        — 'sm' (42×42, for card) | 'md' (54×54, for detail banner)
 *   onBoostDone — optional callback after successful boost
 */
export default function BoostPill({ task, size = 'sm', onBoostDone, onSheetClose }) {
  const queryClient = useQueryClient();
  const { t, isRTL } = useLanguage();
  const [pct, setPct] = useState(0);
  const [charged, setCharged] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showCooldown, setShowCooldown] = useState(false);
  const [remainingMs, setRemainingMs] = useState(0);
  const [loading, setLoading] = useState(false);
  const calcState = () => {
    // Reference: last boost if exists, else task creation date
    const refMs = task.last_boost_at
      ? toUTCMs(task.last_boost_at)
      : toUTCMs(task.created_date);

    if (!refMs || isNaN(refMs)) return { pct: 100, charged: true, remainingMs: 0 };

    const elapsed = Date.now() - refMs;
    if (elapsed >= HOUR_MS) return { pct: 100, charged: true, remainingMs: 0 };
    if (elapsed < 0) return { pct: 0, charged: false, remainingMs: HOUR_MS };
    return { pct: Math.round((elapsed / HOUR_MS) * 100), charged: false, remainingMs: HOUR_MS - elapsed };
  };

  // Recalculate every second; restart when task timestamps change
  useEffect(() => {
    const tick = () => {
      const { pct: p, charged: c, remainingMs: r } = calcState();
      setPct(p);
      setCharged(c);
      setRemainingMs(r);
      // Auto-close cooldown popup once charged
      if (c && showCooldown) setShowCooldown(false);
    };
    tick(); // run immediately
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task.id, task.last_boost_at, task.created_date, showCooldown]);

  const handleBoost = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await base44.functions.invoke('boostTask', { taskId: task.id });
      if (res.data?.error === 'insufficient_credits') {
        toast.error(t('boost_insufficient').replace('{n}', BOOST_COST));
        return;
      }
      if (res.data?.error === 'boost_cooldown') {
        toast.error(res.data.message || t('boost_cooldown_msg').replace('{n}', res.data.minutes_left));
        // Force re-sync the pill state from server data
        queryClient.invalidateQueries({ queryKey: ['task', task.id] });
        queryClient.invalidateQueries({ queryKey: ['tasks'] });
        setPct(0);
        setCharged(false);
        return;
      }
      if (res.data?.error === 'task_not_open') {
        toast.error(t('boost_only_open'));
        return;
      }
      if (!res.data?.success) {
        toast.error(t('boost_error'));
        return;
      }
      // Reset pill immediately — will re-sync from server on next render
      setPct(0);
      setCharged(false);
      queryClient.invalidateQueries({ queryKey: ['me'] });
      queryClient.invalidateQueries({ queryKey: ['task', task.id] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      window.dispatchEvent(new CustomEvent('hide_task_sheet'));
      window.dispatchEvent(new CustomEvent('show_boost_overlay', {
        detail: { taskId: task.id, taskTitle: task.title, taskPrice: task.price, taskCategory: task.category }
      }));
      onBoostDone?.();
    } finally {
      setLoading(false);
    }
  };

  const dim = size === 'md' ? 54 : 42;
  const radius = size === 'md' ? 14 : 10;
  const iconSize = size === 'md' ? 16 : 14;
  const textSize = size === 'md' ? 9 : 8;
  const iconColor = pct > 50 ? 'white' : (size === 'md' ? 'rgba(255,255,255,0.9)' : '#7c3aed');
  const borderColor = charged
    ? (size === 'md' ? 'rgba(192,132,252,0.9)' : '#7c3aed')
    : (size === 'md' ? 'rgba(192,132,252,0.45)' : '#c4b5fd');
  const bg = size === 'md' ? 'rgba(255,255,255,0.07)' : '#f5f3ff';

  return (
    <>
      <div
        onClick={(e) => { e.stopPropagation(); if (charged && !loading) setShowConfirm(true); else if (!charged && !loading) setShowCooldown(true); }}
        title={charged ? t('boost_send_tooltip').replace('{n}', BOOST_COST) : t('boost_loading_tooltip').replace('{pct}', pct)}
        style={{
          width: size === 'md' ? '100%' : dim,
          height: dim,
          borderRadius: radius,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden', position: 'relative',
          border: `1.5px solid ${borderColor}`,
          background: bg,
          cursor: charged ? 'pointer' : 'default',
          flexShrink: 0,
        }}
      >
        {/* Fill bar */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          height: `${pct}%`,
          background: charged
            ? (size === 'md'
                ? 'linear-gradient(180deg,rgba(168,85,247,0.85),rgba(124,58,237,0.9))'
                : 'linear-gradient(180deg,#a855f7,#7c3aed)')
            : (size === 'md'
                ? 'linear-gradient(180deg,rgba(192,132,252,0.65),rgba(168,85,247,0.75))'
                : 'linear-gradient(180deg,rgba(192,132,252,0.9),rgba(168,85,247,0.95))'),
          borderRadius: pct >= 98 ? radius : `0 0 ${radius}px ${radius}px`,
          transition: 'height 0.9s linear',
          overflow: 'hidden',
        }}>
          {!charged && <>
            <div style={{ position: 'absolute', top: -5, left: 0, right: 0, height: 10, background: 'rgba(255,255,255,0.22)', borderRadius: '50% 50% 0 0 / 100% 100% 0 0', animation: 'bpWave1 1.6s ease-in-out infinite' }} />
            <div style={{ position: 'absolute', top: -4, left: 0, right: 0, height: 8, background: 'rgba(255,255,255,0.15)', borderRadius: '50% 50% 0 0 / 100% 100% 0 0', animation: 'bpWave2 2.1s ease-in-out infinite reverse' }} />
          </>}
          {!charged && [
            { s: 3, l: '22%', d: '0s', dur: '1.8s' },
            { s: 2, l: '60%', d: '0.6s', dur: '2.2s' },
          ].map((b, i) => (
            <div key={i} style={{ position: 'absolute', bottom: '5%', width: b.s, height: b.s, borderRadius: '50%', background: 'rgba(255,255,255,0.7)', left: b.l, animation: `bpRise ${b.dur} ease-in infinite`, animationDelay: b.d }} />
          ))}
        </div>

        {/* Icon + % */}
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
          {loading
            ? <Loader2 size={iconSize} color={iconColor} className="animate-spin" />
            : <Zap size={iconSize} color={iconColor} fill={charged ? iconColor : 'none'} strokeWidth={charged ? 0 : 2} />
          }
          {!charged && !loading && (
            <span style={{ fontSize: textSize, fontWeight: 900, color: iconColor, lineHeight: 1 }}>{pct}%</span>
          )}
        </div>
      </div>

      {/* Confirm sheet */}
      {showConfirm && createPortal(
        <div className="mobile-sheet-overlay" onClick={() => setShowConfirm(false)}>
          <div dir={isRTL ? 'rtl' : 'ltr'} className="mobile-sheet" style={{ width: '100%', maxWidth: 480, padding: '24px 20px 0' }} onClick={e => e.stopPropagation()}>
            <div style={{ width: 40, height: 4, borderRadius: 99, background: '#dde4ef', margin: '0 auto 20px' }} />
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 44, marginBottom: 10 }}>⚡</div>
              <div style={{ fontSize: 19, fontWeight: 900, color: '#0f1e40', marginBottom: 10 }}>{t('boost_send_again')}</div>
              <div style={{ fontSize: 14, color: '#64748b', lineHeight: 1.7, marginBottom: 16 }}>
                {t('boost_desc_long')}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingBottom: 8 }}>
              <button
                onClick={() => { setShowConfirm(false); handleBoost(); }}
                disabled={loading}
                style={{ width: '100%', height: 52, borderRadius: 16, background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', border: 'none', color: 'white', fontWeight: 900, fontSize: 15, cursor: 'pointer', boxShadow: '0 4px 18px rgba(124,58,237,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
                {loading ? <Loader2 size={18} className="animate-spin" /> : <><Zap size={16} fill="white" /> {t('boost_send_now_cost').replace('{n}', BOOST_COST)}</>}
              </button>
              <button onClick={() => setShowConfirm(false)}
                style={{ width: '100%', height: 46, borderRadius: 16, background: 'none', border: '1px solid #e8edf5', color: '#64748b', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                {t('boost_cancel_btn')}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Cooldown popup — shows a live countdown until the next boost is available */}
      {showCooldown && createPortal(
        <div className="mobile-sheet-overlay" onClick={() => setShowCooldown(false)}>
          <div dir={isRTL ? 'rtl' : 'ltr'} className="mobile-sheet" style={{ width: '100%', maxWidth: 480, padding: '24px 20px 0' }} onClick={e => e.stopPropagation()}>
            <div style={{ width: 40, height: 4, borderRadius: 99, background: '#dde4ef', margin: '0 auto 20px' }} />
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'linear-gradient(135deg,#f5f3ff,#ede9fe)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', border: '2px solid #ddd6fe' }}>
                <Zap size={30} color="#a855f7" strokeWidth={2} />
              </div>
              <div style={{ fontSize: 19, fontWeight: 900, color: '#0f1e40', marginBottom: 8 }}>{t('boost_cooldown_title') || 'הבוסט נטען'}</div>
              <div style={{ fontSize: 14, color: '#64748b', lineHeight: 1.7, marginBottom: 18 }}>
                {t('boost_cooldown_body') || 'הבוסט מתמלא פעם בשעה. נשאר:'}
              </div>
              {/* Countdown timer */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 18 }}>
                <div style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', color: 'white', borderRadius: 16, padding: '14px 20px', minWidth: 140, boxShadow: '0 6px 20px rgba(124,58,237,0.3)' }}>
                  <div style={{ fontSize: 36, fontWeight: 900, fontFamily: 'monospace', letterSpacing: 1, lineHeight: 1 }}>
                    {String(Math.floor(remainingMs / 60000)).padStart(2, '0')}:{String(Math.floor((remainingMs % 60000) / 1000)).padStart(2, '0')}
                  </div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)', fontWeight: 700, marginTop: 4 }}>{t('minutes_seconds') || 'דקות:שניות'}</div>
                </div>
              </div>
              {/* Progress ring mirroring the pill fill */}
              <div style={{ height: 6, background: '#ede9fe', borderRadius: 99, overflow: 'hidden', marginBottom: 6 }}>
                <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg,#c084fc,#7c3aed)', borderRadius: 99, transition: 'width 1s linear' }} />
              </div>
              <div style={{ fontSize: 11, color: '#a855f7', fontWeight: 700 }}>{pct}% {t('boost_charged') || 'טעון'}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingBottom: 8 }}>
              <button
                onClick={() => setShowCooldown(false)}
                style={{ width: '100%', height: 48, borderRadius: 16, background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', border: 'none', color: 'white', fontWeight: 900, fontSize: 15, cursor: 'pointer', boxShadow: '0 4px 16px rgba(124,58,237,0.3)' }}>
                {t('boost_close_btn') || 'הבנתי'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      <style>{`
        @keyframes bpWave1 { 0%{transform:translateX(0%) scaleY(1)} 50%{transform:translateX(-8%) scaleY(1.4)} 100%{transform:translateX(0%) scaleY(1)} }
        @keyframes bpWave2 { 0%{transform:translateX(0%) scaleY(1)} 50%{transform:translateX(8%) scaleY(1.6)} 100%{transform:translateX(0%) scaleY(1)} }
        @keyframes bpRise  { 0%{transform:translateY(0) scale(1);opacity:0.8} 80%{opacity:0.6} 100%{transform:translateY(-80px) scale(0.4);opacity:0} }
      `}</style>
    </>
  );
}