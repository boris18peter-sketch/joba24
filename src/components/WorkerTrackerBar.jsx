import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Navigation, CheckCircle2, PartyPopper, Loader2, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

const STEPS = [
  { key: 'on_the_way', label: 'יצאתי לדרך', icon: Navigation, color: '#3b82f6', bg: '#dbeafe' },
  { key: 'arrived', label: 'הגעתי למיקום', icon: CheckCircle2, color: '#10b981', bg: '#dcfce7' },
  { key: 'done', label: 'ביצעתי את העבודה', icon: PartyPopper, color: '#7c3aed', bg: '#f3e8ff' },
];

export default function WorkerTrackerBar({ task, isWorker, isOwner, onUpdate }) {
  const [loading, setLoading] = useState(false);
  const [localStatus, setLocalStatus] = useState(task?.worker_status ?? null);

  // סנכרון עם task.worker_status מ-props
  useEffect(() => {
    setLocalStatus(task?.worker_status ?? null);
  }, [task?.worker_status]);

  if (!task.worker_id) return null;

  // Get current step index - משתמש ב-localStatus
  const currentStepIndex = localStatus ? STEPS.findIndex(s => s.key === localStatus) : -1;

  const handleStepClick = async (step) => {
    setLoading(true);
    // Optimistic update - update locally first
    setLocalStatus(step.key);
    
    try {
      const update = { worker_status: step.key };
      
      // Save timestamps
      if (step.key === 'on_the_way') {
        update.on_the_way_at = new Date().toISOString();
        
        // Capture location before updating
        if (navigator.geolocation) {
          await new Promise((resolve) => {
            navigator.geolocation.getCurrentPosition(
              (pos) => {
                update.worker_lat = pos.coords.latitude;
                update.worker_lng = pos.coords.longitude;
                resolve();
              },
              () => resolve() // Silent fail
            );
          });
        }
      } else if (step.key === 'arrived') {
        update.arrived_at = new Date().toISOString();
      } else if (step.key === 'done') {
        update.completed_at = new Date().toISOString();
      }

      // Update after timestamps are set
      await onUpdate(update);
      toast.success(`✅ ${step.label}`);
    } catch (err) {
      // Revert on error
      setLocalStatus(task?.worker_status ?? null);
      toast.error('שגיאה בעדכון סטטוס');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Unified view - shows same progress for both worker and owner
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-4 space-y-4 shadow-sm">
      <h3 className="font-bold text-sm text-gray-900">התקדמות המשימה</h3>
      
      {/* Progress timeline */}
      <div className="space-y-3">
        {STEPS.map((step, idx) => {
          const isDone = idx <= currentStepIndex;
          const isActive = idx === currentStepIndex;
          const Icon = step.icon;
          const timestamp = 
            step.key === 'on_the_way' ? task.on_the_way_at :
            step.key === 'arrived' ? task.arrived_at :
            step.key === 'done' ? task.completed_at : null;
          
          return (
            <div key={step.key} className="flex gap-3 items-start">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1 transition-all"
                style={{
                  background: isDone ? step.color : isActive ? step.bg : '#f3f4f6',
                  color: isDone || isActive ? step.color : '#d1d5db',
                }}
              >
                <Icon className="w-4 h-4" />
              </div>
              
              <div className="flex-1 pt-0.5">
                <div className="font-medium text-sm text-gray-900">{step.label}</div>
                {isDone && timestamp && (
                  <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDistanceToNow(new Date(timestamp), { addSuffix: true })}
                  </div>
                )}
                {!isDone && <div className="text-xs text-gray-400 mt-0.5">ממתין...</div>}
              </div>

              {isDone && (
                <div className="text-xs font-bold text-green-600 pt-0.5">✓</div>
              )}
            </div>
          );
        })}
      </div>

      {/* Action buttons - only for worker */}
      {isWorker && (
        <div className="space-y-2 pt-2 border-t border-gray-100">
          {currentStepIndex === -1 && (
            <Button
              onClick={() => handleStepClick(STEPS[0])}
              disabled={loading}
              className="w-full rounded-xl text-white font-bold h-11"
              style={{ background: '#1a6fd4' }}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <Navigation className="w-4 h-4 ml-2" />}
              יצאתי לדרך
            </Button>
          )}
          
          {currentStepIndex === 0 && (
            <Button
              onClick={() => handleStepClick(STEPS[1])}
              disabled={loading}
              className="w-full rounded-xl text-white font-bold h-11"
              style={{ background: '#1a6fd4' }}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <CheckCircle2 className="w-4 h-4 ml-2" />}
              הגעתי למיקום
            </Button>
          )}
          
          {currentStepIndex === 1 && (
            <Button
              onClick={() => handleStepClick(STEPS[2])}
              disabled={loading}
              className="w-full rounded-xl text-white font-bold h-11"
              style={{ background: '#1a6fd4' }}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <PartyPopper className="w-4 h-4 ml-2" />}
              ביצעתי את העבודה
            </Button>
          )}

          {currentStepIndex === 2 && (
            <div className="text-center py-2 bg-blue-50 rounded-lg">
              <p className="text-sm font-bold text-blue-700">✅ ממתין לאישור הלקוח</p>
              <p className="text-xs text-gray-500 mt-1">הלקוח יאשר את הביצוע וישחרר את התשלום</p>
            </div>
          )}
        </div>
      )}
    </div>
  );

  return null;
}