/**
 * coinBurst — the flying-coins effect used by the credit celebrations.
 *
 * Coins burst out from the centre of the screen and fly into the header's
 * credits pill, which pops as they land. Extracted from the signup gift modal so
 * every bonus celebration (signup, loyalty) plays the exact same animation
 * instead of keeping two copies that drift apart.
 */
const COIN_COUNT = 26;

const coinSvgString = `
  <svg width="26" height="26" viewBox="0 0 26 26" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="cg${Math.random().toString(36).slice(2)}" cx="38%" cy="35%">
        <stop offset="0%" stop-color="#ffe566"/>
        <stop offset="55%" stop-color="#f59e0b"/>
        <stop offset="100%" stop-color="#b45309"/>
      </radialGradient>
    </defs>
    <ellipse cx="13" cy="15" rx="10" ry="4.5" fill="#92400e" opacity="0.45"/>
    <circle cx="13" cy="12" r="10" fill="#f59e0b"/>
    <circle cx="13" cy="12" r="10" fill="none" stroke="#fde68a" stroke-width="1.2"/>
    <text x="13" y="16.5" text-anchor="middle" font-weight="900" font-size="11" fill="#7c2d12" font-family="Inter,Arial,sans-serif">J</text>
    <ellipse cx="9" cy="8.5" rx="2.5" ry="1.2" fill="rgba(255,255,255,0.3)" transform="rotate(-30,9,8.5)"/>
  </svg>
`;

/**
 * Spawn the burst. `onSettled` (optional) runs once the last coin has landed —
 * used to refresh the balance query after the animation finishes.
 */
export function spawnCoinBurst({ onSettled } = {}) {
  const pill = document.getElementById('onboarding-credits-pill');
  const pillRect = pill?.getBoundingClientRect();
  const targetX = pillRect ? pillRect.left + pillRect.width / 2 : window.innerWidth - 80;
  const targetY = pillRect ? pillRect.top + pillRect.height / 2 : 28;
  const cx = window.innerWidth / 2;
  const cy = window.innerHeight / 2;

  for (let i = 0; i < COIN_COUNT; i++) {
    const coin = document.createElement('div');
    const angle = (i / COIN_COUNT) * Math.PI * 2 + (Math.random() - 0.5) * 0.6;
    const radius = 65 + Math.random() * 145;
    const ex = cx + Math.cos(angle) * radius;
    const ey = cy + Math.sin(angle) * radius;
    const stagger = Math.floor(i * 32);
    const spinDeg = (Math.random() > 0.5 ? 1 : -1) * (180 + Math.random() * 360);

    coin.innerHTML = coinSvgString;
    Object.assign(coin.style, {
      position: 'fixed', left: `${cx - 13}px`, top: `${cy - 13}px`,
      width: '26px', height: '26px', zIndex: '999997',
      pointerEvents: 'none', opacity: '0',
      transform: 'scale(0) rotate(0deg)', transition: 'none',
      willChange: 'transform, opacity', borderRadius: '50%',
      filter: 'drop-shadow(0 3px 6px rgba(251,191,36,0.6))',
    });
    document.body.appendChild(coin);

    setTimeout(() => {
      coin.style.transition = 'transform 0.38s cubic-bezier(0.16,1,0.3,1), opacity 0.2s ease';
      coin.style.opacity = '1';
      coin.style.transform = `translate(${ex - cx}px,${ey - cy}px) scale(1.1) rotate(${spinDeg * 0.3}deg)`;
    }, stagger);
    setTimeout(() => {
      coin.style.transition = 'transform 0.65s cubic-bezier(0.6,0,0.9,0.4), opacity 0.4s ease 0.25s';
      coin.style.transform = `translate(${targetX - cx}px,${targetY - cy}px) scale(0.18) rotate(${spinDeg}deg)`;
      coin.style.opacity = '0';
    }, stagger + 400);
    setTimeout(() => {
      if (pill) {
        pill.style.transition = 'transform 0.12s cubic-bezier(0.16,1,0.3,1)';
        pill.style.transform = 'scale(1.22)';
        setTimeout(() => { if (pill) pill.style.transform = 'scale(1)'; }, 120);
      }
      if (navigator.vibrate) navigator.vibrate(7);
    }, stagger + 1060);
    setTimeout(() => coin.remove(), stagger + 1200);
  }

  setTimeout(() => { onSettled?.(); }, COIN_COUNT * 32 + 1100);
}