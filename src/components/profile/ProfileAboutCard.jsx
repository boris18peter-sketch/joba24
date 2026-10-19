import { getCityLabel } from '@/lib/cityLabels';
import { useLanguage } from '@/lib/LanguageContext';

/**
 * ProfileAboutCard — "who this person is", in ONE card.
 *
 * About, professional areas and service areas answer one question between them,
 * so they are one block with three labelled lines rather than three cards with
 * three borders and three sets of padding around very little content.
 *
 * The professions and cities are plain text separated by a middot, not pill
 * tags: a row of coloured pills competes with the content for attention and
 * turns a short fact into a wall of shapes.
 *
 * Shared by the personal and the public profile, so the two can never drift.
 */
function Row({ label, children }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-3)', letterSpacing: 0.3, marginBottom: 5 }}>{label}</div>
      <div style={{ fontSize: 14, color: 'var(--text-1)', lineHeight: 1.6 }}>{children}</div>
    </div>
  );
}

export default function ProfileAboutCard({ bio, categories = [], cities = [], scope, selectable = false }) {
  const { t, lang } = useLanguage();
  const hasCategories = categories.length > 0;
  const hasCities = cities.length > 0;
  if (!bio && !hasCategories && !hasCities) return null;

  return (
    <div style={{
      background: 'var(--brand-card-bg, var(--surface-2))',
      borderRadius: 14,
      border: '1px solid var(--border-1)',
      padding: '14px 16px',
      display: 'flex',
      flexDirection: 'column',
      gap: 14,
    }}>
      {bio && (
        <Row label={t('pr_about')}>
          <p className={selectable ? 'selectable-text' : undefined} style={{ margin: 0 }}>{bio}</p>
        </Row>
      )}
      {hasCategories && (
        <Row label={t('pr_professions')}>
          {categories.map(c => scope.label(c, t)).join(' · ')}
        </Row>
      )}
      {hasCities && (
        <Row label={t('pr_areas')}>
          {cities.map(c => getCityLabel(c, lang)).join(' · ')}
        </Row>
      )}
    </div>
  );
}