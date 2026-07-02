import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Star, LogOut, Briefcase, CreditCard, ChevronLeft, User, Camera, Loader2, Shield, X, Trash2, Clock, Save, BarChart3, Pencil } from 'lucide-react';

const JOIN_COMPLETED_KEY = 'joba24_join_completed';
import TaskCard from '@/components/TaskCard';
import VerifyModal from '@/components/VerifyModal';
import VerifiedBadge from '@/components/VerifiedBadge';
import TrustCard from '@/components/TrustCard';
import SubscriptionManager from '@/components/credits/SubscriptionManager';
import InstagramSection from '@/components/InstagramSection';
import { Link, useNavigate } from 'react-router-dom';
import { getCategoryLabel } from '@/lib/categories';
import { useLanguage } from '@/lib/LanguageContext';

// ── Reusable menu row ──────────────────────────────────────────────────────
function MenuRow({ icon: Icon, iconBg, iconColor, label, sub, onClick, to, danger, chevronColor }) {
  const inner = (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '14px 16px', cursor: 'pointer',
        transition: 'background 0.13s',
      }}
      onPointerDown={e => { e.currentTarget.style.background = 'var(--surface-3)'; }}
      onPointerUp={e => { e.currentTarget.style.background = ''; }}
      onPointerLeave={e => { e.currentTarget.style.background = ''; }}
    >
      <div style={{ width: 42, height: 42, borderRadius: 13, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={18} color={iconColor} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: danger ? '#dc2626' : 'var(--text-1)' }}>{label}</div>
        {sub && <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>{sub}</div>}
      </div>
      <ChevronLeft size={16} color={chevronColor || 'var(--text-3)'} />
    </div>
  );
  if (to) return <Link to={to} style={{ textDecoration: 'none', display: 'block' }}>{inner}</Link>;
  return inner;
}

// ── Section card wrapper ───────────────────────────────────────────────────
function SectionCard({ children, style }) {
  return (
    <div style={{
      background: 'var(--surface-2)',
      borderRadius: 18,
      border: '1px solid var(--border-1)',
      overflow: 'hidden',
      ...style,
    }}>
      {children}
    </div>
  );
}

// ── Review chip ───────────────────────────────────────────────────────────
function ReviewChips({ review }) {
  const chips = [
    review.arrived_on_time && { label: '⏱️ הגיע בזמן', color: '#0891b2', bg: '#ecfeff', border: '#a5f3fc' },
    review.professional && { label: '💼 מקצועי', color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' },
    review.good_communication && { label: '💬 תקשורת', color: '#1a6fd4', bg: '#eff6ff', border: '#bfdbfe' },
    review.would_hire_again && { label: '🔁 ממליץ', color: '#db2777', bg: '#fdf2f8', border: '#fbcfe8' },
  ].filter(Boolean);
  if (!chips.length) return null;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
      {chips.map(c => (
        <span key={c.label} style={{ fontSize: 10, fontWeight: 700, color: c.color, background: c.bg, border: `1px solid ${c.border}`, borderRadius: 99, padding: '2px 8px' }}>
          {c.label}
        </span>
      ))}
    </div>
  );
}

export default function Profile() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { t, isRTL } = useLanguage();
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showTaskHistory, setShowTaskHistory] = useState(false);
  const [showWallet, setShowWallet] = useState(false);
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

  useEffect(() => {
    if (!me?.id) return;
    const unsub = base44.entities.Task.subscribe((event) => {
      if (event.type !== 'update' || !event.data) return;
      if (event.data.worker_id !== me.id && event.data.worker_id !== undefined) return;
      queryClient.setQueryData(['workerTasks', me.id], (old = []) => {
        if (!Array.isArray(old)) return old;
        const exists = old.find(t => t.id === event.id);
        if (!exists) return old;
        return old.map(t => t.id === event.id ? { ...t, ...event.data } : t);
      });
    });
    return unsub;
  }, [me?.id, queryClient]);

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

  return (
    <div style={{ background: 'var(--surface-1)', minHeight: '100dvh', paddingBottom: 32 }} dir={isRTL ? 'rtl' : 'ltr'}>
      {showVerifyModal && (
        <VerifyModal
          onClose={() => setShowVerifyModal(false)}
          onSuccess={() => { setShowVerifyModal(false); queryClient.invalidateQueries({ queryKey: ['me'] }); }}
        />
      )}

      {/* ── Header ── */}
      <div style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border-1)', padding: '14px 20px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-1)' }}>{t('profile_title')}</span>
        <button
          onClick={() => {
            const joinCompleted = me?.preferred_categories?.length > 0 && me?.preferred_cities?.length > 0;
            navigate(joinCompleted ? '/worker-profile' : '/join');
          }}
          style={{ height: 36, paddingInline: 18, borderRadius: 20, background: 'linear-gradient(135deg,#1a6fd4,#0a52b0)', border: 'none', color: 'white', fontWeight: 800, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, boxShadow: '0 2px 10px rgba(26,111,212,0.3)' }}
        >
          <Pencil size={14} color="white" />
          {t('edit') || 'עריכה'}
        </button>
      </div>

      {/* ── Avatar + Name Hero ── */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 20px 24px', background: 'var(--surface-2)', borderBottom: '1px solid var(--border-1)' }}>
        {/* Avatar */}
        <div style={{ position: 'relative', marginBottom: 16 }}>
          <div
            onClick={() => photoInputRef.current?.click()}
            style={{
              width: 88, height: 88, borderRadius: '50%',
              background: 'linear-gradient(135deg,#1a6fd4,#0a52b0)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 30, fontWeight: 900, color: 'white',
              overflow: 'hidden', cursor: 'pointer',
              boxShadow: '0 4px 20px rgba(26,111,212,0.3)',
            }}
          >
            {me?.profile_photo
              ? <img src={me.profile_photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : initials}
          </div>
          <button
            onClick={() => photoInputRef.current?.click()}
            style={{ position: 'absolute', bottom: 2, right: 2, width: 26, height: 26, borderRadius: '50%', background: 'white', border: '2px solid #1a6fd4', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 6px rgba(0,0,0,0.15)' }}
          >
            {uploadingPhoto ? <Loader2 size={12} color="#1a6fd4" className="animate-spin" /> : <Camera size={12} color="#1a6fd4" />}
          </button>
          <input ref={photoInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoUpload} />
        </div>

        {/* Name + verified */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 20, fontWeight: 900, color: 'var(--text-1)' }}>{me?.full_name || 'User'}</span>
          {(me?.is_verified && me?.id_number) && <VerifiedBadge size="md" />}
        </div>

        {me?.preferred_categories?.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, justifyContent: 'center', maxWidth: 300, marginBottom: 4 }}>
            {me.preferred_categories.slice(0, 4).map(cat => (
              <span key={cat} style={{ fontSize: 11, fontWeight: 700, color: '#1a6fd4', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 99, padding: '2px 8px' }}>{getCategoryLabel(cat)}</span>
            ))}
            {me.preferred_categories.length > 4 && (
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', padding: '2px 4px' }}>+{me.preferred_categories.length - 4}</span>
            )}
          </div>
        )}
        <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{me?.email}</div>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: 0, marginTop: 20, background: 'var(--surface-3)', borderRadius: 16, overflow: 'hidden', border: '1px solid var(--border-1)', width: '100%', maxWidth: 340 }}>
          {[
            { value: completedCount, label: t('tasks_completed') },
            { value: avgRating + (rating > 0 ? '★' : ''), label: t('rating'), sub: me?.rating_count > 0 ? `${me.rating_count} ביקורות` : null },
            { value: me?.worker_credits ?? 100, label: t('credits') },
          ].map((s, i, arr) => (
            <div key={i} style={{ flex: 1, padding: '12px 8px', textAlign: 'center', borderLeft: i < arr.length - 1 ? '1px solid var(--border-1)' : 'none' }}>
              <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--text-1)' }}>{s.value}</div>
              <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2, lineHeight: 1.3 }}>{s.label}</div>
              {s.sub && <div style={{ fontSize: 9, color: 'var(--text-3)' }}>{s.sub}</div>}
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: '16px 16px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* ── Verify CTA ── */}
        {!(me?.is_verified && me?.id_number) && (
          <button onClick={() => setShowVerifyModal(true)} style={{ all: 'unset', cursor: 'pointer', width: '100%' }}>
            <SectionCard>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px' }}>
                <div style={{ width: 42, height: 42, borderRadius: 13, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Shield size={20} color="#1a6fd4" />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-1)', marginBottom: 2 }}>{t('verify_title')}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-2)' }}>{t('verify_sub')}</div>
                </div>
                <ChevronLeft size={16} color="var(--text-3)" />
              </div>
            </SectionCard>
          </button>
        )}

        {/* ── Trust Bar ── */}
        <TrustCard user={me} reviews={reviews} tasks={workerTasks} />

        {/* ── Instagram ── */}
        <InstagramSection user={me} />

        {/* ── Active Subscriptions ── */}
        <SubscriptionManager />

        {/* ── Main Menu ── */}
        <SectionCard>
          <MenuRow icon={Briefcase} iconBg="#eff6ff" iconColor="#1a6fd4" label={t('worker_profile')} sub={t('profession_certs_cities') || 'מקצוע, תעודות, ערים'} to="/worker-profile" />
          <div style={{ height: 1, background: 'var(--border-1)', margin: '0 16px' }} />
          <MenuRow icon={CreditCard} iconBg="#f0fdf4" iconColor="#16a34a" label={t('credit_movement')} sub={t('balance_payments_history') || 'יתרה, תשלומים, היסטוריה'} to="/wallet" />
          <div style={{ height: 1, background: 'var(--border-1)', margin: '0 16px' }} />
          <MenuRow icon={BarChart3} iconBg="#eff6ff" iconColor="#1a6fd4" label={t('earnings_dashboard') || 'דשבורד רווחים'} sub={t('earnings_summary_sub') || 'הכנסות לפי ימים, שבועות וחודשים'} to="/earnings" />
          <div style={{ height: 1, background: 'var(--border-1)', margin: '0 16px' }} />
          <MenuRow icon={Clock} iconBg="#f5f3ff" iconColor="#7c3aed" label={t('task_history')} sub={`${completedCount} ${t('tasks_completed')}`} onClick={() => setShowTaskHistory(true)} />
          {reviews.length > 0 && <>
            <div style={{ height: 1, background: 'var(--border-1)', margin: '0 16px' }} />
            <MenuRow icon={Star} iconBg="#fffbeb" iconColor="#f59e0b" label={t('recent_reviews') || 'ביקורות'} sub={`${reviews.length} ביקורות`} onClick={() => setShowAllReviews(true)} />
          </>}
        </SectionCard>

        {/* ── Skills ── */}
        {me?.preferred_categories?.length > 0 && (
          <SectionCard style={{ padding: '16px' }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-3)', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 12 }}>{t('categories') || 'תחומים'}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {me.preferred_categories.map(c => (
                <span key={c} style={{ fontSize: 13, background: '#eff6ff', color: '#1a6fd4', padding: '5px 14px', borderRadius: 20, fontWeight: 600, border: '1px solid #bfdbfe' }}>
                  {getCategoryLabel(c)}
                </span>
              ))}
            </div>
          </SectionCard>
        )}

        {/* ── Logout / Delete ── */}
        <SectionCard>
          <MenuRow icon={LogOut} iconBg="#fff1f2" iconColor="#dc2626" label={t('logout')} danger onClick={() => base44.auth.logout()} chevronColor="#fca5a5" />
          <div style={{ height: 1, background: 'var(--border-1)', margin: '0 16px' }} />
          <MenuRow icon={Trash2} iconBg="#f8fafc" iconColor="#94a3b8" label={t('delete_account')} onClick={() => setShowDeleteConfirm(true)} chevronColor="#e2e8f0" />
        </SectionCard>

        <div style={{ height: 24 }} />
      </div>

      {/* ── Task History Sheet ── */}
      {showTaskHistory && createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={() => setShowTaskHistory(false)}>
          <div style={{ background: 'var(--surface-2)', borderRadius: '24px 24px 0 0', width: '100%', maxWidth: 480, maxHeight: '82vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px 12px', borderBottom: '1px solid var(--border-1)' }}>
              <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-1)' }}>{t('task_history')} ({completedCount})</span>
              <button onClick={() => setShowTaskHistory(false)} style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--surface-3)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={16} color="#64748b" />
              </button>
            </div>
            <div style={{ overflowY: 'auto', padding: '12px 16px 32px', display: 'flex', flexDirection: 'column', gap: 0 }} dir="rtl">
              {completedCount === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                  <div style={{ fontSize: 40, marginBottom: 10 }}>📋</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)' }}>{t('no_completed_tasks_yet')}</div>
                </div>
              ) : workerTasks.filter(task => task.status === 'COMPLETED').map((task, idx, arr) => {
                const date = new Date(task.completed_at || task.updated_date);
                const diffDays = Math.floor((Date.now() - date.getTime()) / 86400000);
                const dateLabel = diffDays === 0 ? 'היום' : diffDays === 1 ? 'אתמול' : diffDays < 7 ? `לפני ${diffDays} ימים` : date.toLocaleDateString('he-IL', { day: 'numeric', month: 'short' });
                return (
                  <div key={task.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, paddingTop: idx > 0 ? 14 : 0, paddingBottom: idx < arr.length - 1 ? 14 : 0, borderTop: idx > 0 ? '1px solid var(--border-1)' : 'none' }}>
                    <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#dcfce7', border: '2px solid #16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 10, color: '#16a34a', fontWeight: 900 }}>✓</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)', lineHeight: 1.3 }}>{task.title}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 3 }}>{dateLabel} · ₪{task.price}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── All Reviews Sheet ── */}
      {showAllReviews && createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={() => setShowAllReviews(false)}>
          <div style={{ background: 'var(--surface-2)', borderRadius: '24px 24px 0 0', width: '100%', maxWidth: 480, maxHeight: '80vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px 12px', borderBottom: '1px solid var(--border-1)' }}>
              <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-1)' }}>{t('all_my_reviews')} ({reviews.length})</span>
              <button onClick={() => setShowAllReviews(false)} style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--surface-3)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={16} color="#64748b" />
              </button>
            </div>
            <div style={{ overflowY: 'auto', padding: '12px 20px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {reviews.map(review => (
                <div key={review.id} style={{ background: 'var(--surface-3)', borderRadius: 14, padding: '14px', border: '1px solid var(--border-1)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 6 }}>
                    {[1, 2, 3, 4, 5].map(s => (
                      <Star key={s} size={13} className={s <= review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200 fill-gray-200'} />
                    ))}
                    <span style={{ fontSize: 10, color: 'var(--text-3)', marginRight: 'auto' }}>{review.role === 'worker' ? t('from_client') : t('from_worker')}</span>
                  </div>
                  {review.comment && <p style={{ fontSize: 13, color: 'var(--text-1)', lineHeight: 1.6, margin: 0 }}>{review.comment}</p>}
                  <ReviewChips review={review} />
                </div>
              ))}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── Delete Confirm Sheet ── */}
      {showDeleteConfirm && createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex: 999999, background: 'rgba(5,15,40,0.65)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
          onClick={e => { if (e.target === e.currentTarget) setShowDeleteConfirm(false); }}>
          <div dir="rtl" style={{ background: 'var(--surface-2)', borderRadius: '28px 28px 0 0', width: '100%', maxWidth: 480, padding: '0 20px', paddingBottom: 'max(28px, env(safe-area-inset-bottom))', boxShadow: '0 -20px 60px rgba(0,0,0,0.25)' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ width: 40, height: 4, borderRadius: 99, background: 'var(--border-1)', margin: '14px auto 20px' }} />
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ width: 60, height: 60, borderRadius: 20, background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                <Trash2 size={28} color="#dc2626" strokeWidth={1.6} />
              </div>
              <div style={{ fontSize: 19, fontWeight: 900, color: 'var(--text-1)', marginBottom: 8 }}>{t('delete_account')}</div>
              <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.7 }}>{t('action_permanent')}<br />{t('data_deleted')}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button onClick={handleDeleteAccount} disabled={deleteLoading}
                style={{ width: '100%', height: 52, borderRadius: 14, background: deleteLoading ? '#fca5a5' : 'linear-gradient(135deg,#ef4444,#dc2626)', border: 'none', color: 'white', fontWeight: 900, fontSize: 15, cursor: deleteLoading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                {deleteLoading ? <Loader2 size={18} className="animate-spin" /> : <><Trash2 size={16} /> {t('yes_delete')}</>}
              </button>
              <button onClick={() => setShowDeleteConfirm(false)} disabled={deleteLoading}
                style={{ width: '100%', height: 48, borderRadius: 14, background: 'var(--surface-3)', border: '1px solid var(--border-1)', color: 'var(--text-1)', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
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