import { useEffect, useState } from 'react';
import { Timer } from 'lucide-react';
import { useLanguage } from '@/lib/LanguageContext';

// showOnlyWhenUrgent=true → only shows timer when < 6 hours left (for task cards)
// showOnlyWhenUrgent=false → always shows (for task detail page)
export default function TaskExpiry({ expiresAt, showOnlyWhenUrgent = true, inline = false }) {
  const { t } = useLanguage();
  const [timeLeft, setTimeLeft] = useState('');
  const [hoursLeft, setHoursLeft] = useState(null);

  useEffect(() => {
    if (!expiresAt) return;

    // The text is coarse while the task is more than an hour away ("3h 12m"),
    // so it only changes once a MINUTE. Ticking every second meant ~60 date
    // computations and string builds for text that was identical 59 times out
    // of 60 — for every expiry timer on screen at once. Seconds are shown only
    // in the final hour, so only then does the clock need to run per second.
    // The rendered text is unchanged either way.
    let timer;
    const tick = () => {
      const diff = new Date(expiresAt) - new Date();
      if (diff <= 0) {
        setTimeLeft(t('te_expired'));
        setHoursLeft(0);
        return; // settled — stop the clock
      }
      const hours = Math.floor(diff / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      setHoursLeft(hours);
      if (hours > 0) {
        setTimeLeft(`${hours}${t('hours_short')} ${mins}${t('minutes_short')}`);
        timer = setTimeout(tick, 60000);
      } else {
        const secs = Math.floor((diff % 60000) / 1000);
        setTimeLeft(`${mins}:${secs.toString().padStart(2, '0')}`);
        timer = setTimeout(tick, 1000);
      }
    };
    timer = setTimeout(tick, 1000);
    return () => clearTimeout(timer);
  }, [expiresAt]);

  if (!expiresAt || !timeLeft) return null;

  // In card mode: only show when < 6 hours left
  if (showOnlyWhenUrgent && hoursLeft !== null && hoursLeft >= 6) return null;

  const isExpired = timeLeft === t('te_expired');
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
      title={t('te_title')}
    >
      <Timer size={12} color={isUrgent ? '#dc2626' : '#f97316'} />
      <span>{t('te_closing_in', { time: timeLeft })}</span>
    </div>
  );
}