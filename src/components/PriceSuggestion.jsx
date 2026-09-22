import { useEffect, useState } from 'react';
import { Sparkles, Loader2, Wand2, Search, Wrench, Package } from 'lucide-react';
import { useLanguage } from '@/lib/LanguageContext';
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
  const [result, setResult] = useState(null);

  // Re-run when the photo set changes. Joined so the effect deps stay stable
  // (a new array identity on every render would loop forever).
  const photoKey = (images || []).join(',');
  const hasPhotos = photoKey.length > 0;

  useEffect(() => {
    if (!category) return;
    let cancelled = false;
    const fallback = () => {
      const r = getRateRange(category, isHourly);
      return { min: r.min, max: r.max, reason: t('ps_market_fallback'), confidence: 'low' };
    };
    // The full analysis consumes integration credits on every run, so it only
    // fires once the publisher has actually described the job (or attached a
    // photo). Before that we show the free curated range instantly.
    // Structured form details count as "described" — a moving job with the
    // addresses and floors filled in is analysable even with a short text.
    const hasDetails = (detailsText || '').trim().length > 0;
    if ((description || '').trim().length < 15 && !hasPhotos && !hasDetails) {
      setResult(fallback());
      return;
    }
    // Longer debounce than a text-only suggestion: the analysis also searches
    // live market prices, so we don't want a run per keystroke pause.
    const timer = setTimeout(async () => {
      try {
        const res = await analyzePrice({
          category, estimatedTime, description, location, isHourly, distance, images, lang,
          detailsText, requirementsText,
        });
        if (!cancelled) setResult(res || fallback());
      } catch {
        // Analysis unavailable — fall back to the curated category range
        if (!cancelled) setResult(fallback());
      }
    }, 1200);

    return () => { cancelled = true; clearTimeout(timer); };
  }, [category, estimatedTime, description, location, isHourly, distance, photoKey, lang, t, detailsText, requirementsText]);

  if (!category) return null;

  // Nothing to show yet — show progress rather than an empty gap. Once a result
  // exists it stays on screen while a newer one is computed (no flicker).
  if (!result) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: '#f8faff', border: '1px solid #dbeafe', borderRadius: 14, marginTop: 8 }}>
        <Loader2 size={14} color="#1a6fd4" className="animate-spin" />
        <span style={{ fontSize: 12, color: '#1a6fd4', fontWeight: 600 }}>
          {hasPhotos ? t('ps_analyzing') : t('ps_loading')}
        </span>
      </div>
    );
  }

  const conf = CONFIDENCE_STYLE[result.confidence] || CONFIDENCE_STYLE.low;

  return (
    <button
      onClick={() => onAccept(Math.round((result.min + result.max) / 2 / 10) * 10)}
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
          <Wand2 size={16} color="#1a6fd4" style={{ flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: '#1e40af', fontWeight: 800 }}>{t('ps_recommended')}</span>
        </div>
        <span style={{ fontSize: 10, color: '#1a6fd4', fontWeight: 700, background: '#dbeafe', borderRadius: 6, padding: '2px 6px', whiteSpace: 'nowrap' }}>
          {result.hasPhotos ? t('ps_based_on_photo') : t('ps_based_on_desc')}
        </span>
      </div>

      {/* Price + accept pill */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 6 }}>
        <div dir="ltr" style={{ fontSize: 22, fontWeight: 900, color: '#0f2b6b', letterSpacing: -0.5, unicodeBidi: 'isolate' }}>
          ₪{result.min}–₪{result.max}{isHourly ? t('ps_hourly_suffix') : ''}
        </div>
        <div style={{ background: '#1a6fd4', color: 'white', borderRadius: 10, padding: '7px 14px', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>
          {t('ps_use')}
        </div>
      </div>

      {/* Visual analysis */}
      {result.identified && (
        <AnalysisRow icon={<Search size={12} color="#3b82f6" />} label={t('ps_identified')} value={result.identified} />
      )}
      {result.requiredWork && (
        <AnalysisRow icon={<Wrench size={12} color="#3b82f6" />} label={t('ps_required')} value={result.requiredWork} />
      )}
      {result.materials && (
        <AnalysisRow icon={<Package size={12} color="#3b82f6" />} label={t('ps_materials')} value={result.materials} />
      )}

      {/* Confidence + how many real jobs the estimate leans on */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 9, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 10, fontWeight: 700, background: conf.bg, color: conf.color, border: `1px solid ${conf.border}`, borderRadius: 999, padding: '2px 8px' }}>
          {t('ps_confidence')}: {t(conf.key)}
        </span>
        {result.historyCount > 0 && (
          <span style={{ fontSize: 10, fontWeight: 700, background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', borderRadius: 999, padding: '2px 8px' }}>
            {t('ps_history', { n: result.historyCount })}
          </span>
        )}
      </div>

      <div style={{ fontSize: 10, color: '#3b82f6', marginTop: 6, lineHeight: 1.5, display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
        <Sparkles size={11} style={{ flexShrink: 0 }} />
        {/* Only a genuinely short reason fits the footer line — the analysis rows above carry the detail */}
        {result.reason && result.reason.length <= 70 && <span>{result.reason} · </span>}
        {t('ps_market_based')}
      </div>
      <div style={{ fontSize: 10, color: '#64748b', marginTop: 4, fontWeight: 600 }}>
        {t('ps_disclaimer')}
      </div>
    </button>
  );
}