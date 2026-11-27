import { useEffect, useState } from 'react';
import { Sparkles, Loader2, Search, Wrench, Package, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { useLanguage } from '@/lib/LanguageContext';
import { useGlobalCategories, globalFieldChain } from '@/lib/brand/globalCategories';
import { analyzePrice, getRateRange, priceSignature } from '@/lib/priceInsights';

// Confidence → chip styling. Keys match the `confidence` values the engine returns.
const CONFIDENCE_STYLE = {
  high:   { key: 'ps_conf_high',   label: 'גבוהה', bg: 'rgba(22,163,74,0.14)',  color: '#15803d' },
  medium: { key: 'ps_conf_medium', label: 'בינונית', bg: 'rgba(217,119,6,0.16)', color: '#b45309' },
  low:    { key: 'ps_conf_low',    label: 'בסיסית', bg: 'rgba(100,116,139,0.16)', color: '#475569' },
};

// One line of the analysis. Kept to a single short sentence: the panel is there
// to show the recommendation has a basis, not to explain the model.
function AnalysisRow({ icon, label, value }) {
  const text = String(value || '').trim();
  if (!text) return null;
  const short = text.length > 110 ? `${text.slice(0, 110).trimEnd()}…` : text;
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginTop: 4 }}>
      <span style={{ flexShrink: 0, marginTop: 1.5 }}>{icon}</span>
      <span style={{ fontSize: 11.5, color: 'var(--text-2)', lineHeight: 1.45, fontWeight: 400 }}>
        <strong style={{ fontWeight: 700, color: 'var(--text-1)' }}>{label}:</strong> {short}
      </span>
    </div>
  );
}

/**
 * PriceSuggestion — one recommended price, its estimated range, and the
 * analysis it is based on, in ONE clickable blue box.
 *
 * ── THE SHAPE OF THIS CARD IS THE POINT ─────────────────────────────────────
 * The recommendation is the largest thing on the card, the range sits under it
 * as supporting context (never as a set of options), and the analysis is always
 * visible rather than folded behind a dropdown: seeing what the model read in
 * the task is what makes the number believable. The whole box is the action —
 * one tap writes the amount into the budget — and the budget stays editable
 * afterwards.
 */
export default function PriceSuggestion({ category, estimatedTime, description, location, isHourly, distance, images, detailsText, requirementsText, onAccept }) {
  const { t, isRTL, lang } = useLanguage();
  const { map: categoryMap } = useGlobalCategories();
  const [result, setResult] = useState(null);
  const [applied, setApplied] = useState(false);

  // The model must receive the category as a HUMAN NAME with its taxonomy
  // context, never the raw slug: "elec_panel" means nothing to it, while
  // "חשמל › לוח חשמל" pins both the trade and the specific job.
  const row = category ? categoryMap[category] : null;
  const categoryLabel = row
    ? globalFieldChain(row, categoryMap).map(n => n.label).filter(Boolean).join(' › ')
    : '';

  const photoKey = (images || []).join(',');
  const hasPhotos = photoKey.length > 0;

  // ── WHAT THE ANALYSIS NEEDS BEFORE IT CAN SAY ANYTHING TAILORED ──────────
  const hasDetails = (detailsText || '').trim().length > 0;
  const hasRequirements = (requirementsText || '').trim().length > 0;
  const hasText = (description || '').trim().length >= 15;
  const ready = !!category && (hasText || hasPhotos || hasDetails || hasRequirements);

  // ── ONE STABLE KEY FOR "THE DETAILS THE PRICE DEPENDS ON" ────────────────
  // A signature of the actual content is the only thing that may trigger a new
  // recommendation, so a re-render can never change the number on screen — and
  // a recommendation for DIFFERENT details is cleared instead of being left
  // there as a stale figure.
  const signature = priceSignature({
    category, isHourly, estimatedTime, description, location, distance, images, lang, detailsText, requirementsText,
  });

  useEffect(() => {
    if (!category || !ready) return;
    let cancelled = false;
    setResult(null);
    setApplied(false);
    const fallback = () => {
      const r = getRateRange(category, isHourly);
      return { min: r.min, max: r.max, reason: t('ps_market_fallback'), confidence: 'low' };
    };
    const timer = setTimeout(async () => {
      try {
        const res = await analyzePrice({
          category, categoryLabel, estimatedTime, description, location, isHourly, distance, images, lang,
          detailsText, requirementsText,
        });
        if (!cancelled) setResult(res || fallback());
      } catch {
        if (!cancelled) setResult(fallback());
      }
    }, 900);

    return () => { cancelled = true; clearTimeout(timer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, ready]);

  const surface = {
    width: '100%',
    textAlign: isRTL ? 'right' : 'left',
    background: 'var(--brand-primary-light)',
    border: 'none',
    borderRadius: 12,
    padding: '10px 12px',
    marginTop: 8,
  };

  // ── STATE 1 — NOT ENOUGH DETAILS YET ──────────────────────────────────────
  if (!ready) {
    return (
      <div dir={isRTL ? 'rtl' : 'ltr'} style={surface}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Sparkles size={13} color="var(--brand-primary)" style={{ flexShrink: 0 }} />
          <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-1)' }}>
            {t('ps_title', 'המלצת מחיר AI')}
          </span>
        </div>
        <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-2)', lineHeight: 1.5, fontWeight: 400 }}>
          {t('ps_need_more', 'הוסף פרטים על המשימה ונמליץ לך על מחיר מתאים.')}
        </p>
      </div>
    );
  }

  // ── STATE 2 — ANALYSING ───────────────────────────────────────────────────
  if (!result) {
    return (
      <div dir={isRTL ? 'rtl' : 'ltr'} style={surface}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Sparkles size={13} color="var(--brand-primary)" style={{ flexShrink: 0 }} />
          <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-1)' }}>
            {t('ps_title', 'המלצת מחיר AI')}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 5 }}>
          <Loader2 size={13} className="animate-spin" color="var(--brand-primary)" style={{ flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: 'var(--text-2)', fontWeight: 400 }}>
            {t('ps_analyzing_short', 'מנתחים את פרטי המשימה שלך…')}
          </span>
        </div>
      </div>
    );
  }

  // ── STATE 3 — THE RECOMMENDATION ──────────────────────────────────────────
  const round10 = (n) => Math.round(Number(n) / 10) * 10;
  const low = round10(result.min);
  const high = Math.max(round10(result.max), low + 10);
  // The single figure is the middle of the estimated range: the number the
  // budget field should hold. The range stays visible as context, never as a
  // choice — the recommendation is supposed to answer, not ask.
  const amount = round10((result.min + result.max) / 2);

  const conf = CONFIDENCE_STYLE[result.confidence] || CONFIDENCE_STYLE.low;
  const hasAnalysis = !!(result.identified || result.requiredWork || result.materials);
  const Chevron = isRTL ? ChevronLeft : ChevronRight;
  const suffix = isHourly ? t('ps_hourly_suffix') : '';
  const divider = <div style={{ height: 1, background: 'var(--border-2)', margin: '7px 0' }} />;

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} style={{ marginTop: 8 }}>
      {/* THE WHOLE BOX IS THE ACTION — price, range, analysis and note are one
          element, so nothing inside needs its own control. */}
      <button
        type="button"
        onClick={() => { onAccept(amount); setApplied(true); }}
        style={{ ...surface, marginTop: 0, cursor: 'pointer', boxShadow: 'none', minHeight: 'unset', WebkitTapHighlightColor: 'transparent', display: 'block' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <Sparkles size={12} color="var(--brand-primary)" style={{ flexShrink: 0 }} />
          <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-2)' }}>
            {t('ps_title', 'המלצת מחיר AI')}
          </span>
        </div>

        {/* THE RECOMMENDED PRICE — the largest thing on the card */}
        <div dir="ltr" style={{
          fontSize: 26, fontWeight: 900, color: 'var(--brand-primary)',
          letterSpacing: -0.6, lineHeight: 1.1, marginTop: 2,
          textAlign: isRTL ? 'right' : 'left',
        }}>
          ₪{amount}{suffix}
        </div>

        {/* THE RANGE — context, not options */}
        <div style={{ fontSize: 12, color: 'var(--text-2)', fontWeight: 500, marginTop: 1 }}>
          {t('ps_range_label', 'טווח מחירים משוער')}:{' '}
          <span dir="ltr" style={{ fontWeight: 700, color: 'var(--text-1)' }}>{low}–{high} ₪{suffix}</span>
        </div>

        <div style={{ fontSize: 10.5, color: 'var(--text-2)', fontWeight: 400, marginTop: 1 }}>
          {t('ps_based_on_your_input', 'בהתבסס על פרטי המשימה שהזנת')}
        </div>

        {/* THE AFFORDANCE — a chevron before, a single tick after */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 4, marginTop: 5,
          fontSize: 11.5, fontWeight: 700,
          color: applied ? 'var(--color-success)' : 'var(--brand-primary)',
        }}>
          {applied
            ? <><Check size={13} /> {t('ps_price_updated', 'המחיר עודכן')}</>
            : <>{t('ps_tap_to_apply', 'לחץ לעדכון התקציב')} <Chevron size={13} /></>}
        </div>

        {/* ── THE ANALYSIS — always visible, inside the same box ───────────── */}
        {hasAnalysis && (
          <>
            {divider}
            <div style={{ fontSize: 10.5, fontWeight: 800, color: 'var(--text-3)', letterSpacing: 0.2 }}>
              {t('ps_analysis_title', 'ניתוח פרטי המשימה שלך')}
            </div>
            <AnalysisRow icon={<Search size={11} color="var(--brand-primary)" />} label={t('ps_identified')} value={result.identified} />
            <AnalysisRow icon={<Wrench size={11} color="var(--brand-primary)" />} label={t('ps_required')} value={result.requiredWork} />
            <AnalysisRow icon={<Package size={11} color="var(--brand-primary)" />} label={t('ps_materials')} value={result.materials} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 5 }}>
              <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-2)' }}>{t('ps_confidence')}:</span>
              <span style={{ fontSize: 9.5, fontWeight: 700, background: conf.bg, color: conf.color, borderRadius: 999, padding: '1px 7px' }}>
                {t(conf.key, conf.label)}
              </span>
            </div>
          </>
        )}

        {divider}

        {/* THE DISCLOSURE — always present, and readable (never the faintest ink) */}
        <div style={{ fontSize: 10.5, color: 'var(--text-2)', fontWeight: 500, lineHeight: 1.45 }}>
          {t('ps_estimate_only', 'זוהי הערכת מחיר בלבד, בהתאם לפרטים שהזנת. התקציב לבחירתך.')}
        </div>
      </button>
    </div>
  );
}