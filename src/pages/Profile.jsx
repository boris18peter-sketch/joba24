import { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { myPublishedTasksQuery, pendingApplicationsQuery } from '@/lib/queries';
import {
  LogOut, Briefcase, CreditCard, ChevronLeft, Loader2,
  X, Trash2, Clock, BarChart3, Pencil, FileText, MapPin, ShieldCheck, Link2,
} from 'lucide-react';
import VerificationStatusBanner from '@/components/VerificationStatusBanner';
import VerifiedBadge from '@/components/VerifiedBadge';
import GoldBadge from '@/components/GoldBadge';
import TrustCard from '@/components/TrustCard';
import SubscriptionManager from '@/components/credits/SubscriptionManager';
import SocialLinksSection from '@/components/SocialLinksSection';
import ProfileSubscriptionCard from '@/components/profile/ProfileSubscriptionCard';
import ReviewsSection from '@/components/profile/ReviewsSection';
import ProfileMediaGallery from '@/components/ProfileMediaGallery';
import TaskReviewHistory from '@/components/TaskReviewHistory';
import ProfileStatsPill from '@/components/profile/ProfileStatsPill';
import ProfileAvatar from '@/components/profile/ProfileAvatar';
import ProfileAboutCard from '@/components/profile/ProfileAboutCard';
import { profileHeroBackground } from '@/lib/profileTier';
import { useTaskSheet } from '@/lib/TaskSheetContext';
import { Link, useNavigate } from 'react-router-dom';
import { getCategoryLabel } from '@/lib/categories';
import { useProfessionalScope } from '@/lib/brand/professionalScope';
import { useBrand } from '@/lib/brand/BrandProvider';
import { getCityLabel } from '@/lib/cityLabels';
import { computeLockedJobas } from '@/lib/jobaBalance';
import { calculateTrustScore } from '@/lib/trustScore';
import { useLanguage } from '@/lib/LanguageContext';
import { useAuth } from '@/lib/AuthContext';
import { isUserVerified, hasSocialVerified } from '@/lib/utils';

// One neutral icon tile for every row; only the destructive rows are coloured,
// so colour marks meaning — "this signs you out", "this deletes your account" —
// instead of decorating a list of six different hues.
function MenuRow({ icon: Icon, label, sub, onClick, to, danger, last }) {
  const inner = (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '13px 14px', cursor: 'pointer',
        transition: 'background 0.13s',
      }}
      onPointerDown={e => { e.currentTarget.style.background = 'var(--surface-3)'; }}
      onPointerUp={e => { e.currentTarget.style.background = ''; }}
      onPointerLeave={e => { e.currentTarget.style.background = ''; }}
    >
      <div style={{ width: 38, height: 38, borderRadius: 11, background: danger ? 'var(--color-danger-bg)' : 'var(--surface-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={17} color={danger ? 'var(--color-danger)' : 'var(--text-2)'} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: danger ? '#dc2626' : 'var(--text-1)' }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 1 }}>{sub}</div>}
      </div>
      <ChevronLeft size={15} color="var(--text-3)" />
    </div>
  );
  return (
    <>
      {to ? <Link to={to} style={{ textDecoration: 'none', display: 'block' }}>{inner}</Link> : inner}
      {!last && <div style={{ height: 1, background: 'var(--border-1)', margin: '0 14px 0 56px' }} />}
    </>
  );
}

export default function Profile() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { t, isRTL, lang } = useLanguage();
  const { user: authUser, refreshUser, logout } = useAuth();
  const scope = useProfessionalScope();
  // Profile task lists are Brand-contextual — a global account's Tasks must not
  // leak between Brands. Scoped by the Task's own origin_brand_id.
  const { currentBrandId, isPlatformBrand } = useBrand();
  const completedScope = isPlatformBrand ? {} : { origin_brand_id: currentBrandId };
  const { openTaskSheet } = useTaskSheet();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showUnifiedHistory, setShowUnifiedHistory] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const handleDeleteAccount = async () => {
    setDeleteLoading(true);
    try {
      await base44.auth.deleteAccount();
    } catch (e) {
      try { await base44.auth.updateMe({ account_deleted: true }); } catch {}
    }
    // The app's own logout, so a deleted account lands on the welcome screen
    // with a clean session rather than on the publish form.
    logout();
    setDeleteLoading(false);
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await base44.auth.updateMe({ profile_photo: file_url });
      await refreshUser();
    } finally {
      setUploadingPhoto(false);
    }
  };

  const me = authUser;
  const isLoading = !me;

  const { data: reviews = [] } = useQuery({
    queryKey: ['myReviews', me?.id],
    queryFn: () => base44.entities.Review.filter({ reviewee_id: me.id }, '-created_date', 100),
    enabled: !!me?.id,
    staleTime: 60000,
  });

  useEffect(() => {
    if (!me?.id) return;
    const unsub = base44.entities.Review.subscribe((event) => {
      if (event.data?.reviewee_id === me.id) {
        queryClient.invalidateQueries({ queryKey: ['myReviews', me.id] });
      }
    });
    return unsub;
  }, [me?.id]);

  // My COMPLETED worker tasks — the worker side of the review history.
  //
  // Renamed from ['workerTasks', me.id], a key the PUBLIC worker profile also
  // used for a different list (that user's tasks, any status). Two different
  // queryFns under one key means whichever screen mounted first silently decides
  // what the other sees — this page could have been handed all-status tasks
  // where it needed completed ones, or the reverse.
  const { data: workerTasks = [] } = useQuery({
    queryKey: ['myCompletedWorkerTasks', me?.id],
    queryFn: () => base44.entities.Task.filter({ worker_id: me.id, status: 'COMPLETED', ...completedScope }, '-created_date', 50),
    enabled: !!me?.id && !!currentBrandId,
    staleTime: 30000,
  });

  // Every task this account PUBLISHED — not only the completed ones. Filtering
  // by status hid a freshly posted task from its own publisher's profile.
  //
  // Reads the ONE shared published list (see @/lib/queries) and applies this
  // screen's Brand scope in memory, rather than downloading a private second copy
  // under its own key. That copy was also invalidated nowhere, so it could sit
  // stale until the next window focus; the shared list is kept live by the
  // realtime layer.
  const { data: allPostedTasks = [] } = useQuery(myPublishedTasksQuery(me?.id));
  const postedTasks = useMemo(
    () => (isPlatformBrand ? allPostedTasks : allPostedTasks.filter((t) => t.origin_brand_id === currentBrandId)),
    [allPostedTasks, isPlatformBrand, currentBrandId],
  );

  // Locked Jobas — the shared pending-applications query.
  const { data: myApplications = [] } = useQuery(pendingApplicationsQuery(me?.id));
  const lockedJobas = computeLockedJobas(myApplications);

  if (isLoading) {
    return (
      <div dir={isRTL ? 'rtl' : 'ltr'} style={{ background: 'var(--surface-1)', minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 size={28} className="animate-spin" color="var(--brand-primary)" />
      </div>
    );
  }

  const completedCount = me?.tasks_completed || workerTasks.length;
  const postedCount = postedTasks.length;
  const reviewsAvg = reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
  const rating = (me?.rating && me.rating > 0) ? me.rating : reviewsAvg;
  const avgRating = rating > 0 ? rating.toFixed(1) : '—';
  const initials = me?.full_name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';
  const cities = me?.preferred_cities || [];
  // Visibility only — the user's global categories are never modified, and a
  // category outside this Brand's scope stays stored and simply is not shown.
  const categories = scope.filter(me?.preferred_categories || []);
  const verified = isUserVerified(me);
  const social = hasSocialVerified(me);
  const trustScore = calculateTrustScore(me, { tasks: workerTasks, reviews });

  return (
    <div style={{ background: 'var(--surface-1)' }} dir={isRTL ? 'rtl' : 'ltr'}>
      {/* ── SECTION 1 — IDENTITY (compact hero) ── */}
      <div style={{
        background: profileHeroBackground(me, 'linear-gradient(160deg, var(--brand-hero-bg, #0a52b0) 0%, var(--brand-hero-bg, var(--brand-primary)) 55%, var(--brand-hero-bg, #2563eb) 100%)'),
        paddingBottom: 16, position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: -30, left: -20, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
        <div style={{ position: 'absolute', bottom: -40, right: -10, width: 80, height: 80, borderRadius: '50%', background: 'rgba(251,191,36,0.1)' }} />

        {/* Top bar */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px 0' }}>
          <span style={{ fontSize: 17, fontWeight: 800, color: 'var(--brand-hero-text, white)' }}>{t('profile_title')}</span>
          <button
            onClick={() => navigate('/worker-profile')}
            style={{ height: 34, paddingInline: 16, borderRadius: 20, background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.2)', color: 'var(--brand-hero-text, white)', fontWeight: 800, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, backdropFilter: 'blur(6px)' }}
          >
            <Pencil size={13} color="var(--brand-hero-text, white)" /> {t('pr_edit')}
          </button>
        </div>

        {/* Avatar + Name + badges — tighter, identity-first */}
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '14px 20px 0' }}>
          <div style={{ marginBottom: 8 }}>
            <ProfileAvatar
              user={me}
              size={104}
              textSize={34}
              editable
              onUpload={handlePhotoUpload}
              uploading={uploadingPhoto}
              background="rgba(255,255,255,0.15)"
              borderColor="rgba(255,255,255,0.3)"
              textColor="var(--brand-hero-text, white)"
            />
          </div>

          {/* Read-only here — the name is edited on the profile edit page
              (/worker-profile), which is the single place for profile edits. */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2, padding: '2px 8px' }}>
            <span style={{ fontSize: 19, fontWeight: 900, color: 'var(--brand-hero-text, white)' }}>{me?.full_name || 'User'}</span>
            {verified && social ? <GoldBadge size="md" /> : verified && <VerifiedBadge size="md" />}
          </div>

        </div>

        {/* Stats pill — 3 cubes directly under the name (legacy layout) */}
        <div style={{ padding: '12px 16px 0' }}>
          <ProfileStatsPill rating={rating} reviewCount={reviews.length} postedCount={postedCount} completedCount={completedCount} />
        </div>
      </div>

      {/* ── Content: trust hierarchy ── */}
      <div style={{ padding: '12px 14px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>

        {/* SECTION 2b — Reliability score (compact, clickable → existing modal) */}
        <TrustCard user={me} reviews={reviews} tasks={workerTasks} />

        {/* Verify CTA — status-aware */}
        <VerificationStatusBanner me={me} />

        {/* Reviews are NOT shown inline any more: the block took up half the
            page and the same content is one tap away in the sheet below. The
            component itself is unchanged — it simply renders inside that sheet
            now, so the design is identical to what used to sit here. */}

        {/* About + professional areas + service areas — ONE card, not three.
            Same block on the public profile (see ProfileAboutCard). */}
        <ProfileAboutCard bio={me?.bio} categories={categories} cities={cities} scope={scope} selectable />

        {/* SECTION 6 — ABOUT ME (personal gallery, renamed) */}
        {(me?.profile_media?.length > 0 || me?.intro_video_url) && (
          <div style={{ background: 'var(--brand-card-bg, var(--surface-2))', borderRadius: 14, border: '1px solid var(--border-1)', padding: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-3)' }}>{t('pr_about_me')}</span>
            </div>
            <ProfileMediaGallery
              media={[
                ...(me?.intro_video_url ? [{ type: 'video', url: me.intro_video_url }] : []),
                ...(me?.profile_media || []),
              ]}
              isEditing={false}
            />
          </div>
        )}

        {/* Certificates — professional documents */}
        {(me?.certificate_files?.length > 0) && (
          <div style={{ background: 'var(--brand-card-bg, var(--surface-2))', borderRadius: 14, border: '1px solid var(--border-1)', padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 8 }}>
              <FileText size={12} color="var(--text-3)" />
              <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-3)' }}>{t('pr_certs')}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(me?.certificate_files || []).map(doc => (
                <a key={doc.url} href={doc.url} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--surface-3)', border: '1px solid var(--border-1)', borderRadius: 12, padding: '10px 12px', textDecoration: 'none' }}>
                  <FileText size={16} color="var(--text-2)" style={{ flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.name}</span>
                  {/* The one colour on the row, because this row IS a link. */}
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--brand-primary)' }}>{t('pr_view')}</span>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* SECTION 9 — SOCIAL NETWORKS */}
        <SocialLinksSection user={me} />

        {/* Apple subscription — server-side normalized entitlement */}
        <ProfileSubscriptionCard />

        {/* Subscriptions */}
        <SubscriptionManager />

        {/* Menu — single grouped list */}
        <div style={{
          background: 'var(--brand-card-bg, var(--surface-2))', borderRadius: 14,
          border: '1px solid var(--border-1)', overflow: 'hidden',
        }}>
          <MenuRow icon={Briefcase} label={t('worker_profile')} sub={t('profession_certs_cities') || 'מקצוע, תעודות, ערים'} to="/worker-profile" />
          <MenuRow icon={CreditCard} label={t('credit_movement')} sub={t('balance_payments_history') || 'יתרה, תשלומים, היסטוריה'} to="/wallet" />
          <MenuRow icon={BarChart3} label={t('earnings_dashboard') || 'דשבורד רווחים'} sub={t('earnings_summary_sub') || 'הכנסות לפי תקופות'} to="/earnings" />
          <MenuRow icon={Clock} label={t('pr_history_reviews')} sub={t('pr_history_count', { n: completedCount + postedCount, m: reviews.length })} onClick={() => setShowUnifiedHistory(true)} />
          <MenuRow icon={LogOut} label={t('logout')} danger onClick={() => logout()} />
          <MenuRow icon={Trash2} label={t('delete_account')} danger onClick={() => setShowDeleteConfirm(true)} last />
        </div>
      </div>

      {/* Unified History & Reviews Sheet */}
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
              {/* The reviews, in the EXACT design the profile used to show inline */}
              <ReviewsSection
                reviews={reviews}
                tasks={[...workerTasks, ...postedTasks]}
                profileUserId={me?.id}
                rating={rating}
                scope={scope}
                showTaskTitle
              />

              <TaskReviewHistory tasks={[...workerTasks, ...postedTasks]} reviews={reviews} userId={me.id} onTaskClick={openTaskSheet} scope={scope} />
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Delete Confirm Sheet */}
      {showDeleteConfirm && createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex: 999999, background: 'var(--overlay-bg)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
          onClick={e => { if (e.target === e.currentTarget) setShowDeleteConfirm(false); }}>
          <div dir="rtl" className="j-modal-surface" style={{ background: 'var(--brand-modal-bg, var(--surface-2))', border:'1px solid var(--brand-modal-border, var(--border-1))', borderRadius: 'var(--brand-modal-radius, 24px) var(--brand-modal-radius, 24px) 0 0', width: '100%', maxWidth: 480, padding: '0 20px', paddingBottom: 'max(24px, env(safe-area-inset-bottom))', boxShadow: '0 -16px 60px rgba(0,0,0,0.25)' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ width: 40, height: 4, borderRadius: 99, background: 'var(--border-1)', margin: '14px auto 20px' }} />
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ width: 56, height: 56, borderRadius: 18, background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                <Trash2 size={26} color="#dc2626" strokeWidth={1.6} />
              </div>
              <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--text-1)', marginBottom: 8 }}>{t('delete_account')}</div>
              <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6 }}>{t('action_permanent')}<br />{t('data_deleted')}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button onClick={handleDeleteAccount} disabled={deleteLoading}
                style={{ width: '100%', height: 48, borderRadius: 14, background: deleteLoading ? '#fca5a5' : 'linear-gradient(135deg,var(--color-danger),var(--color-danger))', border: 'none', color: 'var(--brand-btn-primary-text, white)', fontWeight: 900, fontSize: 15, cursor: deleteLoading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                {deleteLoading ? <Loader2 size={18} className="animate-spin" /> : <><Trash2 size={16} /> {t('yes_delete')}</>}
              </button>
              <button onClick={() => setShowDeleteConfirm(false)} disabled={deleteLoading}
                style={{ width: '100%', height: 44, borderRadius: 14, background: 'var(--surface-3)', border: '1px solid var(--border-1)', color: 'var(--text-1)', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                {t('cancel')}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}