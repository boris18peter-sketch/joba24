import { useEffect, useState } from 'react';
import { Timer } from 'lucide-react';

export default function TaskExpiry({ expiresAt, price, taskId, onPriceUpdate }) {
  const [timeLeft, setTimeLeft] = useState('');
  const [bumped, setBumped] = useState(false);

  useEffect(() => {
    if (!expiresAt) return;
    const interval = setInterval(() => {
      const now = new Date();
      const exp = new Date(expiresAt);
      const diff = exp - now;
      if (diff <= 0) {
        setTimeLeft('פג תוקף');
        clearInterval(interval);
      } else {
        const hours = Math.floor(diff / 3600000);
        const mins = Math.floor((diff % 3600000) / 60000);
        if (hours > 0) {
          setTimeLeft(`${hours}ש' ${mins}ד'`);
        } else {
          const secs = Math.floor((diff % 60000) / 1000);
          setTimeLeft(`${mins}:${secs.toString().padStart(2, '0')}`);
        }
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  if (!expiresAt) return null;

  const isUrgent = timeLeft && timeLeft !== 'פג תוקף' && parseInt(timeLeft) < 2;

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        background: isUrgent ? '#fef2f2' : '#f8fafc',
        border: `1px solid ${isUrgent ? '#fca5a5' : '#e2e8f0'}`,
        borderRadius: 8,
        padding: '3px 8px',
        fontSize: 12,
        fontWeight: 600,
        color: isUrgent ? '#dc2626' : '#64748b',
      }}
    >
      <Timer size={12} color={isUrgent ? '#dc2626' : '#94a3b8'} />
      {timeLeft || '...'}
    </div>
  );
}