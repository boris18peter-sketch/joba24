import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Sparkles, Loader2, TrendingUp, RefreshCw } from 'lucide-react';

export default function PriceSuggestion({ category, estimatedTime, description, location, onAccept }) {
  const [range, setRange] = useState(null);
  const [loading, setLoading] = useState(false);
  const [triggered, setTriggered] = useState(false);

  const fetchSuggestion = async () => {
    if (!category) return;
    setLoading(true);
    setRange(null);
    try {
      const historicalTasks = await base44.entities.Task.filter(
        { category, status: 'COMPLETED' },
        '-created_date',
        30
      );
      const prices = historicalTasks.map(t => t.price).filter(Boolean);
      const avgHistorical = prices.length > 0
        ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length)
        : null;
      const median = prices.length > 0
        ? prices.sort((a, b) => a - b)[Math.floor(prices.length / 2)]
        : null;

      const prompt = `
אתה מומחה תמחור לפלטפורמת משימות וג'ובות בישראל.
תפקידך לסרוק את שוק העבודה הישראלי ולתת המלצת מחיר ריאלית ומדויקת.

פרטי המשימה:
- קטגוריה: ${category}
- זמן ביצוע: ${estimatedTime || 'לא צוין'}
- תיאור: ${description || 'לא צוין'}
- מיקום: ${location || 'ישראל'}
${avgHistorical ? `- מחיר ממוצע היסטורי בפלטפורמה: ₪${avgHistorical}` : ''}
${median ? `- מחיר חציוני: ₪${median}` : ''}
${prices.length > 0 ? `- מבוסס על ${prices.length} עסקאות אמיתיות` : ''}

בדוק את מחירי השוק הישראלי לעבודות כאלה.
השב אך ורק ב-JSON תקין:
{"min": <מספר_שלם>, "max": <מספר_שלם>, "reason": "<עד 8 מילים בעברית>", "market_note": "<משפט קצר על מחיר השוק>"}

חוקים: min < max, שניהם מעוגלים ל-10, הפרש עד 150₪.
`;
      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: true,
        model: 'gemini_3_flash',
        response_json_schema: {
          type: 'object',
          properties: {
            min: { type: 'number' },
            max: { type: 'number' },
            reason: { type: 'string' },
            market_note: { type: 'string' },
          },
        },
      });
      if (result?.min && result?.max) {
        setRange({ ...result, historicalCount: prices.length, avgHistorical });
      }
    } catch (e) {
      // silent
    } finally {
      setLoading(false);
    }
  };

  // Auto-trigger when category+description are filled in
  useEffect(() => {
    if (!category || !description || description.length < 10) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      if (!cancelled) {
        setTriggered(true);
        await fetchSuggestion();
      }
    }, 1200);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [category, description, estimatedTime]);

  if (!category) return null;

  // Show trigger button before user has typed description
  if (!triggered && !loading && !range) {
    if (!description || description.length < 10) return null;
  }

  if (loading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '12px 16px', background: 'linear-gradient(135deg,#f0f7ff,#e8f0fe)',
        border: '1.5px solid #bfdbfe', borderRadius: 16, marginTop: 10,
      }}>
        <Loader2 size={16} color="#1a6fd4" className="animate-spin" />
        <div>
          <div style={{ fontSize: 13, color: '#1a6fd4', fontWeight: 700 }}>סורק מחירי שוק...</div>
          <div style={{ fontSize: 11, color: '#3b82f6', marginTop: 1 }}>בדיקת עסקאות דומות + מחירי שוק ישראלי</div>
        </div>
      </div>
    );
  }

  if (!range) return null;

  const midPrice = Math.round((range.min + range.max) / 2);

  return (
    <div style={{
      background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)',
      border: '1.5px solid #86efac',
      borderRadius: 16,
      padding: '14px 16px',
      marginTop: 10,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
        <TrendingUp size={15} color="#16a34a" />
        <span style={{ fontSize: 12, fontWeight: 800, color: '#15803d' }}>מחיר שוק מומלץ</span>
        {range.historicalCount > 0 && (
          <span style={{ fontSize: 10, color: '#16a34a', background: 'rgba(22,163,74,0.1)', borderRadius: 20, padding: '2px 7px', fontWeight: 600 }}>
            מבוסס על {range.historicalCount} עסקאות
          </span>
        )}
      </div>

      {/* Price range */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
          <span style={{ fontSize: 28, fontWeight: 900, color: '#14532d', letterSpacing: -1 }}>
            ₪{range.min}
          </span>
          <span style={{ fontSize: 16, color: '#16a34a', fontWeight: 700 }}>–</span>
          <span style={{ fontSize: 28, fontWeight: 900, color: '#14532d', letterSpacing: -1 }}>
            ₪{range.max}
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
          <button
            onClick={() => onAccept(midPrice)}
            style={{
              background: 'linear-gradient(135deg,#16a34a,#15803d)',
              color: 'white', border: 'none', borderRadius: 12,
              padding: '8px 16px', fontSize: 13, fontWeight: 800,
              cursor: 'pointer', whiteSpace: 'nowrap',
              boxShadow: '0 2px 10px rgba(22,163,74,0.3)',
            }}
          >
            השתמש ב-₪{midPrice}
          </button>
          <button
            onClick={fetchSuggestion}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 4,
              fontSize: 11, color: '#16a34a', fontWeight: 600,
            }}
          >
            <RefreshCw size={10} /> חשב מחדש
          </button>
        </div>
      </div>

      {/* Reason / market note */}
      <div style={{ marginTop: 8, fontSize: 11, color: '#166534', lineHeight: 1.5 }}>
        {range.reason && <span>💡 {range.reason}</span>}
        {range.market_note && <div style={{ marginTop: 2, color: '#16a34a' }}>📊 {range.market_note}</div>}
      </div>
    </div>
  );
}