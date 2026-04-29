import { useState, useEffect } from 'react';
import { CheckCircle2, Loader2, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { Link } from 'react-router-dom';
import WorkerCompletionPhoto from '@/components/WorkerCompletionPhoto';

const STEPS = [
  { key: 'on_the_way', workerLabel: 'יצאתי לדרך', ownerLabel: 'יצא לדרך', icon: '🛵', color: '#1a6fd4', bg: '#dbeafe', textColor: '#1e40af' },
  { key: 'arrived',    workerLabel: 'הגעתי',        ownerLabel: 'הגיע',        icon: '📍', color: '#f59e0b', bg: '#fef3c7', textColor: '#92400e' },
  { key: 'done',       workerLabel: 'סיימתי',        ownerLabel: 'סיים',        icon: '✅', color: '#10b981', bg: '#dcfce7', textColor: '#065f46' },
];

// Wolt-style scanning pulse rings
function ScanningPulse() {
  return (
    <div style={{ position: 'relative', width: 64, height: 64, flexShrink: 0 }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          position: 'absolute', inset: 0, borderRadius: '50%',
          border: '2px solid rgba(255,255,255,0.4)',
          animation: `scan-ring 2s ease-out ${i * 0.6}s infinite`,
        }} />
      ))}
      <div style={{
        position: 'absolute', inset: 8, borderRadius: '50%',
        background: 'rgba(255,255,255,0.2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 22,
      }}>🔍</div>
      <style>{`
        @keyframes scan-ring {
          0%   { transform: scale(1);   opacity: 0.7; }
          100% { transform: scale(2.2); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

export default function WorkerTrackerBar({ task, isWorker, isOwner, onUpdate }) {
  const [loading, setLoading] = useState(false);
  const [localStatus, setLocalStatus] = useState(task?.worker_status ?? null);
  const [completionPhoto, setCompletionPhoto] = useState(task?.completion_photo || null);

  useEffect(() => {
    setLocalStatus(task?.worker_status ?? null);
    setCompletionPhoto(task?.completion_photo || null);
  }, [task?.worker_status, task?.completion_photo]);

  // Show "searching" state for owner when task is still OPEN (no worker yet)
  if (!task.worker_id && isOwner && task.status === 'OPEN') {
    return (
      <div dir="rtl" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', borderRadius: 24, padding: '20px 20px', display: 'flex', alignItems: 'center', gap: 16, boxShadow: '0 4px 24px rgba(99,102,241,0.3)' }}>
        <ScanningPulse />
        <div style={{ flex: 1 }}>
          <div style={{ color: 'white', fontWeight: 900, fontSize: 17, marginBottom: 3 }}>מחפש פועל...</div>
          <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13 }}>המשימה פתוחה — עובדים יכולים להגיש מועמדות</div>
        </div>
      </div>
    );
  }

  if (!task.worker_id) return null;

  const currentStepIndex = localStatus ? STEPS.findIndex(s => s.key === localStatus) : -1;
  const nextStep = STEPS[currentStepIndex + 1];
  const currentStep = currentStepIndex >= 0 ? STEPS[currentStepIndex] : null;

  const handleStepClick = async (step) => {
    setLoading(true);
    setLocalStatus(step.key);
    try {
      const update = { worker_status: step.key };
      if (step.key === 'on_the_way') {
        update.on_the_way_at = new Date().toISOString();
        await new Promise((resolve) => {
          if (!navigator.geolocation) return resolve();
          navigator.geolocation.getCurrentPosition(
            (pos) => { update.worker_lat = pos.coords.latitude; update.worker_lng = pos.coords.longitude; resolve(); },
            () => resolve()
          );
        });
      } else if (step.key === 'arrived') {
        update.arrived_at = new Date().toISOString();
      } else if (step.key === 'done') {
        update.completed_at = new Date().toISOString();
        if (completionPhoto) update.completion_photo = completionPhoto;
      }
      await onUpdate(update);
      toast.success(`${step.icon} ${step.workerLabel}`);
    } catch {
      setLocalStatus(task?.worker_status ?? null);
      toast.error('שגיאה בעדכון סטטוס');
    } finally {
      setLoading(false);
    }
  };

  const timestamp =
    currentStep?.key === 'on_the_way' ? task.on_the_way_at :
    currentStep?.key === 'arrived'    ? task.arrived_at    :
    currentStep?.key === 'done'       ? task.completed_at  : null;

  // ── Header text ──────────────────────────────────────────────────────
  const headerTitle = (() => {
    if (currentStepIndex === 2) return isOwner ? '🎉 הפועל סיים את הג\'ובה' : '🎉 סיימת את הג\'ובה!';
    if (currentStepIndex === 1) return isOwner ? '📍 הפועל הגיע אליך' : '📍 הגעת למיקום';
    if (currentStepIndex === 0) return isOwner ? '🛵 הפועל יצא לדרך אליך' : '🛵 אתה בדרך';
    return isOwner ? 'מחפש פועל...' : 'התחל את הג\'ובה';
  })();

  const headerSub = (() => {
    if (currentStepIndex === 2) return isOwner ? 'אשר סיום לשחרור התשלום' : 'ממתין לאישור המעסיק ושחרור תשלום';
    if (currentStepIndex === 1) return isWorker ? 'עדכן כשסיימת את העבודה' : 'יעדכן אותך כשיסיים';
    if (currentStepIndex === 0) {
      if (isWorker) return timestamp ? `יצאת ${formatDistanceToNow(new Date(timestamp), { addSuffix: true })}` : 'עדכן כשתגיע למיקום';
      return timestamp ? `יצא ${formatDistanceToNow(new Date(timestamp), { addSuffix: true })}` : 'בדרך אליך';
    }
    return isOwner ? 'ממתין שהפועל ייצא לדרך' : 'לחץ כדי להתחיל';
  })();

  const gradientColor =
    currentStepIndex === 2 ? 'linear-gradient(135deg, #059669, #10b981)' :
    currentStepIndex === 1 ? 'linear-gradient(135deg, #d97706, #f59e0b)' :
    currentStepIndex === 0 ? 'linear-gradient(135deg, #1a6fd4, #3b82f6)' :
    isOwner              ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'  : // scanning = purple
                           'linear-gradient(135deg, #1a6fd4, #3b82f6)';

  return (
    <div dir="rtl" style={{ background: 'white', borderRadius: 24, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>

      {/* Header */}
      <div style={{ background: gradientColor, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
        {isOwner && currentStepIndex === -1 ? <ScanningPulse /> : (
          <div style={{ fontSize: 32 }}>
            {currentStepIndex === 2 ? '🎉' : currentStepIndex === 1 ? '📍' : currentStepIndex === 0 ? '🛵' : '⏳'}
          </div>
        )}
        <div style={{ flex: 1 }}>
          <div style={{ color: 'white', fontWeight: 900, fontSize: 16, marginBottom: 2 }}>{headerTitle}</div>
          <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12 }}>{headerSub}</div>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 12, padding: '6px 12px', color: 'white', fontWeight: 900, fontSize: 18 }}>
          ₪{task.price}
        </div>
      </div>

      {/* Progress steps */}
      <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 0 }}>
        {STEPS.map((step, idx) => {
          const isDone = idx <= currentStepIndex;
          const isActive = idx === currentStepIndex;
          return (
            <div key={step.key} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
              {idx < STEPS.length - 1 && (
                <div style={{ position: 'absolute', top: 16, left: '-50%', right: '-50%', height: 3, background: idx < currentStepIndex ? step.color : '#e2e8f0', zIndex: 0, transition: 'background 0.4s' }} />
              )}
              <div style={{ width: 34, height: 34, borderRadius: '50%', background: isDone ? step.color : '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, zIndex: 1, position: 'relative', boxShadow: isActive ? `0 0 0 4px ${step.bg}` : 'none', transition: 'all 0.3s', border: isDone ? `2px solid ${step.color}` : '2px solid #e2e8f0' }}>
                {isDone ? '✓' : step.icon}
              </div>
              <div style={{ fontSize: 10, fontWeight: isActive ? 800 : 600, color: isDone ? step.textColor : '#94a3b8', marginTop: 6, textAlign: 'center', lineHeight: 1.3 }}>
                {isOwner ? step.ownerLabel : step.workerLabel}
              </div>
            </div>
          );
        })}
      </div>

      {/* Worker action button */}
      {isWorker && currentStepIndex < 2 && (
        <div style={{ padding: '0 16px 16px' }}>
          {/* Photo upload before marking done */}
          {currentStepIndex === 1 && (
            <WorkerCompletionPhoto photoUrl={completionPhoto} onPhotoUploaded={setCompletionPhoto} />
          )}
          <button
            onClick={() => handleStepClick(nextStep || STEPS[0])}
            disabled={loading}
            style={{ marginTop: 10, width: '100%', height: 52, borderRadius: 16, background: loading ? '#94a3b8' : (nextStep || STEPS[0]).color, color: 'white', fontWeight: 900, fontSize: 15, border: 'none', cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.15)', transition: 'all 0.2s' }}
          >
            {loading ? <><Loader2 size={18} className="animate-spin" /> רגע...</> :
             currentStepIndex === -1 ? '🛵 יצאתי לדרך' :
             currentStepIndex === 0  ? '📍 הגעתי למיקום' :
             currentStepIndex === 1  ? '✅ סיימתי את הג\'ובה' : null}
          </button>
        </div>
      )}

      {/* Worker done state */}
      {isWorker && currentStepIndex === 2 && (
        <div style={{ margin: '0 16px 16px', background: '#f0fdf4', borderRadius: 14, padding: '12px 16px', textAlign: 'center', border: '1px solid #bbf7d0' }}>
          <div style={{ fontWeight: 800, color: '#065f46', fontSize: 14 }}>כל הכבוד! ממתין לאישור המעסיק 🎉</div>
          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>המעסיק יאשר ותקבל ₪{task.price}</div>
          {completionPhoto && <img src={completionPhoto} alt="proof" style={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: 12, marginTop: 10, border: '1px solid #bbf7d0' }} />}
        </div>
      )}

      {/* Owner confirm button when worker is done */}
      {isOwner && currentStepIndex === 2 && (
        <div style={{ margin: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {completionPhoto && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#0f2b6b', marginBottom: 6 }}>📸 תמונת הוכחה מהפועל:</div>
              <img src={completionPhoto} alt="proof" style={{ width: '100%', height: 180, objectFit: 'cover', borderRadius: 14, border: '2px solid #dce8f5' }} />
            </div>
          )}
          <button
            onClick={() => onUpdate({ status: 'COMPLETED', client_confirmed: true })}
            style={{ width: '100%', height: 50, borderRadius: 16, background: 'linear-gradient(135deg, #059669, #10b981)', color: 'white', fontWeight: 900, fontSize: 15, border: 'none', cursor: 'pointer', boxShadow: '0 4px 16px rgba(16,185,129,0.3)' }}
          >
            ✅ אשר סיום ושחרר תשלום
          </button>
        </div>
      )}

      {/* Chat link */}
      <div style={{ padding: '0 16px 16px' }}>
        <Link to={`/chat/${task.id}`} style={{ textDecoration: 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, height: 42, borderRadius: 14, border: '1px solid #dce8f5', background: 'white', color: '#1a6fd4', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
            <MessageCircle size={16} />
            צ'אט עם {isWorker ? 'המעסיק' : 'הפועל'}
          </div>
        </Link>
      </div>
    </div>
  );
}