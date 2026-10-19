import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { fetchPublicTasks } from '@/lib/publicTasks';
import { MapPin, FileText, ChevronLeft, Loader2, Clock, X, Phone, Instagram, Facebook, Music2, ShieldCheck, Link2, SearchX } from 'lucide-react';
import VerifiedBadge from '@/components/VerifiedBadge';
import GoldBadge from '@/components/GoldBadge';
import TrustCard from '@/components/TrustCard';
import ProfileMediaGallery from '@/components/ProfileMediaGallery';
import TaskReviewHistory from '@/components/TaskReviewHistory';
import ReviewsSection from '@/components/profile/ReviewsSection';
import ProfileStatsPill from '@/components/profile/ProfileStatsPill';
import ProfileAvatar from '@/components/profile/ProfileAvatar';
import ProfileAboutCard from '@/components/profile/ProfileAboutCard';
import { profileHeroBackground } from '@/lib/profileTier';
import { getCategoryLabel } from '@/lib/categories';
import { useProfessionalScope } from '@/lib/brand/professionalScope';
import { getCityLabel } from '@/lib/cityLabels';
import { calculateTrustScore } from '@/lib/trustScore';
import { isUserVerified } from '@/lib/utils';
import { useLanguage } from '@/lib/LanguageContext';

export default function PublicProfile() {
  const navigate = useNavigate();
  const { t, isRTL, lang } = useLanguage();
  const scope = useProfessionalScope();
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
    queryFn: () => fetchPublicTasks({ mode: 'userCompleted', userId, role: 'worker', limit: 20 }),
    enabled: !!userId,
  });
  const { data: postedTasks = [] } = useQuery({
    queryKey: ['publicPostedTasks', userId],
    queryFn: () => fetchPublicTasks({ mode: 'userCompleted', userId, role: 'client', limit: 20 }),
    enabled: !!userId,
  });

  const [showUnifiedHistory, setShowUnifiedHistory] = useState(false);

  if (isLoading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100dvh' }}>
      <Loader2 size={28} className="animate-spin" color="var(--brand-primary)" />
    </div>
  );

  if (!user) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100dvh', gap: 12 }} dir={isRTL ? 'rtl' : 'ltr'}>
      <SearchX size={36} color="var(--text-3)" strokeWidth={1.5} />
      <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-2)' }}>{t('pp_user_not_found')}</p>
      <button onClick={() => navigate(-1)} style={{ fontSize: 14, fontWeight: 700, color: 'var(--brand-primary)', background: 'none', border: 'none', cursor: 'pointer' }}>{t('pp_back')}</button>
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
  // Professional scope of the CURRENT Brand. The user's categories are global;
  // this Brand only ever presents the ones it offers. Joba24 is broad and shows
  // all of them.
  const categories = scope.filter(user.preferred_categories || []);
  const initials = user.full_name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';

  return (
    <div style={{ background: 'var(--surface-1)' }} dir={isRTL ? 'rtl' : 'ltr'}>
      {/* ── SECTION 1 — IDENTITY ──
          The SAME hero as the personal profile: one top bar inside it, the
          avatar, the name with its badge, and the stats pill underneath. The
          only difference is what the top bar carries — a Back button here,
          where the owner has Edit. */}
      <div style={{
        background: profileHeroBackground(user, 'linear-gradient(160deg, var(--brand-hero-bg, #0a52b0) 0%, var(--brand-hero-bg, var(--brand-primary)) 55%, var(--brand-hero-bg, #2563eb) 100%)'),
        paddingBottom: 16, position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: -30, left: -20, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
        <div style={{ position: 'absolute', bottom: -40, right: -10, width: 80, height: 80, borderRadius: '50%', background: 'rgba(251,191,36,0.1)' }} />

        {/* Top bar */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px 0' }}>
          <button
            onClick={() => navigate(-1)}
            aria-label={t('pp_back')}
            style={{ width: 34, height: 34, borderRadius: 20, background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(6px)' }}
          >
            <ChevronLeft size={17} color="var(--brand-hero-text, white)" style={{ transform: 'rotate(180deg)' }} />
          </button>
          <span style={{ fontSize: 17, fontWeight: 800, color: 'var(--brand-hero-text, white)' }}>{t('pp_user_profile')}</span>
        </div>

        {/* Avatar + Name + badges */}
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '14px 20px 0' }}>
          <div style={{ marginBottom: 8 }}>
            <ProfileAvatar
              user={user}
              size={64}
              textSize={22}
              background="rgba(255,255,255,0.15)"
              borderColor="rgba(255,255,255,0.3)"
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2, padding: '2px 8px' }}>
            <span style={{ fontSize: 19, fontWeight: 900, color: 'var(--brand-hero-text, white)' }}>{user.full_name}</span>
            {verified && social ? <GoldBadge size="md" /> : verified && <VerifiedBadge size="md" />}
          </div>
        </div>

        {/* Stats pill */}
        <div style={{ padding: '12px 16px 0' }}>
          <ProfileStatsPill rating={liveRating} reviewCount={liveRatingCount} postedCount={postedCount} completedCount={completedCount} />
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

        {/* SECTION 2b — Reliability */}
        <TrustCard user={liveUser} reviews={reviews} tasks={[]} isPublic />

        {/* Reviews are NOT rendered inline: the block ate half the page and the
            same content is one tap away in the history sheet below — which is
            exactly how the personal profile is laid out. */}

        {/* About + professional areas + service areas — ONE card, not three.
            The SAME component the personal profile uses, so the two match. */}
        <ProfileAboutCard bio={user.bio} categories={categories} cities={cities} scope={scope} selectable />

        {/* SECTION 6 — ABOUT ME */}
        {(user.profile_media?.length > 0 || user.intro_video_url) && (
          <div style={{ background: 'var(--brand-card-bg, var(--surface-2))', borderRadius: 14, border: '1px solid var(--border-1)', padding: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
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

        {/* Certificates */}
        {(user.certificate_files?.length > 0) && (
          <div style={{ background: 'var(--brand-card-bg, var(--surface-2))', borderRadius: 14, border: '1px solid var(--border-1)', padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 8 }}>
              <FileText size={12} color="var(--text-3)" />
              <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-3)' }}>{t('pr_certs')}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(user.certificate_files || []).map(doc => (
                <a key={doc.url} href={doc.url} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--surface-3)', border: '1px solid var(--border-1)', borderRadius: 12, padding: '10px 12px', textDecoration: 'none' }}>
                  <FileText size={16} color="var(--text-2)" style={{ flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.name}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--brand-primary)' }}>{t('pr_view')}</span>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* SECTION 9 — SOCIAL NETWORKS (verified only) */}
        {social && (
          <div style={{ background: 'var(--brand-card-bg, var(--surface-2))', borderRadius: 14, border: '1px solid var(--border-1)', padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 10 }}>
              <Link2 size={12} color="var(--text-3)" />
              <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-3)' }}>{t('pp_social_networks')}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { key: 'instagram', label: 'Instagram', username: user.instagram_username, verified: user.instagram_verified, url: `https://instagram.com/${user.instagram_username}`, icon: Instagram, color: 'linear-gradient(135deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)' },
                { key: 'facebook', label: 'Facebook', username: user.facebook_username, verified: user.facebook_verified, url: `https://facebook.com/${user.facebook_username}`, icon: Facebook, color: '#1877F2' },
                { key: 'tiktok', label: 'TikTok', username: user.tiktok_username, verified: user.tiktok_verified, url: `https://tiktok.com/@${user.tiktok_username}`, icon: Music2, color: 'linear-gradient(135deg, #25F4EE, #000000, #FE2C55)' },
              ].filter(p => p.username && p.verified).map(p => (
                <a key={p.key} href={p.url} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--surface-4)', border: '1px solid var(--border-1)', borderRadius: 12, padding: '8px 10px', textDecoration: 'none' }}>
                  <span style={{ width: 36, height: 36, borderRadius: 10, background: p.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: 'var(--shadow-xs)' }}>
                    <p.icon size={17} color="white" />
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>@{p.username}</div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', marginTop: 1 }}>{p.label}</div>
                  </div>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 3, background: '#fffbeb', border: '1px solid #fde68a', color: '#d97706', fontSize: 10, fontWeight: 800, padding: '3px 8px', borderRadius: 99, flexShrink: 0 }}>
                    <ShieldCheck size={11} color="#d97706" /> {t('pp_verified')}
                  </span>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Unified history button */}
        {(completedCount > 0 || postedCount > 0 || reviews.length > 0) && (
          <div style={{ background: 'var(--brand-card-bg, var(--surface-2))', borderRadius: 14, border: '1px solid var(--border-1)', overflow: 'hidden' }}>
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
            <SearchX size={40} color="var(--text-3)" strokeWidth={1.5} style={{ marginBottom: 12 }} />
            <div style={{ fontSize: 15, fontWeight: 700 }}>{t('pp_user_no_profile')}</div>
          </div>
        )}

        <div style={{ height: 16 }} />
      </div>

      {/* Unified History Sheet */}
      {showUnifiedHistory && createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'var(--overlay-bg)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={() => setShowUnifiedHistory(false)}>
          <div className="j-modal-surface" style={{ background: 'var(--brand-modal-bg, var(--surface-2))', borderRadius: 'var(--brand-modal-radius, 24px) var(--brand-modal-radius, 24px) 0 0', width: '100%', maxWidth: 480, maxHeight: '82vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px 12px', borderBottom: '1px solid var(--border-1)' }}>
              <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-1)' }}>{t('pr_history_reviews')}</span>
              <button onClick={() => setShowUnifiedHistory(false)} style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--surface-3)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={16} color="var(--text-2)" />
              </button>
            </div>
            <div style={{ overflowY: 'auto', padding: '16px 20px 32px', display: 'flex', flexDirection: 'column', gap: 18 }} dir="rtl">
              {/* The reviews, in the EXACT design the personal profile shows —
                  the same component, the same order, the same props. */}
              <ReviewsSection
                reviews={reviews}
                tasks={[...completedTasks, ...postedTasks]}
                profileUserId={userId}
                rating={liveRating}
                scope={scope}
                showTaskTitle
              />

              <TaskReviewHistory tasks={[...completedTasks, ...postedTasks]} reviews={reviews} userId={userId} clickable={false} hidePrices scope={scope} />
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}