import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import TaskPublishedCelebration from '@/components/celebration/TaskPublishedCelebration';
import { CELEBRATION_CONFIG as C } from '@/components/celebration/celebrationConfig';



const CATEGORY_NAME_PLURAL = {
  plumbing: 'אינסטלטורים', electricity: 'חשמלאים', gardening: 'גננים',
  cleaning: 'מנקים', moving: 'עוזרי הובלה', painting: 'צבעים',
  carpentry: 'נגרים', ac: 'טכנאי מזגנים', locksmith: 'מנעולנים',
  shopping: 'שליחים', delivery: 'שליחים', babysitting: 'מטפלים',
  tutoring: 'מורים פרטיים', it_support: 'תומכי IT', other: 'עובדים'
};

export default function LiveSearchOverlay({ taskId, taskTitle, taskPrice, taskCategory, taskLocation, onDismiss }) {
  const navigate = useNavigate();
  const [workerCount, setWorkerCount] = useState(0);
  const [pulseWorkers, setPulseWorkers] = useState([]);
  const [canSkip, setCanSkip] = useState(false);
  const [firstAppReceived, setFirstAppReceived] = useState(false);
  const [statusMsg, setStatusMsg] = useState('מחפש עובדים בקרבת מקום...');
  const [phase, setPhase] = useState('scanning'); // scanning | found | celebrating
  const [scannerVisible, setScannerVisible] = useState(true);
  const [celebrationVisible, setCelebrationVisible] = useState(false);
  const skipTimerRef = useRef(null);
  const celebrationTimerRef = useRef(null);
  const navigateRef = useRef(null);

  // Navigate to task (final destination)
  const goToTask = () => {
    clearTimeout(navigateRef.current);
    clearTimeout(celebrationTimerRef.current);
    onDismiss?.();
    navigate(`/task/${taskId}`);
  };

  // Transition: scanner → celebration → taskDetail
  const triggerCelebration = () => {
    if (phase === 'celebrating') return;
    setPhase('celebrating');
    // Fade out scanner, then show celebration
    setScannerVisible(false);
    celebrationTimerRef.current = setTimeout(() => {
      setCelebrationVisible(true);
    }, C.scanner.transitionDuration);
  };

  // Allow skip after scannerMinDuration
  useEffect(() => {
    skipTimerRef.current = setTimeout(() => setCanSkip(true), C.scanner.scannerMinDuration);
    // Auto-trigger celebration after scannerMaxDuration
    navigateRef.current = setTimeout(triggerCelebration, C.scanner.scannerMaxDuration);
    return () => {
      clearTimeout(skipTimerRef.current);
      clearTimeout(navigateRef.current);
      clearTimeout(celebrationTimerRef.current);
    };
  }, []);

  const { data: allUsers = [] } = useQuery({
    queryKey: ['workerPool'],
    queryFn: () => base44.entities.User.list('-last_active_at', 500),
    staleTime: 5 * 60 * 1000,
  });
  const categoryWorkerCount = (() => {
    if (!taskCategory || !allUsers.length) return 0;
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    return allUsers.filter(u =>
      u.preferred_categories?.includes(taskCategory) &&
      u.last_active_at && new Date(u.last_active_at) >= sevenDaysAgo
    ).length;
  })();

  // Real application count
  useEffect(() => {
    if (!taskId) return;
    base44.entities.TaskApplication.filter({ task_id: taskId })
      .then(apps => setWorkerCount(apps.length));
  }, [taskId]);

  // Ping workers appearing
  useEffect(() => {
    const msgs = [
      'שולח התראות לעובדים...',
      'עובדים בקרבת מקום נמצאו 🎯',
      'ממתין לתגובות ראשונות...',
      'המשימה שלך חיה! 🚀',
    ];
    let i = 0;
    const iv = setInterval(() => {
      if (i < msgs.length) { setStatusMsg(msgs[i]); i++; }
      else clearInterval(iv);
    }, 3500);
    return () => clearInterval(iv);
  }, []);

  // Radar dots (visual only)
  useEffect(() => {
    const interval = setInterval(() => {
      setPulseWorkers(prev => [...prev.slice(-6), {
        id: Date.now(),
        angle: Math.random() * 360,
        dist: 35 + Math.random() * 45,
      }]);
    }, 2200);
    return () => clearInterval(interval);
  }, []);

  // Subscribe to first application → trigger celebration
  useEffect(() => {
    if (!taskId) return;
    const unsub = base44.entities.TaskApplication.subscribe((event) => {
      if (event.data?.task_id === taskId && event.type === 'create') {
        setWorkerCount(c => c + 1);
        setFirstAppReceived(true);
        setStatusMsg('🎉 התקבלה מועמדות ראשונה!');
        // After a brief "found" moment, launch celebration
        setTimeout(triggerCelebration, 800);
      }
    });
    return () => unsub();
  }, [taskId]);

  const dotX = (angle, dist) => 50 + dist * Math.cos((angle * Math.PI) / 180);
  const dotY = (angle, dist) => 50 + dist * Math.sin((angle * Math.PI) / 180);

  return createPortal(
    <>
      {/* Celebration overlay — shown after scanner fades */}
      <TaskPublishedCelebration
        visible={celebrationVisible}
        taskTitle={taskTitle}
        taskPrice={taskPrice}
        taskLocation={taskLocation}
        onNavigate={goToTask}
      />

      {/* Scanner — fades out before celebration */}
      <AnimatePresence>
        {scannerVisible && (
          <motion.div
            key="scanner"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: C.scanner.transitionDuration / 1000, ease: 'easeInOut' }}
            dir="rtl"
            style={{
              position: 'fixed', inset: 0, zIndex: 999998,
              background: 'linear-gradient(160deg, #05112e 0%, #0a1f4e 60%, #0d2a60 100%)',
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <style>{`
              @keyframes radarSpin { to { transform: rotate(360deg); } }
              @keyframes radarPulse { 0%,100% { transform: scale(1); opacity: 0.18; } 50% { transform: scale(1.07); opacity: 0.28; } }
              @keyframes workerPing { 0% { transform: scale(0.4); opacity: 0; } 40% { transform: scale(1.4); opacity: 1; } 100% { transform: scale(1); opacity: 0.9; } }
              @keyframes dotBlink { 0%,80%,100% { opacity: 0; } 40% { opacity: 1; } }
              @keyframes slideUpIn { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
              @keyframes foundPop { 0% { transform: scale(0.7); opacity: 0; } 70% { transform: scale(1.12); } 100% { transform: scale(1); opacity: 1; } }
            `}</style>

            {/* Skip → triggers celebration */}
            {canSkip && phase !== 'celebrating' && (
              <button
                onClick={triggerCelebration}
                style={{
                  position: 'absolute', top: 'max(18px, env(safe-area-inset-top))', left: 16,
                  background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: 20, padding: '7px 14px', color: 'rgba(255,255,255,0.8)', fontSize: 13,
                  fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                  animation: 'slideUpIn 0.3s ease', zIndex: 10,
                }}
              >
                <ChevronLeft size={14} /> המשך
              </button>
            )}

            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: 32, padding: '0 24px', animation: 'slideUpIn 0.5s ease' }}>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 6, letterSpacing: 1, textTransform: 'uppercase', fontWeight: 600 }}>
                {firstAppReceived ? 'נמצא עובד!' : 'שוק חי · Joba24'}
              </div>
              <div style={{ fontSize: 22, fontWeight: 900, color: 'white', lineHeight: 1.25, marginBottom: 4 }}>
                {firstAppReceived
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
              {[100, 78, 56, 36].map((size, i) => (
                <div key={i} style={{
                  position: 'absolute', inset: `${(100 - size) / 2}%`, borderRadius: '50%',
                  border: `1px solid rgba(99,179,237,${0.08 + i * 0.04})`,
                  animation: `radarPulse ${2.5 + i * 0.4}s ease-in-out infinite`,
                  animationDelay: `${i * 0.3}s`,
                }} />
              ))}
              <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', overflow: 'hidden' }}>
                <div style={{
                  position: 'absolute', inset: 0,
                  background: 'conic-gradient(from 0deg, transparent 75%, rgba(99,179,237,0.35) 100%)',
                  animation: 'radarSpin 2.8s linear infinite', borderRadius: '50%',
                }} />
              </div>
              <div style={{
                position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                width: 14, height: 14, borderRadius: '50%', background: '#60a5fa',
                boxShadow: '0 0 18px #60a5fa, 0 0 40px rgba(96,165,250,0.4)',
              }} />
              {pulseWorkers.map((w) => (
                <div key={w.id} style={{
                  position: 'absolute',
                  left: `${dotX(w.angle, w.dist)}%`, top: `${dotY(w.angle, w.dist)}%`,
                  transform: 'translate(-50%, -50%)',
                  width: 9, height: 9, borderRadius: '50%', background: '#4ade80',
                  boxShadow: '0 0 10px #4ade80', animation: 'workerPing 1.4s ease-out forwards',
                }} />
              ))}
              <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.08 }}>
                <line x1="50%" y1="0" x2="50%" y2="100%" stroke="#63b3ed" strokeWidth="1" />
                <line x1="0" y1="50%" x2="100%" y2="50%" stroke="#63b3ed" strokeWidth="1" />
              </svg>
            </div>

            {/* Status */}
            <div key={statusMsg} style={{
              fontSize: 15, fontWeight: 700, color: 'white', marginBottom: 24, textAlign: 'center',
              animation: 'slideUpIn 0.3s ease', display: 'flex', alignItems: 'center', gap: 8,
            }}>
              {!firstAppReceived && (
                <span style={{ display: 'flex', gap: 3 }}>
                  {[0.1, 0.3, 0.5].map((d, i) => (
                    <span key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: '#60a5fa', display: 'inline-block', animation: `dotBlink 1.2s ${d}s infinite` }} />
                  ))}
                </span>
              )}
              {statusMsg}
            </div>

            {categoryWorkerCount > 0 && !firstAppReceived && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(74,222,128,0.12)', border: '1px solid rgba(74,222,128,0.3)', borderRadius: 99, padding: '8px 16px', marginBottom: 20, animation: 'slideUpIn 0.5s ease' }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#4ade80', display: 'inline-block', animation: 'dotBlink 1.2s 0.1s infinite' }} />
                <span style={{ fontSize: 13, fontWeight: 700, color: '#4ade80' }}>
                  {categoryWorkerCount} {CATEGORY_NAME_PLURAL[taskCategory] || 'עובדים'} יכולים להגיש בקשה
                </span>
              </div>
            )}

            {workerCount > 0 && (
              <div style={{ textAlign: 'center', animation: 'slideUpIn 0.6s ease', marginBottom: 32 }}>
                <div style={{ fontSize: 40, fontWeight: 900, color: '#60a5fa', letterSpacing: -2 }}>{workerCount}</div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', fontWeight: 600, marginTop: 4 }}>מועמדויות שהתקבלו</div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>,
    document.body
  );
}