import { Star, Pencil } from 'lucide-react';
import VerifiedBadge from '@/components/VerifiedBadge';
import GoldBadge from '@/components/GoldBadge';
import { useLanguage } from '@/lib/LanguageContext';

/**
 * ProfileHeader — compact, personal, white.
 *
 * Identity first: avatar, name, verification indicator, and ONE line of context
 * (rating · reviews · completed tasks). No dashboard metrics, no gradient.
 * Tapping the avatar still changes the profile photo; Edit opens the editor.
 */
export default function ProfileHeader({
  me,
  initials,
  rating,
  reviewCount,
  completedCount,
  verified,
  social,
  onEdit,
  onAvatarClick,
  avatarInputRef,
  onAvatarChange,
}) {
  const { t, isRTL } = useLanguage();
  const r = Number(rating) || 0;
  const reviews = Number(reviewCount) || 0;
  const completed = Number(completedCount) || 0;

  const Sep = () => (
    <span aria-hidden style={{ color: 'var(--text-3)', opacity: 0.55 }}>·</span>
  );

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} style={{ background: 'var(--surface-2)', padding: '18px 20px 4px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        {/* Avatar — tapping it changes the photo (unchanged behaviour) */}
        <button
          onClick={onAvatarClick}
          aria-label={t('pr_edit')}
          style={{
            width: 66, height: 66, borderRadius: '50%', flexShrink: 0,
            border: 'none', padding: 0, cursor: 'pointer', overflow: 'hidden',
            background: 'var(--surface-3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          {me?.profile_photo ? (
            <img src={me.profile_photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <span style={{ fontSize: 23, fontWeight: 900, color: 'var(--text-2)' }}>{initials}</span>
          )}
        </button>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
            <span style={{
              fontSize: 20, fontWeight: 900, color: 'var(--text-1)', letterSpacing: -0.3,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {me?.full_name || 'User'}
            </span>
            {verified && social ? <GoldBadge size="sm" /> : verified ? <VerifiedBadge size="sm" /> : null}
          </div>

          {/* One compact line of context — no repeated stat blocks */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap',
            marginTop: 4, fontSize: 13, fontWeight: 600, color: 'var(--text-2)',
          }}>
            {r > 0 && (
              <>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                  <Star size={13} color="#fbbf24" fill="#fbbf24" />
                  <span style={{ color: 'var(--text-1)', fontWeight: 800 }}>{r.toFixed(1)}</span>
                </span>
                <Sep />
              </>
            )}
            <span>{reviews > 0 ? t('pr_reviews_count', { n: reviews }) : t('pr_no_reviews_yet')}</span>
            <Sep />
            <span>{t('pr_tasks_count', { n: completed })}</span>
          </div>
        </div>

        <button
          onClick={onEdit}
          style={{
            flexShrink: 0, height: 34, padding: '0 14px', borderRadius: 99,
            background: 'rgba(26,111,212,0.08)', border: 'none', cursor: 'pointer',
            color: 'var(--brand-primary)', fontWeight: 800, fontSize: 13,
            display: 'flex', alignItems: 'center', gap: 5,
          }}
        >
          <Pencil size={13} color="var(--brand-primary)" /> {t('pr_edit')}
        </button>
      </div>

      <input
        ref={avatarInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={onAvatarChange}
      />
    </div>
  );
}