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
      // Add transaction for worker
      if (isWorker) {
        await base44.entities.Transaction.create({
          user_id: me.id,
          task_id: task.id,
          task_title: task.title,
          amount: task.price,
          type: 'earning',
          status: 'completed',
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task', task.id] });
      toast.success('המשימה הושלמה! 🎉');
      onClose();
      navigate('/');
    },
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="mx-4 rounded-2xl" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-center">🎉 השלמת משימה</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <p className="text-center text-muted-foreground text-sm">
            {isWorker ? 'דרג את הלקוח' : 'דרג את המבצע'}
          </p>
          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map(s => (
              <button key={s} onClick={() => setRating(s)}>
                <Star
                  className={`w-8 h-8 transition-colors ${
                    s <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'
                  }`}
                />
              </button>
            ))}
          </div>
          <Textarea
            placeholder="הוסף תגובה (אופציונלי)..."
            value={comment}
            onChange={e => setComment(e.target.value)}
            className="bg-secondary border-0 rounded-xl resize-none"
            rows={3}
          />
          <Button
            onClick={() => completeMutation.mutate()}
            disabled={completeMutation.isPending}
            className="w-full h-12 rounded-2xl font-semibold"
          >
            {completeMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : 'אשר השלמה'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}