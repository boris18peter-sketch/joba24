import { useState, useRef, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Star, LogOut, Pencil, Briefcase, CheckCircle, CreditCard, ChevronLeft, User, Camera, Loader2, Shield, X } from 'lucide-react';
import VerifyModal from '@/components/VerifyModal';
import VerifiedBadge from '@/components/VerifiedBadge';
import { Link } from 'react-router-dom';
import { getCategoryLabel } from '@/lib/categories';
import BackButton from '@/components/BackButton';
import PageHeader from '@/components/PageHeader';
import TrustBadges from '@/components/TrustBadges';
import TrustCard from '@/components/TrustCard';

const StatBox = ({ value, label, sub }) =>
<div style={{ background: 'rgba(255,255,255,0.13)', borderRadius: 16, padding: '12px 10px', textAlign: 'center' }}>
    <div style={{ color: 'white', fontSize: 18, fontWeight: 900 }}>{value}</div>
    <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 10, marginTop: 2 }}>{label}</div>
    {sub && <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 9 }}>{sub}</div>}
  </div>;


const SectionTitle = ({ children }) =>
<div style={{ fontSize: 11, fontWeight: 800, color: '#1a6fd4', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 10 }}>{children}</div>;


export default function Profile() {
  const queryClient = useQueryClient();
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const photoInputRef = useRef(null);

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    await base44.auth.updateMe({ profile_photo: file_url });
    queryClient.invalidateQueries({ queryKey: ['me'] });
    setUploadingPhoto(false);
  };

  const { data: me, isLoading } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });

  const { data: reviews = [] } = useQuery({
    queryKey: ['myReviews', me?.id],
    queryFn: () => base44.entities.Review.filter({ reviewee_id: me.id }, '-created_date', 100),
    enabled: !!me?.id,
    staleTime: 60000
  });

  // Live subscribe to new reviews
  useEffect(() => {
    if (!me?.id) return;
    const unsub = base44.entities.Review.subscribe((event) => {
      if (event.data?.reviewee_id === me.id) {
        queryClient.invalidateQueries({ queryKey: ['myReviews', me.id] });
        queryClient.invalidateQueries({ queryKey: ['me'] });
      }
    });
    return unsub;
  }, [me?.id]);

  const { data: workerTasks = [] } = useQuery({
    queryKey: ['workerTasks', me?.id],
    queryFn: () => base44.entities.Task.filter({ worker_id: me.id }, '-created_date', 5),
    enabled: !!me?.id
  });

  if (isLoading) {
    return (
      <div dir="rtl" style={{ background: 'var(--surface-1)', minHeight: '100dvh' }}>
        <PageHeader title="הפרופיל שלי" right={<div style={{ width: 36, height: 36, borderRadius: 12, background: '#e8edf5' }} className="animate-pulse" />} />
        {/* Hero skeleton */}
        <div style={{ background: 'linear-gradient(140deg, #0f2b6b 0%, #1a6fd4 100%)', padding: '28px 20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 22 }}>
            <div style={{ width: 68, height: 68, borderRadius: 20, background: 'rgba(255,255,255,0.18)' }} className="animate-pulse" />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ height: 18, width: '50%', borderRadius: 8, background: 'rgba(255,255,255,0.18)' }} className="animate-pulse" />
              <div style={{ height: 12, width: '70%', borderRadius: 6, background: 'rgba(255,255,255,0.12)' }} className="animate-pulse" />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            {[1,2,3].map(i => <div key={i} style={{ height: 64, borderRadius: 16, background: 'rgba(255,255,255,0.13)' }} className="animate-pulse" />)}
          </div>
        </div>
        {/* Body skeleton */}
        <div style={{ padding: '16px 16px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ height: 100, borderRadius: 18, background: 'white', border: '1px solid #dce8f5' }} className="animate-pulse" />
          <div style={{ height: 80, borderRadius: 16, background: 'white', border: '1px solid #dce8f5' }} className="animate-pulse" />
          <div style={{ height: 110, borderRadius: 16, background: 'white', border: '1px solid #dce8f5' }} className="animate-pulse" />
        </div>
      </div>
    );
  }

  const completedCount = workerTasks.filter((t) => t.status === 'COMPLETED').length;
  const rating = me?.rating || 0;
  const avgRating = rating > 0 ? rating.toFixed(1) : '—';
  const workerScore = me?.worker_score || 0;

  return (
    <div className="min-h-screen" style={{ background: 'var(--surface-1)' }} dir="rtl">
      {showVerifyModal &&
      <VerifyModal
        onClose={() => setShowVerifyModal(false)}
        onSuccess={() => {setShowVerifyModal(false);queryClient.invalidateQueries({ queryKey: ['me'] });}} />

      }

      <PageHeader title="הפרופיל שלי" right={<Link to="/worker-profile" style={{ width: 36, height: 36, borderRadius: 12, background: 'white', border: '1px solid #dce8f5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Pencil size={16} color="#666" /></Link>} />

      {/* Hero */}
      <div style={{ background: 'linear-gradient(140deg, #0f2b6b 0%, #1a6fd4 100%)', padding: '28px 20px 24px', position: 'relative', overflow: 'hidden' }}>
        

        {/* Avatar + Name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 22 }}>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <div
              onClick={() => photoInputRef.current?.click()}
              style={{ width: 68, height: 68, borderRadius: 20, background: 'rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, fontWeight: 900, color: 'white', border: '2px solid rgba(255,255,255,0.25)', overflow: 'hidden', cursor: 'pointer' }}>
              
              {me?.profile_photo ?
              <img src={me.profile_photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> :
              me?.full_name?.[0]?.toUpperCase() || <User size={26} />}
            </div>
            <button onClick={() => photoInputRef.current?.click()}
            style={{ position: 'absolute', bottom: -4, right: -4, width: 22, height: 22, borderRadius: '50%', background: 'white', border: '2px solid #1a6fd4', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              {uploadingPhoto ? <Loader2 size={11} color="#1a6fd4" className="animate-spin" /> : <Camera size={11} color="#1a6fd4" />}
            </button>
            <input ref={photoInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoUpload} />
          </div>
          <div>
            <div style={{ color: 'white', fontSize: 19, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 7 }}>
              {me?.full_name || 'משתמש'}
              {(me?.is_verified && me?.id_number) && <VerifiedBadge size="md" />}
            </div>
            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 2 }}>{me?.email}</div>
            {me?.profession &&
            <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: 11, marginTop: 5, background: 'rgba(255,255,255,0.15)', padding: '2px 10px', borderRadius: 20, display: 'inline-block' }}>
                {me.profession}
              </div>
            }
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          <StatBox value={completedCount} label="ג'ובות בוצעו" />
          <StatBox value={avgRating + (rating > 0 ? '★' : '')} label="דירוג" sub={`${me?.rating_count || 0} ביקורות`} />
          <StatBox value={me?.worker_credits ?? 100} label="קרדיטים" sub="ג'ובות" />
        </div>
      </div>

      <div style={{ padding: '16px 16px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* Verification status - only show banner to users who haven't completed KYC */}
        {!(me?.is_verified && me?.id_number) && (
          <button onClick={() => setShowVerifyModal(true)} style={{ all: 'unset', cursor: 'pointer', width: '100%' }}>
            <div style={{ background: 'linear-gradient(135deg,#1a6fd4,#0a52b0)', borderRadius: 18, padding: '16px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: -20, right: -20, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.07)' }} />
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
                <div style={{ width: 44, height: 44, borderRadius: 13, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Shield size={22} color="white" />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 900, color: 'white', marginBottom: 3 }}>אמת את הפרופיל שלך</div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', lineHeight: 1.5 }}>
                    פרופיל מאומת זוכה לחשיפה גבוהה יותר וסיכוי פי 2 ל-Match מהיר למשימות
                  </div>
                </div>
                <ChevronLeft size={18} color="rgba(255,255,255,0.7)" style={{ flexShrink: 0, marginTop: 4 }} />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {['✅ אימות חד-פעמי', '🔒 מידע מוצפן', '⚡ Match מהיר פי 2'].map(t => (
                  <div key={t} style={{ flex: 1, background: 'rgba(255,255,255,0.12)', borderRadius: 8, padding: '5px 6px', fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.9)', textAlign: 'center' }}>{t}</div>
                ))}
              </div>
            </div>
          </button>
        )}

        {/* Trust Badges */}
        <TrustBadges user={me} />

        {/* Trust Card */}
        <TrustCard user={me} reviews={reviews} tasks={workerTasks} />

        {/* Quick links */}
        <div style={{ background: 'var(--surface-2)', borderRadius: 16, border: '1px solid var(--border-1)', overflow: 'hidden' }}>
          {[
          { icon: Briefcase, label: 'פרופיל עובד', sub: 'מקצוע, תעודות, ערים', to: '/worker-profile', color: '#1a6fd4' },
          { icon: CreditCard, label: 'תנועת קרדיטים', sub: 'יתרה, תשלומים, היסטוריה', to: '/wallet', color: '#16a34a' }].
          map(({ icon: Icon, label, sub, to, color }, i, arr) =>
          <Link key={to} to={to} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderBottom: i < arr.length - 1 ? '1px solid var(--border-1)' : 'none' }}>
              <div style={{ width: 38, height: 38, borderRadius: 11, background: color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={17} color={color} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)' }}>{label}</div>
                <div style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 1 }}>{sub}</div>
              </div>
              <ChevronLeft size={16} color="#ccc" />
            </Link>
          )}
        </div>

        {/* Skills / Categories */}
        {me?.preferred_categories?.length > 0 &&
        <div style={{ background: 'var(--surface-2)', borderRadius: 16, border: '1px solid var(--border-1)', padding: '14px 16px' }}>
            <SectionTitle>תחומי עיסוק</SectionTitle>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {me.preferred_categories.map((c) =>
            <span key={c} style={{ fontSize: 12, background: '#eff6ff', color: '#1a6fd4', padding: '4px 12px', borderRadius: 20, fontWeight: 600 }}>
                  {getCategoryLabel(c)}
                </span>
            )}
            </div>
          </div>
        }

        {/* Certificates */}
        {me?.certificates?.length > 0 &&
        <div style={{ background: 'var(--surface-2)', borderRadius: 16, border: '1px solid var(--border-1)', padding: '14px 16px' }}>
            <SectionTitle>תעודות ואישורים</SectionTitle>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {me.certificates.map((cert) =>
            <span key={cert} style={{ fontSize: 12, background: '#f0fdf4', color: '#166534', padding: '4px 12px', borderRadius: 20, fontWeight: 600, border: '1px solid #bbf7d0' }}>
                  ✅ {cert}
                </span>
            )}
            </div>
          </div>
        }

        {/* Recent Reviews */}
        {reviews.length > 0 &&
        <div style={{ background: 'var(--surface-2)', borderRadius: 16, border: '1px solid var(--border-1)', padding: '14px 16px' }}>
            <SectionTitle>ביקורות אחרונות</SectionTitle>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {reviews.slice(0, 3).map((review) =>
            <div key={review.id} style={{ borderBottom: '1px solid var(--border-1)', paddingBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                    {[1, 2, 3, 4, 5].map((s) =>
                <Star key={s} size={12} className={s <= review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200 fill-gray-200'} />
                )}
                    <span style={{ fontSize: 10, color: '#aaa', marginRight: 'auto' }}>{review.role === 'worker' ? 'מלקוח' : 'ממבצע'}</span>
                  </div>
                  {review.comment && <p style={{ fontSize: 12, color: 'var(--text-1)', lineHeight: 1.5, margin: '0 0 6px' }}>{review.comment}</p>}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {review.arrived_on_time === true && <span style={{ fontSize: 10, fontWeight: 700, color: '#0891b2', background: '#ecfeff', border: '1px solid #a5f3fc', borderRadius: 99, padding: '2px 7px' }}>⏱️ הגיע בזמן</span>}
                    {review.professional === true && <span style={{ fontSize: 10, fontWeight: 700, color: '#7c3aed', background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: 99, padding: '2px 7px' }}>💼 מקצועי</span>}
                    {review.good_communication === true && <span style={{ fontSize: 10, fontWeight: 700, color: '#1a6fd4', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 99, padding: '2px 7px' }}>💬 תקשורת טובה</span>}
                    {review.would_hire_again === true && <span style={{ fontSize: 10, fontWeight: 700, color: '#db2777', background: '#fdf2f8', border: '1px solid #fbcfe8', borderRadius: 99, padding: '2px 7px' }}>🔁 ממליץ</span>}
                  </div>
                </div>
            )}
            </div>
          </div>
        }

        {/* All Reviews button */}
        {reviews.length > 3 &&
        <button onClick={() => setShowAllReviews(true)} style={{ width: '100%', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 14, padding: '10px 16px', textAlign: 'center', fontSize: 13, fontWeight: 700, color: '#1a6fd4', cursor: 'pointer' }}>
          ראה את כל הביקורות שלי ({reviews.length}) →
        </button>
        }

        {/* All Reviews Modal */}
        {showAllReviews && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={() => setShowAllReviews(false)}>
            <div style={{ background: 'var(--surface-2)', borderRadius: '24px 24px 0 0', width: '100%', maxWidth: 480, maxHeight: '80vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px 12px', borderBottom: '1px solid var(--border-1)' }}>
                <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-1)' }}>כל הביקורות שלי ({reviews.length})</span>
                <button onClick={() => setShowAllReviews(false)} style={{ width: 32, height: 32, borderRadius: 10, background: '#f1f5f9', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <X size={16} color="#64748b" />
                </button>
              </div>
              <div style={{ overflowY: 'auto', padding: '12px 20px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                {reviews.map((review) => (
                  <div key={review.id} style={{ background: 'var(--surface-3)', borderRadius: 14, padding: '12px 14px', border: '1px solid var(--border-1)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 6 }}>
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star key={s} size={13} className={s <= review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200 fill-gray-200'} />
                      ))}
                      <span style={{ fontSize: 10, color: '#94a3b8', marginRight: 'auto' }}>{review.role === 'worker' ? 'מלקוח' : 'ממבצע'}</span>
                    </div>
                    {review.comment && <p style={{ fontSize: 13, color: 'var(--text-1)', lineHeight: 1.6, margin: 0 }}>{review.comment}</p>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Logout */}
        <div style={{ background: 'var(--surface-2)', borderRadius: 16, border: '1px solid var(--border-1)', overflow: 'hidden', marginBottom: 24 }}>
          <button
            onClick={() => base44.auth.logout()}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: 'none', border: 'none', cursor: 'pointer' }}>
            
            <div style={{ width: 38, height: 38, borderRadius: 11, background: '#fff1f2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <LogOut size={17} color="#dc2626" />
            </div>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#dc2626', flex: 1, textAlign: 'right' }}>התנתקות</span>
            <ChevronLeft size={16} color="#fca5a5" />
          </button>
        </div>
      </div>
    </div>);

}