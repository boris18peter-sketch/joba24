import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  Loader2, Trash2, Briefcase, CreditCard, Clock, Wallet,
  Settings, ShieldCheck, ShieldAlert, Sparkles, MapPin, Images, X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ProfileHeader from '@/components/profile/ProfileHeader';
import ReputationSummary from '@/components/profile/ReputationSummary';
import ProfileRow, { ProfileSection } from '@/components/profile/ProfileRow';
import ProfileSheet from '@/components/profile/ProfileSheet';
import TaxonomySheet from '@/components/profile/TaxonomySheet';
import MediaSheet from '@/components/profile/MediaSheet';
import SubscriptionSheet from '@/components/profile/SubscriptionSheet';
import AccountSettingsSheet from '@/components/profile/AccountSettingsSheet';
import ReviewsSection from '@/components/profile/ReviewsSection';
import TaskReviewHistory from '@/components/TaskReviewHistory';
import VerifyModal from '@/components/VerifyModal';
import { useTaskSheet } from '@/lib/TaskSheetContext';
import { useProfessionalScope } from '@/lib/brand/professionalScope';
import { useBrand } from '@/lib/brand/BrandProvider';
import { getCityLabel } from '@/lib/cityLabels';
import { computeLockedJobas } from '@/lib/jobaBalance';
import { calculateTrustScore } from '@/lib/trustScore';
import { useLanguage } from '@/lib/LanguageContext';
import { useAuth } from '@/lib/AuthContext';
import { isUserVerified, hasSocialVerified } from '@/lib/utils';

/**
 * Profile — identity, reputation, and one place to manage everything else.
 *
 * The page answers three questions and nothing more:
 *   1. Who am I, and how does my profile appear?   → header + bio
 *   2. What is my reputation and verification?      → reputation block + rows
 *   3. Where do I manage my details and account?    → the two settings groups
 *
 * Everything detailed (reviews, breakdown, skills, areas, gallery, subscription,
 * account actions) opens in a sheet, so nothing is lost and the page stays short.
 * All data loading, writes and third-party flows are unchanged.
 */
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

  const [sheet, setSheet] = useState(null); // skills | areas | media | subscription | account | reviews
  const [showVerify, setShowVerify] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showUnifiedHistory, setShowUnifiedHistory] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const photoInputRef = useRef(null);

  const handleDeleteAccount = async () => {
    setDeleteLoading(true);
    try {
      await base44.auth.deleteAccount();
    } catch (e) {
      try { await base44.auth.updateMe({ account_deleted: true }); } catch {}
    }
    await base44.auth.logout('/');
    setDeleteLoading(false);
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    await base44.auth.updateMe({ profile_photo: file_url });
    await refreshUser();
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

  const { data: workerTasks = [] } = useQuery({
    queryKey: ['workerTasks', me?.id],
    queryFn: () => base44.entities.Task.filter({ worker_id: me.id, status: 'COMPLETED', ...completedScope }, '-created_date', 50),
    enabled: !!me?.id && !!currentBrandId,
    staleTime: 30000,
  });

  // Every task this account PUBLISHED — not only the completed ones. Filtering
  // by status hid a freshly posted task from its own publisher's profile.
  const { data: postedTasks = [] } = useQuery({
    queryKey: ['postedTasks', me?.id],
    queryFn: () => base44.entities.Task.filter({ client_id: me.id, ...completedScope }, '-created_date', 50),
    enabled: !!me?.id && !!currentBrandId,
    staleTime: 30000,
  });

  const { data: myApplications = [] } = useQuery({
    queryKey: ['myLockedJobas', me?.id],
    queryFn: () => base44.entities.TaskApplication.filter({ worker_id: me.id, status: 'pending' }, '-created_date', 50),
    enabled: !!me?.id,
    staleTime: 15000,
  });
  const lockedJobas = computeLockedJobas(myApplications);

  if (isLoading) {
    return (
      <div dir={isRTL ? 'rtl' : 'ltr'} style={{ background: 'var(--surface-2)', minHeight: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 size={28} className="animate-spin" color="var(--brand-primary)" />
      </div>
    );
  }

  const completedCount = me?.tasks_completed || workerTasks.length;
  const postedCount = postedTasks.length;
  const reviewsAvg = reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
  const rating = (me?.rating && me.rating > 0) ? me.rating : reviewsAvg;
  const initials = me?.full_name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';
  const cities = me?.preferred_cities || [];
  // Visibility only — the user's global categories are never modified, and a
  // category outside this Brand's scope stays stored and simply is not shown.
  const categories = scope.filter(me?.preferred_categories || []);
  const verified = isUserVerified(me);
  const social = hasSocialVerified(me);
  const kycStatus = me?.kyc_status;
  const trustScore = calculateTrustScore(me, { tasks: workerTasks, reviews });

  const mediaCount = (me?.profile_media?.length || 0) + (me?.intro_video_url ? 1 : 0);

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} style={{ background: 'var(--surface-2)', minHeight: '100%', paddingBottom: 28 }}>

      {/* 1 — IDENTITY */}
      <ProfileHeader
        me={me}
        initials={initials}
        rating={rating}
        reviewCount={reviews.length}
        completedCount={completedCount}
        verified={verified}
        social={social}
        onEdit={() => navigate('/worker-profile')}
        onAvatarClick={() => photoInputRef.current?.click()}
        avatarInputRef={photoInputRef}
        onAvatarChange={handlePhotoUpload}
      />

      {me?.bio && (
        <p
          className="selectable-text"
          style={{
            margin: '12px 20px 0', fontSize: 14.5, lineHeight: 1.65,
            color: 'var(--text-2)',
          }}
        >
          {me.bio}
        </p>
      )}

      {/* 2 — REPUTATION (rating → reviews, reliability → breakdown) */}
      <ReputationSummary
        me={me}
        reviews={reviews}
        tasks={workerTasks}
        rating={rating}
        reviewCount={reviews.length}
        onOpenReviews={() => setSheet('reviews')}
      />

      {/* 3 — MY DETAILS */}
      <ProfileSection title={t('pr_my_details')}>
        <ProfileRow
          icon={Briefcase}
          label={t('worker_profile')}
          to="/worker-profile"
        />
        <ProfileRow
          icon={Sparkles}
          label={t('pr_skills')}
          value={categories.length > 0 ? t('pr_skills_count', { n: categories.length }) : t('pr_none_yet')}
          onClick={() => setSheet('skills')}
        />
        <ProfileRow
          icon={MapPin}
          label={t('pr_areas')}
          value={cities.length > 0 ? t('pr_areas_count', { n: cities.length }) : t('pr_none_yet')}
          onClick={() => setSheet('areas')}
        />
        {mediaCount > 0 && (
          <ProfileRow
            icon={Images}
            label={t('pr_media_gallery')}
            value={t('pr_media_count', { n: mediaCount })}
            onClick={() => setSheet('media')}
          />
        )}
        <ProfileRow
          icon={verified ? ShieldCheck : ShieldAlert}
          iconColor={verified ? 'var(--color-success)' : 'var(--brand-primary)'}
          label={t('pr_identity_verification')}
          value={verified ? t('pr_verified_label') : kycStatus === 'pending' ? t('pr_verify_pending') : t('pr_not_verified')}
          valueColor={verified ? 'var(--color-success)' : kycStatus === 'pending' ? 'var(--color-warning)' : 'var(--brand-primary)'}
          onClick={verified ? undefined : () => setShowVerify(true)}
          last
        />
      </ProfileSection>

      {/* 4 — ACCOUNT & PAYMENTS */}
      <ProfileSection title={t('pr_account_payments')}>
        <ProfileRow
          icon={CreditCard}
          label={t('pr_my_subscription')}
          onClick={() => setSheet('subscription')}
        />
        <ProfileRow
          icon={Wallet}
          label={t('pr_purchases_jobas')}
          to="/wallet"
        />
        <ProfileRow
          icon={Clock}
          label={t('pr_history_reviews')}
          value={t('pr_history_count', { n: completedCount + postedCount, m: reviews.length })}
          onClick={() => setShowUnifiedHistory(true)}
        />
        <ProfileRow
          icon={Settings}
          label={t('pr_account_settings')}
          onClick={() => setSheet('account')}
          last
        />
      </ProfileSection>

      {/* ── Detail sheets ─────────────────────────────────────────────── */}

      {sheet === 'reviews' && (
        <ProfileSheet title={t('rev_section_title')} onClose={() => setSheet(null)}>
          <div style={{ paddingBottom: 8 }}>
            <ReviewsSection
              reviews={reviews}
              tasks={[...workerTasks, ...postedTasks]}
              profileUserId={me?.id}
              rating={rating}
              scope={scope}
              showTaskTitle
              bare
            />
          </div>
        </ProfileSheet>
      )}

      {sheet === 'skills' && (
        <TaxonomySheet
          title={t('pr_skills')}
          subtitle={t('pr_skills_sub')}
          items={categories}
          renderLabel={(key) => scope.label(key, t)}
          emptyText={t('pr_skills_empty')}
          onClose={() => setSheet(null)}
        />
      )}

      {sheet === 'areas' && (
        <TaxonomySheet
          title={t('pr_areas')}
          subtitle={t('pr_areas_sub')}
          items={cities}
          renderLabel={(key) => getCityLabel(key, lang)}
          emptyText={t('pr_areas_empty')}
          onClose={() => setSheet(null)}
        />
      )}

      {sheet === 'media' && <MediaSheet me={me} onClose={() => setSheet(null)} />}
      {sheet === 'subscription' && <SubscriptionSheet onClose={() => setSheet(null)} />}

      {sheet === 'account' && (
        <AccountSettingsSheet
          me={me}
          onClose={() => setSheet(null)}
          onLogout={() => logout()}
          onDelete={() => { setSheet(null); setShowDeleteConfirm(true); }}
        />
      )}

      {/* Identity verification — the same modal as before */}
      {showVerify && (
        <VerifyModal onClose={() => setShowVerify(false)} onSuccess={() => setShowVerify(false)} />
      )}

      {/* Unified History & Reviews Sheet (unchanged) */}
      {showUnifiedHistory && createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'var(--overlay-bg)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={() => setShowUnifiedHistory(false)}>
          <div className="j-modal-surface" style={{ background: 'var(--brand-modal-bg, var(--surface-2))', borderRadius: 'var(--brand-modal-radius, 24px) var(--brand-modal-radius, 24px) 0 0', width: '100%', maxWidth: 480, maxHeight: '82vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px 12px', borderBottom: '1px solid var(--border-1)' }}>
              <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-1)' }}>{t('pr_history_reviews')}</span>
              <button onClick={() => setShowUnifiedHistory(false)} style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--surface-3)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={16} color="var(--text-2)" />
              </button>
            </div>
            <div style={{ overflowY: 'auto', padding: '16px 20px 32px' }} dir="rtl">
              <TaskReviewHistory tasks={[...workerTasks, ...postedTasks]} reviews={reviews} userId={me.id} onTaskClick={openTaskSheet} scope={scope} />
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Delete Confirm Sheet (unchanged) */}
      {showDeleteConfirm && createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex: 999999, background: 'var(--overlay-bg)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
          onClick={e => { if (e.target === e.currentTarget) setShowDeleteConfirm(false); }}>
          <div dir="rtl" className="j-modal-surface" style={{ background: 'var(--brand-modal-bg, var(--surface-2))', border: '1px solid var(--brand-modal-border, var(--border-1))', borderRadius: 'var(--brand-modal-radius, 24px) var(--brand-modal-radius, 24px) 0 0', width: '100%', maxWidth: 480, padding: '0 20px', paddingBottom: 'max(24px, env(safe-area-inset-bottom))', boxShadow: '0 -16px 60px rgba(0,0,0,0.25)' }}
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