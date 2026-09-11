import { useState, useEffect } from 'react';
import { useRegistrationCount } from '@/hooks/useRegistrationCount';

/**
 * RotatingPromoText — cycles between static messages and a live registration counter.
 * Fades smoothly between messages every `interval` ms.
 *
 * Props:
 *   messages: array of strings (static promo messages)
 *   interval: rotation speed in ms (default 4000)
 *   style:    style object applied to the span
 */
export default function RotatingPromoText({ messages = [], interval = 4000, style }) {
  const count = useRegistrationCount();

  const counterMessage = `כבר ${count.toLocaleString()} הצטרפו ל-Joba24`;
  const allMessages = [...messages, counterMessage];

  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIndex(i => (i + 1) % allMessages.length);
        setVisible(true);
      }, 300);
    }, interval);
    return () => clearInterval(timer);
  }, [allMessages.length, interval]);

  return (
    <span style={{ opacity: visible ? 1 : 0, transition: 'opacity 0.3s ease', ...style }}>
      {allMessages[index]}
    </span>
  );
}