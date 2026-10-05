import { ShieldCheck, Briefcase, User } from 'lucide-react';
import { brandContextCategoryLabel, brandContextTaskTitle } from '@/lib/brand/professionalScope';
import { REVIEW_ABOUT_WORKER, reviewerNameFromTask } from '@/lib/reviewClassification';
import { useLanguage } from '@/lib/LanguageContext';

const LOCALE_MAP = { he: 'he-IL', ar: 'ar-IL', en: 'en-US', es: 'es-ES', fr: 'fr-FR', ru: 'ru-RU', fil: 'fil-PH', hi: 'hi-IN', zh: 'zh-CN' };

function formatDate(value, lang) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(LOCALE_MAP[lang] || 'he-IL', { day: 'numeric', month: 'long', year: 'numeric' });
}

/**
 * One review card. Answers, at a glance: WHO wrote it, in WHAT capacity they
 * reviewed the profile owner, the rating, the date, the work type and — when
 * the review is backed by a completed Task — a verified-job marker.
 */
export default function ReviewCard({ review, task, kind, scope, showTaskTitle = false }) {
  const { t, lang } = useLanguage();
  const isAboutWorker = kind === REVIEW_ABOUT_WORKER;
  const reviewerName = reviewerNameFromTask(review, task, kind);
  const category = review.task_category || task?.category;
  const completed = task?.status === 'COMPLETED';

  const roleCfg = isAboutWorker
    ? { label: t('rev_badge_from_client'), icon: User, color: 'var(--brand-primary)', bg: 'var(--brand-primary-light)', border: 'var(--border-2)' }
    : { label: t('rev_badge_from_worker'), icon: Briefcase, color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' };
  const RoleIcon = roleCfg.icon;

  const rating = Number(review.rating) || 0;

  return (
    <div style={{
      background: 'var(--brand-card-bg, var(--surface-2))',
      border: '1px solid var(--border-1)',
      borderRadius: 16,
      padding: '14px 15px',
    }}>
      {/* Who + when */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 9 }}>
        <div style={{
          width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
          background: 'var(--surface-3)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, fontWeight: 900, color: 'var(--text-2)',
        }}>
          {reviewerName ? reviewerName.trim().charAt(0) : '?'}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {reviewerName || t('rev_anonymous_reviewer')}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600, marginTop: 1 }}>
            {formatDate(review.created_date, lang)}
          </div>
        </div>
        <span style={{
          fontSize: 10, fontWeight: 800, color: roleCfg.color, background: roleCfg.bg,
          border: `1px solid ${roleCfg.border}`, borderRadius: 99, padding: '3px 9px',
          display: 'inline-flex', alignItems: 'center', gap: 4, flexShrink: 0,
        }}>
          <RoleIcon size={10} strokeWidth={2.2} /> {roleCfg.label}
        </span>
      </div>

      {/* Rating */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 7 }}>
        <div style={{ display: 'flex', gap: 2 }}>
          {[1, 2, 3, 4, 5].map((s) => (
            <span key={s} style={{ fontSize: 14, color: s <= rating ? '#fbbf24' : 'var(--border-2)', lineHeight: 1 }}>★</span>
          ))}
        </div>
        <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-2)' }}>{rating.toFixed(1)}</span>
      </div>

      {/* Text */}
      {review.comment && (
        <p className="selectable-text" style={{ fontSize: 13.5, color: 'var(--text-1)', lineHeight: 1.6, margin: 0 }}>
          {review.comment}
        </p>
      )}

      {/* Work context */}
      {(category || (showTaskTitle && task?.title) || completed) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 9 }}>
          {category && (
            <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-2)', background: 'var(--surface-3)', borderRadius: 8, padding: '3px 9px' }}>
              {brandContextCategoryLabel(category, scope, t)}
            </span>
          )}
          {showTaskTitle && task?.title && (
            <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-2)', background: 'var(--surface-3)', borderRadius: 8, padding: '3px 9px', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {brandContextTaskTitle(task.title, task.category, scope, t)}
            </span>
          )}
          {completed && (
            <span style={{ fontSize: 10.5, fontWeight: 800, color: 'var(--color-success)', background: 'var(--color-success-bg)', border: '1px solid var(--color-success-border)', borderRadius: 99, padding: '3px 9px', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <ShieldCheck size={10} strokeWidth={2.4} /> {t('rev_verified_job')}
            </span>
          )}
        </div>
      )}
    </div>
  );
}