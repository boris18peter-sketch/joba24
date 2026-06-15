import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Star, RotateCcw, DoorOpen, Loader2, FileText } from 'lucide-react';
import { toast } from 'sonner';
import RatingModal from '@/components/RatingModal';
import InvoiceModal from '@/components/InvoiceModal';
import CompletionModal from '@/components/CompletionModal';
import ApplySheet from '@/components/ApplySheet';
import BuyCreditsModal from '@/components/BuyCreditsModal';

export default function TaskDetailActions({
  task, me, id, isOwner, isWorker,
  canApplyManual, myApp, myReview, applyLoading,
  onApply, onSetShowApplyForm, showApplyForm,
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showRating, setShowRating] = useState(false);
  const [hasRated, setHasRated] = useState(false);
  const [showCompletion, setShowCompletion] = useState(false);
  const [showInvoice, setShowInvoice] = useState(false);
  const [showBuyCredits, setShowBuyCredits] = useState(false);
  const [creditsNeeded, setCreditsNeeded] = useState(null);

  const cancelTakeMutation = useMutation({
    mutationFn: async () => {
      const res = await base44.functions.invoke('cancelTaskPayment', { taskId: id });
      if (!res.data?.success) throw new Error(res.data?.error || 'שגיאה');
      if (task?.client_id && me) {
        await base44.entities.ChatMessage.create({
          task_id: id,
          sender_id: me.id,
          sender_name: me.full_name,
          content: `👋 ${me.full_name} יצא מהמשימה. המשימה חזרה להיות פתוחה — תוכל לאשר בקשות קיימות או לקבל חדשות.`
        });
      }
    },
    onSuccess: () => {
      queryClient.setQueryData(['myApp', id, me?.id], null);
      queryClient.invalidateQueries({ queryKey: ['myApp', id, me?.id] });
      queryClient.invalidateQueries({ queryKey: ['task', id] });
      queryClient.invalidateQueries({ queryKey: ['me'] });
      toast.success('יצאת מהמשימה והקרדיטים הוחזרו 🪙');
      navigate('/');
    },
    onError: () => toast.error('שגיאה ביציאה מהמשימה'),
  });

  const reopenMutation = useMutation({
    mutationFn: () => base44.entities.Task.update(id, {
      status: 'OPEN', expires_at: null, worker_id: null, worker_name: null,
      worker_status: null, last_boost_at: null, boost_count: 0,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task', id] });
      toast.success('המשימה נפתחה מחדש!');
    },
  });

  const isCompleted = task?.status === 'COMPLETED';
  const isParticipant = me?.id === task?.client_id || me?.id === task?.worker_id;

  return (
    <>
      <div style={{ paddingBottom: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>

        {/* Apply sheet portal */}
        {canApplyManual && showApplyForm && createPortal(
          <ApplySheet
            task={task}
            loading={applyLoading}
            onClose={() => onSetShowApplyForm(false)}
            onApply={(msg) => onApply(msg)}
          />,
          document.body
        )}

        {/* Invoice button — worker after completion, no location map */}
        {isCompleted && me?.id === task?.worker_id && !(task?.lat && task?.lng) && (
          <button
            onClick={() => setShowInvoice(true)}
            style={{ width: '100%', height: 48, borderRadius: 14, background: task?.requires_invoice ? 'linear-gradient(135deg,#7c3aed,#6d28d9)' : '#faf5ff', border: task?.requires_invoice ? 'none' : '1.5px solid #e9d5ff', color: task?.requires_invoice ? 'white' : '#7c3aed', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 14, boxShadow: task?.requires_invoice ? '0 4px 14px rgba(124,58,237,0.3)' : 'none' }}>
            <FileText size={16} />
            {task?.requires_invoice ? '📄 הפק חשבונית מס (נדרש על ידי הלקוח)' : 'הפק חשבונית מס'}
          </button>
        )}

        {/* Rating CTA */}
        {isCompleted && isParticipant && myReview === null && !hasRated && (
          <button
            onClick={() => setShowRating(true)}
            style={{ width: '100%', height: 52, borderRadius: 14, background: 'linear-gradient(135deg,#fbbf24,#f59e0b)', border: 'none', color: 'white', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 14, boxShadow: '0 4px 14px rgba(251,191,36,0.35)' }}>
            <Star size={16} style={{ fill: 'white' }} /> דרג את {me?.id === task?.client_id ? task?.worker_name : task?.client_name}
          </button>
        )}
        {isCompleted && isParticipant && myReview && (
          <div style={{ background: '#fefce8', border: '1px solid #fde68a', borderRadius: 14, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#92400e', fontWeight: 700 }}>
            <Star size={15} style={{ fill: '#fbbf24', color: '#fbbf24' }} />
            {[1,2,3,4,5].slice(0, myReview.rating).map(() => '★').join('')} הדירוג שלך נשמר — לא ניתן לדרג שוב
          </div>
        )}

        {/* Repost */}
        {isOwner && ['COMPLETED', 'CANCELLED', 'EXPIRED'].includes(task?.status) && (
          <button
            onClick={() => {
              if (task?.status === 'EXPIRED' && task?.payment_status === 'funded') {
                navigate(`/create-task?editId=${id}&repost=1`);
                return;
              }
              const params = new URLSearchParams({ repost: '1', title: task?.title || '', description: task?.description || '', price: String(task?.price || ''), city: task?.city || '', location_name: task?.location_name || '', category: task?.category || '', estimated_time: task?.estimated_time || '', approval_mode: task?.approval_mode || 'manual' });
              navigate(`/create-task?${params.toString()}`);
            }}
            style={{ width: '100%', height: 48, borderRadius: 14, background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1a6fd4', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 14 }}>
            <RotateCcw size={16} /> פרסם שוב
          </button>
        )}

        {/* Exit task */}
        {isWorker && task?.status === 'TAKEN' && task?.worker_status !== 'done' && (
          <button
            onClick={() => cancelTakeMutation.mutate()}
            disabled={cancelTakeMutation.isPending}
            style={{ width: '100%', height: 48, borderRadius: 14, background: 'white', border: '1px solid #fecaca', color: '#dc2626', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>
            {cancelTakeMutation.isPending ? <Loader2 size={18} className="animate-spin" /> : <><DoorOpen size={16} strokeWidth={1.8} /> צא מהמשימה</>}
          </button>
        )}
      </div>

      {showRating && task && me && createPortal(
        <RatingModal task={task} me={me} onClose={() => { setShowRating(false); setHasRated(true); }} />,
        document.body
      )}
      {showCompletion && task && me && createPortal(
        <CompletionModal task={task} me={me} onClose={() => { setShowCompletion(false); setShowRating(true); }} />,
        document.body
      )}
      {showInvoice && task && me && createPortal(
        <InvoiceModal task={task} me={me} onClose={() => setShowInvoice(false)} />,
        document.body
      )}
      {showBuyCredits && (
        <BuyCreditsModal creditsNeeded={creditsNeeded} onClose={() => setShowBuyCredits(false)} />
      )}
    </>
  );
}