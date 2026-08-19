import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  Star, LogOut, Briefcase, CreditCard, ChevronLeft, Camera, Loader2,
  X, Trash2, Clock, BarChart3, Pencil, FileText, MapPin, Award,
} from 'lucide-react';
import TaskCard from '@/components/TaskCard';
import VerificationStatusBanner from '@/components/VerificationStatusBanner';
import VerifiedBadge from '@/components/VerifiedBadge';
import GoldBadge from '@/components/GoldBadge';
import TrustCard from '@/components/TrustCard';
import SubscriptionManager from '@/components/credits/SubscriptionManager';
import SocialLinksSection from '@/components/SocialLinksSection';
import ProfileMediaGallery from '@/components/ProfileMediaGallery';
import TaskReviewHistory from '@/components/TaskReviewHistory';
import { useTaskSheet } from '@/lib/TaskSheetContext';
import { Link, useNavigate } from 'react-router-dom';
import { getCategoryLabel } from '@/lib/categories';
import { getCityLabel } from '@/lib/cityLabels';
import { computeLockedJobas } from '@/lib/jobaBalance';
import { useLanguage } from '@/lib/LanguageContext';
import { useAuth } from '@/lib/AuthContext';
import { isUserVerified } from '@/lib/utils';

function MenuRow({ icon: Icon, iconBg, iconColor, label, sub, onClick, to, danger, last }) {
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
      <div style={{ width: 38, height: 38, borderRadius: 11, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={17} color={iconColor} />
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
  const { user: authUser, refreshUser } = useAuth();
  const { openTaskSheet } = useTaskSheet();
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showUnifiedHistory, setShowUnifiedHistory] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const photoInputRef = useRef(null);

  const handleDeleteAccount = async () => {
    setDeleteLoading(true);
    try {
      await base44.auth.deleteAccount();
    } catch (e) {
      // Fallback: mark account as deleted via updateMe
      try { await base44.auth.updateMe({ account_deleted: true }); } catch {}
    }
    // Log out and redirect to welcome page
    await base44.auth.logout('/');
    setDeleteLoading(false);
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    await base44.auth.updateMe({ profile_photo: file_url });
    await refreshUser();
    setUploadingPhoto(false);
  };

  // Use the real-time synced user from AuthContext — this ensures is_verified,
  // kyc_status, worker_credits etc. update immediately when the admin changes them
  // (via WebSocket subscription + 45s polling fallback in AuthContext).
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
    queryFn: () => base44.entities.Task.filter({ worker_id: me.id, status: 'COMPLETED' }, '-created_date', 50),
    enabled: !!me?.id,
    staleTime: 30000,
  });

  // Tasks the user posted as a client (completed) — for the "posted" stat
  const { data: postedTasks = [] } = useQuery({
    queryKey: ['postedTasks', me?.id],
    queryFn: () => base44.entities.Task.filter({ client_id: me.id, status: 'COMPLETED' }, '-created_date', 50),
    enabled: !!me?.id,
    staleTime: 30000,
  });

  // Pending applications — for locked (committed) balance display next to credits
  const { data: myApplications = [] } = useQuery({
    queryKey: ['myLockedJobas', me?.id],
    queryFn: () => base44.entities.TaskApplication.filter({ worker_id: me.id, status: 'pending' }, '-created_date', 50),
    enabled: !!me?.id,
    staleTime: 15000,
  });
  const lockedJobas = computeLockedJobas(myApplications);

  if (isLoading) {
    return (
      <div dir={isRTL ? 'rtl' : 'ltr'} style={{ background: 'var(--surface-1)', minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 size={28} className="animate-spin" color="#1a6fd4" />
      </div>
    );
  }

  const completedCount = workerTasks.length;
  const postedCount = postedTasks.length;
  // Prefer the denormalized rating, but fall back to the actual reviews so the
  // rating shows even when the User field is stale/wiped (e.g. by the simulator).
  const reviewsAvg = reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
  const rating = (me?.rating && me.rating > 0) ? me.rating : reviewsAvg;
  const avgRating = rating > 0 ? rating.toFixed(1) : '—';
  const initials = me?.full_name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';
  const cities = me?.preferred_cities || [];
  const categories = me?.preferred_categories || [];

  return (
    <div style={{ background: 'var(--surface-1)', paddingBottom: 'calc(90px + env(safe-area-inset-bottom))' }} dir={isRTL ? 'rtl' : 'ltr'}>
      {/* ── Hero: gradient header + avatar + name + stats ── */}
      <div style={{
        background: 'linear-gradient(160deg, #0a52b0 0%, #1a6fd4 50%, #2563eb 100%)',
        paddingBottom: 20, position: 'relative', overflow: 'hidden',
      }}>
        {/* Decorative circles */}
        <div style={{ position: 'absolute', top: -30, left: -20, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
        <div style={{ position: 'absolute', bottom: -40, right: -10, width: 80, height: 80, borderRadius: '50%', background: 'rgba(251,191,36,0.1)' }} />

        {/* Top bar */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px 0' }}>
          <span style={{ fontSize: 17, fontWeight: 800, color: 'white' }}>{t('profile_title')}</span>
          <button
            onClick={() => {
              const joinCompleted = categories.length > 0 && cities.length > 0;
              navigate(joinCompleted ? '/worker-profile' : '/join');
            }}
            style={{ height: 34, paddingInline: 16, borderRadius: 20, background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', fontWeight: 800, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, backdropFilter: 'blur(6px)' }}
          >
            <Pencil size={13} color="white" /> {t('pr_edit')}
          </button>
        </div>

        {/* Avatar + Name */}
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 20px 0' }}>
          <div style={{ position: 'relative', marginBottom: 12 }}>
            <div
              onClick={() => photoInputRef.current?.click()}
              style={{
                width: 84, height: 84, borderRadius: '50%',
                background: 'rgba(255,255,255,0.15)',
                border: '3px solid rgba(255,255,255,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 28, fontWeight: 900, color: 'white',
                overflow: 'hidden', cursor: 'pointer',
                boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
              }}
            >
              {me?.profile_photo
                ? <img src={me.profile_photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : initials}
            </div>
            <button
              onClick={() => photoInputRef.current?.click()}
              style={{ position: 'absolute', bottom: 2, right: 2, width: 24, height: 24, borderRadius: '50%', background: 'white', border: '2px solid #1a6fd4', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 6px rgba(0,0,0,0.15)' }}
            >
              {uploadingPhoto ? <Loader2 size={11} color="#1a6fd4" className="animate-spin" /> : <Camera size={11} color="#1a6fd4" />}
            </button>
            <input ref={photoInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoUpload} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
            <span style={{ fontSize: 19, fontWeight: 900, color: 'white' }}>{me?.full_name || 'User'}</span>
            {isUserVerified(me) && (me?.instagram_verified || me?.facebook_verified || me?.tiktok_verified)
              ? <GoldBadge size="md" />
              : isUserVerified(me) && <VerifiedBadge size="md" />}
          </div>
        </div>

        {/* Stats — inline, connected */}
        <div style={{
          position: 'relative', display: 'flex', margin: '14px 18px 0',
          background: 'rgba(255,255,255,0.1)', borderRadius: 14,
          border: '1px solid rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)',
        }}>
          {[
            { value: completedCount, label: t('pr_jobs_done') },
            { value: postedCount, label: t('pr_jobs_posted') },
            { value: avgRating + (rating > 0 ? '★' : ''), label: t('pr_rating'), sub: reviews.length > 0 ? t('pr_reviews_count', { n: reviews.length }) : null },
          ].map((s, i, arr) => (
            <div key={i} style={{ flex: 1, padding: '10px 8px', textAlign: 'center', borderLeft: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.12)' : 'none' }}>
              <div style={{ fontSize: 17, fontWeight: 900, color: 'white' }}>{s.value}</div>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.6)', marginTop: 1, lineHeight: 1.3 }}>{s.label}</div>
              {s.sub && <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)' }}>{s.sub}</div>}
            </div>
          ))}
        </div>
      </div>

      {/* ── Content: connected sections with minimal spacing ── */}
      <div style={{ padding: '12px 14px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>

        {/* Verify CTA — unified, status-aware (same banner as Home feed) */}
        <VerificationStatusBanner me={me} />

        {/* Trust Bar — opens a popup with "how to improve" guide */}
        <TrustCard user={me} reviews={reviews} tasks={workerTasks} />

        {/* About */}
        {me?.bio && (
          <div style={{ background: 'var(--surface-2)', borderRadius: 14, border: '1px solid var(--border-1)', padding: '14px 16px' }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-3)', marginBottom: 6 }}>{t('pr_about')}</div>
            <p style={{ fontSize: 14, color: 'var(--text-1)', lineHeight: 1.6, margin: 0 }}>{me.bio}</p>
          </div>
        )}

        {/* Categories — תחומי עיסוק (matches public profile wording) */}
        {categories.length > 0 && (
          <div style={{ background: 'var(--surface-2)', borderRadius: 14, border: '1px solid var(--border-1)', padding: '14px 16px' }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-3)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
              <Award size={12} /> {t('pr_professions')}
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

        {/* Cities — אזורי פעילות (matches public profile wording) */}
        {cities.length > 0 && (
          <div style={{ background: 'var(--surface-2)', borderRadius: 14, border: '1px solid var(--border-1)', padding: '14px 16px' }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-3)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
              <MapPin size={12} /> {t('pr_areas')}
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

        {/* Certificates — תעודות מקצוע */}
        {(me?.certificate_files?.length > 0 || me?.certificates?.length > 0) && (
          <div style={{ background: 'var(--surface-2)', borderRadius: 14, border: '1px solid var(--border-1)', padding: '14px 16px' }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-3)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
              <FileText size={12} /> {t('pr_certs')}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(me?.certificate_files || []).map(doc => (
                <a key={doc.url} href={doc.url} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: '10px 12px', textDecoration: 'none' }}>
                  <FileText size={16} color="#16a34a" style={{ flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: '#166534', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.name}</span>
                  <span style={{ fontSize: 11, color: '#86efac' }}>{t('pr_view')}</span>
                </a>
              ))}
              {me?.certificates?.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {me.certificates.map(cert => (
                    <span key={cert} style={{ fontSize: 13, background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0', padding: '5px 14px', borderRadius: 20, fontWeight: 600 }}>✅ {cert}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Media Gallery */}
        {(me?.profile_media?.length > 0 || me?.intro_video_url) && (
         <div style={{
           background: 'var(--surface-2)', borderRadius: 14,
           border: '1px solid var(--border-1)', padding: 14,
         }}>
           <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-3)', marginBottom: 10 }}>{t('pr_media_gallery')}</div>
           <ProfileMediaGallery
             media={[
               ...(me?.intro_video_url ? [{ type: 'video', url: me.intro_video_url }] : []),
               ...(me?.profile_media || []),
             ]}
             isEditing={false}
           />
         </div>
        )}

        {/* Social Links */}
        <SocialLinksSection user={me} />

        {/* Subscriptions */}
        <SubscriptionManager />

        {/* Menu — single grouped list */}
        <div style={{
          background: 'var(--surface-2)', borderRadius: 14,
          border: '1px solid var(--border-1)', overflow: 'hidden',
        }}>
          <MenuRow icon={Briefcase} iconBg="#eff6ff" iconColor="#1a6fd4" label={t('worker_profile')} sub={t('profession_certs_cities') || 'מקצוע, תעודות, ערים'} to="/worker-profile" />
          <MenuRow icon={CreditCard} iconBg="#f0fdf4" iconColor="#16a34a" label={t('credit_movement')} sub={t('balance_payments_history') || 'יתרה, תשלומים, היסטוריה'} to="/wallet" />
          <MenuRow icon={BarChart3} iconBg="#eff6ff" iconColor="#1a6fd4" label={t('earnings_dashboard') || 'דשבורד רווחים'} sub={t('earnings_summary_sub') || 'הכנסות לפי תקופות'} to="/earnings" />
          <MenuRow icon={Clock} iconBg="#f5f3ff" iconColor="#7c3aed" label={t('pr_history_reviews')} sub={t('pr_history_count', { n: completedCount + postedCount, m: reviews.length })} onClick={() => setShowUnifiedHistory(true)} />
          <MenuRow icon={LogOut} iconBg="#fff1f2" iconColor="#dc2626" label={t('logout')} danger onClick={() => base44.auth.logout()} chevronColor="#fca5a5" />
          <MenuRow icon={Trash2} iconBg="#fee2e2" iconColor="#dc2626" label={t('delete_account')} onClick={() => setShowDeleteConfirm(true)} chevronColor="#fca5a5" last />
        </div>

        <div style={{ height: 20 }} />
      </div>

      {/* Unified History & Reviews Sheet */}
      {showUnifiedHistory && createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={() => setShowUnifiedHistory(false)}>
          <div style={{ background: 'var(--surface-2)', borderRadius: '24px 24px 0 0', width: '100%', maxWidth: 480, maxHeight: '82vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px 12px', borderBottom: '1px solid var(--border-1)' }}>
              <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-1)' }}>{t('pr_history_reviews')}</span>
              <button onClick={() => setShowUnifiedHistory(false)} style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--surface-3)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={16} color="#64748b" />
              </button>
            </div>
            <div style={{ overflowY: 'auto', padding: '16px 20px 32px' }} dir="rtl">
              <TaskReviewHistory tasks={[...workerTasks, ...postedTasks]} reviews={reviews} userId={me.id} onTaskClick={openTaskSheet} />
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Delete Confirm Sheet */}
      {showDeleteConfirm && createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex: 999999, background: 'rgba(5,15,40,0.65)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
          onClick={e => { if (e.target === e.currentTarget) setShowDeleteConfirm(false); }}>
          <div dir="rtl" style={{ background: 'var(--surface-2)', borderRadius: '24px 24px 0 0', width: '100%', maxWidth: 480, padding: '0 20px', paddingBottom: 'max(24px, env(safe-area-inset-bottom))', boxShadow: '0 -16px 60px rgba(0,0,0,0.25)' }}
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
                style={{ width: '100%', height: 48, borderRadius: 14, background: deleteLoading ? '#fca5a5' : 'linear-gradient(135deg,#ef4444,#dc2626)', border: 'none', color: 'white', fontWeight: 900, fontSize: 15, cursor: deleteLoading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
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