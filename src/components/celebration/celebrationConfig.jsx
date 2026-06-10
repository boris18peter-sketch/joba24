/**
 * ═══════════════════════════════════════════════════════
 *  🎮 CELEBRATION CONFIG — ניתן לעריכה ולשינוי חופשי
 *  ערוך את הפרמטרים כאן כדי לשנות את חוויית החגיגה
 * ═══════════════════════════════════════════════════════
 */

export const CELEBRATION_CONFIG = {

  // ─── TIMING (in ms) ────────────────────────────────────
  // (no auto-navigate — user must tap the CTA button)
  timing: {},

  // ─── PHYSICS — spring animation ────────────────────────
  physics: {
    avatarSpring: { type: 'spring', damping: 10, stiffness: 120 },
    slamSpring:   { type: 'spring', damping: 8,  stiffness: 200 },
    titleSpring:  { type: 'spring', damping: 14, stiffness: 160 },
  },

  // ─── CAMERA SHAKE ──────────────────────────────────────
  shake: {
    enabled: true,
    intensity: 7,    // px
    duration: 0.35,  // seconds
    cycles: 5,       // כמה פעמים הולך וחוזר
  },

  // ─── COLORS ────────────────────────────────────────────
  colors: {
    overlay: 'rgba(2, 8, 20, 0.92)',          // רקע האוברליי
    sunburst: ['#f59e0b', '#fbbf24', '#fcd34d', '#fde68a'],  // צבעי קרני אור
    shockwave: '#3b82f6',                     // צבע גל ההדף
    confetti: ['#fbbf24', '#f59e0b', '#3b82f6', '#10b981', '#ef4444', '#a855f7', '#06b6d4'],
    flagGold: '#f59e0b',
    title: '#ffffff',
    subtitle: 'rgba(255,255,255,0.75)',
  },

  // ─── TEXTS ─────────────────────────────────────────────
  texts: {
    line1: '🚀 המשימה שלך באוויר!',
    line2: 'עובדים באזור כבר רואים אותה',
    line3: '🔍 מחפשים את הבנאדם המושלם...',
    skipLabel: 'דלג לפרטי המשימה',
  },

  // ─── AVATAR ────────────────────────────────────────────
  avatar: {
    emoji: '👷',     // האווטאר הראשי
    size: 72,         // px
    flagEmoji: '🚩',  // הדגל
    flagSize: 42,     // px
  },

  // ─── CONFETTI ──────────────────────────────────────────
  confetti: {
    count: 28,         // כמות חלקיקים
    coinCount: 12,     // כמות מטבעות (מתוך הכולל)
    spread: 220,       // טווח פיזור (px)
    gravity: 0.45,     // משיכת כבידה (0=ריחוף, 1=נפילה מהירה)
  },

  // ─── SCANNER INTEGRATION ───────────────────────────────
  scanner: {
    showScannerFirst: true,    // הצג scanner לפני החגיגה
    scannerMinDuration: 2500,  // ms מינימום לסקנר לפני מעבר לחגיגה
    scannerMaxDuration: 7000,  // ms מקסימום לסקנר (ואז חגיגה בכל מקרה)
    transitionDuration: 400,   // ms מעבר חלק בין scanner לחגיגה
  },
};