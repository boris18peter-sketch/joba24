import { useEffect, useState } from 'react';
import { Sparkles, Loader2, Wand2, Search, Wrench, Package } from 'lucide-react';
import { useLanguage } from '@/lib/LanguageContext';
import { useGlobalCategories, globalFieldChain } from '@/lib/brand/globalCategories';
import { analyzePrice, getRateRange, priceSignature } from '@/lib/priceInsights';

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
  const [analyzing, setAnalyzing] = useState(false);

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

  // ── ONE STABLE KEY FOR "THE DETAILS THE PRICE DEPENDS ON" ────────────────
  // The effect used to depend on a long list of props, several of which change
  // IDENTITY without changing meaning (a translated string function, a rebuilt
  // details string). Any one of them re-ran the whole analysis, and since the
  // model reasons over live market prices, each run answered with a different
  // range: a publisher filled in a wardrobe assembly, read 230–500, and two
  // seconds later the same screen said 300–660. A signature of the actual
  // content is the only thing that may trigger a new recommendation.
  const signature = priceSignature({
    category, isHourly, estimatedTime, description, location, distance, images, lang, detailsText, requirementsText,
  });

  useEffect(() => {
    if (!category || !ready) return;
    let cancelled = false;
    setAnalyzing(true);
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
      } finally {
        if (!cancelled) setAnalyzing(false);
      }
    }, 900);

    return () => { cancelled = true; clearTimeout(timer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, ready]);

  // ── THE CARD IS ALWAYS ON SCREEN ─────────────────────────────────────────
  // It used to disappear entirely until a service was chosen, and until then
  // the price block simply had nothing where the recommendation belongs. It now
  // has two honest faces and never a blank:
  //
  //   • not ready — the card says, in one professional line, exactly what it
  //     needs before a TAILORED recommendation exists (a service, a description,
  //     a location). It carries no price, because inventing one would be a
  //     number the publisher could act on for the wrong job.
  //   • ready — the recommendation itself, drawn once it exists. There is no
  //     provisional number to be replaced a moment later: the first range shown
  //     is the one the publisher can act on.
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
          <span style={{ fontSize: 13, color: 'var(--text-1)', fontWeight: 800 }}>
            {t('ps_title', 'המלצת מחיר AI')}
          </span>
        </div>
        <p style={{ margin: '6px 0 0', fontSize: 12.5, color: 'var(--text-2)', lineHeight: 1.5, fontWeight: 600 }}>
          {t('ps_need_details', 'כתבו כמה מילים על המשימה — ההמלצה תופיע כאן מיד.')}
        </p>
      </div>
    );
  }

  // ── NO NUMBER UNTIL THERE IS A REAL ANSWER ────────────────────────────────
  // The card used to draw the curated category range immediately and then
  // REPLACE it with the AI's range a moment later. That replacement was read as
  // an unstable recommendation: two different numbers on one screen, seconds
  // apart, with nothing in between to explain the change. The first range a
  // publisher sees is now the final one for the details they actually entered.
  if (!result) {
    return (
      <div
        dir={isRTL ? 'rtl' : 'ltr'}
        className="j-ai-card"
        style={{ display: 'block', width: '100%', textAlign: isRTL ? 'right' : 'left', marginTop: 8 }}
      >
        <div className="j-ai-inner" style={{ padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <span className="j-ai-pill"><Sparkles size={10} /> AI</span>
            <span style={{ fontSize: 12.5, color: 'var(--text-2)', fontWeight: 800 }}>
              {t('ps_title', 'המלצת מחיר AI')}
            </span>
          </div>

          {/* ── THE WAIT HAS TO LOOK LIKE WORK ──────────────────────────────
              This used to be one 12.5px line with a small spinner, and it was
              read as "the AI is not working at all" — the card looked like a
              finished, empty card. The wait is now the loudest thing on the
              card: a large spinner beside a headline that names what is
              happening, then the price's own shimmering placeholder where the
              number will appear, so it is obvious the figure is being worked
              out rather than missing. */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12 }}>
            <Loader2 size={26} className="animate-spin" color="var(--brand-primary)" style={{ flexShrink: 0 }} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--text-1)', letterSpacing: -0.2 }}>
                {t('ps_calculating', 'מחשב מחיר מתאים…')}
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--text-2)', fontWeight: 600, marginTop: 2, lineHeight: 1.45 }}>
                {t('ps_calculating_sub', 'בודק מחירי שוק ועבודות דומות — עוד רגע')}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 14 }}>
            <div className="j-img-skeleton" style={{ position: 'relative', height: 26, width: 132, borderRadius: 8, overflow: 'hidden' }} />
            <div style={{ background: 'var(--surface-3)', borderRadius: 10, height: 32, width: 64 }} />
          </div>
        </div>
      </div>
    );
  }

  const view = result;
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
          {analyzing && <Loader2 size={9} className="animate-spin" />}
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
        {analyzing ? t('ps_analyzing') : t('ps_market_based')}
      </div>
      <div style={{ fontSize: 10, color: '#64748b', marginTop: 4, fontWeight: 600 }}>
        {t('ps_disclaimer')}
      </div>
    </button>
  );
}