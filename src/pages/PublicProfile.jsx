import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { MapPin, FileText, ChevronLeft, Loader2, Clock, X, Phone, Instagram, Facebook, Music2, ShieldCheck, Link2 } from 'lucide-react';
import VerifiedBadge from '@/components/VerifiedBadge';
import GoldBadge from '@/components/GoldBadge';
import TrustCard from '@/components/TrustCard';
import ProfileMediaGallery from '@/components/ProfileMediaGallery';
import TaskReviewHistory from '@/components/TaskReviewHistory';
import ProfileStatsPill from '@/components/profile/ProfileStatsPill';
import { getCategoryLabel } from '@/lib/categories';
import { getCityLabel } from '@/lib/cityLabels';
import { calculateTrustScore } from '@/lib/trustScore';
import { isUserVerified } from '@/lib/utils';
import { useLanguage } from '@/lib/LanguageContext';

export default function PublicProfile() {
  const navigate = useNavigate();
  const { t, isRTL, lang } = useLanguage();
  const [searchParams] = useSearchParams();
  const userId = searchParams.get('id');
  const taskId = searchParams.get('taskId');

  const { data: user, isLoading } = useQuery({
    queryKey: ['publicProfileUser', userId, taskId],
    queryFn: async () => {
      if (!userId) return null;
      const res = await base44.functions.invoke('getPublicUserProfile', { userId, taskId });
      return res.data?.user || null;
    },
    enabled: !!userId,
    staleTime: 60000,
    refetchOnWindowFocus: false,
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

  const [showUnifiedHistory, setShowUnifiedHistory] = useState(false);

  if (isLoading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100dvh' }}>
      <Loader2 size={28} className="animate-spin" color="#1a6fd4" />
    </div>
  );

  if (!user) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100dvh', gap: 12 }} dir={isRTL ? 'rtl' : 'ltr'}>
      <div style={{ fontSize: 36 }}>🔍</div>
      <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-2)' }}>{t('pp_user_not_found')}</p>
      <button onClick={() => navigate(-1)} style={{ fontSize: 14, fontWeight: 700, color: '#1a6fd4', background: 'none', border: 'none', cursor: 'pointer' }}>{t('pp_back')}</button>
    </div>
  );

  const liveRating = user.rating || 0;
  const liveRatingCount = user.rating_count || 0;
  const completedCount = user.tasks_completed || completedTasks.length;
  const postedCount = postedTasks.length;
  const reviews = user.reviews || [];
  const social = !!(user.instagram_verified || user.facebook_verified || user.tiktok_verified);
  const verified = isUserVerified(user);

  const liveUser = {
    ...user,
    rating: reviews.length > 0 ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) : liveRating,
    rating_count: reviews.length || liveRatingCount || 0,
  };
  const trustScore = calculateTrustScore(liveUser, { reviews });

  const cities = user.preferred_cities || [];
  const categories = user.preferred_categories || [];
  const initials = user.full_name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';

  return (
    <div style={{ background: 'var(--surface-1)', paddingBottom: 'calc(90px + env(safe-area-inset-bottom))' }} dir={isRTL ? 'rtl' : 'ltr'}>
      {/* ── Back bar ── */}
      <div style={{ position: 'sticky', top: 0, zIndex: 20, background: 'rgba(10,82,176,0.97)', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12, backdropFilter: 'blur(8px)' }}>
        <button onClick={() => navigate(-1)} style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <ChevronLeft size={17} color="white" style={{ transform: 'rotate(180deg)' }} />
        </button>
        <span style={{ fontSize: 16, fontWeight: 800, color: 'white' }}>{t('pp_user_profile')}</span>
      </div>

      {/* ── SECTION 1 — IDENTITY ── */}
      <div style={{
        background: 'linear-gradient(160deg, #0a52b0 0%, #1a6fd4 55%, #2563eb 100%)',
        paddingBottom: 18, position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: -30, left: -20, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
        <div style={{ position: 'absolute', bottom: -40, right: -10, width: 80, height: 80, borderRadius: '50%', background: 'rgba(251,191,36,0.1)' }} />

        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '14px 20px 0' }}>
          <div style={{
            width: 80, height: 80, borderRadius: '50%',
            background: 'rgba(255,255,255,0.15)',
            border: '3px solid rgba(255,255,255,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 28, fontWeight: 900, color: 'white',
            overflow: 'hidden', marginBottom: 8,
            boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
          }}>
            {user.profile_photo
              ? <img src={user.profile_photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : initials}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
            <span style={{ fontSize: 19, fontWeight: 900, color: 'white' }}>{user.full_name}</span>
            {verified && social ? <GoldBadge size="md" /> : verified && <VerifiedBadge size="md" />}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
            {verified && (
              <span style={{ fontSize: 11, fontWeight: 700, color: 'white', background: 'rgba(255,255,255,0.18)', borderRadius: 20, padding: '3px 10px', display: 'flex', alignItems: 'center', gap: 4, border: '1px solid rgba(255,255,255,0.22)' }}>
                <ShieldCheck size={11} color="#4ade80" /> {t('pr_identity_verified')}
              </span>
            )}
            {social && (
              <span style={{ fontSize: 11, fontWeight: 700, color: 'white', background: 'rgba(251,191,36,0.22)', borderRadius: 20, padding: '3px 10px', display: 'flex', alignItems: 'center', gap: 4, border: '1px solid rgba(251,191,36,0.4)' }}>
                <Link2 size={11} color="#fbbf24" /> {t('pr_social_connected')}
              </span>
            )}
            {cities.length > 0 && (
              <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.9)', display: 'flex', alignItems: 'center', gap: 3 }}>
                <MapPin size={11} /> {getCityLabel(cities[0], lang)}{cities.length > 1 ? ` +${cities.length - 1}` : ''}
              </span>
            )}
          </div>
        </div>
      </div>

      <div style={{ padding: '12px 14px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* Phone — revealed only for approved worker */}
        {user.phone && (
          <a href={`tel:${user.phone}`} dir="ltr"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, height: 50, borderRadius: 14, background: 'linear-gradient(135deg,#059669,#047857)', color: 'white', fontWeight: 800, fontSize: 15, textDecoration: 'none', boxShadow: '0 4px 14px rgba(5,150,105,0.3)' }}>
            <Phone size={18} color="white" /> {user.phone}
          </a>
        )}

        {/* SECTION 2 — STATS PILL (rating · posted · completed) */}
        <ProfileStatsPill rating={liveRating} reviewCount={liveRatingCount} postedCount={postedCount} completedCount={completedCount} />

        {/* SECTION 2b — Reliability */}
        <TrustCard user={liveUser} reviews={reviews} tasks={[]} isPublic />

        {/* About */}
        {user.bio && (
          <div style={{ background: 'var(--surface-2)', borderRadius: 14, border: '1px solid var(--border-1)', padding: '14px 16px' }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-3)', marginBottom: 6 }}>{t('pr_about')}</div>
            <p className="selectable-text" style={{ fontSize: 14, color: 'var(--text-1)', lineHeight: 1.6, margin: 0 }}>{user.bio}</p>
          </div>
        )}

        {/* SECTION 6 — ABOUT ME */}
        {(user.profile_media?.length > 0 || user.intro_video_url) && (
          <div style={{ background: 'var(--surface-2)', borderRadius: 14, border: '1px solid var(--border-1)', padding: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
              <span style={{ fontSize: 14 }}>👋</span>
              <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-3)' }}>{t('pr_about_me')}</span>
            </div>
            <ProfileMediaGallery
              media={[
                ...(user.intro_video_url ? [{ type: 'video', url: user.intro_video_url }] : []),
                ...(user.profile_media || []),
              ]}
              isEditing={false}
            />
          </div>
        )}

        {/* SECTION 7 — PROFESSIONAL AREAS */}
        {categories.length > 0 && (
          <div style={{ background: 'var(--surface-2)', borderRadius: 14, border: '1px solid var(--border-1)', padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 8 }}>
              <span style={{ fontSize: 13 }}>🔧</span>
              <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-3)' }}>{t('pr_professions')}</span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {categories.map(c => (
                <span key={c} style={{ fontSize: 13, background: '#eff6ff', color: '#1a6fd4', padding: '5px 14px', borderRadius: 20, fontWeight: 600, border: '1px solid #bfdbfe' }}>
                  {getCategoryLabel(c, t)}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Certificates */}
        {(user.certificate_files?.length > 0) && (
          <div style={{ background: 'var(--surface-2)', borderRadius: 14, border: '1px solid var(--border-1)', padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 8 }}>
              <FileText size={12} color="var(--text-3)" />
              <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-3)' }}>{t('pr_certs')}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(user.certificate_files || []).map(doc => (
                <a key={doc.url} href={doc.url} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: '10px 12px', textDecoration: 'none' }}>
                  <FileText size={16} color="#16a34a" style={{ flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: '#166534', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.name}</span>
                  <span style={{ fontSize: 11, color: '#86efac' }}>{t('pr_view')}</span>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* SECTION 8 — SERVICE AREAS */}
        {cities.length > 0 && (
          <div style={{ background: 'var(--surface-2)', borderRadius: 14, border: '1px solid var(--border-1)', padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 8 }}>
              <span style={{ fontSize: 13 }}>📍</span>
              <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-3)' }}>{t('pr_areas')}</span>
              <span style={{ fontSize: 10, color: 'var(--text-3)', fontWeight: 600, marginRight: 'auto' }}>
                {t('pr_active_in_areas', { n: cities.length })}
              </span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {cities.map(c => (
                <span key={c} style={{ fontSize: 13, background: '#f0f9ff', color: '#0369a1', border: '1px solid #bae6fd', padding: '5px 14px', borderRadius: 20, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <MapPin size={11} /> {getCityLabel(c, lang)}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* SECTION 9 — SOCIAL NETWORKS (verified only) */}
        {social && (
          <div style={{ background: 'var(--surface-2)', borderRadius: 14, border: '1px solid var(--border-1)', padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 10 }}>
              <span style={{ fontSize: 13 }}>🔗</span>
              <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-3)' }}>{t('pp_social_networks')}</span>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {[
                { key: 'instagram', username: user.instagram_username, verified: user.instagram_verified, url: `https://instagram.com/${user.instagram_username}`, icon: Instagram, color: 'linear-gradient(135deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)' },
                { key: 'facebook', username: user.facebook_username, verified: user.facebook_verified, url: `https://facebook.com/${user.facebook_username}`, icon: Facebook, color: '#1877F2' },
                { key: 'tiktok', username: user.tiktok_username, verified: user.tiktok_verified, url: `https://tiktok.com/@${user.tiktok_username}`, icon: Music2, color: 'linear-gradient(135deg, #25F4EE, #000000, #FE2C55)' },
              ].filter(p => p.username && p.verified).map(p => (
                <a key={p.key} href={p.url} target="_blank" rel="noopener noreferrer"
                  style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '10px 4px', borderRadius: 14, textDecoration: 'none', border: '1px solid #fde68a', background: '#fffbeb' }}>
                  <div style={{ position: 'relative', width: 36, height: 36, borderRadius: 10, background: p.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <p.icon size={18} color="white" />
                    <span style={{ position: 'absolute', top: -4, right: -4, width: 16, height: 16, borderRadius: '50%', background: '#d97706', border: '2px solid var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ShieldCheck size={9} color="white" /></span>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#d97706' }}>{t('pp_verified')}</span>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Unified history button */}
        {(completedCount > 0 || postedCount > 0 || reviews.length > 0) && (
          <div style={{ background: 'var(--surface-2)', borderRadius: 14, border: '1px solid var(--border-1)', overflow: 'hidden' }}>
            <button onClick={() => setShowUnifiedHistory(true)}
              style={{ all: 'unset', width: '100%', boxSizing: 'border-box', display: 'flex', alignItems: 'center', gap: 14, padding: '13px 14px', cursor: 'pointer' }}
              onPointerDown={e => { e.currentTarget.style.background = 'var(--surface-3)'; }}
              onPointerUp={e => { e.currentTarget.style.background = ''; }}
              onPointerLeave={e => { e.currentTarget.style.background = ''; }}
            >
              <div style={{ width: 38, height: 38, borderRadius: 11, background: '#f5f3ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Clock size={17} color="#7c3aed" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)' }}>{t('pr_history_reviews')}</div>
                <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 1 }}>{completedCount + postedCount} {t('tasks')} · {reviews.length} {t('pp_reviews')}</div>
              </div>
              <ChevronLeft size={15} color="var(--text-3)" />
            </button>
          </div>
        )}

        {/* Empty */}
        {!user.bio && !categories.length && completedCount === 0 && reviews.length === 0 && !social && (
          <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--text-3)' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
            <div style={{ fontSize: 15, fontWeight: 700 }}>{t('pp_user_no_profile')}</div>
          </div>
        )}

        <div style={{ height: 16 }} />
      </div>

      {/* Unified History Sheet */}
      {showUnifiedHistory && createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={() => setShowUnifiedHistory(false)}>
          <div style={{ background: 'var(--surface-2)', borderRadius: '24px 24px 0 0', width: '100%', maxWidth: 480, maxHeight: '82vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px 12px', borderBottom: '1px solid var(--border-1)' }}>
              <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-1)' }}>{t('pr_history_reviews')}</span>
              <button onClick={() => setShowUnifiedHistory(false)} style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--surface-3)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={16} color="#64748b" />
              </button>
            </div>
            <div style={{ overflowY: 'auto', padding: '16px 20px 32px' }} dir={isRTL ? 'rtl' : 'ltr'}>
              <TaskReviewHistory tasks={[...completedTasks, ...postedTasks]} reviews={reviews} userId={userId} clickable={false} hidePrices />
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}