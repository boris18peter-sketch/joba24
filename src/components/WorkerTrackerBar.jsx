import { useState, useEffect } from 'react';
import { Navigation, CheckCircle2, PartyPopper, Loader2, Clock, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { Link } from 'react-router-dom';

const STEPS = [
  {
    key: 'on_the_way',
    label: 'יצאתי לדרך',
    sublabel: 'בדרך למיקום',
    icon: '🛵',
    color: '#1a6fd4',
    bg: '#dbeafe',
    textColor: '#1e40af',
  },
  {
    key: 'arrived',
    label: 'הגעתי',
    sublabel: 'נמצא במיקום',
    icon: '📍',
    color: '#f59e0b',
    bg: '#fef3c7',
    textColor: '#92400e',
  },
  {
    key: 'done',
    label: 'סיימתי',
    sublabel: 'ממתין לאישור',
    icon: '✅',
    color: '#10b981',
    bg: '#dcfce7',
    textColor: '#065f46',
  },
];

export default function WorkerTrackerBar({ task, isWorker, isOwner, onUpdate }) {
  const [loading, setLoading] = useState(false);
  const [localStatus, setLocalStatus] = useState(task?.worker_status ?? null);

  useEffect(() => {
    setLocalStatus(task?.worker_status ?? null);
  }, [task?.worker_status]);

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
        if (navigator.geolocation) {
          await new Promise((resolve) => {
            navigator.geolocation.getCurrentPosition(
              (pos) => {
                update.worker_lat = pos.coords.latitude;
                update.worker_lng = pos.coords.longitude;
                resolve();
              },
              () => resolve()
            );
          });
        }
      } else if (step.key === 'arrived') {
        update.arrived_at = new Date().toISOString();
      } else if (step.key === 'done') {
        update.completed_at = new Date().toISOString();
      }

      await onUpdate(update);
      toast.success(`${step.icon} ${step.label}`);
    } catch (err) {
      setLocalStatus(task?.worker_status ?? null);
      toast.error('שגיאה בעדכון סטטוס');
    } finally {
      setLoading(false);
    }
  };

  const timestamp =
    currentStep?.key === 'on_the_way' ? task.on_the_way_at :
    currentStep?.key === 'arrived' ? task.arrived_at :
    currentStep?.key === 'done' ? task.completed_at : null;

  return (
    <div dir="rtl" style={{ background: 'white', borderRadius: 24, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>

      {/* Top status bar - Wolt style */}
      <div style={{
        background: currentStepIndex === 2
          ? 'linear-gradient(135deg, #059669, #10b981)'
          : currentStepIndex === 1
          ? 'linear-gradient(135deg, #d97706, #f59e0b)'
          : 'linear-gradient(135deg, #1a6fd4, #3b82f6)',
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
      }}>
        <div style={{ fontSize: 32 }}>
          {currentStepIndex === 2 ? '🎉' : currentStepIndex === 1 ? '📍' : currentStepIndex === 0 ? '🛵' : '⏳'}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ color: 'white', fontWeight: 900, fontSize: 17, marginBottom: 2 }}>
            {currentStepIndex === 2
              ? (isOwner ? 'העובד סיים!' : 'סיימת את העבודה!')
              : currentStepIndex === 1
              ? (isWorker ? 'הגעת למיקום' : 'העובד הגיע אליך!')
              : currentStepIndex === 0
              ? (isWorker ? 'אתה בדרך' : 'העובד בדרך אליך 🛵')
              : (isWorker ? 'התחל את המשימה' : 'ממתין שהעובד יצא לדרך')}
          </div>
          <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12 }}>
            {currentStepIndex === 2
              ? (isOwner ? 'אשר את סיום העבודה לשחרור התשלום' : 'ממתין לאישור הלקוח ושחרור תשלום')
              : currentStepIndex === 1
              ? (isWorker ? 'עדכן כשסיימת את העבודה' : 'עדכן תישלח לך כשיסיים')
              : currentStepIndex === 0
              ? (isWorker
                  ? (timestamp ? `יצאת ${formatDistanceToNow(new Date(timestamp), { addSuffix: true })}` : 'עדכן כשתגיע למיקום')
                  : (timestamp ? `יצא ${formatDistanceToNow(new Date(timestamp), { addSuffix: true })}` : 'בדרך אליך'))
              : (isWorker ? 'לחץ על הכפתור כדי להתחיל' : 'תקבל הודעה כשיצא לדרך')}
          </div>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 12, padding: '6px 12px', color: 'white', fontWeight: 900, fontSize: 18 }}>
          ₪{task.price}
        </div>
      </div>

      {/* Progress steps - Wolt style horizontal */}
      <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 0, position: 'relative' }}>
        {STEPS.map((step, idx) => {
          const isDone = idx <= currentStepIndex;
          const isActive = idx === currentStepIndex;

          return (
            <div key={step.key} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
              {/* Connector line */}
              {idx < STEPS.length - 1 && (
                <div style={{
                  position: 'absolute',
                  top: 16,
                  left: '-50%',
                  right: '-50%',
                  height: 3,
                  background: idx < currentStepIndex ? step.color : '#e2e8f0',
                  zIndex: 0,
                  transition: 'background 0.4s',
                }} />
              )}

              {/* Step circle */}
              <div style={{
                width: 34,
                height: 34,
                borderRadius: '50%',
                background: isDone ? step.color : '#f1f5f9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 15,
                zIndex: 1,
                position: 'relative',
                boxShadow: isActive ? `0 0 0 4px ${step.bg}` : 'none',
                transition: 'all 0.3s',
                border: isDone ? `2px solid ${step.color}` : '2px solid #e2e8f0',
              }}>
                {isDone ? '✓' : step.icon}
              </div>

              {/* Label */}
              <div style={{
                fontSize: 10,
                fontWeight: isActive ? 800 : 600,
                color: isDone ? step.textColor : '#94a3b8',
                marginTop: 6,
                textAlign: 'center',
                lineHeight: 1.3,
              }}>
                {step.label}
              </div>
            </div>
          );
        })}
      </div>

      {/* Action button - Worker only */}
      {isWorker && currentStepIndex < 2 && (
        <div style={{ padding: '0 16px 16px' }}>
          <button
            onClick={() => handleStepClick(nextStep || STEPS[0])}
            disabled={loading}
            style={{
              width: '100%',
              height: 52,
              borderRadius: 16,
              background: loading ? '#94a3b8' : (nextStep || STEPS[0]).color,
              color: 'white',
              fontWeight: 900,
              fontSize: 15,
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              boxShadow: `0 4px 16px rgba(0,0,0,0.15)`,
              transition: 'all 0.2s',
            }}
          >
            {loading
              ? <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> רגע...</>
              : currentStepIndex === -1
              ? '🛵 יצאתי לדרך'
              : currentStepIndex === 0
              ? '📍 הגעתי למיקום'
              : null
            }
          </button>
        </div>
      )}

      {/* Done state */}
      {currentStepIndex === 2 && (
        isWorker ? (
          <div style={{ margin: '0 16px 16px', background: '#f0fdf4', borderRadius: 14, padding: '12px 16px', textAlign: 'center', border: '1px solid #bbf7d0' }}>
            <div style={{ fontSize: 22, marginBottom: 4 }}>🎉</div>
            <div style={{ fontWeight: 800, color: '#065f46', fontSize: 14 }}>כל הכבוד! ממתין לאישור</div>
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>הלקוח יאשר ותקבל ₪{task.price}</div>
          </div>
        ) : isOwner ? (
          <div style={{ margin: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ background: '#f0fdf4', borderRadius: 14, padding: '12px 16px', textAlign: 'center', border: '1px solid #bbf7d0' }}>
              <div style={{ fontSize: 22, marginBottom: 4 }}>✅</div>
              <div style={{ fontWeight: 800, color: '#065f46', fontSize: 14 }}>העובד דיווח על סיום</div>
              <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>אשר את סיום העבודה כדי לשחרר את התשלום של ₪{task.price}</div>
            </div>
            <button
              onClick={() => onUpdate({ status: 'COMPLETED', client_confirmed: true })}
              style={{ width: '100%', height: 50, borderRadius: 16, background: 'linear-gradient(135deg, #059669, #10b981)', color: 'white', fontWeight: 900, fontSize: 15, border: 'none', cursor: 'pointer', boxShadow: '0 4px 16px rgba(16,185,129,0.3)' }}
            >
              ✅ אשר סיום ושחרר תשלום
            </button>
          </div>
        ) : null
      )}

      {/* Chat link */}
      <div style={{ padding: '0 16px 16px' }}>
        <Link to={`/chat/${task.id}`} style={{ textDecoration: 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, height: 42, borderRadius: 14, border: '1px solid #dce8f5', background: 'white', color: '#1a6fd4', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
            <MessageCircle size={16} />
            פתח צ'אט עם {isWorker ? 'המעסיק' : 'העובד'}
          </div>
        </Link>
      </div>
    </div>
  );
}