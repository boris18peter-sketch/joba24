import { ISRAELI_CITIES } from '@/lib/israeliCities';
import { getCityLabel } from '@/lib/cityLabels';
import { useLanguage } from '@/lib/LanguageContext';

/**
 * The worker profile step, built from the app's OWN data: the real profession
 * list and the real city list, laid out with the same chip the join flow uses —
 * same radius, same padding, same weight, same ✓ on the selected ones.
 *
 * Nothing here is invented. Only WHICH chips are selected is illustrative.
 *
 * Chips carry the app's own surface and text tokens so the contrast between the
 * card, the chips and their labels holds in Light and Dark alike.
 */
function Chip({ label, selected }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        fontSize: 13,
        fontWeight: 700,
        padding: '8px 14px',
        borderRadius: 99,
        background: selected ? 'var(--brand-primary)' : 'var(--surface-2)',
        color: selected ? '#ffffff' : 'var(--text-2)',
        border: `1.5px solid ${selected ? 'var(--brand-primary)' : 'var(--border-1)'}`,
        boxShadow: selected ? '0 2px 8px rgba(26,111,212,0.25)' : '0 1px 3px rgba(0,0,0,0.04)',
        whiteSpace: 'nowrap',
      }}
    >
      {selected && '✓ '}{label}
    </span>
  );
}

export default function WorkerProfileScreen() {
  const { t, lang } = useLanguage();

  // The chip LISTS are translated (onb_prof_list / onb_prof_selected), so the
  // illustration reads in the visitor's own language. The cities keep their
  // stored Hebrew names — that is how the app stores them — and are DISPLAYED
  // through the app's own city labels, exactly as the live profile does.
  const professions = t('onb_prof_list');
  const selectedProfessions = t('onb_prof_selected');
  const cities = ISRAELI_CITIES.slice(0, 10);
  const selectedCities = ['תל אביב', 'רמת גן', 'גבעתיים'];

  return (
    <>
      <div style={{ height: 52, flexShrink: 0, display: 'flex', alignItems: 'center', padding: '0 14px', background: 'var(--surface-2)', boxShadow: '0 1px 0 var(--border-1)' }}>
        <span style={{ fontSize: 16.5, fontWeight: 900, color: 'var(--text-1)' }}>{t('onb_v_my_profile')}</span>
      </div>

      <div style={{ background: 'var(--surface-1)', padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="j-card" style={{ padding: '14px 14px 16px' }}>
          <div style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--text-1)', marginBottom: 10 }}>{t('onb_v_professions')}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {professions.map(p => (
              <Chip key={p} label={p} selected={selectedProfessions.includes(p)} />
            ))}
          </div>
        </div>

        <div className="j-card" style={{ padding: '14px 14px 16px' }}>
          <div style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--text-1)', marginBottom: 10 }}>{t('onb_v_areas')}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {cities.map(c => (
              <Chip key={c} label={getCityLabel(c, lang)} selected={selectedCities.includes(c)} />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}