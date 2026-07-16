import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  Star, LogOut, Briefcase, CreditCard, ChevronLeft, Camera, Loader2,
  Shield, X, Trash2, Clock, BarChart3, Pencil, FileText, MapPin, Award,
} from 'lucide-react';
import TaskCard from '@/components/TaskCard';
import VerifyModal from '@/components/VerifyModal';
import VerifiedBadge from '@/components/VerifiedBadge';
import GoldBadge from '@/components/GoldBadge';
import TrustCard from '@/components/TrustCard';
import SubscriptionManager from '@/components/credits/SubscriptionManager';
import SocialLinksSection from '@/components/SocialLinksSection';
import ProfileMediaGallery from '@/components/ProfileMediaGallery';
import TaskReviewHistory from '@/components/TaskReviewHistory';
import { Link, useNavigate } from 'react-router-dom';
import { getCategoryLabel } from '@/lib/categories';
import { useLanguage } from '@/lib/LanguageContext';

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
  const { t, isRTL } = useLanguage();
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showUnifiedHistory, setShowUnifiedHistory] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const photoInputRef = useRef(null);

  const handleDeleteAccount = async () => {
    setDeleteLoading(true);
    await base44.auth.deleteAccount();
    setDeleteLoading(false);
  };

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
    staleTime: 60000,
  });

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
    queryFn: () => base44.entities.Task.filter({ worker_id: me.id }, '-created_date', 50),
    enabled: !!me?.id,
    staleTime: 30000,
  });

  if (isLoading) {
    return (
      <div dir={isRTL ? 'rtl' : 'ltr'} style={{ background: 'var(--surface-1)', minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 size={28} className="animate-spin" color="#1a6fd4" />
      </div>
    );
  }

  const completedCount = workerTasks.filter(t => t.status === 'COMPLETED').length;
  const rating = me?.rating || 0;
  const avgRating = rating > 0 ? rating.toFixed(1) : '—';
  const initials = me?.full_name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';
  const cities = me?.preferred_cities || [];
  const categories = me?.preferred_categories || [];

  return (
    <div style={{ background: 'var(--surface-1)', minHeight: '100dvh', paddingBottom: 32 }} dir={isRTL ? 'rtl' : 'ltr'}>
      {showVerifyModal && (
        <VerifyModal
          onClose={() => setShowVerifyModal(false)}
          onSuccess={() => { setShowVerifyModal(false); queryClient.invalidateQueries({ queryKey: ['me'] }); }}
        />
      )}

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
            <Pencil size={13} color="white" /> עריכה
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
            {me?.is_verified && <VerifiedBadge size="md" />}
            {me?.is_verified && (me?.instagram_verified || me?.facebook_verified || me?.tiktok_verified) && <GoldBadge size="md" />}
          </div>
        </div>

        {/* Stats — inline, connected */}
        <div style={{
          position: 'relative', display: 'flex', margin: '14px 18px 0',
          background: 'rgba(255,255,255,0.1)', borderRadius: 14,
          border: '1px solid rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)',
        }}>
          {[
            { value: completedCount, label: t('tasks_completed') },
            { value: avgRating + (rating > 0 ? '★' : ''), label: t('rating') },
            { value: me?.worker_credits ?? 100, label: t('credits') },
          ].map((s, i, arr) => (
            <div key={i} style={{ flex: 1, padding: '10px 8px', textAlign: 'center', borderLeft: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.12)' : 'none' }}>
              <div style={{ fontSize: 17, fontWeight: 900, color: 'white' }}>{s.value}</div>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.6)', marginTop: 1 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Content: connected sections with minimal spacing ── */}
      <div style={{ padding: '12px 14px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>

        {/* Verify CTA — shows whenever not verified, with status */}
        {!me?.is_verified && (
          <button onClick={() => setShowVerifyModal(true)} style={{ all: 'unset', cursor: 'pointer', width: '100%' }}>
            <div style={{
              background: 'var(--surface-2)', borderRadius: 14,
              border: `1px solid ${me?.kyc_status === 'pending' ? '#fde68a' : me?.kyc_status === 'rejected' ? '#fecaca' : 'var(--border-1)'}`,
              display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
            }}>
              <div style={{
                width: 38, height: 38, borderRadius: 11,
                background: me?.kyc_status === 'pending' ? '#fffbeb' : me?.kyc_status === 'rejected' ? '#fef2f2' : '#eff6ff',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <Shield size={18} color={me?.kyc_status === 'pending' ? '#d97706' : me?.kyc_status === 'rejected' ? '#dc2626' : '#1a6fd4'} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-1)' }}>
                  {me?.kyc_status === 'pending' ? 'אימות בבדיקה' : me?.kyc_status === 'rejected' ? 'אימות נדחה' : t('verify_title')}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-2)' }}>
                  {me?.kyc_status === 'pending'
                    ? 'הפרטים שלך נשלחו, ממתין לאישור מנהל'
                    : me?.kyc_status === 'rejected'
                    ? 'האימות נדחה. ניתן לעדכן את הפרטים ולשלוח שוב'
                    : t('verify_sub')}
                </div>
              </div>
              <ChevronLeft size={15} color="var(--text-3)" />
            </div>
          </button>
        )}

        {/* Trust Bar */}
        <TrustCard user={me} reviews={reviews} tasks={workerTasks} />

        {/* About + Skills + Cities — connected in one card */}
        <div style={{
          background: 'var(--surface-2)', borderRadius: 14,
          border: '1px solid var(--border-1)', overflow: 'hidden',
        }}>
          {/* About */}
          {me?.bio && (
            <div style={{ padding: '14px 14px 12px', borderBottom: (categories.length > 0 || cities.length > 0) ? '1px solid var(--border-1)' : 'none' }}>
              <p style={{ fontSize: 14, color: 'var(--text-1)', lineHeight: 1.6, margin: 0 }}>{me.bio}</p>
            </div>
          )}

          {/* Skills */}
          {categories.length > 0 && (
            <div style={{ padding: '12px 14px', borderBottom: cities.length > 0 ? '1px solid var(--border-1)' : 'none' }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-3)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
                <Award size={12} /> {t('categories') || 'תחומים'}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {categories.map(c => (
                  <span key={c} style={{ fontSize: 12, background: '#eff6ff', color: '#1a6fd4', padding: '4px 12px', borderRadius: 20, fontWeight: 600, border: '1px solid #bfdbfe' }}>
                    {getCategoryLabel(c)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Cities */}
          {cities.length > 0 && (
            <div style={{ padding: '12px 14px', borderBottom: (me?.certificate_files?.length > 0 || me?.certificates?.length > 0) ? '1px solid var(--border-1)' : 'none' }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-3)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
                <MapPin size={12} /> ערים לביצוע משימות
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {cities.map(c => (
                  <span key={c} style={{ fontSize: 12, background: '#f0fdf4', color: '#059669', padding: '4px 12px', borderRadius: 20, fontWeight: 600, border: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', gap: 3 }}>
                    <MapPin size={10} /> {c}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Certificates — inside the same card, below cities */}
          {(me?.certificate_files?.length > 0 || me?.certificates?.length > 0) && (
            <div style={{ padding: '12px 14px' }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-3)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
                <FileText size={12} /> תעודות מקצוע
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {(me?.certificate_files || []).map(doc => (
                  <a key={doc.url} href={doc.url} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '8px 12px', textDecoration: 'none' }}>
                    <FileText size={15} color="#16a34a" style={{ flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: 12, fontWeight: 700, color: '#166534', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.name}</span>
                    <span style={{ fontSize: 10, color: '#86efac' }}>›</span>
                  </a>
                ))}
                {(me?.certificates || []).length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                    {me.certificates.map(cert => (
                      <span key={cert} style={{ fontSize: 12, background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0', padding: '4px 10px', borderRadius: 20, fontWeight: 600 }}>✅ {cert}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Media Gallery */}
        {(me?.profile_media?.length > 0 || me?.intro_video_url) && (
         <div style={{
           background: 'var(--surface-2)', borderRadius: 14,
           border: '1px solid var(--border-1)', padding: 14,
         }}>
           <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-3)', marginBottom: 4 }}>גלריית מדיה</div>
           <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 10, lineHeight: 1.4 }}>סרטונים ומדיה שמסבירים עלייך</div>
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
          <MenuRow icon={Clock} iconBg="#f5f3ff" iconColor="#7c3aed" label="היסטוריה וביקורות" sub={`${completedCount} משימות · ${reviews.length} ביקורות`} onClick={() => setShowUnifiedHistory(true)} />
          <MenuRow icon={LogOut} iconBg="#fff1f2" iconColor="#dc2626" label={t('logout')} danger onClick={() => base44.auth.logout()} chevronColor="#fca5a5" />
          <MenuRow icon={Trash2} iconBg="#f8fafc" iconColor="#94a3b8" label={t('delete_account')} onClick={() => setShowDeleteConfirm(true)} chevronColor="#e2e8f0" last />
        </div>

        <div style={{ height: 20 }} />
      </div>

      {/* Unified History & Reviews Sheet */}
      {showUnifiedHistory && createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={() => setShowUnifiedHistory(false)}>
          <div style={{ background: 'var(--surface-2)', borderRadius: '24px 24px 0 0', width: '100%', maxWidth: 480, maxHeight: '82vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px 12px', borderBottom: '1px solid var(--border-1)' }}>
              <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-1)' }}>היסטוריה וביקורות</span>
              <button onClick={() => setShowUnifiedHistory(false)} style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--surface-3)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={16} color="#64748b" />
              </button>
            </div>
            <div style={{ overflowY: 'auto', padding: '16px 20px 32px' }} dir="rtl">
              <TaskReviewHistory tasks={workerTasks.filter(t => t.status === 'COMPLETED')} reviews={reviews} />
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