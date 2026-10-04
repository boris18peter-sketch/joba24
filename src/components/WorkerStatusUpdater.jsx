import { useState } from 'react';
import { getCurrentPosition } from '@/lib/nativeGeolocation';
import { Button } from '@/components/ui/button';
import { Navigation, MapPin, CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import useTaskStatusFlow from '@/hooks/useTaskStatusFlow';
import { nextCta } from '@/lib/taskStatusFlow';

const CTA_ICONS = { navigation: Navigation, map_pin: MapPin, check: CheckCircle2 };

/**
 * WorkerStatusUpdater — the worker's single "advance the job" button.
 *
 * The button label, confirm copy and success toast all come from the task's
 * CATEGORY-AWARE status flow (GlobalCategory.status_flow), so a plumber and a DJ
 * each read their own language while advancing the SAME canonical backend state
 * (on_the_way → arrived → done).
 */
export default function WorkerStatusUpdater({ task, isWorker, onUpdate }) {
  const flow = useTaskStatusFlow(task?.category);
  const [loading, setLoading] = useState(false);

  if (!isWorker || !task.worker_id) return null;

  const cta = nextCta(flow, task.worker_status);
  if (!cta) return null;

  const Icon = CTA_ICONS[flow.steps.find((s) => s.key === cta.key)?.icon] || Navigation;

  const updateStatus = async (status) => {
    setLoading(true);
    try {
      const update = { worker_status: status };

      // Capture location when going on the way
      if (status === 'on_the_way' && navigator.geolocation) {
        getCurrentPosition(
          (pos) => {
            update.worker_lat = pos.coords.latitude;
            update.worker_lng = pos.coords.longitude;
            onUpdate(update);
            toast.success(cta.toast);
          },
          () => {
            onUpdate(update);
            toast.success(cta.toast);
          }
        );
      } else {
        await onUpdate(update);
        toast.success(cta.toast);
      }
    } catch (err) {
      toast.error('שגיאה בעדכון הסטטוס');
    }
    setLoading(false);
  };

  const isLast = cta.key === 'done';

  return (
    <Button
      onClick={() => updateStatus(cta.key)}
      disabled={loading}
      className={`w-full rounded-xl text-white font-bold h-12 ${isLast ? 'bg-emerald-500 hover:bg-emerald-600' : cta.key === 'on_the_way' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700'}`}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <Icon className="w-4 h-4 ml-2" />}
      {cta.emoji} {cta.label}
    </Button>
  );
}