import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Star, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export default function CompletionModal({ task, me, onClose }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const isWorker = me?.id === task.worker_id;
  const revieweeId = isWorker ? task.client_id : task.worker_id;

  const completeMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.Task.update(task.id, { status: 'COMPLETED' });
      await base44.entities.Review.create({
        task_id: task.id,
        reviewer_id: me.id,
        reviewee_id: revieweeId,
        rating,
        comment,
        role: isWorker ? 'worker' : 'client',
      });

      // רק כשהלקוח (פותח המשימה) מאשר — מעביר כסף לארנק העובד
      if (!isWorker) {
        // Create earning transaction for worker
        await base44.entities.Transaction.create({
          user_id: task.worker_id,
          task_id: task.id,
          task_title: task.title,
          amount: task.price,
          type: 'earning',
          status: 'completed',
        });
        // Create payment transaction for client
        await base44.entities.Transaction.create({
          user_id: task.client_id,
          task_id: task.id,
          task_title: task.title,
          amount: task.price,
          type: 'payment',
          status: 'completed',
        });
        // Call backend function to release payment to worker's wallet
        await base44.functions.invoke('releasePayment', {
          taskId: task.id,
          workerId: task.worker_id,
          amount: task.price,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task', task.id] });
      queryClient.invalidateQueries({ queryKey: ['me'] });
      toast.success(isWorker ? 'מעולה! התשלום ממתין לאישור הלקוח 💪' : '🎉 אישרת את הביצוע! התשלום שוחרר לעובד');
      onClose();
      navigate('/');
    },
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="mx-4 rounded-2xl" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-center text-xl">
            {isWorker ? '💪 סיימת עבודה מעולה!' : '💸 אשר ושחרר תשלום'}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="bg-gray-50 rounded-2xl p-3 text-center">
            <div className="text-sm text-gray-500">{isWorker ? 'משימה' : 'תשלום לשחרור'}</div>
            <div className="font-bold text-gray-900">{task.title}</div>
            <div className="text-2xl font-black text-black mt-1">₪{task.price}</div>
          </div>
          <p className="text-center text-muted-foreground text-sm font-medium">
            {isWorker ? `איך היה לעבוד עם ${task.client_name || 'הלקוח'}?` : `איך היה לעבוד עם ${task.worker_name || 'הביצועיסט'}?`}
          </p>
          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map(s => (
              <button key={s} onClick={() => setRating(s)}>
                <Star className={`w-9 h-9 transition-colors ${s <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`} />
              </button>
            ))}
          </div>
          <Textarea
            placeholder="שתף חוויה (אופציונלי)..."
            value={comment}
            onChange={e => setComment(e.target.value)}
            className="bg-secondary border-0 rounded-xl resize-none"
            rows={2}
          />
          <Button
           onClick={() => completeMutation.mutate()}
           disabled={completeMutation.isPending}
           className="w-full h-14 rounded-2xl font-bold text-base text-white"
           style={{ background: '#1a6fd4' }}
          >
           {completeMutation.isPending
             ? <Loader2 className="w-5 h-5 animate-spin" />
             : isWorker ? '✅ סיימתי! שלח לאישור לקוח' : '💸 אשר ושחרר תשלום'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}