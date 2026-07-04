import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Sparkles, Loader2 } from 'lucide-react';
import { getCategoryPriceRange } from '@/lib/taskFlowConfig';

// Realistic per-hour rate ranges for hourly categories in the Israeli market (2025)
// Used to constrain LLM suggestions and as a fallback when the LLM is unavailable
const HOURLY_RATE_RANGES = {
  babysitting:  { min: 35,  max: 70  },
  pets:         { min: 30,  max: 60  },
  elderly_care: { min: 45,  max: 100 },
  tutoring:     { min: 80,  max: 180 },
  fitness:      { min: 100, max: 250 },
};

function getRateRange(category, isHourly) {
  if (isHourly && HOURLY_RATE_RANGES[category]) {
    return HOURLY_RATE_RANGES[category];
  }
  return getCategoryPriceRange(category);
}

function clampToRange(value, range) {
  return Math.max(range.min, Math.min(value, range.max));
}

export default function PriceSuggestion({ category, estimatedTime, description, location, isHourly, onAccept }) {
  const [range, setRange] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!category) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoading(true);
      const configRange = getRateRange(category, isHourly);
      try {
        const unit = isHourly ? 'לשעה אחת' : 'לכל המשימה המלאה';
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
{"min": <מספר>, "max": <מספר>, "reason": "<משפט קצר בעברית עד 8 מילים מדוע>"}

הכללים:
- min ו-max חייבים להיות מספרים שלמים מעוגלים לעשרות
- min תמיד קטן מ-max
- הטווח לא יעלה על ${isHourly ? '20' : '80'} ₪ הפרש
- המחירים חייבים להיות בתוך הטווח ₪${configRange.min}–₪${configRange.max} ${isHourly ? 'לשעה' : ''} — אל תחרוג ממנו
- ${isHourly ? 'המחיר הוא לשעה אחת בלבד, לא לכל המשימה' : 'המחיר הוא לכל המשימה'}
- בסס את ההמלצה על מחירי שוק ריאליים בישראל לשנת 2025 לתחום ${category}
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
          // Clamp LLM response to the realistic market range
          const clampedMin = clampToRange(Math.round(result.min / 10) * 10, configRange);
          const clampedMax = clampToRange(Math.round(result.max / 10) * 10, configRange);
          const finalMin = Math.min(clampedMin, clampedMax);
          const finalMax = Math.max(clampedMin, clampedMax);
          setRange({ min: finalMin, max: finalMax, reason: result.reason });
        }
      } catch (e) {
        // Fallback to config range if LLM fails
        if (!cancelled) {
          setRange({ min: configRange.min, max: configRange.max, reason: 'מבוסס על מחירי שוק' });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 600);

    return () => { cancelled = true; clearTimeout(timer); };
  }, [category, estimatedTime, description, location, isHourly]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: '#f8faff', border: '1px solid #dbeafe', borderRadius: 14, marginTop: 8 }}>
        <Loader2 size={14} color="#1a6fd4" className="animate-spin" />
        <span style={{ fontSize: 12, color: '#1a6fd4', fontWeight: 600 }}>מחשב מחיר מומלץ...</span>
      </div>
    );
  }

  if (!range) return null;

  return (
    <button
      onClick={() => onAccept(Math.round((range.min + range.max) / 2))}
      style={{
        display: 'block', width: '100%', textAlign: 'right', cursor: 'pointer',
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
          <Sparkles size={16} color="#1a6fd4" />
          <div>
            <div style={{ fontSize: 11, color: '#1e40af', fontWeight: 600, marginBottom: 1 }}>
              מחיר מומלץ {isHourly ? 'לשעה' : ''}
            </div>
            <div style={{ fontSize: 22, fontWeight: 900, color: '#0f2b6b', letterSpacing: -0.5 }}>
              ₪{range.min}–{range.max}{isHourly ? ' /שעה' : ''}
            </div>
          </div>
        </div>
        <div style={{
          background: '#1a6fd4', color: 'white', borderRadius: 10,
          padding: '7px 14px', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap',
        }}>
          השתמש
        </div>
      </div>
      <div style={{ fontSize: 10, color: '#3b82f6', marginTop: 6 }}>
        {range.reason && <span>{range.reason} · </span>}
        המחיר מבוסס על מחירי שוק ומשימות דומות
      </div>
    </button>
  );
}