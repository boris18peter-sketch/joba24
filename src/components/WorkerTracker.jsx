import { useState } from 'react';
import { MapPin, Navigation, CheckCircle2, Search, Loader2, PartyPopper } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

// Steps for the client (viewing their own task)
const CLIENT_STEPS = [
  { key: 'searching', icon: Search, label: '🔍 מחפשים עובד מושלם...', desc: 'המשימה שלך חיה! עובדים מקצועיים כבר בדרך', color: '#f59e0b', bg: '#fef3c7' },
  { key: 'found', icon: Navigation, label: '🙌 נמצא עובד!', desc: null, color: '#3b82f6', bg: '#dbeafe' },
  { key: 'on_the_way', icon: Navigation, label: '🚗 העובד בדרך אליך!', desc: 'מיקום מתעדכן בזמן אמת', color: '#3b82f6', bg: '#dbeafe' },
  { key: 'arrived', icon: CheckCircle2, label: '📍 העובד הגיע!', desc: 'העובד נמצא אצלך', color: '#16a34a', bg: '#dcfce7' },
  { key: 'done', icon: CheckCircle2, label: '✅ העובד סיים את העבודה!', desc: 'אשר את הביצוע כדי לשחרר את התשלום', color: '#7c3aed', bg: '#f3e8ff' },
];

function getClientStep(task) {
  // Only use worker_status as source of truth
  if (!task.worker_status) return 1; // worker found but no status yet
  if (task.worker_status === 'on_the_way') return 2;
  if (task.worker_status === 'arrived') return 3;
  if (task.worker_status === 'done') return 4;
  return 1;
}

// Worker action panel
function WorkerActions({ task, onUpdate }) {
  const [loading, setLoading] = useState(false);

  const updateStatus = async (workerStatus) => {
    setLoading(true);
    try {
      if (workerStatus === 'done') {
        await onUpdate({ worker_status: 'done' });
        setLoading(false);
        toast.success('מעולה! 🎉 ממתין לאישור הלקוח לשחרור התשלום');
        return;
      }
      if (workerStatus === 'on_the_way' && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(async (pos) => {
          await onUpdate({ worker_status: workerStatus, worker_lat: pos.coords.latitude, worker_lng: pos.coords.longitude });
          setLoading(false);
          toast.success('יצאת לדרך! הלקוח קיבל עדכון 🚗');
        }, async () => {
          await onUpdate({ worker_status: workerStatus });
          setLoading(false);
          toast.success('יצאת לדרך! הלקוח קיבל עדכון 🚗');
        });
      } else {
        await onUpdate({ worker_status: workerStatus });
        setLoading(false);
        toast.success('סטטוס עודכן!');
      }
    } catch {
      setLoading(false);
    }
  };

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 space-y-3">
      <h3 className="font-bold text-blue-900 text-sm">עדכון סטטוס שלך</h3>
      <div className="space-y-2">
         {!task.worker_status && task.worker_status !== 'done' && (
           <Button
             onClick={() => updateStatus('on_the_way')}
             disabled={loading}
             className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold"
           >
             {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Navigation className="w-4 h-4 ml-2" />יצאתי לדרך</>}
           </Button>
         )}
        {task.worker_status === 'on_the_way' && (
          <Button
            onClick={() => updateStatus('arrived')}
            disabled={loading}
            className="w-full rounded-xl bg-green-600 hover:bg-green-700 text-white font-semibold"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle2 className="w-4 h-4 ml-2" />הגעתי למיקום</>}
          </Button>
        )}
        {task.worker_status === 'arrived' && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-green-700 font-semibold text-sm justify-center py-1">
              <CheckCircle2 className="w-5 h-5" />
              הגעת למיקום ✅
            </div>
            <Button
              onClick={() => updateStatus('done')}
              disabled={loading}
              className="w-full rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-base h-12"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><PartyPopper className="w-4 h-4 ml-2" />סיימתי את העבודה!</>}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// Client status tracker (GetTaxi style)
function ClientTracker({ task, onConfirmDone }) {
  const stepIndex = getClientStep(task);
  const DISPLAY_STEPS = CLIENT_STEPS.slice(0, 4); // show 4 steps in progress bar

  return (
    <div className="space-y-3">
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        {/* Active status banner */}
        <div style={{ background: CLIENT_STEPS[stepIndex].bg }} className="px-4 py-4 flex items-center gap-3">
          <div style={{ background: CLIENT_STEPS[stepIndex].color }} className="w-10 h-10 rounded-full flex items-center justify-center shrink-0">
            {stepIndex === 0 ? (
              <Loader2 className="w-5 h-5 text-white animate-spin" />
            ) : (
              (() => { const Icon = CLIENT_STEPS[stepIndex].icon; return <Icon className="w-5 h-5 text-white" />; })()
            )}
          </div>
          <div>
            <div className="font-bold text-gray-900" style={{ fontSize: 15 }}>{CLIENT_STEPS[stepIndex].label}</div>
            <div className="text-xs text-gray-500 mt-0.5">
              {stepIndex === 1 ? `${task.worker_name} לקח את המשימה` : CLIENT_STEPS[stepIndex].desc}
            </div>
          </div>
        </div>

        {/* Progress steps (4 steps) */}
        <div className="px-4 py-3">
          <div className="flex items-center gap-0">
            {DISPLAY_STEPS.map((step, i) => {
              const done = i <= Math.min(stepIndex, 3);
              const Icon = step.icon;
              return (
                <div key={step.key} className="flex items-center flex-1 last:flex-none">
                  <div className="flex flex-col items-center gap-1">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center transition-all"
                      style={{ background: done ? step.color : '#e5e7eb' }}>
                      {i === 0 && stepIndex === 0 ? (
                        <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
                      ) : (
                        <Icon className="w-3.5 h-3.5" style={{ color: done ? 'white' : '#9ca3af' }} />
                      )}
                    </div>
                    <span className="text-[10px] text-center leading-tight"
                      style={{ color: done ? step.color : '#9ca3af', fontWeight: done ? 600 : 400, maxWidth: 52 }}>
                      {i === 0 ? 'מחפש' : i === 1 ? 'נמצא' : i === 2 ? 'בדרך' : 'הגיע'}
                    </span>
                  </div>
                  {i < DISPLAY_STEPS.length - 1 && (
                    <div className="flex-1 h-1 mx-1 rounded-full mb-4"
                      style={{ background: i < stepIndex ? '#3b82f6' : '#e5e7eb' }} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Live location */}
        {task.worker_status === 'on_the_way' && task.worker_lat && task.worker_lng && (
          <div className="px-4 pb-3">
            <div className="flex items-center gap-2 bg-blue-50 rounded-xl p-2.5 text-blue-700 text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse shrink-0" />
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              <span>מיקום העובד מתעדכן בזמן אמת</span>
            </div>
          </div>
        )}
      </div>

      {/* Big confirm button when worker marked done */}
      {task.worker_status === 'done' && (
        <button
          onClick={onConfirmDone}
          className="w-full rounded-2xl p-5 text-white font-black text-lg text-center shadow-lg active:scale-[0.98] transition-all"
          style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)' }}
        >
          <div className="text-3xl mb-1">💸</div>
          <div>אשר ביצוע ושחרר תשלום</div>
          <div className="text-sm font-normal opacity-80 mt-1">₪{task.price} יועברו ל{task.worker_name}</div>
        </button>
      )}
    </div>
  );
}

export default function WorkerTracker({ task, isOwner, isWorker, onUpdate, onConfirmDone }) {
  if (task.status === 'COMPLETED' || task.status === 'CANCELLED') return null;

  // Show tracker when worker_id is set (ONLY source of truth)
  const ownerCanSeeTracker = isOwner && task.worker_id;
  const showWorkerActions = isWorker && task.worker_id && task.worker_status !== 'done';

  return (
    <div className="space-y-3">
      {ownerCanSeeTracker && <ClientTracker task={task} onConfirmDone={onConfirmDone} />}
      {showWorkerActions && (
        <WorkerActions task={task} onUpdate={onUpdate} />
      )}
      {isWorker && task.worker_status === 'done' && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center">
          <div className="text-3xl mb-2">⏳</div>
          <div className="font-bold text-emerald-800">ממתין לאישור הלקוח</div>
          <div className="text-xs text-emerald-600 mt-1">ברגע שהלקוח יאשר, ₪{task.price} יועברו אליך</div>
        </div>
      )}
    </div>
  );
}