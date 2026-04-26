import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Star, CheckCircle2, LogOut, Settings, Award, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import TaskCard from '@/components/TaskCard';
import { Link } from 'react-router-dom';
import { getCategoryLabel } from '@/lib/categories';

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

  const completedCount = workerTasks.filter(t => t.status === 'COMPLETED').length;
  const rating = me?.rating || 0;
  const ratingCount = me?.rating_count || 0;
  const workerScore = me?.worker_score || 0;

  return (
    <div className="min-h-screen" dir="rtl">
      {/* Header */}
      <div className="bg-black text-white px-4 pt-14 pb-8">
        <div className="flex items-start justify-between mb-4">
          <h1 className="text-lg font-bold opacity-80">הפרופיל שלי</h1>
          <div className="flex gap-2">
            <Link to="/worker-profile">
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 rounded-xl">
                <Settings className="w-5 h-5" />
              </Button>
            </Link>
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 rounded-xl" onClick={() => base44.auth.logout()}>
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-2xl bg-white/15 flex items-center justify-center text-3xl font-black">
            {me?.full_name?.[0]?.toUpperCase() || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold">{me?.full_name || 'משתמש'}</h2>
            <p className="text-sm opacity-75">{me?.email}</p>
            {me?.profession && <p className="text-sm mt-0.5 opacity-90 font-semibold">🏷️ {me.profession}</p>}
            {me?.bio && <p className="text-xs mt-1 opacity-70 line-clamp-2">{me.bio}</p>}
          </div>
        </div>

        {/* Worker status badge */}
        {me?.profession && (
          <div className="flex items-center gap-2 mt-2">
            <span className="flex items-center gap-1.5 text-xs bg-green-500/20 text-green-300 border border-green-500/30 px-2.5 py-1 rounded-full font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              עובד פעיל
            </span>
            <span className="text-xs opacity-60">{me.profession}</span>
          </div>
        )}

        {/* Certificates */}
        {me?.certificates?.length > 0 && (
          <div className="flex gap-2 flex-wrap mt-3">
            {me.certificates.map(cert => (
              <span key={cert} className="text-xs bg-white/20 text-white px-2.5 py-1 rounded-full font-medium">✅ {cert}</span>
            ))}
          </div>
        )}

        {/* Worker Score */}
        {workerScore > 0 && (
          <div className="mt-3 bg-white/10 rounded-xl px-3 py-2 flex items-center gap-2">
            <Award className="w-4 h-4 text-yellow-300" />
            <span className="text-sm font-bold text-yellow-300">{workerScore.toFixed(0)} נק' עובד</span>
            <span className="text-xs opacity-60 mr-auto">{completedCount} משימות הושלמו</span>
          </div>
        )}

        {/* Preferred categories */}
        {me?.preferred_categories?.length > 0 && (
          <div className="flex gap-1.5 flex-wrap mt-2">
            {me.preferred_categories.map(c => (
              <span key={c} className="text-[11px] bg-white/15 text-white/80 px-2 py-0.5 rounded-full">{getCategoryLabel(c)}</span>
            ))}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mt-4">
          <div className="bg-white/15 rounded-xl p-3 text-center">
            <div className="text-2xl font-bold">{completedCount}</div>
            <div className="text-xs opacity-75 mt-0.5">ביצעתי</div>
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

      {/* Worker Profile CTA */}
      {!me?.profession && (
        <div className="px-4 pt-4">
          <Link to="/worker-profile">
            <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <div className="font-bold text-purple-900 text-sm">השלם פרופיל עובד</div>
                <div className="text-xs text-purple-600 mt-0.5">הוסף מקצוע, תעודות וערים מועדפות</div>
              </div>
              <ChevronLeft className="w-5 h-5 text-purple-400" />
            </div>
          </Link>
        </div>
      )}

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