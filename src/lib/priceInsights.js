/**
 * Price insights — the AI price-recommendation engine.
 *
 * Combines three market sources:
 *   1. Our own marketplace history — real prices paid on completed tasks
 *   2. A curated Israeli price database (per-category ranges)
 *   3. A live web search for current market prices
 * and, when the publisher attached photos, a visual analysis of the actual
 * problem (what it is, what work it needs, what materials it costs).
 */

import { base44 } from '@/api/base44Client';
import { getCategoryPriceRange } from '@/lib/taskFlowConfig';

// Realistic per-hour rate ranges for hourly categories in the Israeli market (2025).
// Used to constrain LLM suggestions and as a fallback when the LLM is unavailable.
const HOURLY_RATE_RANGES = {
  babysitting:  { min: 35,  max: 70  },
  pets:         { min: 30,  max: 60  },
  elderly_care: { min: 45,  max: 100 },
  tutoring:     { min: 80,  max: 180 },
  fitness:      { min: 100, max: 250 },
};

// Maps app language code → English name, so the LLM returns its text in the user's language
const LANG_NAMES = {
  he: 'Hebrew', en: 'English', ar: 'Arabic', es: 'Spanish', fr: 'French',
  ru: 'Russian', fil: 'Filipino', hi: 'Hindi', zh: 'Chinese',
};

export function getRateRange(category, isHourly) {
  if (isHourly && HOURLY_RATE_RANGES[category]) {
    return HOURLY_RATE_RANGES[category];
  }
  return getCategoryPriceRange(category);
}

const clampToRange = (value, min, max) => Math.max(min, Math.min(value, max));

// Estimate how many distinct tasks the description contains.
// Multi-task bundles (e.g. a post listing several jobs) should be priced as the
// SUM of the individual tasks, not a single task.
function countDistinctTasks(description) {
  if (!description) return 1;
  const text = description.trim();
  if (!text) return 1;
  const filler = /^(היי|שלום|מחפש|מחפשת|דחוף|אשמח|תודה|שעה|שעות|בוקר|ערב|לילה|0?\d{1,2}:\d{2}|יום|ראשון|שני|שלישי|רביעי|חמישי|שישי|שבת)/i;
  const lines = text.split(/\n+/).map(l => l.trim()).filter(l => l.length > 4 && !filler.test(l));
  const fragments = text.split(/[,\u2022\u05be\u00b7;]/).map(s => s.trim()).filter(s => s.length > 5);
  const estimate = Math.max(lines.length, fragments.length);
  return Math.max(1, Math.min(estimate, 8));
}

// ── Source 1: real prices paid on our own marketplace ──
// Cached per category so typing in the description doesn't re-query on every
// keystroke — one query per category per 5 minutes is plenty.
const HISTORY_TTL = 5 * 60 * 1000;
const historyCache = new Map();

export async function fetchHistoricalPrices(category) {
  if (!category) return null;
  const cached = historyCache.get(category);
  if (cached && Date.now() - cached.ts < HISTORY_TTL) return cached.data;

  let data = null;
  try {
    const tasks = await base44.entities.Task.filter(
      { category, status: 'COMPLETED' },
      '-completed_at',
      100
    );
    const prices = (tasks || [])
      .map(t => Number(t.price))
      .filter(p => Number.isFinite(p) && p > 0)
      .sort((a, b) => a - b);
    // Require a meaningful sample before calling it market data
    if (prices.length >= 5) {
      data = {
        count: prices.length,
        median: prices[Math.floor(prices.length / 2)],
        min: prices[0],
        max: prices[prices.length - 1],
      };
    }
  } catch {
    data = null;
  }
  historyCache.set(category, { ts: Date.now(), data });
  return data;
}

// The LLM is asked for exactly high | medium | low, but normalise defensively
// and fall back to what we actually know about the input.
function normalizeConfidence(raw, hasPhotos, description) {
  const v = String(raw || '').toLowerCase();
  if (v.includes('high') || v.includes('גבוה')) return 'high';
  if (v.includes('low') || v.includes('נמוך')) return 'low';
  if (v.includes('medium') || v.includes('בינוני')) return 'medium';
  if (hasPhotos && (description || '').trim().length > 20) return 'high';
  if (hasPhotos || (description || '').trim().length > 20) return 'medium';
  return 'low';
}

// ── The analysis call ──
// Returns null when the LLM produced nothing usable (caller falls back to the
// curated category range).
export async function analyzePrice({ category, estimatedTime, description, location, isHourly, distance, images, lang }) {
  const configRange = getRateRange(category, isHourly);
  const taskCount = countDistinctTasks(description);
  const isMultiTask = !isHourly && taskCount >= 2;
  const photoUrls = Array.isArray(images) ? images.filter(Boolean).slice(0, 4) : [];
  const hasPhotos = photoUrls.length > 0;

  const history = await fetchHistoricalPrices(category);

  const unit = isHourly ? 'לשעה אחת' : 'לכל המשימה המלאה';
  const langName = LANG_NAMES[lang] || 'English';
  const distanceLine = distance != null
    ? `מרחק בין מוצא ליעד: ${distance < 1 ? `${Math.round(distance * 1000)} מטר` : `${distance.toFixed(1)} ק"מ`}\nעלות דלק וזמן נסיעה: יש להוסיף למחיר כ-${Math.max(2, Math.round(distance * 2.5))}–${Math.max(4, Math.round(distance * 4))} ₪ עבור דלק ובלאי`
    : '';
  const historyLine = history
    ? `מחירים אמיתיים ששולמו בפלטפורמה שלנו עבור משימות ${category} שהושלמו: חציון ₪${history.median}, טווח ₪${history.min}–₪${history.max} (מתוך ${history.count} משימות). זהו הנתון האמין ביותר — תן לו משקל גבוה.`
    : '';

  const photoInstructions = hasPhotos
    ? `מצורפות ${photoUrls.length} תמונות של הבעיה בפועל. נתח אותן בעיון:
- זהה מהי הבעיה המדויקת (סוג הנזק, איזה חלק או רכיב, גודל ומורכבות)
- הערך מהי העבודה הנדרשת לתיקון
- הערך אילו חומרים או חלקים יידרשו ומה עלותם המשוערת בישראל
אם התמונה לא ברורה או לא רלוונטית, ציין זאת בשדה identified והחזר רמת ביטחון נמוכה.`
    : 'לא צורפו תמונות — בסס את ההערכה על התיאור בלבד.';

  const prompt = `
אתה מומחה תמחור בכיר לפלטפורמת עבודות קטנות בישראל (בסגנון TaskRabbit / Fixlers).
הערך את הג'ובה הבאה והחזר המלצת מחיר מקצועית. המחיר הוא ${unit}.

קטגוריה: ${category}
סוג תמחור: ${isHourly ? 'לפי שעה' : 'מחיר כולל למשימה'}
${estimatedTime ? `זמן משוער: ${estimatedTime}` : 'זמן משוער: לא צוין'}
תיאור: ${description || 'לא צוין'}
מיקום: ${location || 'לא צוין'}
${distanceLine}
${historyLine}
טווח מחירים מקצועי לקטגוריה זו בישראל 2025: ₪${configRange.min}–₪${configRange.max} ${isHourly ? 'לשעה' : ''}

${photoInstructions}

השתמש בחיפוש אינטרנט כדי לאמת מחירי שוק עדכניים בישראל לתחום ${category}.

השב בלבד עם JSON תקין בפורמט:
{"min": <מספר>, "max": <מספר>, "identified": "<מה זוהה>", "required_work": "<מה נדרש>", "materials": "<חומרים ועלותם>", "confidence": "high|medium|low", "reason": "<משפט קצר עד 8 מילים>"}

הכללים:
- קרא את כל התיאור בעיון. אם מוזכרות מספר עבודות נפרדות (למשל פירוק ארון + התקנת מכונת כביסה + תיקון מגירות), המחיר הוא סכום כל העבודות יחד, לא מחיר של עבודה אחת.
- אל תתעלם מאף עבודה שמוזכרת בתיאור. ככל שיש יותר עבודות או שהן מורכבות יותר, המחיר עולה בהתאם.
${distanceLine ? `- המרחק בין הכתובות משפיע על המחיר: דלק, בלאי רכב וזמן נסיעה.\n` : ''}- min ו-max חייבים להיות מספרים שלמים מעוגלים לעשרות.
- min תמיד קטן מ-max בפער משמעותי — לפחות 15% מהמחיר (ולא פחות מ-${isHourly ? '10' : '50'} ₪). אסור ש-min יהיה שווה ל-max.
- הטה את ההמלצה לכיוון העליון של הטווח הריאלי כדי שהמשימה תהיה אטרקטיבית לעובדים — עדיף להמליץ על מחיר גבוה יותר שימשוך יותר עובדים מקצועיים.
- מחיר המינימום: ₪${configRange.min} ${isHourly ? 'לשעה' : ''}
- ${isHourly ? 'המחיר הוא לשעה אחת בלבד, לא לכל המשימה' : `כשיש מספר עבודות נפרדות, המחיר יכול לעלות משמעותית על ₪${configRange.max} — הערך כל עבודה בנפרד וסכום אותן`}
- בסס את ההמלצה על מחירי שוק ריאליים בישראל לשנת 2025 לתחום ${category}
- שדות identified, required_work, materials ו-reason חייבים להיות כתובים בשפה הבאה: ${langName}
- שדה confidence חייב להיות בדיוק אחד מהערכים: high, medium, low
`;

  const result = await base44.integrations.Core.InvokeLLM({
    prompt,
    ...(hasPhotos ? { file_urls: photoUrls } : {}),
    add_context_from_internet: true,
    // gemini_3_flash is the cheapest model that supports BOTH vision
    // (file_urls) and live web search, so analyses stay accurate without the
    // much higher per-call cost of the Pro tier.
    model: 'gemini_3_flash',
    response_json_schema: {
      type: 'object',
      properties: {
        min: { type: 'number' },
        max: { type: 'number' },
        identified: { type: 'string' },
        required_work: { type: 'string' },
        materials: { type: 'string' },
        confidence: { type: 'string' },
        reason: { type: 'string' },
      },
    },
  });

  if (!result?.min || !result?.max) return null;

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
  // Guarantee a meaningful spread so we NEVER show a collapsed range like
  // "400–400". Enforce ≥15% (or the hourly minimum) between the two.
  const minSpread = Math.max(isHourly ? 10 : 50, Math.round(finalMax * 0.15));
  if (finalMax - finalMin < minSpread) {
    finalMin = Math.max(minFloor, finalMax - minSpread);
    if (finalMax - finalMin < minSpread) finalMax = finalMin + minSpread;
  }

  return {
    min: finalMin,
    max: finalMax,
    identified: result.identified || '',
    requiredWork: result.required_work || '',
    materials: result.materials || '',
    confidence: normalizeConfidence(result.confidence, hasPhotos, description),
    reason: result.reason || '',
    hasPhotos,
    historyCount: history?.count || 0,
  };
}