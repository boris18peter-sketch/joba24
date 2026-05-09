import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Star, Briefcase, CheckCircle, Shield, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import VerifiedBadge from '@/components/VerifiedBadge';
import { getCategoryLabel } from '@/lib/categories';
import BackButton from '@/components/BackButton';

export default function PublicProfile() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const userId = urlParams.get('id');

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['publicUser', userId],
    queryFn: () => base44.entities.User.list(),
    select: data => data.filter(u => u.id === userId),
    enabled: !!userId,
  });
  const user = users[0];

  const { data: reviews = [] } = useQuery({
    queryKey: ['publicReviews', userId],
    queryFn: () => base44.entities.Review.filter({ reviewee_id: userId }, '-created_date', 10),
    enabled: !!userId,
  });

  const { data: completedTasks = [] } = useQuery({
    queryKey: ['publicTasks', userId],
    queryFn: () => base44.entities.Task.filter({ worker_id: userId, status: 'COMPLETED' }, '-created_date', 5),
    enabled: !!userId,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4" dir="rtl">
        <p className="text-gray-500 text-sm">המשתמש לא נמצא</p>
        <button onClick={() => navigate(-1)} className="text-blue-600 font-semibold text-sm">חזרה</button>
      </div>
    );
  }

  const rating = user.rating || 0;
  const avgRating = rating > 0 ? rating.toFixed(1) : '—';

  return (
    <div className="min-h-screen" style={{ background: '#f4f7fb' }} dir="rtl">
      {/* Header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(244,247,251,0.95)', backdropFilter: 'blur(8px)', padding: '44px 16px 10px', borderBottom: '1px solid #dce8f5', display: 'flex', alignItems: 'center', gap: 12 }}>
        <BackButton />
        <span style={{ fontWeight: 800, fontSize: 17, color: '#0f2b6b', flex: 1 }}>פרופיל משתמש</span>
      </div>

      {/* Hero */}
      <div style={{ background: 'linear-gradient(140deg, #0f2b6b 0%, #1a6fd4 100%)', padding: '28px 20px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
          <div style={{ width: 68, height: 68, borderRadius: 20, background: 'rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 900, color: 'white', border: '2px solid rgba(255,255,255,0.25)', overflow: 'hidden', flexShrink: 0 }}>
            {user.profile_photo
              ? <img src={user.profile_photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : (user.full_name?.[0]?.toUpperCase() || '?')}
          </div>
          <div>
            <div style={{ color: 'white', fontSize: 19, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 7 }}>
              {user.full_name}
              {user.is_verified && <VerifiedBadge size="md" />}
            </div>
            {user.profession && (
              <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: 11, marginTop: 6, background: 'rgba(255,255,255,0.15)', padding: '2px 10px', borderRadius: 20, display: 'inline-block' }}>
                {user.profession}
              </div>
            )}
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          {[
            { value: completedTasks.length, label: "ג'ובות בוצעו" },
            { value: avgRating + (rating > 0 ? '★' : ''), label: 'דירוג', sub: `${user.rating_count || 0} ביקורות` },
            { value: user.worker_score > 0 ? user.worker_score.toFixed(0) : '—', label: 'ניקוד' },
          ].map(s => (
            <div key={s.label} style={{ background: 'rgba(255,255,255,0.13)', borderRadius: 16, padding: '12px 10px', textAlign: 'center' }}>
              <div style={{ color: 'white', fontSize: 18, fontWeight: 900 }}>{s.value}</div>
              <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 10, marginTop: 2 }}>{s.label}</div>
              {s.sub && <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 9 }}>{s.sub}</div>}
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: '16px 16px 32px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Verified status */}
        {user.is_verified && (
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 14, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Shield size={18} color="#16a34a" />
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#166534' }}>זהות מאומתת</div>
              <div style={{ fontSize: 11, color: '#15803d' }}>הפרופיל מאומת ומהימן</div>
            </div>
          </div>
        )}

        {/* Categories */}
        {user.preferred_categories?.length > 0 && (
          <div style={{ background: 'white', borderRadius: 16, border: '1px solid #dce8f5', padding: '14px 16px' }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#1a6fd4', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 10 }}>תחומי עיסוק</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {user.preferred_categories.map(c => (
                <span key={c} style={{ fontSize: 12, background: '#eff6ff', color: '#1a6fd4', padding: '4px 12px', borderRadius: 20, fontWeight: 600 }}>
                  {getCategoryLabel(c)}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Reviews */}
        {reviews.length > 0 && (
          <div style={{ background: 'white', borderRadius: 16, border: '1px solid #dce8f5', padding: '14px 16px' }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#1a6fd4', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 10 }}>ביקורות</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {reviews.slice(0, 5).map(review => (
                <div key={review.id} style={{ borderBottom: '1px solid #f0f4fa', paddingBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                    {[1,2,3,4,5].map(s => (
                      <Star key={s} size={12} className={s <= review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200 fill-gray-200'} />
                    ))}
                    <span style={{ fontSize: 10, color: '#aaa', marginRight: 'auto' }}>{review.role === 'worker' ? 'מלקוח' : 'ממבצע'}</span>
                  </div>
                  {review.comment && <p style={{ fontSize: 12, color: '#444', lineHeight: 1.5, margin: 0 }}>{review.comment}</p>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}