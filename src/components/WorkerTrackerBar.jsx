import { useState, useEffect, useRef } from 'react';
import { MessageCircle, Loader2, Clock, Navigation, Wrench, CheckCircle, MapPin, Flag, AlertOctagon, ChevronLeft, Phone } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import WorkerCompletionPhoto from '@/components/WorkerCompletionPhoto';
import { base44 } from '@/api/base44Client';

const WORKER_STATUSES = [
  { key: 'on_the_way', label: 'בדרך',        ownerLabel: 'בדרך אליך',       Icon: Navigation,  color: '#2563eb', bg: '#dbeafe', step: 0 },
  { key: 'delayed',    label: 'מתעכב',       ownerLabel: 'מתעכב קצת',       Icon: Clock,       color: '#d97706', bg: '#fef3c7', step: 0 },
  { key: 'parking',    label: 'מחפש חניה',  ownerLabel: 'מחפש חניה',       Icon: MapPin,      color: '#7c3aed', bg: '#ede9fe', step: 0 },
  { key: 'arrived',    label: 'הגעתי',       ownerLabel: 'הגיע',             Icon: MapPin,      color: '#d97706', bg: '#fef3c7', step: 1 },
  { key: 'starting',   label: 'מתחיל עבודה', ownerLabel: 'מתחיל עבודה',    Icon: Wrench,      color: '#059669', bg: '#d1fae5', step: 1 },
  { key: 'finishing',  label: 'מסיים עבודה', ownerLabel: 'מסיים עבודה',    Icon: Flag,        color: '#0d9488', bg: '#ccfbf1', step: 1 },
  { key: 'done',       label: 'סיימתי',      ownerLabel: 'סיים — ממתין לאישור', Icon: CheckCircle, color: '#16a34a', bg: '#dcfce7', step: 2 },
];

const MAIN_STEPS = [
  { key: 'on_the_way', label: 'בדרך',   Icon: Navigation  },
  { key: 'arrived',    label: 'בשטח',   Icon: MapPin      },
  { key: 'done',       label: 'סיים',   Icon: CheckCircle },
];

function getStepIndex(status) {
  const s = WORKER_STATUSES.find(s => s.key === status);
  return s ? s.step : -1;
}
function getStatusInfo(key) {
  return WORKER_STATUSES.find(s => s.key === key) || WORKER_STATUSES[0];
}

// ── Live ETA Timer ─────────────────────────────────────────────────────────────
function ETATimer({ since, label, color = 'white' }) {
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
  const display = mins > 0 ? `${mins}:${String(secs).padStart(2, '0')} דק'` : `${secs} שנ'`;

  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      background: 'rgba(255,255,255,0.18)', borderRadius: 20, padding: '4px 12px',
      fontSize: 13, color, fontWeight: 800, letterSpacing: 0.5,
    }}>
      <Clock size={12} />
      {label}: {display}
    </div>
  );
}

// ── Step Progress ─────────────────────────────────────────────────────────────
function StepProgress({ currentStatus }) {
  const stepIdx = getStepIndex(currentStatus);
  const fillPct = stepIdx === 0 ? '16%' : stepIdx === 1 ? '50%' : '84%';

  return (
    <div style={{ padding: '16px 20px 10px', background: 'white' }}>
      <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
        {/* Track */}
        <div style={{ position: 'absolute', top: 18, right: 22, left: 22, height: 5, background: '#e2e8f0', borderRadius: 99, zIndex: 0 }} />
        {/* Fill */}
        <motion.div
          style={{ position: 'absolute', top: 18, right: 22, height: 5, borderRadius: 99, zIndex: 1,
            background: 'linear-gradient(90deg, #1a6fd4, #06b6d4)' }}
          animate={{ width: fillPct }}
          transition={{ duration: 0.7, ease: [0.34, 1.56, 0.64, 1] }}
        />
        {MAIN_STEPS.map((step, idx) => {
          const isDone = idx <= stepIdx;
          const isActive = idx === stepIdx;
          const StepIcon = step.Icon;
          return (
            <div key={step.key} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', zIndex: 2 }}>
              <motion.div
                animate={{ scale: isActive ? 1.15 : 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                style={{
                  width: 38, height: 38, borderRadius: '50%',
                  background: isDone ? (isActive ? '#1a6fd4' : '#bfdbfe') : 'white',
                  border: `2.5px solid ${isDone ? '#1a6fd4' : '#e2e8f0'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: isActive ? '0 0 0 6px rgba(26,111,212,0.15)' : 'none',
                }}
              >
                <StepIcon size={17} color={isDone ? '#1a6fd4' : '#94a3b8'} strokeWidth={isActive ? 2.5 : 1.8} />
              </motion.div>
              <div style={{ fontSize: 11, fontWeight: isActive ? 800 : 500, color: isDone ? '#1a6fd4' : '#94a3b8', marginTop: 6, letterSpacing: -0.2 }}>
                {step.label}
              </div>
            </div>
          );
        })}
      </div>
      <style>{`@keyframes activeRing{0%,100%{transform:scale(1);opacity:.4}50%{transform:scale(1.2);opacity:.7}}`}</style>
    </div>
  );
}

// ── Sub-status chips ────────────────────────────────────────────────────────────
function SubStatusPicker({ currentStatus, onSelect, loading }) {
  const stepIdx = getStepIndex(currentStatus);
  const subOptions = stepIdx === 0
    ? [
        { key: 'on_the_way', label: 'בדרך',       Icon: Navigation, color: '#2563eb' },
        { key: 'delayed',    label: 'מתעכב',      Icon: Clock,      color: '#d97706' },
        { key: 'parking',    label: 'חניה',        Icon: MapPin,     color: '#7c3aed' },
      ]
    : stepIdx === 1
    ? [
        { key: 'arrived',   label: 'הגעתי',       Icon: MapPin,  color: '#d97706' },
        { key: 'starting',  label: 'מתחיל',       Icon: Wrench,  color: '#059669' },
        { key: 'finishing', label: 'מסיים',       Icon: Flag,    color: '#0d9488' },
      ]
    : [];

  if (!subOptions.length) return null;

  return (
    <div style={{ padding: '4px 16px 14px' }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', marginBottom: 8, textAlign: 'center' }}>
        עדכן סטטוס מדויק
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        {subOptions.map(opt => {
          const isSelected = currentStatus === opt.key;
          const OptIcon = opt.Icon;
          return (
            <motion.button
              key={opt.key}
              disabled={loading}
              onClick={() => onSelect(opt.key)}
              whileTap={{ scale: 0.95 }}
              style={{
                flex: 1, height: 44, borderRadius: 14,
                background: isSelected ? opt.color : '#f8fafc',
                color: isSelected ? 'white' : '#475569',
                fontWeight: 700, fontSize: 12, border: isSelected ? 'none' : '1.5px solid #e2e8f0',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                boxShadow: isSelected ? `0 4px 14px ${opt.color}44` : 'none',
                transition: 'all 0.2s',
              }}
            >
              <OptIcon size={13} strokeWidth={1.8} /> {opt.label}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

// ── Status description row ─────────────────────────────────────────────────────
function StatusDescription({ localStatus, isOwner, workerName }) {
  const DESCRIPTIONS = {
    on_the_way: { worker: 'לחץ "הגיע" כשתגיע למיקום', owner: `${workerName} בדרך — תוכל לפנות אליו בצ'אט` },
    delayed:    { worker: 'עדכן מוקדם ככל האפשר',     owner: `${workerName} מתעכב — ייתכן עיכוב בלתי צפוי` },
    parking:    { worker: 'מיקום ממוקם, מחפש חניה',   owner: `${workerName} מחפש חניה — יגיע בדקות הקרובות` },
    arrived:    { worker: 'אתה בשטח! עדכן כשמתחיל',  owner: `${workerName} הגיע — ממתין להתחיל` },
    starting:   { worker: 'מתחיל עכשיו, בהצלחה!',    owner: `${workerName} מתחיל את העבודה` },
    finishing:  { worker: 'כמעט שם, לחץ "סיימתי" בסיום', owner: `${workerName} מסיים — בקרוב הושלם` },
    done:       { worker: 'ממתין לאישור המעסיק',      owner: 'לחץ "אשר ביצוע" לשחרר תשלום' },
  };
  const desc = DESCRIPTIONS[localStatus];
  if (!desc) return null;
  const text = isOwner ? desc.owner : desc.worker;

  return (
    <div style={{ margin: '0 16px 14px', background: '#f8fafc', borderRadius: 12, padding: '10px 14px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
      <div style={{ fontSize: 12.5, color: '#475569', fontWeight: 600, lineHeight: 1.5 }}>{text}</div>
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────────
export default function WorkerTrackerBar({ task, isWorker, isOwner, onUpdate }) {
  const [loading, setLoading] = useState(false);
  const [localStatus, setLocalStatus] = useState(task?.worker_status ?? null);
  const [completionPhoto, setCompletionPhoto] = useState(task?.completion_photo || null);
  const [showNoShowConfirm, setShowNoShowConfirm] = useState(false);
  const [noShowLoading, setNoShowLoading] = useState(false);
  const [minutesOnTheWay, setMinutesOnTheWay] = useState(0);
  const prevStatusRef = useRef(localStatus);

  useEffect(() => {
    setLocalStatus(task?.worker_status ?? null);
    setCompletionPhoto(task?.completion_photo || null);
  }, [task?.worker_status, task?.completion_photo]);

  useEffect(() => {
    if (!task?.on_the_way_at) return;
    const update = () => {
      const mins = Math.floor((Date.now() - new Date(task.on_the_way_at).getTime()) / 60000);
      setMinutesOnTheWay(mins);
    };
    update();
    const t = setInterval(update, 60000);
    return () => clearInterval(t);
  }, [task?.on_the_way_at]);

  const handleNoShowReport = async () => {
    setNoShowLoading(true);
    try {
      const res = await base44.functions.invoke('reportNoShow', { taskId: task.id });
      if (!res.data?.success) throw new Error('שגיאה');
      window.dispatchEvent(new CustomEvent('worker_no_show_reported', { detail: { task } }));
      const stored = JSON.parse(localStorage.getItem('joba24_notifications') || '[]');
      localStorage.setItem('joba24_notifications', JSON.stringify([
        { type: 'no_show_reported', taskTitle: task.title, taskId: task.id, timestamp: new Date().toISOString(), read: false },
        ...stored,
      ].slice(0, 50)));
      toast.success('הדיווח התקבל. המשימה חזרה לסטטוס פתוח.');
      setShowNoShowConfirm(false);
      window.dispatchEvent(new Event('task_reset_to_open'));
    } catch {
      toast.error('שגיאה בדיווח, נסה שוב');
    } finally {
      setNoShowLoading(false);
    }
  };

  if (!task.worker_id) return null;

  const stepIdx = getStepIndex(localStatus);
  const statusInfo = localStatus ? getStatusInfo(localStatus) : null;
  const StatusIcon = statusInfo?.Icon || Navigation;

  const handleStatusUpdate = async (statusKey, extra = {}) => {
    setLoading(true);
    setLocalStatus(statusKey);
    try {
      const update = { worker_status: statusKey, ...extra };
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

  // ── Header gradient & text config ─────────────────────────────────────────────
  const headerConfig = (() => {
    if (stepIdx === 2) return {
      gradient: 'linear-gradient(135deg, #065f46, #059669)',
      emoji: '✅',
      title: isOwner ? `${task.worker_name} סיים את הג'ובה!` : 'כל הכבוד! סיימת',
      sub: isOwner ? 'אשר ביצוע לשחרר תשלום' : 'ממתין לאישור המעסיק',
      badge: null,
    };
    if (stepIdx === 1) return {
      gradient: `linear-gradient(135deg, #92400e, #d97706)`,
      emoji: '📍',
      title: isOwner ? `${task.worker_name} — ${statusInfo?.ownerLabel || 'הגיע'}` : (statusInfo?.label || 'בשטח'),
      sub: isOwner ? 'העובד נמצא בשטח' : 'עדכן את ההתקדמות',
      badge: statusInfo?.label,
    };
    if (stepIdx === 0) return {
      gradient: statusInfo?.key === 'delayed'
        ? 'linear-gradient(135deg, #92400e, #f59e0b)'
        : statusInfo?.key === 'parking'
        ? 'linear-gradient(135deg, #4c1d95, #7c3aed)'
        : 'linear-gradient(135deg, #1e3a8a, #2563eb)',
      emoji: statusInfo?.key === 'delayed' ? '⏳' : statusInfo?.key === 'parking' ? '🅿️' : '🚗',
      title: isOwner ? `${task.worker_name} — ${statusInfo?.ownerLabel || 'בדרך'}` : (statusInfo?.label || 'בדרך'),
      sub: isOwner ? 'מגיע אליך בקרוב' : 'עדכן כשתגיע למיקום',
      badge: null,
    };
    return {
      gradient: 'linear-gradient(135deg, #312e81, #6366f1)',
      emoji: '🕐',
      title: isOwner ? 'ממתין לעדכון מהעובד' : 'יצאת לדרך?',
      sub: isOwner ? 'העובד אושר — ממתין שיתחיל' : 'לחץ "צא לדרך" להתחיל',
      badge: null,
    };
  })();

  const etaSince = stepIdx === 0 ? task.on_the_way_at : stepIdx === 1 ? task.arrived_at : null;
  const etaLabel = stepIdx === 0 ? 'בדרך' : 'בשטח';

  const mainCTA = (() => {
    if (!isWorker) return null;
    if (stepIdx < 0 || localStatus === null)  return { label: 'צא לדרך!', Icon: Navigation, nextKey: 'on_the_way', color: '#2563eb' };
    if (stepIdx === 0) return { label: 'הגעתי למיקום', Icon: MapPin, nextKey: 'arrived', color: '#d97706' };
    if (stepIdx === 1) return { label: 'סיימתי את הג\'ובה', Icon: CheckCircle, nextKey: 'done', color: '#059669' };
    return null;
  })();

  return (
    <motion.div
      key={localStatus}
      initial={{ opacity: 0.85, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      dir="rtl"
      style={{ background: 'white', borderRadius: 24, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 6px 28px rgba(0,0,0,0.09)' }}
    >
      {/* ── Gradient Header ── */}
      <div style={{ background: headerConfig.gradient, padding: '18px 20px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {/* Emoji icon */}
          <div style={{ width: 50, height: 50, borderRadius: 16, background: 'rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, flexShrink: 0 }}>
            {headerConfig.emoji}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: 'white', fontWeight: 900, fontSize: 16, marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {headerConfig.title}
            </div>
            <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12.5, fontWeight: 500 }}>
              {headerConfig.sub}
            </div>
          </div>
          {/* Price badge */}
          <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 14, padding: '6px 14px', color: 'white', fontWeight: 900, fontSize: 20, flexShrink: 0, backdropFilter: 'blur(4px)' }}>
            ₪{task.price}
          </div>
        </div>

        {/* ETA + badge row */}
        {(etaSince || headerConfig.badge) && (
          <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            {etaSince && <ETATimer since={etaSince} label={etaLabel} />}
            {headerConfig.badge && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(255,255,255,0.18)', borderRadius: 20, padding: '4px 12px', fontSize: 12, color: 'white', fontWeight: 700 }}>
                {headerConfig.badge}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── 3-Step Progress ── */}
      <StepProgress currentStatus={localStatus} />

      {/* ── Status Description ── */}
      <StatusDescription localStatus={localStatus} isOwner={isOwner} workerName={task.worker_name} />

      {/* ── Sub-status detail (worker only, not when done) ── */}
      {isWorker && stepIdx < 2 && (
        <SubStatusPicker currentStatus={localStatus} onSelect={handleStatusUpdate} loading={loading} />
      )}

      {/* ── Go back (worker only) ── */}
      {isWorker && stepIdx > 0 && stepIdx < 2 && (
        <div style={{ padding: '0 16px 4px' }}>
          <button
            onClick={() => handleStatusUpdate(stepIdx === 1 ? 'on_the_way' : 'arrived')}
            disabled={loading}
            style={{ width: '100%', height: 38, borderRadius: 12, background: '#f8fafc', border: '1px solid #e2e8f0', color: '#64748b', fontWeight: 600, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}
          >
            <ChevronLeft size={14} /> חזור לשלב הקודם
          </button>
        </div>
      )}

      {/* ── Worker Main CTA ── */}
      {isWorker && mainCTA && stepIdx < 2 && (
        <div style={{ padding: '0 16px 14px', marginTop: stepIdx < 0 ? 8 : 0 }}>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => handleStatusUpdate(mainCTA.nextKey)}
            disabled={loading}
            style={{
              width: '100%', height: 56, borderRadius: 18,
              background: loading ? '#94a3b8' : mainCTA.color,
              color: 'white', fontWeight: 900, fontSize: 16, border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: loading ? 'none' : `0 6px 22px ${mainCTA.color}66`,
              transition: 'background 0.2s, box-shadow 0.2s',
            }}
          >
            {loading
              ? <><Loader2 size={18} className="animate-spin" /> רגע...</>
              : <>{(() => { const I = mainCTA.Icon; return <I size={19} strokeWidth={2} />; })()} {mainCTA.label}</>
            }
          </motion.button>
        </div>
      )}

      {/* ── Worker done state ── */}
      {isWorker && stepIdx === 2 && (
        <div style={{ margin: '0 16px 14px' }}>
          <WorkerCompletionPhoto photoUrl={completionPhoto} onPhotoUploaded={setCompletionPhoto} />
          <div style={{ background: '#f0fdf4', borderRadius: 16, padding: '16px', textAlign: 'center', border: '1.5px solid #bbf7d0', marginTop: 10 }}>
            <div style={{ fontWeight: 900, color: '#065f46', fontSize: 15, display: 'flex', alignItems: 'center', gap: 7, justifyContent: 'center' }}>
              <CheckCircle size={18} color="#059669" /> כל הכבוד! ממתין לאישור
            </div>
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>המעסיק יראה את עבודתך ויאשר</div>
          </div>
        </div>
      )}

      {/* ── Owner: confirm completion ── */}
      {isOwner && stepIdx === 2 && (
        <div style={{ margin: '0 16px 14px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {completionPhoto && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6 }}>📸 תמונת הוכחה מהעובד:</div>
              <img src={completionPhoto} alt="proof" style={{ width: '100%', height: 170, objectFit: 'cover', borderRadius: 16, border: '2px solid #d1fae5' }} />
            </div>
          )}
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => onUpdate({ status: 'COMPLETED', client_confirmed: true })}
            style={{ width: '100%', height: 56, borderRadius: 18, background: 'linear-gradient(135deg, #065f46, #059669)', color: 'white', fontWeight: 900, fontSize: 16, border: 'none', cursor: 'pointer', boxShadow: '0 6px 22px rgba(5,150,105,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          >
            <CheckCircle size={19} strokeWidth={2} /> אשר ביצוע עבודה — שחרר תשלום
          </motion.button>
        </div>
      )}

      {/* ── Chat link ── */}
      {(task.status === 'TAKEN' || task.status === 'IN_PROGRESS' || task.status === 'ARRIVED' || task.status === 'ON_THE_WAY') && (
        <div style={{ padding: '0 16px 16px' }}>
          <Link to={`/chat/${task.id}`} style={{ textDecoration: 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, height: 44, borderRadius: 14, border: '1.5px solid #dce8f5', background: '#f8fafc', color: '#2563eb', fontWeight: 700, fontSize: 13, transition: 'background 0.15s' }}>
              <MessageCircle size={16} />
              שלח הודעה ל{isWorker ? 'מעסיק' : 'עובד'}
            </div>
          </Link>
        </div>
      )}

      {/* ── No-Show report button ── */}
      {isOwner && task.worker_status === 'on_the_way' && minutesOnTheWay >= 60 && (
        <div style={{ padding: '0 16px 16px' }}>
          <button
            onClick={() => setShowNoShowConfirm(true)}
            style={{ width: '100%', height: 42, borderRadius: 14, background: '#fff1f2', border: '1px solid #fecaca', color: '#dc2626', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}
          >
            <AlertOctagon size={15} strokeWidth={1.8} /> דיווח על אי-הופעה
          </button>
        </div>
      )}

      {/* ── No-Show Modal ── */}
      <AnimatePresence>
        {showNoShowConfirm && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(5,15,40,0.6)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
            onClick={() => setShowNoShowConfirm(false)}
          >
            <motion.div
              initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 350, damping: 28 }}
              dir="rtl"
              style={{ background: 'white', borderRadius: '28px 28px 0 0', width: '100%', maxWidth: 480, padding: '20px 20px 0', paddingBottom: 'max(28px, env(safe-area-inset-bottom))' }}
              onClick={e => e.stopPropagation()}
            >
              <div style={{ width: 40, height: 4, borderRadius: 99, background: '#dde4ef', margin: '0 auto 20px' }} />
              <div style={{ textAlign: 'center', marginBottom: 24 }}>
                <div style={{ fontSize: 44, marginBottom: 12 }}>⚠️</div>
                <div style={{ fontSize: 19, fontWeight: 900, color: '#0f1e40', marginBottom: 8 }}>דיווח על אי-הופעה</div>
                <div style={{ fontSize: 14, color: '#64748b', lineHeight: 1.7 }}>
                  האם אתה בטוח שהעובד <strong style={{ color: '#0f1e40' }}>{task.worker_name}</strong> לא הגיע?<br />
                  <strong style={{ color: '#dc2626' }}>פעולה זו סופית</strong> ותפגע במדד האמינות שלו.
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <button
                  onClick={() => setShowNoShowConfirm(false)}
                  style={{ width: '100%', height: 52, borderRadius: 16, background: 'linear-gradient(135deg,#1a6fd4,#0a52b0)', border: 'none', color: 'white', fontWeight: 900, fontSize: 15, cursor: 'pointer' }}
                >
                  לא, ממתין עוד
                </button>
                <button
                  onClick={handleNoShowReport}
                  disabled={noShowLoading}
                  style={{ width: '100%', height: 48, borderRadius: 16, background: 'white', border: '1px solid #fecaca', color: '#dc2626', fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                >
                  {noShowLoading ? <Loader2 size={18} className="animate-spin" /> : <><AlertOctagon size={16} /> כן, דווח</>}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}