import { useEffect, useState } from 'react';
import { Sparkles, Loader2, Search, Wrench, Package, ChevronLeft, ChevronRight, ChevronDown, Check } from 'lucide-react';
import { useLanguage } from '@/lib/LanguageContext';
import { useGlobalCategories, globalFieldChain } from '@/lib/brand/globalCategories';
import { analyzePrice, getRateRange, priceSignature } from '@/lib/priceInsights';

// Confidence → chip styling. Keys match the `confidence` values the engine returns.
const CONFIDENCE_STYLE = {
  high:   { key: 'ps_conf_high',   bg: 'rgba(22,163,74,0.12)', color: '#15803d' },
  medium: { key: 'ps_conf_medium', bg: 'rgba(217,119,6,0.14)', color: '#b45309' },
  low:    { key: 'ps_conf_low',    bg: 'rgba(100,116,139,0.14)', color: '#475569' },
};

// One line of the DETAILS panel — never shown up front, only when opened.
function AnalysisRow({ icon, label, value }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginTop: 5 }}>
      <span style={{ flexShrink: 0, marginTop: 2 }}>{icon}</span>
      <span style={{ fontSize: 11.5, color: 'var(--text-2)', lineHeight: 1.5, fontWeight: 400 }}>
        <strong style={{ fontWeight: 600 }}>{label}:</strong> {value}
      </span>
    </div>
  );
}

/**
 * PriceSuggestion — one price, one tap.
 *
 * ── WHY THIS IS SMALL AGAIN ─────────────────────────────────────────────────
 * The card had grown into a report: a range, three amounts to choose between, an
 * "use" action and the whole analysis laid out underneath. A publisher does not
 * need to audit the model to accept its price — they need to read one number,
 * understand in a second that tapping it fills the budget, and move on.
 *
 * So the card is ONE clickable block: the recommended amount, one line saying
 * what it is based on, and one line saying what a tap does. Everything the
 * analysis found lives in a details dropdown that is closed by default. Tapping
 * anywhere on the card writes the amount into the budget field; it is never
 * applied on its own.
 */
export default function PriceSuggestion({ category, estimatedTime, description, location, isHourly, distance, images, detailsText, requirementsText, onAccept }) {
  const { t, isRTL, lang } = useLanguage();
  const { map: categoryMap } = useGlobalCategories();
  const [result, setResult] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [applied, setApplied] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

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
    setAnalyzing(true);
    setResult(null);
    setApplied(false);
    setShowDetails(false);
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
      } finally {
        if (!cancelled) setAnalyzing(false);
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

  // ── STATE 3 — ONE RECOMMENDED AMOUNT ──────────────────────────────────────
  // A single figure: the middle of what the engine considers fair for these
  // details, which is the number the budget field should hold. A range made the
  // publisher do the choosing; the recommendation should answer, not ask.
  const amount = Math.round(((result.min + result.max) / 2) / 10) * 10;
  const conf = CONFIDENCE_STYLE[result.confidence] || CONFIDENCE_STYLE.low;
  const hasAnalysis = !!(result.identified || result.requiredWork || result.materials);
  const Chevron = isRTL ? ChevronLeft : ChevronRight;

  const apply = () => {
    onAccept(amount);
    setApplied(true);
  };

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} style={{ marginTop: 8 }}>
      {/* THE WHOLE CARD IS THE ACTION — no inner button, no separate control. */}
      <button
        type="button"
        onClick={apply}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 10,
          textAlign: isRTL ? 'right' : 'left',
          background: 'var(--brand-primary-light)',
          border: 'none', borderRadius: 12,
          padding: '9px 11px', cursor: 'pointer',
          boxShadow: 'none', minHeight: 'unset',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <Sparkles size={12} color="var(--brand-primary)" style={{ flexShrink: 0 }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)' }}>
              {t('ps_title', 'המלצת מחיר AI')}
            </span>
          </div>

          <div dir="ltr" style={{
            fontSize: 21, fontWeight: 800, color: 'var(--brand-primary)',
            letterSpacing: -0.4, lineHeight: 1.15, marginTop: 1,
            textAlign: isRTL ? 'right' : 'left',
          }}>
            ₪{amount}{isHourly ? t('ps_hourly_suffix') : ''}
          </div>

          <div style={{ fontSize: 11, color: 'var(--text-2)', fontWeight: 400, marginTop: 1 }}>
            {t('ps_based_on_your_input', 'לפי פרטי המשימה שהזנת')}
          </div>

          <div style={{
            display: 'flex', alignItems: 'center', gap: 4, marginTop: 2,
            fontSize: 11.5, fontWeight: 500,
            color: applied ? 'var(--color-success)' : 'var(--brand-primary)',
          }}>
            {applied
              ? <><Check size={12} /> {t('ps_price_updated', 'המחיר עודכן')}</>
              : t('ps_tap_to_apply', 'לחץ לעדכון התקציב')}
          </div>
        </div>

        {/* The affordance: a small chevron on the card's left edge. It becomes
            a tick once the tap has landed, so the state is the same element. */}
        {applied
          ? <Check size={16} color="var(--color-success)" style={{ flexShrink: 0 }} />
          : <Chevron size={16} color="var(--brand-primary)" style={{ flexShrink: 0, opacity: 0.7 }} />}
      </button>

      {/* The analysis, folded away. Nothing about how the model reasoned is in
          the publisher's way unless they ask for it. */}
      {hasAnalysis && (
        <>
          <button
            type="button"
            onClick={() => setShowDetails(v => !v)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 3,
              background: 'none', border: 'none', padding: '4px 0 0', cursor: 'pointer',
              color: 'var(--text-3)', fontSize: 11, fontWeight: 500,
              minHeight: 'unset', minWidth: 'unset',
            }}
          >
            {t('ps_details', 'פירוט הניתוח')}
            <ChevronDown size={12} style={{ transform: showDetails ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
          </button>

          {showDetails && (
            <div style={{ marginTop: 2 }}>
              {result.identified && <AnalysisRow icon={<Search size={11} color="var(--brand-primary)" />} label={t('ps_identified')} value={result.identified} />}
              {result.requiredWork && <AnalysisRow icon={<Wrench size={11} color="var(--brand-primary)" />} label={t('ps_required')} value={result.requiredWork} />}
              {result.materials && <AnalysisRow icon={<Package size={11} color="var(--brand-primary)" />} label={t('ps_materials')} value={result.materials} />}
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 6 }}>
                <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-2)' }}>{t('ps_confidence')}:</span>
                <span style={{ fontSize: 10, fontWeight: 600, background: conf.bg, color: conf.color, borderRadius: 999, padding: '1px 7px' }}>
                  {t(conf.key)}
                </span>
              </div>
            </div>
          )}
        </>
      )}

      <div style={{ fontSize: 10.5, color: 'var(--text-3)', marginTop: 4, lineHeight: 1.45, fontWeight: 400 }}>
        {t('ps_estimate_only', 'המלצת מחיר בלבד. התקציב לבחירתך.')}
      </div>
    </div>
  );
}