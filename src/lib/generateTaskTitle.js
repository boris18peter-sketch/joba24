import { base44 } from '@/api/base44Client';

// Heuristic fallback: collapse a multi-line / multi-task description into a
// single concise title that captures the full scope of work (not just the
// first line). Replaces newlines and bullet separators with ", ", strips
// greetings/filler, and truncates at a word boundary.
export function autoGenerateTitle(description) {
  if (!description) return '';
  let text = description.trim();
  if (!text) return '';
  // Drop leading greeting / meta lines that add no task info
  const lines = text.split(/\n+/).map(l => l.trim()).filter(Boolean);
  const filler = /^(היי|שלום|מחפש|מחפשת|דחוף|אשמח|תודה|0?\d{1,2}:\d{2}|בבוקר|בערב|יום (ראשון|שני|שלישי|רביעי|חמישי|שישי|שבת))/i;
  const meaningful = lines.filter(l => !filler.test(l));
  const joined = (meaningful.length ? meaningful : lines)
    .join(' · ')
    .replace(/\s+/g, ' ')
    .trim();
  const limit = 90;
  if (joined.length <= limit) return joined;
  const truncated = joined.substring(0, limit);
  const lastSpace = truncated.lastIndexOf(' ');
  return (lastSpace > 40 ? truncated.substring(0, lastSpace) : truncated) + '...';
}

// AI-generated title: reads the FULL description and returns a single concise
// Hebrew title (≤60 chars) that captures all the work requested — so a
// multi-task post like "פירוק ארון + התקנת מכונה + תיקון מגירות" doesn't get
// truncated to just "פירוק ארון קטן". Falls back to the heuristic on failure.
export async function generateTaskTitle(description) {
  if (!description || description.trim().length < 5) return autoGenerateTitle(description);
  try {
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `אתה יוצר כותרות קצרות למשימות באפליקציית עבודות בעברית.
קרא את תיאור המשימה המלא וצור כותרת אחת תמציתית שמתארת את כל היקף העבודה — לא רק את השורה הראשונה.
אם מוזכרות מספר עבודות, כלול את כולן בקצרה (מותר להשתמש ב"ועוד" בסוף אם אין מקום).
התעלם מברכות (היי/שלום), שעות ותאריכים. התמקד במה שצריך לעשות.
אורך מקסימלי: 60 תווים. ללא סימני פיסוק בסוף.

תיאור:
${description.trim()}

השב בלבד עם JSON תקין: {"title": "<הכותרת>"}`,
      response_json_schema: {
        type: 'object',
        properties: { title: { type: 'string' } },
      },
    });
    const title = (result?.title || '').trim().replace(/["""'].]/g, '');
    if (title && title.length >= 4 && title.length <= 80) return title;
    return autoGenerateTitle(description);
  } catch {
    return autoGenerateTitle(description);
  }
}