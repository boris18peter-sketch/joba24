import { Lightbulb } from 'lucide-react';
import { getSuggestions } from '@/lib/taskFormLogic';

/**
 * DynamicSuggestions — proactive, category-aware hints that adapt to what the
 * user has entered so far (schedule, price). Helps without nagging.
 */
export default function DynamicSuggestions({ schedule, price, category }) {
  const suggestions = getSuggestions(category, schedule, price);
  if (suggestions.length === 0) return null;

  return (
    <div style={{
      background: 'linear-gradient(135deg,#fffbeb,#fef3c7)',
      border: '1px solid #fde68a', borderRadius: 14, padding: '10px 12px',
      display: 'flex', flexDirection: 'column', gap: 6,
    }}>
      {suggestions.map((s, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: '#92400e', fontWeight: 600, lineHeight: 1.4 }}>
          <span style={{ fontSize: 14 }}>{s.icon}</span>
          <span>{s.text}</span>
        </div>
      ))}
    </div>
  );
}