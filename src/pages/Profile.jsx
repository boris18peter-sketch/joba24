import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Star, CheckCircle2, Briefcase, LogOut, Settings, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import TaskCard from '@/components/TaskCard';

export default function Profile() {
  const { data: me, isLoading } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me(),
  });

  const { data: myTasks = [] } = useQuery({
    queryKey: ['myTasks', me?.id],
    queryFn: () => base44.entities.Task.filter({ client_id: me.id }, '-created_date', 20),
    enabled: !!me?.id,
  });

  const { data: workerTasks = [] } = useQuery({
    queryKey: ['workerTasks', me?.id],
    queryFn: () => base44.entities.Task.filter({ worker_id: me.id }, '-created_date', 20),
    enabled: !!me?.id,
  });

  const { data: reviews = [] } = useQuery({
    queryKey: ['myReviews', me?.id],
    queryFn: () => base44.entities.Review.filter({ reviewee_id: me.id }, '-created_date', 20),
    enabled: !!me?.id,
  });

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;
  }

  const completedCount = [...myTasks, ...workerTasks].filter(t => t.status === 'COMPLETED').length;
  const rating = me?.rating || 0;
  const ratingCount = me?.rating_count || 0;

  return (
    <div className="min-h-screen" dir="rtl">
      {/* Header */}
      <div className="bg-primary text-primary-foreground px-4 pt-14 pb-8">
        <div className="flex items-start justify-between mb-4">
          <h1 className="text-lg font-bold opacity-80">הפרופיל שלי</h1>
          <Button
            variant="ghost"
            size="icon"
            className="text-primary-foreground hover:bg-white/10 rounded-xl"
            onClick={() => base44.auth.logout()}
          >
            <LogOut className="w-5 h-5" />
          </Button>
        </div>

        {/* Avatar */}
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-3xl font-bold">
            {me?.full_name?.[0]?.toUpperCase() || '?'}
          </div>
          <div>
            <h2 className="text-xl font-bold">{me?.full_name || 'משתמש'}</h2>
            <p className="text-sm opacity-75">{me?.email}</p>
            {me?.bio && <p className="text-sm mt-1 opacity-80">{me.bio}</p>}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mt-6">
          <div className="bg-white/15 rounded-xl p-3 text-center">
            <div className="text-2xl font-bold">{completedCount}</div>
            <div className="text-xs opacity-75 mt-0.5">משימות</div>
          </div>
          <div className="bg-white/15 rounded-xl p-3 text-center">
            <div className="flex items-center justify-center gap-1">
              <span className="text-2xl font-bold">{rating > 0 ? rating.toFixed(1) : '—'}</span>
              <Star className="w-4 h-4 fill-yellow-300 text-yellow-300" />
            </div>
            <div className="text-xs opacity-75 mt-0.5">דירוג ({ratingCount})</div>
          </div>
          <div className="bg-white/15 rounded-xl p-3 text-center">
            <div className="text-2xl font-bold">₪{me?.wallet_balance || 0}</div>
            <div className="text-xs opacity-75 mt-0.5">ארנק</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 py-4">
        <Tabs defaultValue="published">
          <TabsList className="w-full bg-secondary rounded-xl">
            <TabsTrigger value="published" className="flex-1 rounded-xl text-xs">פרסמתי</TabsTrigger>
            <TabsTrigger value="worked" className="flex-1 rounded-xl text-xs">ביצעתי</TabsTrigger>
            <TabsTrigger value="reviews" className="flex-1 rounded-xl text-xs">ביקורות</TabsTrigger>
          </TabsList>

          <TabsContent value="published" className="mt-4 space-y-3">
            {myTasks.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground text-sm">עדיין לא פרסמת משימות</div>
            ) : (
              myTasks.map(t => <TaskCard key={t.id} task={t} />)
            )}
          </TabsContent>

          <TabsContent value="worked" className="mt-4 space-y-3">
            {workerTasks.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground text-sm">עדיין לא ביצעת משימות</div>
            ) : (
              workerTasks.map(t => <TaskCard key={t.id} task={t} />)
            )}
          </TabsContent>

          <TabsContent value="reviews" className="mt-4 space-y-3">
            {reviews.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground text-sm">עדיין אין ביקורות</div>
            ) : (
              reviews.map(review => (
                <div key={review.id} className="bg-card border border-border rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    {[1,2,3,4,5].map(s => (
                      <Star key={s} className={`w-4 h-4 ${s <= review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`} />
                    ))}
                    <span className="text-xs text-muted-foreground mr-auto">{review.role === 'worker' ? 'מלקוח' : 'ממבצע'}</span>
                  </div>
                  {review.comment && <p className="text-sm text-foreground">{review.comment}</p>}
                </div>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}