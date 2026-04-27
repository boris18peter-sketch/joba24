import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Navigation, CheckCircle2, PartyPopper, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function WorkerStatusUpdater({ task, isWorker, onUpdate }) {
  const [loading, setLoading] = useState(false);

  if (!isWorker || !task.worker_id) return null;

  const updateStatus = async (status) => {
    setLoading(true);
    try {
      const update = { worker_status: status };
      
      // Capture location when going on the way
      if (status === 'on_the_way' && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            update.worker_lat = pos.coords.latitude;
            update.worker_lng = pos.coords.longitude;
            onUpdate(update);
            toast.success('יצאת לדרך! 🚗');
          },
          () => {
            onUpdate(update);
            toast.success('יצאת לדרך! 🚗');
          }
        );
      } else {
        await onUpdate(update);
        if (status === 'arrived') toast.success('הגעת למיקום! 📍');
        if (status === 'done') toast.success('עבודה סיימה! ✅');
      }
    } catch (err) {
      toast.error('שגיאה בעדכון סטטוס');
    }
    setLoading(false);
  };

  // Show different buttons based on current status
  if (!task.worker_status) {
    return (
      <Button
        onClick={() => updateStatus('on_the_way')}
        disabled={loading}
        className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold h-12"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <Navigation className="w-4 h-4 ml-2" />}
        יצאתי לדרך
      </Button>
    );
  }

  if (task.worker_status === 'on_the_way') {
    return (
      <Button
        onClick={() => updateStatus('arrived')}
        disabled={loading}
        className="w-full rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold h-12"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <CheckCircle2 className="w-4 h-4 ml-2" />}
        הגעתי למיקום
      </Button>
    );
  }

  if (task.worker_status === 'arrived') {
    return (
      <Button
        onClick={() => updateStatus('done')}
        disabled={loading}
        className="w-full rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold h-12"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <PartyPopper className="w-4 h-4 ml-2" />}
        סיימתי את העבודה
      </Button>
    );
  }

  return null;
}