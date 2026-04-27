import { useEffect, useState } from 'react';
import { Timer } from 'lucide-react';

// showOnlyWhenUrgent=true → only shows timer when < 6 hours left (for task cards)
// showOnlyWhenUrgent=false → always shows (for task detail page)
export default function TaskExpiry({ expiresAt, showOnlyWhenUrgent = true, inline = false }) {
  const [timeLeft, setTimeLeft] = useState('');
  const [hoursLeft, setHoursLeft] = useState(null);

  useEffect(() => {
    if (!expiresAt) return;
    const interval = setInterval(() => {
      const now = new Date();
      const exp = new Date(expiresAt);
      const diff = exp - now;
      if (diff <= 0) {
        setTimeLeft('פג תוקף');
        setHoursLeft(0);
        clearInterval(interval);
      } else {
        const hours = Math.floor(diff / 3600000);
        const mins = Math.floor((diff % 3600000) / 60000);
        setHoursLeft(hours);
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

  if (!expiresAt || !timeLeft) return null;

  // In card mode: only show when < 6 hours left
  if (showOnlyWhenUrgent && hoursLeft !== null && hoursLeft >= 6) return null;

  const isExpired = timeLeft === 'פג תוקף';
  const isUrgent = !isExpired && hoursLeft !== null && hoursLeft < 2;

  // inline mode: just returns the text for embedding inside another element
  if (inline) {
    return <span style={{ fontWeight: 700 }}>{timeLeft}</span>;
  }

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        background: isUrgent ? '#fef2f2' : '#fff7ed',
        border: `1px solid ${isUrgent ? '#fca5a5' : '#fed7aa'}`,
        borderRadius: 8,
        padding: '3px 8px',
        fontSize: 11,
        fontWeight: 700,
        color: isUrgent ? '#dc2626' : '#ea580c',
      }}
      title="הג'ובה תיסגר אוטומטית בסיום הטיימר"
    >
      <Timer size={12} color={isUrgent ? '#dc2626' : '#f97316'} />
      <span>נסגרת בעוד {timeLeft}</span>
    </div>
  );
}