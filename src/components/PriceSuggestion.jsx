import { useEffect, useState } from 'react';
import { Sparkles, Loader2, Wand2, Search, Wrench, Package } from 'lucide-react';
import { useLanguage } from '@/lib/LanguageContext';
import { useGlobalCategories, globalFieldChain } from '@/lib/brand/globalCategories';
import { analyzePrice, getRateRange } from '@/lib/priceInsights';

// Confidence → chip styling. Keys match the `confidence` values the engine returns.
const CONFIDENCE_STYLE = {
  high:   { key: 'ps_conf_high',   bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
  medium: { key: 'ps_conf_medium', bg: '#fffbeb', color: '#b45309', border: '#fde68a' },
  low:    { key: 'ps_conf_low',    bg: '#f8fafc', color: '#64748b', border: '#e2e8f0' },
};

// One line of the visual analysis (what was identified / what work is needed /
// what materials it costs). Rendered only when the AI returned that field.
function AnalysisRow({ icon, label, value }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 7, marginTop: 6 }}>
      <span style={{ flexShrink: 0, marginTop: 1 }}>{icon}</span>
      <span style={{ fontSize: 11.5, color: '#1e3a8a', lineHeight: 1.5 }}>
        <strong style={{ fontWeight: 800 }}>{label}:</strong> {value}
      </span>
    </div>
  );
}

export default function PriceSuggestion({ category, estimatedTime, description, location, isHourly, distance, images, detailsText, requirementsText, onAccept }) {
  const { t, isRTL, lang } = useLanguage();
  const { map: categoryMap } = useGlobalCategories();
  const [result, setResult] = useState(null);

  // The model must receive the category as a HUMAN NAME with its taxonomy
  // context, never the raw slug: "elec_panel" means nothing to it, while
  // "חשמל › לוח חשמל" pins both the trade and the specific job. Built from the
  // same catalogue the rest of the app reads, so it is already in memory.
  const row = category ? categoryMap[category] : null;
  const categoryLabel = row
    ? globalFieldChain(row, categoryMap).map(n => n.label).filter(Boolean).join(' › ')
    : '';

  // Re-run when the photo set changes. Joined so the effect deps stay stable
  // (a new array identity on every render would loop forever).
  const photoKey = (images || []).join(',');
  const hasPhotos = photoKey.length > 0;

  // ── WHAT THE ANALYSIS NEEDS BEFORE IT CAN SAY ANYTHING TAILORED ──────────
  // A service to price, and something to price: free text, a photo, the filled
  // structured fields or the ticked requirements. Structured details count as
  // "described" — a move with the addresses and floors filled in is analysable
  // with a short text.
  const hasDetails = (detailsText || '').trim().length > 0;
  const hasRequirements = (requirementsText || '').trim().length > 0;
  const hasText = (description || '').trim().length >= 15;
  const ready = !!category && (hasText || hasPhotos || hasDetails || hasRequirements);

  useEffect(() => {
    if (!category || !ready) return;
    let cancelled = false;
    const fallback = () => {
      const r = getRateRange(category, isHourly);
      return { min: r.min, max: r.max, reason: t('ps_market_fallback'), confidence: 'low' };
    };
    // Longer debounce than a text-only suggestion: the analysis also searches
    // live market prices, so we don't want a run per keystroke pause.
    const timer = setTimeout(async () => {
      try {
        const res = await analyzePrice({
          category, categoryLabel, estimatedTime, description, location, isHourly, distance, images, lang,
          detailsText, requirementsText,
        });
        if (!cancelled) setResult(res || fallback());
      } catch {
        // Analysis unavailable — fall back to the curated category range
        if (!cancelled) setResult(fallback());
      }
    }, 1200);

    return () => { cancelled = true; clearTimeout(timer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, categoryLabel, estimatedTime, description, location, isHourly, distance, photoKey, lang, t, detailsText, requirementsText, ready]);

  // ── THE CARD IS ALWAYS ON SCREEN ─────────────────────────────────────────
  // It used to disappear entirely until a service was chosen, and until then
  // the price block simply had nothing where the recommendation belongs. It now
  // has two honest faces and never a blank:
  //
  //   • not ready — the card says, in one professional line, exactly what it
  //     needs before a TAILORED recommendation exists (a service, a description,
  //     a location). It carries no price, because inventing one would be a
  //     number the publisher could act on for the wrong job.
  //   • ready — the curated market range is drawn immediately and the AI
  //     recommendation replaces it the moment it arrives, so there is no spinner
  //     to be stuck behind.
  if (!ready) {
    return (
      <div
        dir={isRTL ? 'rtl' : 'ltr'}
        style={{
          display: 'block', width: '100%', textAlign: isRTL ? 'right' : 'left',
          background: 'var(--surface-2)',
          border: '1.5px dashed var(--border-2)',
          borderRadius: 14,
          padding: '12px 14px',
          marginTop: 8,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <Wand2 size={16} color="var(--brand-primary)" style={{ flexShrink: 0 }} />
          <span style={{ fontSize: 12.5, color: 'var(--text-1)', fontWeight: 800 }}>
            {t('ps_title', 'המלצת מחיר חכמה')}
          </span>
        </div>
        <p style={{ margin: '7px 0 0', fontSize: 12, color: 'var(--text-2)', lineHeight: 1.6, fontWeight: 600 }}>
          {t('ps_need_details',
            'ההמלצה תופיע כאן אוטומטית לאחר מילוי פרטי המשימה — בחירת סוג השירות, תיאור העבודה, המיקום והיקף העבודה. מרגע שהפרטים יוזנו, נחשב עבורכם טווח מחיר מותאם לשוק המקומי.')}
        </p>
      </div>
    );
  }

  const curatedRange = getRateRange(category, isHourly);
  const view = result || {
    min: curatedRange.min,
    max: curatedRange.max,
    reason: '',
    confidence: 'low',
    analyzing: true,
  };

  const conf = CONFIDENCE_STYLE[view.confidence] || CONFIDENCE_STYLE.low;
  const midpoint = Math.round(((view.min + view.max) / 2) / 10) * 10;

  return (
    <button
      onClick={() => onAccept(midpoint)}
      style={{
        display: 'block', width: '100%', textAlign: isRTL ? 'right' : 'left', cursor: 'pointer',
        background: 'linear-gradient(135deg, #eff6ff, #dbeafe)',
        border: '1.5px solid #93c5fd',
        borderRadius: 14,
        padding: '12px 14px',
        marginTop: 8,
        minHeight: 'unset', minWidth: 'unset',
        transition: 'transform 0.1s',
      }}
      onMouseDown={e => e.currentTarget.style.transform = 'scale(0.98)'}
      onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
      onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
    >
      {/* Header — title + what the recommendation is based on */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
          <Wand2 size={16} color="var(--brand-primary)" style={{ flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: '#1e40af', fontWeight: 800 }}>{t('ps_recommended')}</span>
        </div>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'var(--brand-primary)', fontWeight: 700, background: '#dbeafe', borderRadius: 6, padding: '2px 6px', whiteSpace: 'nowrap' }}>
          {view.analyzing && <Loader2 size={9} className="animate-spin" />}
          {view.hasPhotos || hasPhotos ? t('ps_based_on_photo') : t('ps_based_on_desc')}
        </span>
      </div>

      {/* Price + accept pill */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 6 }}>
        <div dir="ltr" style={{ fontSize: 22, fontWeight: 900, color: '#0f2b6b', letterSpacing: -0.5, unicodeBidi: 'isolate' }}>
          ₪{view.min}–₪{view.max}{isHourly ? t('ps_hourly_suffix') : ''}
        </div>
        <div style={{ background: 'var(--brand-primary)', color: 'white', borderRadius: 10, padding: '7px 14px', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>
          {t('ps_use')}
        </div>
      </div>

      {/* Visual analysis */}
      {view.identified && (
        <AnalysisRow icon={<Search size={12} color="#3b82f6" />} label={t('ps_identified')} value={view.identified} />
      )}
      {view.requiredWork && (
        <AnalysisRow icon={<Wrench size={12} color="#3b82f6" />} label={t('ps_required')} value={view.requiredWork} />
      )}
      {view.materials && (
        <AnalysisRow icon={<Package size={12} color="#3b82f6" />} label={t('ps_materials')} value={view.materials} />
      )}

      {/* Confidence + how many real jobs the estimate leans on */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 9, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 10, fontWeight: 700, background: conf.bg, color: conf.color, border: `1px solid ${conf.border}`, borderRadius: 999, padding: '2px 8px' }}>
          {t('ps_confidence')}: {t(conf.key)}
        </span>
        {view.historyCount > 0 && (
          <span style={{ fontSize: 10, fontWeight: 700, background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', borderRadius: 999, padding: '2px 8px' }}>
            {t('ps_history', { n: view.historyCount })}
          </span>
        )}
      </div>

      <div style={{ fontSize: 10, color: '#3b82f6', marginTop: 6, lineHeight: 1.5, display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
        <Sparkles size={11} style={{ flexShrink: 0 }} />
        {/* Only a genuinely short reason fits the footer line — the analysis rows above carry the detail */}
        {view.reason && view.reason.length <= 70 && <span>{view.reason} · </span>}
        {view.analyzing ? t('ps_analyzing') : t('ps_market_based')}
      </div>
      <div style={{ fontSize: 10, color: '#64748b', marginTop: 4, fontWeight: 600 }}>
        {t('ps_disclaimer')}
      </div>
    </button>
  );
}