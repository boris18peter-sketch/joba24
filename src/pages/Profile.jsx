import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Star, LogOut, Settings, Award, Briefcase, CheckCircle, CreditCard, ChevronLeft, User } from 'lucide-react';
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
    return <div className="flex items-center justify-center h-screen"><div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" /></div>;
  }

  const completedCount = workerTasks.filter(t => t.status === 'COMPLETED').length;
  const rating = me?.rating || 0;
  const ratingCount = me?.rating_count || 0;
  const workerScore = me?.worker_score || 0;
  const balance = me?.wallet_balance || 0;
  const avgRating = rating > 0 ? rating.toFixed(1) : '—';

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl" style={{ textAlign: 'right' }}>

      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #0f2b6b, #1a6fd4)', padding: '56px 20px 28px' }}>
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: 600, textAlign: 'right' }}>הפרופיל שלי</h1>
        </div>

        {/* Avatar + Name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20, flexDirection: 'row' }}>
          <div style={{ width: 72, height: 72, borderRadius: 20, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 900, color: 'white', border: '2px solid rgba(255,255,255,0.3)' }}>
            {me?.full_name?.[0]?.toUpperCase() || <User size={28} />}
          </div>
          <div>
            <div style={{ color: 'white', fontSize: 20, fontWeight: 800 }}>{me?.full_name || 'משתמש'}</div>
            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, marginTop: 2 }}>{me?.email}</div>
            {me?.profession && (
              <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12, marginTop: 4, background: 'rgba(255,255,255,0.15)', padding: '2px 10px', borderRadius: 20, display: 'inline-block' }}>
                {me.profession}
              </div>
            )}
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          {[
            { label: 'ג\'ובות בוצעו', value: completedCount, icon: CheckCircle },
            { label: 'דירוג ממוצע', value: avgRating + (rating > 0 ? '★' : ''), icon: Star },
            { label: 'יתרה זמינה', value: `₪${balance}`, icon: CreditCard },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} style={{ background: 'rgba(255,255,255,0.12)', borderRadius: 16, padding: '12px 10px', textAlign: 'center', backdropFilter: 'blur(4px)' }}>
              <Icon size={16} color="rgba(255,255,255,0.7)" style={{ marginBottom: 6, margin: '0 auto 6px' }} />
              <div style={{ color: 'white', fontSize: 17, fontWeight: 800 }}>{value}</div>
              <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 10, marginTop: 2 }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Worker Score card */}
      {workerScore > 0 && (
        <div style={{ padding: '16px 16px 0' }}>
          <div style={{ background: 'white', borderRadius: 16, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, boxShadow: '0 1px 8px rgba(0,0,0,0.06)', border: '1px solid #e8f0fe' }}>
            <div style={{ width: 42, height: 42, borderRadius: 12, background: '#fef9c3', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Award size={20} color="#ca8a04" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#111' }}>ניקוד עובד</div>
              <div style={{ fontSize: 12, color: '#999', marginTop: 1 }}>{completedCount} ג'ובות הושלמו</div>
            </div>
            <div style={{ fontSize: 22, fontWeight: 900, color: '#111' }}>{workerScore.toFixed(0)}</div>
          </div>
        </div>
      )}

      {/* Preferred categories */}
      {me?.preferred_categories?.length > 0 && (
        <div style={{ padding: '12px 16px 0' }}>
          <div style={{ background: 'white', borderRadius: 16, padding: '14px 16px', boxShadow: '0 1px 8px rgba(0,0,0,0.06)', border: '1px solid #e8f0fe' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#0f2b6b', marginBottom: 8 }}>קטגוריות מועדפות</div>
            <div className="flex gap-2 flex-wrap">
              {me.preferred_categories.map(c => (
                <span key={c} style={{ fontSize: 12, background: '#f1f5f9', color: '#444', padding: '4px 12px', borderRadius: 20, fontWeight: 600 }}>
                  {getCategoryLabel(c)}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Certificates */}
      {me?.certificates?.length > 0 && (
        <div style={{ padding: '12px 16px 0' }}>
          <div style={{ background: 'white', borderRadius: 16, padding: '14px 16px', boxShadow: '0 1px 8px rgba(0,0,0,0.06)', border: '1px solid #e8f0fe' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#0f2b6b', marginBottom: 8 }}>תעודות ואישורים</div>
            <div className="flex gap-2 flex-wrap">
              {me.certificates.map(cert => (
                <span key={cert} style={{ fontSize: 12, background: '#f1f5f9', color: '#444', padding: '4px 12px', borderRadius: 20, fontWeight: 600 }}>
                  ✅ {cert}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* CTA: complete worker profile */}
      {!me?.profession && (
        <div style={{ padding: '12px 16px 0' }}>
          <Link to="/worker-profile">
            <div style={{ background: 'white', borderRadius: 16, padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 8px rgba(0,0,0,0.06)', border: '1px solid #e8edf2' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Briefcase size={18} color="#1a6fd4" />
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#111' }}>השלם פרופיל עובד</div>
                  <div style={{ fontSize: 12, color: '#999', marginTop: 1 }}>הוסף מקצוע, תעודות וערים מועדפות</div>
                </div>
              </div>
              <ChevronLeft size={18} color="#ccc" />
            </div>
          </Link>
        </div>
      )}

      {/* Settings & Logout */}
      <div style={{ padding: '12px 16px 0' }}>
        <div style={{ background: 'white', borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 8px rgba(0,0,0,0.06)', border: '1px solid #e8f0fe' }}>
          <Link to="/worker-profile" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', textDecoration: 'none', borderBottom: '1px solid #f0f4fa' }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Settings size={17} color="#666" />
            </div>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#0f2b6b', flex: 1 }}>הגדרות פרופיל</span>
            <ChevronLeft size={16} color="#ccc" />
          </Link>
          <button
            onClick={() => base44.auth.logout()}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <div style={{ width: 36, height: 36, borderRadius: 10, background: '#fff1f2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <LogOut size={17} color="#dc2626" />
            </div>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#dc2626', flex: 1, textAlign: 'right' }}>התנתקות</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ padding: '16px 16px 24px' }}>
        <Tabs defaultValue="published">
          <TabsList className="w-full bg-white rounded-xl border border-blue-100" style={{ boxShadow: '0 1px 4px rgba(26,111,212,0.08)', direction: 'rtl' }}>
            <TabsTrigger value="published" className="flex-1 rounded-xl text-xs">פרסמתי ({myTasks.length})</TabsTrigger>
            <TabsTrigger value="worked" className="flex-1 rounded-xl text-xs">ביצעתי ({completedCount})</TabsTrigger>
            <TabsTrigger value="reviews" className="flex-1 rounded-xl text-xs">ביקורות ({reviews.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="published" className="mt-4 space-y-3">
            {myTasks.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
                <div style={{ fontSize: 40, marginBottom: 10 }}>📋</div>
                <div style={{ fontWeight: 600 }}>עדיין לא פרסמת משימות</div>
              </div>
            ) : (
              myTasks.map(t => (
                <div key={t.id}>
                  {/* Status banner above card */}
                  {t.status === 'OPEN' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, paddingRight: 4 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#3b82f6', display: 'inline-block' }} />
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#1d4ed8' }}>ממתינה לביצוע</span>
                    </div>
                  )}
                  {t.status === 'TAKEN' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, paddingRight: 4 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#8b5cf6', display: 'inline-block' }} />
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#6d28d9' }}>בביצוע</span>
                    </div>
                  )}
                  {t.status === 'COMPLETED' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, paddingRight: 4 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#16a34a', display: 'inline-block' }} />
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#15803d' }}>הושלמה ✅</span>
                    </div>
                  )}
                  {t.status === 'CANCELLED' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, paddingRight: 4 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#dc2626', display: 'inline-block' }} />
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#b91c1c' }}>בוטלה</span>
                    </div>
                  )}
                  {t.status === 'EXPIRED' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, paddingRight: 4 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f97316', display: 'inline-block' }} />
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#ea580c' }}>פגה תוקף</span>
                    </div>
                  )}
                  <TaskCard task={t} />
                </div>
              ))
            )}
          </TabsContent>

          <TabsContent value="worked" className="mt-4 space-y-3">
            {workerTasks.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
                <div style={{ fontSize: 40, marginBottom: 10 }}>💼</div>
                <div style={{ fontWeight: 600 }}>עדיין לא ביצעת משימות</div>
              </div>
            ) : (
              workerTasks.map(t => (
                <div key={t.id}>
                  {/* Awaiting client confirmation highlight */}
                  {t.status === 'TAKEN' && t.worker_status === 'done' && (
                    <div style={{ background: '#fef3c7', border: '1px solid #fbbf24', borderRadius: 12, padding: '8px 14px', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 16 }}>⏳</span>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 800, color: '#92400e' }}>ממתין לאישור הלקוח</div>
                        <div style={{ fontSize: 11, color: '#b45309' }}>לאחר האישור הכסף יועבר אליך</div>
                      </div>
                    </div>
                  )}
                  {t.status === 'COMPLETED' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, paddingRight: 4 }}>
                      <span style={{ fontSize: 14 }}>✅</span>
                      <span style={{ fontSize: 12, fontWeight: 800, color: '#15803d' }}>הלקוח אישר — הכסף הועבר!</span>
                    </div>
                  )}
                  <TaskCard task={t} />
                </div>
              ))
            )}
          </TabsContent>

          <TabsContent value="reviews" className="mt-4 space-y-3">
            {reviews.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
                <div style={{ fontSize: 40, marginBottom: 10 }}>⭐</div>
                <div style={{ fontWeight: 600 }}>עדיין אין ביקורות</div>
              </div>
            ) : (
              reviews.map(review => (
                <div key={review.id} style={{ background: 'white', borderRadius: 16, padding: '14px 16px', boxShadow: '0 1px 6px rgba(0,0,0,0.05)', border: '1px solid #f0f0f0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    {[1,2,3,4,5].map(s => (
                      <Star key={s} size={14} className={s <= review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200 fill-gray-200'} />
                    ))}
                    <span style={{ fontSize: 11, color: '#aaa', marginRight: 'auto' }}>{review.role === 'worker' ? 'מלקוח' : 'ממבצע'}</span>
                  </div>
                  {review.comment && <p style={{ fontSize: 13, color: '#333', lineHeight: 1.5 }}>{review.comment}</p>}
                </div>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}