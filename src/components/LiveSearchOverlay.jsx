import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';

const WORKER_NAMES = ['ליאור', 'מאור', 'יעל', 'אבי', 'דנה', 'רון', 'מיכל', 'אדם', 'שיר', 'ניר', 'גל', 'עומר'];
const AREA_LABELS = ['תל אביב', 'רמת גן', 'גבעתיים', 'פתח תקווה', 'חולון', 'ראשון לציון', 'בת ים'];

function randomBetween(a, b) { return Math.floor(Math.random() * (b - a + 1)) + a; }

export default function LiveSearchOverlay({ taskId, taskTitle, taskPrice, onDismiss }) {
  const navigate = useNavigate();
  const [workerCount, setWorkerCount] = useState(0);
  const [viewCount, setViewCount] = useState(0);
  const [pulseWorkers, setPulseWorkers] = useState([]);
  const [canSkip, setCanSkip] = useState(false);
  const [firstAppReceived, setFirstAppReceived] = useState(false);
  const [statusMsg, setStatusMsg] = useState('מחפש עובדים בקרבת מקום...');
  const [phase, setPhase] = useState('scanning'); // scanning | found
  const skipTimerRef = useRef(null);
  const navigateRef = useRef(null);

  // Navigate to task
  const goToTask = () => {
    clearTimeout(navigateRef.current);
    onDismiss?.();
    navigate(`/task/${taskId}`);
  };

  // Allow skip after 5s
  useEffect(() => {
    skipTimerRef.current = setTimeout(() => setCanSkip(true), 5000);
    // Auto-navigate after 35s regardless
    navigateRef.current = setTimeout(goToTask, 35000);
    return () => {
      clearTimeout(skipTimerRef.current);
      clearTimeout(navigateRef.current);
    };
  }, []);

  // Animate worker + view count upward
  useEffect(() => {
    const notifyCount = randomBetween(8, 24);
    let cur = 0;
    const interval = setInterval(() => {
      cur += randomBetween(1, 3);
      if (cur >= notifyCount) { cur = notifyCount; clearInterval(interval); }
      setWorkerCount(cur);
    }, 180);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const viewTarget = randomBetween(40, 120);
    let cur = 0;
    const interval = setInterval(() => {
      cur += randomBetween(2, 6);
      if (cur >= viewTarget) { cur = viewTarget; clearInterval(interval); }
      setViewCount(cur);
    }, 120);
    return () => clearInterval(interval);
  }, []);

  // Ping workers appearing
  useEffect(() => {
    const msgs = [
      'שולח התראות לעובדים...',
      'עובדים בקרבת מקום נמצאו 🎯',
      'ממתין לתגובות ראשונות...',
      'הג\'ובה שלך חיה!',
    ];
    let i = 0;
    const iv = setInterval(() => {
      if (i < msgs.length) { setStatusMsg(msgs[i]); i++; }
      else clearInterval(iv);
    }, 3500);
    return () => clearInterval(iv);
  }, []);

  // Add pinging workers on the radar
  useEffect(() => {
    const interval = setInterval(() => {
      const newWorker = {
        id: Date.now(),
        name: WORKER_NAMES[Math.floor(Math.random() * WORKER_NAMES.length)],
        area: AREA_LABELS[Math.floor(Math.random() * AREA_LABELS.length)],
        angle: Math.random() * 360,
        dist: randomBetween(35, 80), // % from center
      };
      setPulseWorkers(prev => [...prev.slice(-6), newWorker]);
    }, 2200);
    return () => clearInterval(interval);
  }, []);

  // Subscribe to first application
  useEffect(() => {
    if (!taskId) return;
    const unsub = base44.entities.TaskApplication.subscribe((event) => {
      if (event.data?.task_id === taskId && event.type === 'create') {
        setFirstAppReceived(true);
        setPhase('found');
        setStatusMsg('🎉 התקבלה מועמדות ראשונה!');
        setTimeout(goToTask, 2200);
      }
    });
    return () => unsub();
  }, [taskId]);

  const dotX = (angle, dist) => 50 + dist * Math.cos((angle * Math.PI) / 180);
  const dotY = (angle, dist) => 50 + dist * Math.sin((angle * Math.PI) / 180);

  return (
    <div
      dir="rtl"
      style={{
        position: 'fixed', inset: 0, zIndex: 99999,
        background: 'linear-gradient(160deg, #05112e 0%, #0a1f4e 60%, #0d2a60 100%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center',
        animation: 'lsoFadeIn 0.4s ease',
      }}
    >
      <style>{`
        @keyframes lsoFadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes radarSpin { to { transform: rotate(360deg); } }
        @keyframes radarPulse { 0%,100% { transform: scale(1); opacity: 0.18; } 50% { transform: scale(1.07); opacity: 0.28; } }
        @keyframes workerPing { 0% { transform: scale(0.4); opacity: 0; } 40% { transform: scale(1.4); opacity: 1; } 100% { transform: scale(1); opacity: 0.9; } }
        @keyframes dotBlink { 0%,80%,100% { opacity: 0; } 40% { opacity: 1; } }
        @keyframes slideUpIn { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes foundPop { 0% { transform: scale(0.7); opacity: 0; } 70% { transform: scale(1.12); } 100% { transform: scale(1); opacity: 1; } }
      `}</style>

      {/* Skip button */}
      {canSkip && (
        <button
          onClick={goToTask}
          style={{
            position: 'absolute', top: 'max(18px, env(safe-area-inset-top))', left: 16,
            background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: 20, padding: '7px 14px', color: 'rgba(255,255,255,0.8)', fontSize: 13,
            fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
            animation: 'slideUpIn 0.3s ease',
          }}
        >
          <ChevronLeft size={14} /> דלג
        </button>
      )}

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 32, padding: '0 24px', animation: 'slideUpIn 0.5s ease' }}>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 6, letterSpacing: 1, textTransform: 'uppercase', fontWeight: 600 }}>
          {phase === 'found' ? 'נמצא עובד!' : 'שוק חי · Joba24'}
        </div>
        <div style={{ fontSize: 22, fontWeight: 900, color: 'white', lineHeight: 1.25, marginBottom: 4 }}>
          {phase === 'found'
            ? <span style={{ animation: 'foundPop 0.5s ease' }}>🎉 התקבלה מועמדות!</span>
            : 'מחפשים את העובד המושלם'}
        </div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', maxWidth: 260 }}>
          {taskTitle && <span style={{ fontWeight: 700, color: 'rgba(255,255,255,0.8)' }}>"{taskTitle}"</span>}
          {taskPrice && <> · <span style={{ color: '#4ade80', fontWeight: 800 }}>₪{taskPrice}</span></>}
        </div>
      </div>

      {/* Radar */}
      <div style={{ position: 'relative', width: 240, height: 240, marginBottom: 36 }}>
        {/* Concentric rings */}
        {[100, 78, 56, 36].map((size, i) => (
          <div key={i} style={{
            position: 'absolute',
            inset: `${(100 - size) / 2}%`,
            borderRadius: '50%',
            border: `1px solid rgba(99,179,237,${0.08 + i * 0.04})`,
            animation: `radarPulse ${2.5 + i * 0.4}s ease-in-out infinite`,
            animationDelay: `${i * 0.3}s`,
          }} />
        ))}

        {/* Radar sweep */}
        <div style={{
          position: 'absolute', inset: 0,
          borderRadius: '50%',
          overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', inset: 0,
            background: 'conic-gradient(from 0deg, transparent 75%, rgba(99,179,237,0.35) 100%)',
            animation: 'radarSpin 2.8s linear infinite',
            borderRadius: '50%',
          }} />
        </div>

        {/* Center dot */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 14, height: 14, borderRadius: '50%',
          background: '#60a5fa',
          boxShadow: '0 0 18px #60a5fa, 0 0 40px rgba(96,165,250,0.4)',
        }} />

        {/* Live worker dots on radar */}
        {pulseWorkers.map((w) => (
          <div key={w.id} style={{
            position: 'absolute',
            left: `${dotX(w.angle, w.dist)}%`,
            top: `${dotY(w.angle, w.dist)}%`,
            transform: 'translate(-50%, -50%)',
            width: 9, height: 9, borderRadius: '50%',
            background: '#4ade80',
            boxShadow: '0 0 10px #4ade80',
            animation: 'workerPing 1.4s ease-out forwards',
          }} />
        ))}

        {/* SVG grid lines */}
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.08 }}>
          <line x1="50%" y1="0" x2="50%" y2="100%" stroke="#63b3ed" strokeWidth="1" />
          <line x1="0" y1="50%" x2="100%" y2="50%" stroke="#63b3ed" strokeWidth="1" />
        </svg>
      </div>

      {/* Status message */}
      <div key={statusMsg} style={{
        fontSize: 15, fontWeight: 700, color: 'white', marginBottom: 24, textAlign: 'center',
        animation: 'slideUpIn 0.3s ease',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        {phase !== 'found' && (
          <span style={{ display: 'flex', gap: 3 }}>
            {[0.1, 0.3, 0.5].map((d, i) => (
              <span key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: '#60a5fa', display: 'inline-block', animation: `dotBlink 1.2s ${d}s infinite` }} />
            ))}
          </span>
        )}
        {statusMsg}
      </div>

      {/* Stats row */}
      <div style={{
        display: 'flex', gap: 24, marginBottom: 32,
        animation: 'slideUpIn 0.6s ease',
      }}>
        {[
          { label: 'עובדים קיבלו התראה', value: workerCount, color: '#60a5fa' },
          { label: 'צפיות בג\'ובה', value: viewCount, color: '#a78bfa' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 900, color, letterSpacing: -1 }}>{value}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', fontWeight: 600, marginTop: 2 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Recent pings */}
      <div style={{
        width: '100%', maxWidth: 320, padding: '0 20px',
        animation: 'slideUpIn 0.7s ease',
      }}>
        {pulseWorkers.slice(-3).reverse().map((w) => (
          <div key={w.id} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '8px 12px', marginBottom: 6,
            background: 'rgba(255,255,255,0.06)',
            borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)',
            animation: 'slideUpIn 0.3s ease',
          }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#4ade80', flexShrink: 0 }} />
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>
              {w.name} מ{w.area} <span style={{ color: 'rgba(255,255,255,0.4)' }}>· זמין עכשיו</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}