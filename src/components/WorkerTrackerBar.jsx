import { useState, useEffect, useRef } from 'react';
import { MessageCircle, Loader2, Clock, Navigation, Wrench, CheckCircle, MapPin, AlertCircle, Flag, Coffee } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import WorkerCompletionPhoto from '@/components/WorkerCompletionPhoto';

// ── Rich status definitions ─────────────────────────────────────────────────
const WORKER_STATUSES = [
  { key: 'on_the_way',     label: 'בדרך',           ownerLabel: 'בדרך אליך',           Icon: Navigation,    color: '#3b82f6', bg: '#dbeafe', step: 0 },
  { key: 'delayed',        label: 'מתעכב',          ownerLabel: 'מתעכב',               Icon: Clock,         color: '#f59e0b', bg: '#fef3c7', step: 0 },
  { key: 'parking',        label: 'מחפש חניה',      ownerLabel: 'מחפש חניה',           Icon: MapPin,        color: '#8b5cf6', bg: '#ede9fe', step: 0 },
  { key: 'arrived',        label: 'הגעתי',          ownerLabel: 'הגיע',                Icon: MapPin,        color: '#f59e0b', bg: '#fef3c7', step: 1 },
  { key: 'starting',       label: 'מתחיל עבודה',    ownerLabel: 'מתחיל עבודה',         Icon: Wrench,        color: '#10b981', bg: '#d1fae5', step: 1 },
  { key: 'finishing',      label: 'מסיים עבודה',    ownerLabel: 'מסיים עבודה',         Icon: Flag,          color: '#059669', bg: '#d1fae5', step: 1 },
  { key: 'done',           label: 'סיימתי',         ownerLabel: 'סיים — ממתין לאישור', Icon: CheckCircle,   color: '#10b981', bg: '#d1fae5', step: 2 },
];

const MAIN_STEPS = [
  { key: 'on_the_way', label: 'בדרך',  Icon: Navigation },
  { key: 'arrived',    label: 'הגיע',  Icon: MapPin },
  { key: 'done',       label: 'סיים',  Icon: CheckCircle },
];

function getStepIndex(status) {
  const s = WORKER_STATUSES.find(s => s.key === status);
  return s ? s.step : -1;
}

function getStatusInfo(key) {
  return WORKER_STATUSES.find(s => s.key === key) || WORKER_STATUSES[0];
}

// ── Scanning pulse (searching state) ─────────────────────────────────────────
function ScanningPulse() {
  return (
    <div style={{ position: 'relative', width: 56, height: 56, flexShrink: 0 }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          position: 'absolute', inset: 0, borderRadius: '50%',
          border: '2px solid rgba(255,255,255,0.35)',
          animation: `scan-ring 2.4s ease-out ${i * 0.7}s infinite`,
        }} />
      ))}
      <div style={{
        position: 'absolute', inset: 8, borderRadius: '50%',
        background: 'rgba(255,255,255,0.18)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}><AlertCircle size={20} color="white" strokeWidth={1.5} /></div>
      <style>{`@keyframes scan-ring { 0%{transform:scale(1);opacity:.7}100%{transform:scale(2.4);opacity:0} }`}</style>
    </div>
  );
}

// ── ETA timer ─────────────────────────────────────────────────────────────────
function ETATimer({ since, label }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!since) return;
    const update = () => setElapsed(Math.floor((Date.now() - new Date(since).getTime()) / 1000));
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, [since]);

  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;
  const display = mins > 0 ? `${mins}:${String(secs).padStart(2, '0')} דקות` : `${secs} שניות`;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(255,255,255,0.18)', borderRadius: 10, padding: '4px 10px', fontSize: 12, color: 'white', fontWeight: 700 }}>
      <Clock size={11} />
      {label}: {display}
    </div>
  );
}

// ── Progress bar with step nodes ───────────────────────────────────────────────
function StepProgress({ currentStatus }) {
  const stepIdx = getStepIndex(currentStatus);

  return (
    <div style={{ padding: '14px 20px 8px', background: 'white' }}>
      <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
        {/* Track line */}
        <div style={{ position: 'absolute', top: 17, right: 20, left: 20, height: 4, background: '#e2e8f0', borderRadius: 2, zIndex: 0 }} />
        {/* Fill line */}
        <div style={{
          position: 'absolute', top: 17, right: 20, height: 4,
          width: stepIdx === 0 ? '16%' : stepIdx === 1 ? '50%' : '84%',
          background: 'linear-gradient(90deg, #1a6fd4, #3b82f6)',
          borderRadius: 2, zIndex: 1, transition: 'width 0.6s cubic-bezier(0.34,1.56,0.64,1)',
        }} />

        {MAIN_STEPS.map((step, idx) => {
          const isDone = idx <= stepIdx;
          const isActive = idx === stepIdx;
          const StepIcon = step.Icon;
          return (
            <div key={step.key} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', zIndex: 2 }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                background: isDone ? (isActive ? '#1a6fd4' : '#dbeafe') : 'white',
                border: isDone ? `2.5px solid #1a6fd4` : '2.5px solid #e2e8f0',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: isActive ? '0 0 0 5px rgba(26,111,212,0.15)' : 'none',
                transition: 'all 0.4s ease',
                position: 'relative',
              }}>
                <StepIcon size={16} color={isDone ? '#1a6fd4' : '#94a3b8'} strokeWidth={isActive ? 2.5 : 1.8} />
                {isActive && (
                  <div style={{ position: 'absolute', inset: -6, borderRadius: '50%', border: '2px solid rgba(26,111,212,0.25)', animation: 'activeRing 2s ease-in-out infinite' }} />
                )}
              </div>
              <div style={{ fontSize: 10, fontWeight: isActive ? 800 : 500, color: isDone ? '#1a6fd4' : '#94a3b8', marginTop: 6 }}>{step.label}</div>
            </div>
          );
        })}
      </div>
      <style>{`@keyframes activeRing { 0%,100%{transform:scale(1);opacity:.5}50%{transform:scale(1.15);opacity:.8} }`}</style>
    </div>
  );
}

// ── Sub-status chip row (for worker to pick detail status) ─────────────────────
function SubStatusPicker({ currentStatus, onSelect, loading }) {
  const stepIdx = getStepIndex(currentStatus);
  const subOptions = stepIdx === 0
    ? [
        { key: 'on_the_way', label: 'בדרך', Icon: Navigation },
        { key: 'delayed', label: 'מתעכב', Icon: Clock },
        { key: 'parking', label: 'חניה', Icon: MapPin },
      ]
    : stepIdx === 1
    ? [
        { key: 'arrived', label: 'הגעתי', Icon: MapPin },
        { key: 'starting', label: 'מתחיל', Icon: Wrench },
        { key: 'finishing', label: 'מסיים', Icon: Flag },
      ]
    : [];

  if (!subOptions.length) return null;

  return (
    <div style={{ display: 'flex', gap: 8, padding: '0 16px 12px', flexWrap: 'wrap' }}>
      {subOptions.map(opt => {
        const OptIcon = opt.Icon;
        return (
          <button
            key={opt.key}
            disabled={loading}
            onClick={() => onSelect(opt.key)}
            style={{
              flex: 1, minWidth: 80, height: 40, borderRadius: 12,
              background: currentStatus === opt.key ? '#1a6fd4' : '#f1f5f9',
              color: currentStatus === opt.key ? 'white' : '#475569',
              fontWeight: 700, fontSize: 12, border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
              transition: 'all 0.2s',
            }}
          >
            <OptIcon size={13} strokeWidth={1.8} /> {opt.label}
          </button>
        );
      })}
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────────
export default function WorkerTrackerBar({ task, isWorker, isOwner, onUpdate }) {
  const [loading, setLoading] = useState(false);
  const [localStatus, setLocalStatus] = useState(task?.worker_status ?? null);
  const [completionPhoto, setCompletionPhoto] = useState(task?.completion_photo || null);

  useEffect(() => {
    setLocalStatus(task?.worker_status ?? null);
    setCompletionPhoto(task?.completion_photo || null);
  }, [task?.worker_status, task?.completion_photo]);

  // Searching state for owner
  if (!task.worker_id && isOwner && task.status === 'OPEN') {
    return (
      <div dir="rtl" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', borderRadius: 24, padding: '20px', display: 'flex', alignItems: 'center', gap: 16, boxShadow: '0 4px 24px rgba(99,102,241,0.25)' }}>
        <ScanningPulse />
        <div style={{ flex: 1 }}>
          <div style={{ color: 'white', fontWeight: 900, fontSize: 17, marginBottom: 3 }}>מחפשים פועל...</div>
          <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13 }}>המשימה פתוחה — פועלים יכולים לגשת</div>
        </div>
      </div>
    );
  }

  if (!task.worker_id) return null;

  const stepIdx = getStepIndex(localStatus);
  const statusInfo = localStatus ? getStatusInfo(localStatus) : null;

  const handleStatusUpdate = async (statusKey, extra = {}) => {
    setLoading(true);
    setLocalStatus(statusKey);
    try {
      const update = { worker_status: statusKey, ...extra };
      // Capture timestamps
      if (statusKey === 'on_the_way' && !task.on_the_way_at) {
        update.on_the_way_at = new Date().toISOString();
        await new Promise(resolve => {
          if (!navigator.geolocation) return resolve();
          navigator.geolocation.getCurrentPosition(
            pos => { update.worker_lat = pos.coords.latitude; update.worker_lng = pos.coords.longitude; resolve(); },
            () => resolve(), { timeout: 3000 }
          );
        });
      } else if (statusKey === 'arrived' && !task.arrived_at) {
        update.arrived_at = new Date().toISOString();
      } else if (statusKey === 'done') {
        update.completed_at = new Date().toISOString();
        if (completionPhoto) update.completion_photo = completionPhoto;
      }
      await onUpdate(update);
      toast.success(getStatusInfo(statusKey).label);
    } catch {
      setLocalStatus(task?.worker_status ?? null);
      toast.error('שגיאה בעדכון');
    } finally {
      setLoading(false);
    }
  };

  // ── Header config ────────────────────────────────────────────────────────────
  const StatusIcon = statusInfo?.Icon || Navigation;
  const headerConfig = (() => {
    if (stepIdx === 2) return {
      HeaderIcon: CheckCircle, gradient: 'linear-gradient(135deg, #059669, #10b981)',
      title: isOwner ? 'הפועל סיים את הג\'ובה!' : 'כל הכבוד, סיימת!',
      sub: isOwner ? 'אשר סיום לשחרור תשלום' : 'ממתין לאישור המעסיק',
    };
    if (stepIdx === 1) return {
      HeaderIcon: StatusIcon, gradient: 'linear-gradient(135deg, #d97706, #f59e0b)',
      title: isOwner ? `${statusInfo?.ownerLabel || 'הגיע'} ● ${task.worker_name}` : statusInfo?.label || 'הגעתי',
      sub: isOwner ? 'הפועל נמצא בשטח' : 'עדכן את ההתקדמות',
    };
    if (stepIdx === 0) return {
      HeaderIcon: StatusIcon, gradient: 'linear-gradient(135deg, #1a6fd4, #3b82f6)',
      title: isOwner ? `${task.worker_name} — ${statusInfo?.ownerLabel || 'בדרך'}` : statusInfo?.label || 'בדרך',
      sub: isOwner ? `מגיע אליך בקרוב` : 'עדכן כשתגיע',
    };
    return {
      HeaderIcon: Clock, gradient: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
      title: isOwner ? 'ממתין שהפועל ייצא לדרך' : 'יצא לדרך?',
      sub: isOwner ? 'הפועל אמר שהוא יוצא' : 'לחץ כדי לאשר יציאה',
    };
  })();

  // ETA since timestamp
  const etaSince = stepIdx === 0 ? task.on_the_way_at : stepIdx === 1 ? task.arrived_at : null;
  const etaLabel = stepIdx === 0 ? 'בדרך' : 'עובד';

  // Main CTA for worker
  const mainCTA = (() => {
    if (stepIdx <= 0) return { label: 'הגעתי למיקום', Icon: MapPin, nextKey: 'arrived', color: '#f59e0b' };
    if (stepIdx === 1) return { label: 'סיימתי את הג\'ובה', Icon: CheckCircle, nextKey: 'done', color: '#10b981' };
    return null;
  })();

  return (
    <div dir="rtl" style={{ background: 'white', borderRadius: 24, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.07)' }}>

      {/* ── Gradient Header ── */}
      <div style={{ background: headerConfig.gradient, padding: '16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: etaSince ? 10 : 0 }}>
          <div style={{ width: 44, height: 44, borderRadius: 14, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <headerConfig.HeaderIcon size={22} color="white" strokeWidth={1.8} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: 'white', fontWeight: 900, fontSize: 15, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{headerConfig.title}</div>
            <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12 }}>{headerConfig.sub}</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 12, padding: '6px 12px', color: 'white', fontWeight: 900, fontSize: 18, flexShrink: 0 }}>₪{task.price}</div>
        </div>
        {etaSince && (
          <ETATimer since={etaSince} label={etaLabel} />
        )}
      </div>

      {/* ── 3-Step Progress ── */}
      <StepProgress currentStatus={localStatus} />

      {/* ── Sub-status detail (worker only, not when done) ── */}
      {isWorker && stepIdx < 2 && (
        <SubStatusPicker currentStatus={localStatus} onSelect={handleStatusUpdate} loading={loading} />
      )}

      {/* ── Worker main CTA ── */}
      {isWorker && stepIdx < 2 && mainCTA && (
        <div style={{ padding: '0 16px 12px' }}>
          {stepIdx === 1 && (
            <WorkerCompletionPhoto photoUrl={completionPhoto} onPhotoUploaded={setCompletionPhoto} />
          )}
          <button
            onClick={() => handleStatusUpdate(mainCTA.nextKey)}
            disabled={loading}
            style={{
              marginTop: 8, width: '100%', height: 52, borderRadius: 16,
              background: loading ? '#94a3b8' : mainCTA.color,
              color: 'white', fontWeight: 900, fontSize: 15, border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: `0 4px 16px rgba(0,0,0,0.15)`, transition: 'all 0.2s',
            }}
          >
            {loading ? <><Loader2 size={18} className="animate-spin" />רגע...</> : <>{(() => { const I = mainCTA.Icon; return <I size={18} strokeWidth={1.8} />; })()} {mainCTA.label}</>}
          </button>
        </div>
      )}

      {/* ── Worker done state ── */}
      {isWorker && stepIdx === 2 && (
        <div style={{ margin: '0 16px 12px', background: '#f0fdf4', borderRadius: 14, padding: '14px 16px', textAlign: 'center', border: '1px solid #bbf7d0' }}>
          <div style={{ fontWeight: 900, color: '#065f46', fontSize: 15, display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}><CheckCircle size={16} color="#059669" /> כל הכבוד! ממתין לאישור</div>
          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 3 }}>המעסיק יאשר ותקבל ₪{task.price} לארנק</div>
          {completionPhoto && (
            <img src={completionPhoto} alt="proof" style={{ width: '100%', height: 110, objectFit: 'cover', borderRadius: 12, marginTop: 10, border: '1px solid #bbf7d0' }} />
          )}
        </div>
      )}

      {/* ── Owner: confirm completion ── */}
      {isOwner && stepIdx === 2 && (
        <div style={{ margin: '0 16px 12px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {completionPhoto && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#0f2b6b', marginBottom: 6 }}>📸 תמונת הוכחה:</div>
              <img src={completionPhoto} alt="proof" style={{ width: '100%', height: 160, objectFit: 'cover', borderRadius: 14, border: '2px solid #dce8f5' }} />
            </div>
          )}
          <button
            onClick={() => onUpdate({ status: 'COMPLETED', client_confirmed: true })}
            style={{ width: '100%', height: 52, borderRadius: 16, background: 'linear-gradient(135deg, #059669, #10b981)', color: 'white', fontWeight: 900, fontSize: 15, border: 'none', cursor: 'pointer', boxShadow: '0 4px 16px rgba(16,185,129,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          >
            <CheckCircle size={18} strokeWidth={2} /> אשר סיום ושחרר תשלום ₪{task.price}
          </button>
        </div>
      )}

      {/* ── Chat link ── */}
      <div style={{ padding: '0 16px 16px' }}>
        <Link to={`/chat/${task.id}`} style={{ textDecoration: 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, height: 42, borderRadius: 14, border: '1px solid #dce8f5', background: 'white', color: '#1a6fd4', fontWeight: 700, fontSize: 13 }}>
            <MessageCircle size={16} />
            צ'אט עם {isWorker ? 'המעסיק' : 'הפועל'}
          </div>
        </Link>
      </div>
    </div>
  );
}