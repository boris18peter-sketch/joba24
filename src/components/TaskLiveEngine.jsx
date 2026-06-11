/**
 * TaskLiveEngine
 * The "Fulfillment Engine" card shown on the owner's task card.
 * Shows: live status, health meter, ETA, stats, and smart recommendation.
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  getStatusMessages,
  getTaskHealth,
  getETA,
  getRecommendation,
  canSendSignal,
} from '@/lib/taskEngineLogic';

function StatusCycler({ task }) {
  const messages = getStatusMessages(task);
  const [idx, setIdx] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const iv = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIdx(i => (i + 1) % messages.length);
        setVisible(true);
      }, 350);
    }, 3000);
    return () => clearInterval(iv);
  }, [messages.length]);

  const msg = messages[idx];

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, minHeight: 22 }}>
      {/* Live dot */}
      <span style={{ position: 'relative', display: 'inline-flex', width: 8, height: 8, flexShrink: 0 }}>
        <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'rgba(96,165,250,0.5)', animation: 'enginePing 1.5s ease-in-out infinite' }} />
        <span style={{ position: 'relative', width: 8, height: 8, borderRadius: '50%', background: '#60a5fa', display: 'inline-flex' }} />
      </span>
      <AnimatePresence mode="wait">
        <motion.span
          key={idx}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.28 }}
          style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.92)', letterSpacing: 0.1 }}
        >
          {msg.icon} {msg.text}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}

function HealthBar({ health }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
      <div style={{ flex: 1, height: 5, background: 'rgba(255,255,255,0.15)', borderRadius: 99, overflow: 'hidden' }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${health.score}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          style={{ height: '100%', borderRadius: 99, background: health.score > 70 ? '#4ade80' : health.score > 40 ? '#fbbf24' : '#f87171' }}
        />
      </div>
      <span style={{ fontSize: 10, fontWeight: 700, color: health.score > 70 ? '#4ade80' : health.score > 40 ? '#fbbf24' : '#f87171', whiteSpace: 'nowrap', minWidth: 85 }}>
        🟢 {health.label}
      </span>
    </div>
  );
}

export default function TaskLiveEngine({ task, onSignal, onEdit }) {
  const navigate = useNavigate();
  const apps = task.applicants?.length || 0;
  const views = task.views_count || 0;
  const clicks = task.clicks_count || 0;
  const health = getTaskHealth(task);
  const eta = getETA(task);
  const signalAvailable = canSendSignal(task);
  const rec = getRecommendation(task, signalAvailable);
  const isUrgent = task.urgency_tag === 'immediate';

  const handleRecAction = (e) => {
    e.stopPropagation();
    if (!rec) return;
    if (rec.action === 'signal') onSignal?.();
    else if (rec.action === 'edit') onEdit?.();
    else if (rec.action === 'ai_improve') navigate(`/edit-task/${task.id}`);
  };

  return (
    <div
      dir="rtl"
      onClick={e => e.stopPropagation()}
      style={{
        background: isUrgent
          ? 'linear-gradient(135deg, #7f1d1d 0%, #1a0505 100%)'
          : 'linear-gradient(135deg, #0f2b6b 0%, #1a6fd4 100%)',
        borderRadius: 14,
        padding: '12px 14px',
        marginBottom: 12,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Decorative glow */}
      <div style={{ position: 'absolute', top: -20, left: -20, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />

      {/* Top: Status cycler */}
      <StatusCycler task={task} />

      {/* Health bar */}
      <div style={{ marginTop: 10 }}>
        <HealthBar health={health} />
      </div>

      {/* ETA */}
      {eta && (
        <div style={{ marginTop: 8, fontSize: 11, color: 'rgba(255,255,255,0.65)', fontWeight: 600 }}>
          {eta}
        </div>
      )}

      {/* Stats row */}
      <div style={{ display: 'flex', gap: 0, marginTop: 10, background: 'rgba(255,255,255,0.08)', borderRadius: 10 }}>
        {[
          { label: 'נחשפו', value: views, icon: '👀' },
          { label: 'צפו בפרטים', value: clicks, icon: '📋' },
          { label: 'בקשות', value: apps, icon: '📨' },
        ].map((s, i) => (
          <div key={i} style={{ flex: 1, textAlign: 'center', padding: '7px 4px', borderRight: i < 2 ? '1px solid rgba(255,255,255,0.1)' : 'none' }}>
            <div style={{ fontSize: 14, fontWeight: 900, color: 'white', lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.55)', marginTop: 2, fontWeight: 600 }}>{s.icon} {s.label}</div>
          </div>
        ))}
      </div>

      {/* Recommendation */}
      {rec && (
        <div style={{ marginTop: 10, background: 'rgba(255,255,255,0.1)', borderRadius: 10, padding: '9px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)', fontWeight: 600, flex: 1, lineHeight: 1.4 }}>
            💡 {rec.text}
          </span>
          {rec.cta && (
            <button
              onClick={handleRecAction}
              style={{ flexShrink: 0, padding: '5px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', color: 'white', fontSize: 11, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', WebkitTapHighlightColor: 'transparent' }}
            >
              {rec.cta}
            </button>
          )}
        </div>
      )}

      <style>{`
        @keyframes enginePing {
          0%, 100% { transform: scale(1); opacity: 0.7; }
          50% { transform: scale(2.2); opacity: 0; }
        }
      `}</style>
    </div>
  );
}