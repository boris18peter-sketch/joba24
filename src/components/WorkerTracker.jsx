import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { MapPin, Navigation, CheckCircle2, Search, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

// Steps for the client (viewing their own task)
const CLIENT_STEPS = [
  {
    key: 'searching',
    icon: Search,
    label: 'מחפש עובד...',
    desc: 'המשימה שלך פורסמה ועובד מתאים מחפש',
    color: '#f59e0b',
    bg: '#fef3c7',
  },
  {
    key: 'found',
    icon: Navigation,
    label: 'נמצא עובד! יצא לדרך',
    desc: null, // filled dynamically with worker name
    color: '#3b82f6',
    bg: '#dbeafe',
  },
  {
    key: 'on_the_way',
    icon: Navigation,
    label: 'עובד בדרך אליך',
    desc: 'עוקב אחר מיקום העובד בזמן אמת',
    color: '#3b82f6',
    bg: '#dbeafe',
  },
  {
    key: 'arrived',
    icon: CheckCircle2,
    label: 'העובד הגיע! 🎉',
    desc: 'העובד הגיע למיקום שלך',
    color: '#16a34a',
    bg: '#dcfce7',
  },
];

function getClientStep(task) {
  if (task.status === 'OPEN') return 0;
  if (task.status === 'TAKEN' && !task.worker_status) return 1;
  if (task.worker_status === 'on_the_way') return 2;
  if (task.worker_status === 'arrived') return 3;
  return 0;
}

// Worker action panel
function WorkerActions({ task, onUpdate }) {
  const [loading, setLoading] = useState(false);

  const updateStatus = async (workerStatus) => {
    setLoading(true);
    try {
      if (workerStatus === 'on_the_way' && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(async (pos) => {
          await onUpdate({ worker_status: workerStatus, worker_lat: pos.coords.latitude, worker_lng: pos.coords.longitude });
          setLoading(false);
          toast.success('סטטוס עודכן!');
        }, async () => {
          await onUpdate({ worker_status: workerStatus });
          setLoading(false);
          toast.success('סטטוס עודכן!');
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
        {!task.worker_status && (
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
          <div className="flex items-center gap-2 text-green-700 font-semibold text-sm justify-center py-2">
            <CheckCircle2 className="w-5 h-5" />
            סימנת שהגעת
          </div>
        )}
      </div>
    </div>
  );
}

// Client status tracker (GetTaxi style)
function ClientTracker({ task }) {
  const stepIndex = getClientStep(task);

  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
      {/* Active status banner */}
      <div
        style={{ background: CLIENT_STEPS[stepIndex].bg }}
        className="px-4 py-4 flex items-center gap-3"
      >
        <div
          style={{ background: CLIENT_STEPS[stepIndex].color }}
          className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
        >
          {stepIndex === 0 ? (
            <Loader2 className="w-5 h-5 text-white animate-spin" />
          ) : (
            (() => {
              const Icon = CLIENT_STEPS[stepIndex].icon;
              return <Icon className="w-5 h-5 text-white" />;
            })()
          )}
        </div>
        <div>
          <div className="font-bold text-gray-900" style={{ fontSize: 15 }}>
            {CLIENT_STEPS[stepIndex].label}
          </div>
          <div className="text-xs text-gray-500 mt-0.5">
            {stepIndex === 1
              ? `${task.worker_name} לקח את המשימה`
              : CLIENT_STEPS[stepIndex].desc}
          </div>
        </div>
      </div>

      {/* Progress steps */}
      <div className="px-4 py-3">
        <div className="flex items-center gap-0">
          {CLIENT_STEPS.map((step, i) => {
            const done = i <= stepIndex;
            const Icon = step.icon;
            return (
              <div key={step.key} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center gap-1">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center transition-all"
                    style={{ background: done ? step.color : '#e5e7eb' }}
                  >
                    {i === 0 && done && stepIndex === 0 ? (
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
                {i < CLIENT_STEPS.length - 1 && (
                  <div className="flex-1 h-1 mx-1 rounded-full mb-4"
                    style={{ background: i < stepIndex ? '#3b82f6' : '#e5e7eb' }} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Live location indicator */}
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
  );
}

export default function WorkerTracker({ task, isOwner, isWorker, onUpdate }) {
  if (task.status === 'COMPLETED' || task.status === 'CANCELLED') return null;

  return (
    <div className="space-y-3">
      {isOwner && <ClientTracker task={task} />}
      {isWorker && (task.status === 'TAKEN' || task.status === 'OPEN') && (
        <WorkerActions task={task} onUpdate={onUpdate} />
      )}
      {isWorker && task.status === 'TAKEN' && task.worker_status === 'arrived' && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-4 text-center">
          <CheckCircle2 className="w-8 h-8 text-green-600 mx-auto mb-2" />
          <div className="font-bold text-green-800">הגעת למיקום!</div>
          <div className="text-xs text-green-600 mt-1">סמן ביצוע לאחר סיום העבודה</div>
        </div>
      )}
    </div>
  );
}