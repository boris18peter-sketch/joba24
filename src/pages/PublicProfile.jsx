import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Star, CheckCircle, Shield, Award, FileText, MapPin, Phone } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import VerifiedBadge from '@/components/VerifiedBadge';
import { getCategoryLabel, CATEGORIES } from '@/lib/categories';
import BackButton from '@/components/BackButton';

const CITIES = ['תל אביב', 'ירושלים', 'חיפה', 'באר שבע', 'ראשון לציון', 'פתח תקווה', 'נתניה', 'הרצליה', 'רמת גן', 'אשדוד'];

export default function PublicProfile() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const userId = urlParams.get('id');

  const { data: user, isLoading } = useQuery({
    queryKey: ['publicUser', userId],
    queryFn: async () => {
      if (!userId) return null;
      const users = await base44.entities.User.list();
      return users.find(u => u.id === userId) || null;
    },
    enabled: !!userId,
  });

  const { data: reviews = [] } = useQuery({
    queryKey: ['publicReviews', userId],
    queryFn: () => base44.entities.Review.filter({ reviewee_id: userId }, '-created_date', 10),
    enabled: !!userId,
  });

  const { data: completedTasks = [] } = useQuery({
    queryKey: ['publicTasks', userId],
    queryFn: () => base44.entities.Task.filter({ worker_id: userId, status: 'COMPLETED' }, '-created_date', 20),
    enabled: !!userId,
  });

  const { data: postedTasks = [] } = useQuery({
    queryKey: ['publicPostedTasks', userId],
    queryFn: () => base44.entities.Task.filter({ client_id: userId, status: 'COMPLETED' }, '-created_date', 20),
    enabled: !!userId,
  });

  const { data: allReviews = [] } = useQuery({
    queryKey: ['publicAllReviews', userId],
    queryFn: () => base44.entities.Review.filter({ reviewee_id: userId }, '-created_date', 20),
    enabled: !!userId,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

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

  // Calculate rating from reviews
  const avgRating = allReviews.length > 0 
    ? (allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length).toFixed(1)
    : '—';
  const workerScore = user.worker_score || 0;

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
          <div style={{ width: 72, height: 72, borderRadius: 22, background: 'rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, fontWeight: 900, color: 'white', border: '2px solid rgba(255,255,255,0.25)', overflow: 'hidden', flexShrink: 0 }}>
            {user.profile_photo
              ? <img src={user.profile_photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : (user.full_name?.[0]?.toUpperCase() || '?')}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: 'white', fontSize: 20, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 7 }}>
              {user.full_name}
              {user.is_verified && <VerifiedBadge size="md" />}
            </div>
            {user.profession && (
              <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12, marginTop: 5, background: 'rgba(255,255,255,0.15)', padding: '3px 12px', borderRadius: 20, display: 'inline-block' }}>
                {user.profession}
              </div>
            )}
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          {[
            { value: completedTasks.length, label: "ג'ובות בוצעו" },
            { value: postedTasks.length, label: "ג'ובות פורסמו" },
            { value: avgRating + (avgRating !== '—' ? '★' : ''), label: 'דירוג', sub: `${allReviews.length} ביקורות` },
          ].map(s => (
            <div key={s.label} style={{ background: 'rgba(255,255,255,0.13)', borderRadius: 16, padding: '12px 6px', textAlign: 'center' }}>
              <div style={{ color: 'white', fontSize: 18, fontWeight: 900 }}>{s.value}</div>
              <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 10, marginTop: 2 }}>{s.label}</div>
              {s.sub && <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 9 }}>{s.sub}</div>}
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: '16px 16px 40px', display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* Verified badge */}
        {user.is_verified && (
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 14, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Shield size={18} color="#16a34a" />
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#166534' }}>זהות מאומתת</div>
              <div style={{ fontSize: 11, color: '#15803d' }}>הפרופיל מאומת ומהימן</div>
            </div>
          </div>
        )}

        {/* Worker score */}
        {workerScore > 0 && (
          <div style={{ background: 'linear-gradient(135deg, #6d28d9, #7c3aed)', borderRadius: 16, padding: '14px 16px', color: 'white' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
              <div style={{ width: 40, height: 40, background: 'rgba(255,255,255,0.15)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Award size={20} color="white" />
              </div>
              <div>
                <div style={{ fontSize: 10, opacity: 0.8 }}>ניקוד עובד</div>
                <div style={{ fontSize: 22, fontWeight: 900 }}>{workerScore.toFixed(0)} נק'</div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
              {[
                { val: user.score_tasks || 0, label: 'משימות' },
                { val: user.score_speed || 0, label: 'מהירות' },
                { val: user.score_quality || 0, label: 'ביצוע' },
              ].map(s => (
                <div key={s.label} style={{ background: 'rgba(255,255,255,0.12)', borderRadius: 10, padding: '8px 6px', textAlign: 'center' }}>
                  <div style={{ fontWeight: 800, fontSize: 14 }}>{s.val}</div>
                  <div style={{ fontSize: 9, opacity: 0.75 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bio */}
        {user.bio && (
          <div style={{ background: 'white', borderRadius: 16, border: '1px solid #dce8f5', padding: '14px 16px' }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#1a6fd4', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 }}>אודות</div>
            <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.6, margin: 0 }}>{user.bio}</p>
          </div>
        )}

        {/* Certificates (text) */}
        {user.certificates?.length > 0 && (
          <div style={{ background: 'white', borderRadius: 16, border: '1px solid #dce8f5', padding: '14px 16px' }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#1a6fd4', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 10 }}>תעודות מקצוע</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {user.certificates.map(cert => (
                <span key={cert} style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0', padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
                  ✅ {cert}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Certificate files */}
        {user.certificate_files?.length > 0 && (
          <div style={{ background: 'white', borderRadius: 16, border: '1px solid #dce8f5', padding: '14px 16px' }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#1a6fd4', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 10 }}>מסמכי תעודה</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {user.certificate_files.map(doc => (
                <a key={doc.url} href={doc.url} target="_blank" rel="noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: '10px 12px', textDecoration: 'none' }}>
                  <FileText size={16} color="#16a34a" style={{ flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 12, fontWeight: 700, color: '#166534', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.name}</span>
                  <span style={{ fontSize: 10, color: '#86efac' }}>לצפייה ›</span>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Work categories */}
        {user.preferred_categories?.length > 0 && (
          <div style={{ background: 'white', borderRadius: 16, border: '1px solid #dce8f5', padding: '14px 16px' }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#1a6fd4', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 10 }}>תחומי עיסוק</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {user.preferred_categories.map(c => (
                <span key={c} style={{ fontSize: 12, background: '#eff6ff', color: '#1a6fd4', border: '1px solid #bfdbfe', padding: '5px 12px', borderRadius: 20, fontWeight: 600 }}>
                  {getCategoryLabel(c)}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Preferred cities */}
        {user.preferred_cities?.length > 0 && (
          <div style={{ background: 'white', borderRadius: 16, border: '1px solid #dce8f5', padding: '14px 16px' }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#1a6fd4', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 5 }}>
              <MapPin size={12} /> אזורי פעילות
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {user.preferred_cities.map(c => (
                <span key={c} style={{ fontSize: 12, background: '#f0f9ff', color: '#0369a1', border: '1px solid #bae6fd', padding: '5px 12px', borderRadius: 20, fontWeight: 600 }}>
                  📍 {c}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Completed tasks as worker */}
        {completedTasks.length > 0 && (
          <div style={{ background: 'white', borderRadius: 16, border: '1px solid #dce8f5', padding: '14px 16px' }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#1a6fd4', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 10 }}>ג'ובות שביצע</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {completedTasks.map(t => (
                <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: '#f8faff', borderRadius: 10 }}>
                  <CheckCircle size={14} color="#16a34a" style={{ flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#1a2540', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</div>
                    {t.city && <div style={{ fontSize: 11, color: '#94a3b8' }}>{t.city}</div>}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#1a6fd4', flexShrink: 0 }}>₪{t.price}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reviews */}
        {allReviews.length > 0 && (
          <div style={{ background: 'white', borderRadius: 16, border: '1px solid #dce8f5', padding: '14px 16px' }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#1a6fd4', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 10 }}>ביקורות ({allReviews.length})</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {allReviews.slice(0, 10).map(review => (
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

        {/* Empty state */}
        {!user.bio && !user.preferred_categories?.length && completedTasks.length === 0 && allReviews.length === 0 && (
          <div style={{ textAlign: 'center', padding: '32px 16px', color: '#94a3b8' }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>🔍</div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>המשתמש טרם מילא פרטי פרופיל</div>
          </div>
        )}
      </div>
    </div>
  );
}