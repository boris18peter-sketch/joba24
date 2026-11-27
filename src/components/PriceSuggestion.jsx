import { useEffect, useMemo, useState } from 'react';
import { Sparkles, Loader2, Search, Wrench, Package } from 'lucide-react';
import { useLanguage } from '@/lib/LanguageContext';
import { useGlobalCategories, globalFieldChain } from '@/lib/brand/globalCategories';
import { analyzePrice, getRateRange, priceSignature } from '@/lib/priceInsights';

// Confidence → chip styling. Keys match the `confidence` values the engine returns.
const CONFIDENCE_STYLE = {
  high:   { key: 'ps_conf_high',   bg: 'rgba(22,163,74,0.12)', color: '#15803d' },
  medium: { key: 'ps_conf_medium', bg: 'rgba(217,119,6,0.14)', color: '#b45309' },
  low:    { key: 'ps_conf_low',    bg: 'rgba(100,116,139,0.14)', color: '#475569' },
};

// One line of the visual analysis (what was identified / what work is needed /
// what materials it costs). Rendered only when the AI returned that field.
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
 * PriceSuggestion — a smart helper for choosing a budget, not another field.
 *
 * ── THREE STATES, ONE QUIET SURFACE ─────────────────────────────────────────
 * The card used to be a large framed box that reserved a screen-height before it
 * had anything to say. It now speaks only as much as it knows:
 *
 *   1. not enough details  → one compact line saying what would help;
 *   2. analysing           → a gentle spinner beside the same line, never
 *                            blocking the rest of the form;
 *   3. recommendation      → the price, in the brand's blue, with the range
 *                            selectable before it is applied.
 *
 * A soft blue surface with no border and no shadow is the whole frame: the
 * recommendation is the emphasised thing, not the box around it.
 */
export default function PriceSuggestion({ category, estimatedTime, description, location, isHourly, distance, images, detailsText, requirementsText, onAccept }) {
  const { t, isRTL, lang } = useLanguage();
  const { map: categoryMap } = useGlobalCategories();
  const [result, setResult] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  // The amount the publisher picked inside the recommended range.
  const [picked, setPicked] = useState(null);

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
  // The effect used to depend on a long list of props, several of which change
  // IDENTITY without changing meaning. Any one of them re-ran the whole
  // analysis, and since the model reasons over live market prices, each run
  // answered with a different range. A signature of the actual content is the
  // only thing that may trigger a new recommendation — and it is also what
  // makes an outdated recommendation disappear when the task changes.
  const signature = priceSignature({
    category, isHourly, estimatedTime, description, location, distance, images, lang, detailsText, requirementsText,
  });

  useEffect(() => {
    if (!category || !ready) return;
    let cancelled = false;
    setAnalyzing(true);
    // A recommendation for DIFFERENT details is not a recommendation: it is
    // cleared the moment the task changes, so the number on screen is always
    // about the text that is on screen.
    setResult(null);
    setPicked(null);
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

  const midpoint = useMemo(() => (
    result ? Math.round(((result.min + result.max) / 2) / 10) * 10 : 0
  ), [result]);

  // Three amounts inside the recommended range — its ends and its middle.
  const rangeOptions = useMemo(() => {
    if (!result) return [];
    const { min, max } = result;
    if (!min || !max || max <= min) return [];
    return Array.from(new Set([min, midpoint, max])).sort((a, b) => a - b);
  }, [result, midpoint]);

  const surface = {
    width: '100%',
    textAlign: isRTL ? 'right' : 'left',
    background: 'var(--brand-primary-light)',
    border: 'none',
    borderRadius: 12,
    padding: '11px 13px',
    marginTop: 8,
  };

  const title = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <Sparkles size={13} color="var(--brand-primary)" style={{ flexShrink: 0 }} />
      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>
        {t('ps_smart_title', 'המלצת מחיר חכמה')}
      </span>
      <span style={{
        fontSize: 9, fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase',
        color: 'var(--brand-primary)', background: 'rgba(26,111,212,0.12)',
        borderRadius: 5, padding: '1px 5px',
      }}>
        AI
      </span>
    </div>
  );

  // ── STATE 1 — NOT ENOUGH DETAILS YET ──────────────────────────────────────
  // One line, no frame, no reserved space: it says what would help and then
  // gets out of the way of the form.
  if (!ready) {
    return (
      <div dir={isRTL ? 'rtl' : 'ltr'} style={surface}>
        {title}
        <p style={{ margin: '5px 0 0', fontSize: 12, color: 'var(--text-2)', lineHeight: 1.5, fontWeight: 400 }}>
          {t('ps_need_more', 'הוסף פרטים על המשימה ונמליץ לך על מחיר מתאים.')}
        </p>
      </div>
    );
  }

  // ── STATE 2 — ANALYSING ───────────────────────────────────────────────────
  // A quiet spinner beside the sentence. Nothing is blocked while it runs.
  if (!result) {
    return (
      <div dir={isRTL ? 'rtl' : 'ltr'} style={surface}>
        {title}
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 6 }}>
          <Loader2 size={13} className="animate-spin" color="var(--brand-primary)" style={{ flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: 'var(--text-2)', fontWeight: 400 }}>
            {t('ps_analyzing_short', 'מנתחים את פרטי המשימה שלך…')}
          </span>
        </div>
      </div>
    );
  }

  const conf = CONFIDENCE_STYLE[result.confidence] || CONFIDENCE_STYLE.low;
  const amount = picked ?? midpoint;
  const sameAmount = result.min === result.max;

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} style={surface}>
      {title}

      {/* ── THE PRICE IS THE POINT ─────────────────────────────────────────
          Big, in the brand's blue, with the one line that says where it came
          from. The box around it stays invisible. */}
      <div dir="ltr" style={{
        marginTop: 6, fontSize: 24, fontWeight: 800, letterSpacing: -0.4,
        color: 'var(--brand-primary)', unicodeBidi: 'isolate',
      }}>
        {sameAmount
          ? `₪${result.min}${isHourly ? t('ps_hourly_suffix') : ''}`
          : `₪${result.min}–₪${result.max}${isHourly ? t('ps_hourly_suffix') : ''}`}
      </div>
      <div style={{ fontSize: 11.5, color: 'var(--text-2)', marginTop: 2, fontWeight: 400 }}>
        {t('ps_based_on_your_input', 'בהתבסס על פרטי המשימה שהזנת.')}
      </div>

      {/* Choosing an amount inside the range — optional, never automatic. */}
      {rangeOptions.length > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 9, flexWrap: 'wrap' }}>
          {rangeOptions.map((v) => {
            const active = amount === v;
            return (
              <button
                key={v}
                type="button"
                onClick={() => setPicked(v)}
                style={{
                  minHeight: 30, padding: '0 10px', borderRadius: 9, cursor: 'pointer',
                  fontSize: 12, fontWeight: active ? 600 : 500,
                  background: active ? 'var(--pub-bg)' : 'transparent',
                  color: active ? 'var(--brand-primary)' : 'var(--text-2)',
                  border: `1px solid ${active ? 'var(--brand-primary)' : 'transparent'}`,
                  boxShadow: 'none',
                }}
              >
                ₪{v}
              </button>
            );
          })}
        </div>
      )}

      {/* Visual analysis — only when the engine actually returned it. */}
      {result.identified && <AnalysisRow icon={<Search size={11} color="var(--brand-primary)" />} label={t('ps_identified')} value={result.identified} />}
      {result.requiredWork && <AnalysisRow icon={<Wrench size={11} color="var(--brand-primary)" />} label={t('ps_required')} value={result.requiredWork} />}
      {result.materials && <AnalysisRow icon={<Package size={11} color="var(--brand-primary)" />} label={t('ps_materials')} value={result.materials} />}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
        {/* The secondary action: quiet text, and it only ever fills the field. */}
        <button
          type="button"
          onClick={() => onAccept(amount)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            background: 'none', border: 'none', padding: '2px 0', cursor: 'pointer',
            color: 'var(--brand-primary)', fontSize: 12.5, fontWeight: 600,
            minHeight: 'unset', minWidth: 'unset',
          }}
        >
          {analyzing
            ? <><Loader2 size={11} className="animate-spin" /> {t('ps_analyzing_short', 'מנתחים את פרטי המשימה שלך…')}</>
            : <>{t('ps_apply', 'השתמש בהמלצה')}</>}
        </button>

        <span style={{ fontSize: 10, fontWeight: 600, background: conf.bg, color: conf.color, borderRadius: 999, padding: '2px 8px' }}>
          {t('ps_confidence')}: {t(conf.key)}
        </span>
      </div>

      <div style={{ fontSize: 10.5, color: 'var(--text-3)', marginTop: 5, lineHeight: 1.45, fontWeight: 400 }}>
        {t('ps_estimate_only', 'זוהי הערכת מחיר בלבד. התקציב הסופי לבחירתך.')}
      </div>
    </div>
  );
}