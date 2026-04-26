import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Navigation, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

// Shown to workers who took a task but didn't update status within 3 minutes
export default function WorkerStatusAlert({ task, me }) {
  const [show, setShow] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(180); // 3 minutes
  const queryClient = useQueryClient();

  const isMyTask = task?.worker_id === me?.id && task?.status === 'TAKEN' && !task?.worker_status;

  useEffect(() => {
    if (!isMyTask) return;

    const takenAt = new Date(task.updated_date || task.created_date).getTime();
    const elapsed = (Date.now() - takenAt) / 1000;
    const remaining = 180 - elapsed;

    if (remaining <= 0) {
      // Already past 3 min — release task
      releaseTask();
      return;
    }

    // Show popup after 3 min
    const showTimer = setTimeout(() => setShow(true), remaining * 1000);

    return () => clearTimeout(showTimer);
  }, [isMyTask]);

  useEffect(() => {
    if (!show) return;
    if (secondsLeft <= 0) {
      releaseTask();
      return;
    }
    const t = setTimeout(() => setSecondsLeft(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [show, secondsLeft]);

  const releaseTask = async () => {
    await base44.entities.Task.update(task.id, {
      status: 'OPEN',
      worker_id: null,
      worker_name: null,
    });
    queryClient.invalidateQueries({ queryKey: ['task', task.id] });
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
    toast.error('המשימה שוחררה לציבור כי לא עדכנת סטטוס');
    setShow(false);
  };

  const markOnTheWay = async () => {
    await base44.entities.Task.update(task.id, { worker_status: 'on_the_way' });
    queryClient.invalidateQueries({ queryKey: ['task', task.id] });
    setShow(false);
    toast.success('עודכן — יצאת לדרך!');
  };

  if (!show) return null;

  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const urgent = secondsLeft <= 60;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4" dir="rtl">
      <div className="absolute inset-0 bg-black/50" />
      <div className="relative bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-scale-in">
        <div className="text-center mb-4">
          <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-3">
            <AlertTriangle className="w-8 h-8 text-amber-500" />
          </div>
          <h2 className="text-xl font-black text-gray-900">⚠️ המשימה מחכה לך!</h2>
          <p className="text-sm text-gray-500 mt-1">נא לעדכן סטטוס או לבטל</p>
        </div>

        {/* Countdown */}
        <div className={`text-center p-4 rounded-2xl mb-4 ${urgent ? 'bg-red-50 border-2 border-red-300' : 'bg-amber-50 border border-amber-200'}`}>
          <div className={`text-4xl font-black tabular-nums ${urgent ? 'text-red-600' : 'text-amber-700'}`}>
            {String(mins).padStart(2,'0')}:{String(secs).padStart(2,'0')}
          </div>
          <div className={`text-xs font-semibold mt-1 ${urgent ? 'text-red-500' : 'text-amber-600'}`}>
            {urgent ? '⚠️ המשימה תשוחרר לציבור!' : 'זמן לעדכון סטטוס'}
          </div>
        </div>

        <div className="space-y-2">
          <Button
            onClick={markOnTheWay}
            className="w-full h-12 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold"
          >
            <Navigation className="w-4 h-4 ml-2" />
            יצאתי לדרך
          </Button>
          <Button
            variant="outline"
            onClick={releaseTask}
            className="w-full h-11 rounded-2xl border-red-200 text-red-600 hover:bg-red-50"
          >
            <X className="w-4 h-4 ml-2" />
            בטל את לקיחת המשימה
          </Button>
        </div>
      </div>
    </div>
  );
}