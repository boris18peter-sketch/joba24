import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Sparkles, Loader2 } from 'lucide-react';

export default function PriceSuggestion({ category, estimatedTime, description, location, isHourly, onAccept }) {
  const [range, setRange] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!category) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        // Fetch recent completed tasks in this category for market data
        const historicalTasks = await base44.entities.Task.filter(
          { category, status: 'COMPLETED' },
          '-created_date',
          20
        );
        const prices = historicalTasks.map(t => t.price).filter(Boolean);
        const avgHistorical = prices.length > 0
          ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length)
          : null;
        const minHistorical = prices.length > 0 ? Math.min(...prices) : null;
        const maxHistorical = prices.length > 0 ? Math.max(...prices) : null;

        const unit = isHourly ? 'לשעה אחת' : 'לכל המשימה המלאה';
        const prompt = `
אתה מומחה תמחור לפלטפורמת עבודות קטנות בישראל (דומה ל-TaskRabbit / Fixlers).
תן המלצת מחיר ריאלית לג'ובה הבאה. המחיר הוא ${unit}.

קטגוריה: ${category}
סוג תמחור: ${isHourly ? 'לפי שעה' : 'מחיר כולל למשימה'}
${estimatedTime ? `זמן משוער: ${estimatedTime}` : 'זמן משוער: לא צוין'}
תיאור: ${description || 'לא צוין'}
מיקום: ${location || 'לא צוין'}
${avgHistorical ? `נתוני שוק מהפלטפורמה: ממוצע ₪${avgHistorical}, טווח ₪${minHistorical}–₪${maxHistorical} (מתוך ${prices.length} משימות שהושלמו)` : 'אין עדיין נתונים היסטוריים בפלטפורמה'}

השב בלבד עם JSON תקין בפורמט:
{"min": <מספר>, "max": <מספר>, "reason": "<משפט קצר בעברית עד 8 מילים מדוע>"}

הכללים:
- min ו-max חייבים להיות מספרים שלמים מעוגלים לעשרות
- min תמיד קטן מ-max
- הטווח לא יעלה על ${isHourly ? '30' : '100'} ₪ הפרש
- ${isHourly ? 'המחיר הוא לשעה אחת בלבד, לא לכל המשימה' : 'המחיר הוא לכל המשימה'}
- בסס את ההמלצה על מחירי שוק ריאליים בישראל לשנת 2025 לתחום ${category}
- אם יש נתונים היסטוריים, השתמש בהם כבסיס והתאם לפי התיאור והמיקום
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
          setRange(result);
        }
      } catch (e) {
        // fallback silently
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