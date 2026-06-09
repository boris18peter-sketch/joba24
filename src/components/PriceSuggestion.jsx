import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Sparkles, Loader2 } from 'lucide-react';

export default function PriceSuggestion({ category, estimatedTime, description, location, onAccept }) {
  const [range, setRange] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!category) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        // Fetch recent completed tasks in this category for historical context
        const historicalTasks = await base44.entities.Task.filter(
          { category, status: 'COMPLETED' },
          '-created_date',
          20
        );
        const prices = historicalTasks.map(t => t.price).filter(Boolean);
        const avgHistorical = prices.length > 0
          ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length)
          : null;

        const prompt = `
אתה מומחה תמחור לפלטפורמת עבודות קטנות בישראל (כמו TaskRabbit).
תן המלצת מחיר ריאלית לג'ובה הבאה:

קטגוריה: ${category}
זמן משוער: ${estimatedTime || 'לא צוין'}
תיאור: ${description || 'לא צוין'}
מיקום: ${location || 'לא צוין'}
${avgHistorical ? `מחיר ממוצע היסטורי בקטגוריה זו בפלטפורמה: ₪${avgHistorical}` : ''}

השב בלבד עם JSON תקין בפורמט:
{"min": <מספר>, "max": <מספר>, "reason": "<משפט קצר בעברית עד 8 מילים מדוע>"}

הכלל: min ו-max חייבים להיות מספרים שלמים מעוגלים לעשרות. min תמיד קטן מ-max. הטווח לא יעלה על 100 ₪ הפרש.
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
    }, 600); // debounce

    return () => { cancelled = true; clearTimeout(timer); };
  }, [category, estimatedTime, description, location]);

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
    <div style={{
      background: 'linear-gradient(135deg, #eff6ff, #dbeafe)',
      border: '1.5px solid #93c5fd',
      borderRadius: 14,
      padding: '12px 14px',
      marginTop: 8,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Sparkles size={16} color="#1a6fd4" />
          <div>
            <div style={{ fontSize: 11, color: '#1e40af', fontWeight: 600, marginBottom: 1 }}>מחיר מומלץ</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: '#0f2b6b', letterSpacing: -0.5 }}>
              ₪{range.min}–{range.max}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, alignItems: 'flex-end' }}>
          <button
            onClick={() => onAccept(Math.round((range.min + range.max) / 2))}
            style={{ background: '#1a6fd4', color: 'white', border: 'none', borderRadius: 10, padding: '7px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
          >
            השתמש
          </button>
        </div>
      </div>
      <div style={{ fontSize: 10, color: '#3b82f6', marginTop: 6 }}>
        {range.reason && <span>{range.reason} · </span>}
        המחיר מבוסס על משימות דומות בפלטפורמה
      </div>
    </div>
  );
}