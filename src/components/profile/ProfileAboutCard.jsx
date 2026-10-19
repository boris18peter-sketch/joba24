import { Info, Briefcase, MapPin } from 'lucide-react';
import { getCityLabel } from '@/lib/cityLabels';
import { useLanguage } from '@/lib/LanguageContext';

/**
 * ProfileAboutCard — "who this person is", in ONE card.
 *
 * About, professional areas and service areas answer one question between them,
 * so they are one block with three sections rather than three cards with three
 * borders and three sets of padding around very little content.
 *
 * Each section opens with a small icon tile and its label, and the content sits
 * indented under it, so the three answers are visually separated instead of
 * reading as one dense paragraph. The professions and cities are quiet, borderless
 * tags — they are facts, so they must not look like something you can press.
 *
 * Shared by the personal and the public profile, so the two can never drift.
 */
function Section({ icon: Icon, label, children, last }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 10 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 9, flexShrink: 0,
          background: 'var(--brand-primary-light)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={14} color="var(--brand-primary)" strokeWidth={2} />
        </div>
        <span style={{ fontSize: 11.5, fontWeight: 800, color: 'var(--text-3)', letterSpacing: 0.4 }}>{label}</span>
      </div>

      <div style={{ paddingInlineStart: 37 }}>{children}</div>

      {!last && <div style={{ height: 1, background: 'var(--border-1)', margin: '16px 0' }} />}
    </div>
  );
}

function Chip({ children }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      // No border and no strong colour: these are facts, not buttons, so they
      // must not carry an interaction affordance.
      padding: '5px 11px', borderRadius: 99,
      background: 'var(--surface-3)',
      fontSize: 12.5, fontWeight: 600, color: 'var(--text-2)', lineHeight: 1.4,
    }}>
      {children}
    </span>
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
      padding: '18px 16px',
    }}>
      {bio && (
        <Section icon={Info} label={t('pr_about')} last={!hasCategories && !hasCities}>
          <p
            className={selectable ? 'selectable-text' : undefined}
            style={{ margin: 0, fontSize: 14, lineHeight: 1.65, color: 'var(--text-1)' }}
          >
            {bio}
          </p>
        </Section>
      )}

      {hasCategories && (
        <Section icon={Briefcase} label={t('pr_professions')} last={!hasCities}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
            {categories.map(c => <Chip key={c}>{scope.label(c, t)}</Chip>)}
          </div>
        </Section>
      )}

      {hasCities && (
        <Section icon={MapPin} label={t('pr_areas')} last>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
            {cities.map(c => <Chip key={c}>{getCityLabel(c, lang)}</Chip>)}
          </div>
        </Section>
      )}
    </div>
  );
}