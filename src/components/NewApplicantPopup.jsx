import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router-dom';
import { Loader2, Check, MessageCircle, ChevronLeft, User } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { useLanguage } from '@/lib/LanguageContext';
import { invalidateTaskCaches } from '@/lib/taskSync';
import { isUserVerified } from '@/lib/utils';
import VerifiedBadge from '@/components/VerifiedBadge';
import GoldBadge from '@/components/GoldBadge';
import StarRating from '@/components/profile/StarRating';
import { profileHeroBackground } from '@/lib/profileTier';

/**
 * NewApplicantPopup — a candidate just applied to one of MY tasks.
 *
 * ── THE SAME HERO AS THE PROFILE PAGE ───────────────────────────────────────
 * A candidate is a person you are being asked to trust with a job, so he is
 * introduced exactly the way his own profile introduces him: the brand gradient,
 * the big round photo, the name with its verification badge and the rating
 * underneath. The publisher recognises the person, not a row of data.
 *
 * Tapping the photo (or the pill under it) opens his full profile. The alert is
 * deliberately NOT cleared on the way out — the sheet is simply hidden while the
 * profile is on screen, so going back re-opens it exactly where he left it.
 */
export default function NewApplicantPopup({ task, application, onClose }) {
  const { t, isRTL } = useLanguage();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const [approving, setApproving] = useState(false);

  // ── THE CANDIDATE'S FACE SHOULD BE THERE AT ONCE ──────────────────────────
  // The photo used to arrive only after this popup had waited for the profile
  // request to come back: the sheet opened on an empty circle and filled in a
  // second later, which read as "loading, probably slow". Two changes fix that
  // without touching what is fetched:
  //   • the last known profile for this worker is kept on the device, so the
  //     SECOND (and every later) time his popup opens, his photo and name paint
  //     on the very first frame while the request refreshes them in place;
  //   • a photo that still has to travel shows the app's own shimmer inside the
  //     circle and fades in when it lands, so the wait looks deliberate instead
  //     of broken.
  const cacheKey = application?.worker_id ? `joba_applicant_${application.worker_id}` : null;
  const cachedProfile = (() => {
    if (!cacheKey) return null;
    try { return JSON.parse(localStorage.getItem(cacheKey) || 'null'); } catch { return null; }
  })();
  const [photoLoaded, setPhotoLoaded] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ['applicantProfile', application?.worker_id],
    queryFn: async () => {
      const res = await base44.functions.invoke('getPublicUserProfile', {
        userId: application.worker_id,
        taskId: task.id,
      });
      const fetched = res.data?.user || null;
      if (fetched && cacheKey) {
        try { localStorage.setItem(cacheKey, JSON.stringify(fetched)); } catch { /* storage full — never break the popup */ }
      }
      return fetched;
    },
    enabled: !!application?.worker_id,
    staleTime: 120000,
    placeholderData: cachedProfile,
  });

  const name = profile?.full_name || application?.worker_name || '';
  const rating = Number(profile?.rating || 0);
  const reviewCount = Number(profile?.rating_count || 0);
  const verified = profile ? isUserVerified(profile) : false;
  const socialVerified = !!(profile?.instagram_verified || profile?.facebook_verified || profile?.tiktok_verified);

  // The profile is a full screen of its own: hide the sheet while it is open, and
  // it comes straight back when the visitor returns to this page.
  if (location.pathname.startsWith('/public-profile')) return null;

  const openProfile = () => {
    if (!application?.worker_id) return;
    navigate(`/public-profile?id=${application.worker_id}`);
  };

  const approve = async () => {
    if (approving) return;
    setApproving(true);
    try {
      await base44.functions.invoke('approveWorker', {
        taskId: task.id,
        applicationId: application.id,
        workerId: application.worker_id,
        workerName: name || application.worker_name,
      });
      invalidateTaskCaches(queryClient, { taskId: task.id });
      queryClient.invalidateQueries({ queryKey: ['applications', task.id] });
      toast.success(t('applicant_approved_toast') || 'המועמד אושר');
      setApproving(false);
      onClose();
    } catch (err) {
      setApproving(false);
      toast.error(err?.message || t('generic_error') || 'משהו השתבש, נסה שוב');
    }
  };

  const heroText = 'var(--brand-hero-text, #ffffff)';

  return createPortal(
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 2000000,
        background: 'var(--overlay-bg)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        backdropFilter: 'blur(6px)',
      }}
      onClick={onClose}
    >
      <div
        dir={isRTL ? 'rtl' : 'ltr'}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--brand-modal-bg, var(--surface-1))',
          border: '1px solid var(--brand-modal-border, var(--border-1))',
          borderRadius: 'var(--brand-modal-radius, 24px) var(--brand-modal-radius, 24px) 0 0',
          width: '100%', maxWidth: 480,
          boxShadow: 'var(--shadow-xl)',
          padding: '12px 16px',
          paddingBottom: 'max(24px, env(safe-area-inset-bottom))',
          animation: 'sheetSlideUp 0.3s cubic-bezier(0.32,1.2,0.64,1)',
          maxHeight: '92dvh',
          overflowY: 'auto',
          overscrollBehavior: 'contain',
        }}
      >
        <div style={{ width: 40, height: 4, borderRadius: 99, background: 'var(--border-1)', margin: '0 auto 14px' }} />

        {/* ── THE CANDIDATE — the profile page's own hero ── */}
        <div style={{
          position: 'relative', overflow: 'hidden',
          borderRadius: 20,
          /* The SAME surface his own profile wears — gold for identity + social
             verified, green for identity only, brand blue otherwise — so the
             person on the popup is recognisably the person on the profile. */
          background: profileHeroBackground(profile, 'linear-gradient(160deg, var(--brand-hero-bg, #0a52b0) 0%, var(--brand-hero-bg, var(--brand-primary)) 55%, #2563eb 100%)'),
          padding: '16px 14px 14px',
          textAlign: 'center',
        }}>
          <div style={{ position: 'absolute', top: -34, left: -18, width: 96, height: 96, borderRadius: '50%', background: 'rgba(255,255,255,0.07)' }} />
          <div style={{ position: 'absolute', bottom: -40, right: -12, width: 86, height: 86, borderRadius: '50%', background: 'rgba(251,191,36,0.12)' }} />

          <div style={{ position: 'relative', fontSize: 12, fontWeight: 800, color: heroText, opacity: 0.85, marginBottom: 10 }}>
            {t('applicant_popup_title') || 'מועמד חדש למשימה שלך'}
          </div>

          {/* Photo — one tap opens the full profile */}
          <button
            onClick={openProfile}
            aria-label={t('applicant_popup_view_profile') || 'לפרופיל המלא'}
            style={{
              position: 'relative', display: 'block', margin: '0 auto',
              width: 96, height: 96, borderRadius: '50%', padding: 0,
              border: '3px solid rgba(255,255,255,0.55)',
              background: 'rgba(255,255,255,0.18)',
              overflow: 'hidden', cursor: 'pointer',
              boxShadow: '0 8px 22px rgba(3,20,60,0.28)',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            {!profile ? (
              /* The profile is still on its way and nothing is cached yet — the
                 shimmer says "arriving" instead of an empty grey circle. */
              <span className="j-img-skeleton" style={{ borderRadius: '50%' }} />
            ) : profile.profile_photo ? (
              <>
                {!photoLoaded && <span className="j-img-skeleton" style={{ borderRadius: '50%' }} />}
                <img
                  src={profile.profile_photo}
                  alt={name}
                  loading="eager"
                  decoding="async"
                  fetchPriority="high"
                  onLoad={() => setPhotoLoaded(true)}
                  onError={() => setPhotoLoaded(true)}
                  style={{
                    width: '100%', height: '100%', objectFit: 'cover', display: 'block',
                    opacity: photoLoaded ? 1 : 0,
                    transition: 'opacity 0.22s ease',
                  }}
                />
              </>
            ) : (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <User size={38} color="rgba(255,255,255,0.85)" />
              </span>
            )}
          </button>

          {/* Name + verification */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 9 }}>
            <span style={{ fontSize: 19, fontWeight: 900, color: heroText, letterSpacing: -0.3 }}>{name}</span>
            {verified && (socialVerified ? <GoldBadge size="md" /> : <VerifiedBadge size="md" />)}
          </div>

          {/* Rating — the stars, the score and how many people gave it */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 6 }}>
            <StarRating value={rating} size={15} gap={2} />
            <span style={{ fontSize: 12.5, fontWeight: 800, color: heroText }}>
              {rating > 0 ? rating.toFixed(1) : (t('applicant_no_rating') || 'מועמד חדש')}
            </span>
            {reviewCount > 0 && (
              <span style={{ fontSize: 11.5, fontWeight: 700, color: heroText, opacity: 0.8 }}>
                ({reviewCount})
              </span>
            )}
          </div>

          {/* The way into the profile — directly under the rating, where the eye
              stops. The completed-tasks line that used to sit between the two was
              removed: it repeated what the rating already says and pushed the
              profile link away from the person it belongs to. */}
          <button
            onClick={openProfile}
            style={{
              position: 'relative',
              display: 'inline-flex', alignItems: 'center', gap: 4,
              marginTop: 12, padding: '6px 12px', borderRadius: 99,
              background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.28)',
              color: heroText, fontSize: 12, fontWeight: 800, cursor: 'pointer',
              minHeight: 'unset', minWidth: 'unset',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <span>{t('applicant_popup_view_profile') || 'לפרופיל המלא'}</span>
            <ChevronLeft size={13} strokeWidth={2.4} style={{ transform: isRTL ? 'none' : 'rotate(180deg)' }} />
          </button>
        </div>

        {/* ── His message, in the task's own card ── */}
        <div style={{
          background: 'var(--brand-card-bg, var(--surface-2))',
          borderRadius: 'var(--r-lg)',
          border: '1px solid var(--border-1)',
          boxShadow: 'var(--shadow-xs)',
          padding: 14,
          marginTop: 10,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-3)', letterSpacing: 0.3 }}>
              {t('applicant_popup_applied_to') || 'הגיש בקשה ל'}
            </span>
            <span style={{ fontSize: 13, fontWeight: 900, color: 'var(--text-1)', whiteSpace: 'nowrap' }}>₪{Math.round(task?.price || 0)}</span>
          </div>
          <div style={{ fontSize: 15, fontWeight: 900, color: 'var(--text-1)', lineHeight: 1.3, marginTop: 3 }}>
            {task?.title}
          </div>

          {application?.message && (
            <div style={{ display: 'flex', gap: 7, marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border-1)' }}>
              <MessageCircle size={13} style={{ flexShrink: 0, marginTop: 3, color: 'var(--text-3)' }} />
              <span style={{ fontSize: 12.5, lineHeight: 1.55, color: 'var(--text-2)' }}>{application.message}</span>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button
            onClick={onClose}
            style={{
              height: 52, padding: '0 18px', borderRadius: 14, flexShrink: 0,
              background: 'var(--surface-3)', border: '1px solid var(--border-1)',
              color: 'var(--text-2)', fontWeight: 700, fontSize: 14, cursor: 'pointer',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            {t('later_btn') || 'אחר כך'}
          </button>
          <button
            onClick={approve}
            disabled={approving}
            style={{
              flex: 1, height: 52, borderRadius: 14,
              background: 'var(--brand-btn-primary-bg, var(--brand-primary))',
              border: 'none', fontSize: 15.5, fontWeight: 900,
              color: 'var(--brand-btn-primary-text, #ffffff)',
              cursor: approving ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: approving ? 'none' : '0 6px 18px rgba(26,111,212,0.26)',
              opacity: approving ? 0.75 : 1,
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            {approving ? <Loader2 size={18} className="animate-spin" /> : (
              <>
                <Check size={17} strokeWidth={2.6} />
                <span>{t('applicant_popup_approve') || 'אישור מיידי'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}