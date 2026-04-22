import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Sparkles, Loader2 } from 'lucide-react';

const categoryBase = {
  moving: 120,
  repairs: 100,
  cleaning: 80,
  shopping: 60,
  other: 70,
};

const timeMultiplier = {
  '15m': 0.5,
  '30m': 0.75,
  '1h': 1,
  '2h': 1.8,
  'custom': 1.5,
};

export default function PriceSuggestion({ category, estimatedTime, onAccept }) {
  const [suggested, setSuggested] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!category || !estimatedTime) return;
    const base = categoryBase[category] || 70;
    const mult = timeMultiplier[estimatedTime] || 1;
    const price = Math.round(base * mult / 10) * 10;
    setSuggested(price);
  }, [category, estimatedTime]);

  if (!suggested) return null;

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)',
        border: '1.5px solid #86efac',
        borderRadius: 14,
        padding: '12px 14px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
        marginTop: 8,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Sparkles size={16} color="#16a34a" />
        <div>
          <div style={{ fontSize: 12, color: '#15803d', fontWeight: 600 }}>מחיר מומלץ</div>
          <div style={{ fontSize: 20, fontWeight: 900, color: '#166534' }}>₪{suggested}</div>
        </div>
      </div>
      <button
        onClick={() => onAccept(suggested)}
        style={{
          background: '#16a34a',
          color: 'white',
          border: 'none',
          borderRadius: 10,
          padding: '8px 14px',
          fontSize: 13,
          fontWeight: 700,
          cursor: 'pointer',
        }}
      >
        השתמש
      </button>
    </div>
  );
}