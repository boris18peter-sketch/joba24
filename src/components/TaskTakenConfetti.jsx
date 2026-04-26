import { useEffect } from 'react';
import confetti from 'canvas-confetti';

export default function TaskTakenConfetti({ trigger }) {
  useEffect(() => {
    if (!trigger) return;

    const duration = 1500;
    const end = Date.now() + duration;

    const colors = ['#16a34a', '#22c55e', '#4ade80', '#86efac', '#fbbf24', '#f59e0b'];

    const frame = () => {
      confetti({
        particleCount: 6,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors,
      });
      confetti({
        particleCount: 6,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors,
      });
      if (Date.now() < end) requestAnimationFrame(frame);
    };

    frame();

    // Big burst in center
    confetti({
      particleCount: 80,
      spread: 90,
      origin: { x: 0.5, y: 0.55 },
      colors,
      startVelocity: 35,
    });
  }, [trigger]);

  return null;
}