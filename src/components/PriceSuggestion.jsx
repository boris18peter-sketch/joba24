import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Sparkles, Loader2, Wand2 } from 'lucide-react';
import { getCategoryPriceRange } from '@/lib/taskFlowConfig';
import { useLanguage } from '@/lib/LanguageContext';

// Realistic per-hour rate ranges for hourly categories in the Israeli market (2025)
// Used to constrain LLM suggestions and as a fallback when the LLM is unavailable
const HOURLY_RATE_RANGES = {
  babysitting:  { min: 35,  max: 70  },
  pets:         { min: 30,  max: 60  },
  elderly_care: { min: 45,  max: 100 },
  tutoring:     { min: 80,  max: 180 },
  fitness:      { min: 100, max: 250 },
};

// Maps app language code → English name, so the LLM `reason` is returned in the user's language
const LANG_NAMES = {
  he: 'Hebrew', en: 'English', ar: 'Arabic', es: 'Spanish', fr: 'French',
  ru: 'Russian', fil: 'Filipino', hi: 'Hindi', zh: 'Chinese',
};

function getRateRange(category, isHourly) {
  if (isHourly && HOURLY_RATE_RANGES[category]) {
    return HOURLY_RATE_RANGES[category];
  }
  return getCategoryPriceRange(category);
}

function clampToRange(value, min, max) {
  return Math.max(min, Math.min(value, max));
}

// Estimate how many distinct tasks the description contains.
// Multi-task bundles (e.g. a Facebook-style post listing several jobs) should
// be priced as the SUM of the individual tasks, not a single task.
function countDistinctTasks(description) {
  if (!description) return 1;
  const text = description.trim();
  if (!text) return 1;
  // Split into lines, drop greetings / filler / time-only lines
  const filler = /^(היי|שלום|מחפש|מחפשת|דחוף|אשמח|תודה|שעה|שעות|בוקר|ערב|לילה|0?\d{1,2}:\d{2}|יום|ראשון|שני|שלישי|רביעי|חמישי|שישי|שבת)/i;
  const lines = text.split(/\n+/).map(l => l.trim()).filter(l => l.length > 4 && !filler.test(l));
  // Also count action-phrase fragments separated by commas / bullets
  const fragments = text.split(/[,\u2022\u05be\u00b7;]/).map(s => s.trim()).filter(s => s.length > 5);
  const estimate = Math.max(lines.length, fragments.length);
  return Math.max(1, Math.min(estimate, 8));
}

export default function PriceSuggestion({ category, estimatedTime, description, location, isHourly, onAccept }) {
  const { t, isRTL, lang } = useLanguage();
  const [range, setRange] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!category) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoading(true);
      const configRange = getRateRange(category, isHourly);
      const taskCount = countDistinctTasks(description);
      const isMultiTask = !isHourly && taskCount >= 2;
      try {
        const unit = isHourly ? 'לשעה אחת' : 'לכל המשימה המלאה';
        const langName = LANG_NAMES[lang] || 'English';
        const prompt = `
אתה מומחה תמחור לפלטפורמת עבודות קטנות בישראל (דומה ל-TaskRabbit / Fixlers).
תן המלצת מחיר ריאלית לג'ובה הבאה. המחיר הוא ${unit}.

קטגוריה: ${category}
סוג תמחור: ${isHourly ? 'לפי שעה' : 'מחיר כולל למשימה'}
${estimatedTime ? `זמן משוער: ${estimatedTime}` : 'זמן משוער: לא צוין'}
תיאור: ${description || 'לא צוין'}
מיקום: ${location || 'לא צוין'}

טווח מחירים ריאלי לפי מחירי שוק בישראל 2025: ₪${configRange.min}–₪${configRange.max} ${isHourly ? 'לשעה' : ''}

השב בלבד עם JSON תקין בפורמט:
{"min": <מספר>, "max": <מספר>, "reason": "<משפט קצר עד 8 מילים מדוע>"}

הכללים:
- קרא את כל התיאור בעיון. אם מוזכרות מספר עבודות נפרדות (למשל פירוק ארון + התקנת מכונת כביסה + תיקון מגירות + תליית מנורה), המחיר הוא סכום כל העבודות יחד, לא מחיר של עבודה אחת.
- אל תתעלם מאף עבודה שמוזכרת בתיאור. ככל שיש יותר עבודות או שהן מורכבות יותר, המחיר עולה בהתאם.
- min ו-max חייבים להיות מספרים שלמים מעוגלים לעשרות.
- min תמיד קטן מ-max בפער משמעותי — לפחות 15% מהמחיר (ולא פחות מ-${isHourly ? '10' : '50'} ₪). אסור ש-min יהיה שווה ל-max.
- הטה את ההמלצה לכיוון העליון של הטווח הריאלי כדי שהמשימה תהיה אטרקטיבית לעובדים — עדיף להמליץ על מחיר גבוה יותר שימשוך יותר עובדים מקצועיים.
- מחיר המינימום: ₪${configRange.min} ${isHourly ? 'לשעה' : ''}
- ${isHourly ? 'המחיר הוא לשעה אחת בלבד, לא לכל המשימה' : `כשיש מספר עבודות נפרדות, המחיר יכול לעלות משמעותית על ₪${configRange.max} — הערך כל עבודה בנפרד וסכום אותן`}
- בסס את ההמלצה על מחירי שוק ריאליים בישראל לשנת 2025 לתחום ${category}
- שדה ה-reason חייב להיות כתוב בשפה הבאה: ${langName}
`;
        const result = await base44.integrations.Core.InvokeLLM({
          prompt,
          response_json_schema: {
            type: 'object',
            properties: {
              min: { type: 'number' },
              max: { type: 'number' },
              reason: { type: 'string' },
            },
          },
        });
        if (!cancelled && result?.min && result?.max) {
          // For non-hourly multi-task bundles, allow the upper bound to scale up
          // (the market range is per single task; a bundle sums several tasks).
          const minFloor = configRange.min;
          const maxCeiling = isHourly
            ? configRange.max
            : isMultiTask
              ? Math.min(configRange.max * Math.min(taskCount + 1, 5), 3000)
              : configRange.max;
          const clampedMin = clampToRange(Math.round(result.min / 10) * 10, minFloor, maxCeiling);
          const clampedMax = clampToRange(Math.round(result.max / 10) * 10, minFloor, maxCeiling);
          let finalMin = Math.min(clampedMin, clampedMax);
          let finalMax = Math.max(clampedMin, clampedMax);
          // Guarantee a meaningful spread so we NEVER show a collapsed range
          // like "400–400". Enforce ≥15% (or the hourly minimum) between the two.
          const minSpread = Math.max(isHourly ? 10 : 50, Math.round(finalMax * 0.15));
          if (finalMax - finalMin < minSpread) {
            finalMin = Math.max(minFloor, finalMax - minSpread);
            if (finalMax - finalMin < minSpread) finalMax = finalMin + minSpread;
          }
          setRange({ min: finalMin, max: finalMax, reason: result.reason });
        }
      } catch (e) {
        // Fallback to config range if LLM fails
        if (!cancelled) {
          setRange({ min: configRange.min, max: configRange.max, reason: t('ps_market_fallback') });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 600);

    return () => { cancelled = true; clearTimeout(timer); };
  }, [category, estimatedTime, description, location, isHourly, lang, t]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: '#f8faff', border: '1px solid #dbeafe', borderRadius: 14, marginTop: 8 }}>
        <Loader2 size={14} color="#1a6fd4" className="animate-spin" />
        <span style={{ fontSize: 12, color: '#1a6fd4', fontWeight: 600 }}>{t('ps_loading')}</span>
      </div>
    );
  }

  if (!range) return null;

  return (
    <button
      onClick={() => onAccept(Math.round((range.min + (range.max - range.min) * 0.7) / 10) * 10)}
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Wand2 size={16} color="#1a6fd4" />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 1 }}>
              <span style={{ fontSize: 12, color: '#1e40af', fontWeight: 800 }}>
                {t('ps_recommended')}
              </span>
              <span style={{ fontSize: 10, color: '#1a6fd4', fontWeight: 700, background: '#dbeafe', borderRadius: 6, padding: '1px 6px' }}>
                {t('ps_based_on_desc')}
              </span>
            </div>
            <div dir="ltr" style={{ fontSize: 22, fontWeight: 900, color: '#0f2b6b', letterSpacing: -0.5, unicodeBidi: 'isolate' }}>
              ₪{range.min}–₪{range.max}{isHourly ? t('ps_hourly_suffix') : ''}
            </div>
          </div>
        </div>
        <div style={{
          background: '#1a6fd4', color: 'white', borderRadius: 10,
          padding: '7px 14px', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap',
        }}>
          {t('ps_use')}
        </div>
      </div>
      <div style={{ fontSize: 10, color: '#3b82f6', marginTop: 6, lineHeight: 1.5, display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
        <Sparkles size={11} style={{ flexShrink: 0 }} />
        {range.reason && <span>{range.reason} · </span>}
        {t('ps_market_based')}
      </div>
      <div style={{ fontSize: 10, color: '#64748b', marginTop: 4, fontWeight: 600 }}>
        {t('ps_disclaimer')}
      </div>
    </button>
  );
}