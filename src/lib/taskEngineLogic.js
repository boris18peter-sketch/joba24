/**
 * Task Engine Logic
 * Computes real-time status, health, ETA, and recommendations for a published task.
 */

// ── Status Messages by engagement state ─────────────────────────────────────
const STATUS_NO_VIEWS = [
  { icon: '📡', text: 'שולח התראות לעובדים' },
  { icon: '🔍', text: 'מחפש עובדים באזור' },
  { icon: '📢', text: 'מפיץ את המשימה' },
];

const STATUS_HAS_VIEWS = [
  { icon: '👀', text: 'עובדים צופים במשימה' },
  { icon: '🎯', text: 'מתבצעות התאמות' },
  { icon: '📍', text: 'מחפש עובדים קרובים' },
];

const STATUS_HAS_CLICKS = [
  { icon: '🧠', text: 'עובדים בודקים פרטים' },
  { icon: '📋', text: 'המשימה נבחנת' },
  { icon: '👀', text: 'מתעניינים במשימה' },
];

const STATUS_HAS_APPS = [
  { icon: '📨', text: 'התקבלו בקשות' },
  { icon: '🎯', text: 'נמצאו עובדים מתאימים' },
  { icon: '⚡', text: 'ממתין לבחירתך' },
];

const STATUS_URGENT = [
  { icon: '🚨', text: 'משימה דחופה — שידור פעיל' },
  { icon: '⚡', text: 'עדיפות גבוהה בפיד' },
  { icon: '🔴', text: 'מחפש עובד זמין מיידית' },
];

export function getStatusMessages(task) {
  const apps = task.applicants?.length || 0;
  const clicks = task.clicks_count || 0;
  const views = task.views_count || 0;
  const isUrgent = task.urgency_tag === 'immediate';

  if (isUrgent && apps === 0) return STATUS_URGENT;
  if (apps > 0) return STATUS_HAS_APPS;
  if (clicks > 0) return STATUS_HAS_CLICKS;
  if (views > 0) return STATUS_HAS_VIEWS;
  return STATUS_NO_VIEWS;
}

// ── Health Score (0–100) ─────────────────────────────────────────────────────
export function getTaskHealth(task) {
  const apps = task.applicants?.length || 0;
  const clicks = task.clicks_count || 0;
  const views = task.views_count || 0;
  const ageMinutes = (Date.now() - new Date(task.created_date || Date.now()).getTime()) / 60000;

  if (apps > 0) return { score: 90, label: 'עובדים מתעניינים', color: '#16a34a', dot: '#22c55e', level: 'high' };

  const viewRate = ageMinutes > 0 ? views / ageMinutes : 0;
  const clickRate = views > 0 ? clicks / views : 0;

  if (views >= 15 && clicks >= 3) return { score: 75, label: 'ביקוש גבוה', color: '#16a34a', dot: '#22c55e', level: 'high' };
  if (views >= 8 || clicks >= 1) return { score: 55, label: 'דרושה חשיפה נוספת', color: '#d97706', dot: '#f59e0b', level: 'medium' };
  if (views >= 3) return { score: 35, label: 'כדאי לשפר פרטים', color: '#ea580c', dot: '#f97316', level: 'low' };
  return { score: 15, label: 'נדרשת פעולה', color: '#dc2626', dot: '#ef4444', level: 'critical' };
}

// ── ETA Estimate ─────────────────────────────────────────────────────────────
export function getETA(task) {
  const apps = task.applicants?.length || 0;
  const clicks = task.clicks_count || 0;
  const views = task.views_count || 0;
  const isUrgent = task.urgency_tag === 'immediate';
  const ageMinutes = (Date.now() - new Date(task.created_date || Date.now()).getTime()) / 60000;

  if (apps > 0) return null; // Already has apps, no need for ETA

  if (isUrgent) return '⏱ בקשה צפויה תוך 5–15 דקות';
  if (clicks >= 3) return '⏱ בקשה צפויה תוך 10–20 דקות';
  if (views >= 10) return '⏱ בקשה צפויה תוך 15–30 דקות';
  if (views >= 3) return '⏱ משימות דומות מקבלות בקשה תוך 20–40 דקות';
  if (ageMinutes < 5) return '⏱ הרגע פורסמה — ממתין לחשיפה ראשונה';
  return '⏱ הביקוש נמוך כרגע — מומלץ לשפר';
}

// ── Smart Recommendation ─────────────────────────────────────────────────────
export function getRecommendation(task, canSignal) {
  const apps = task.applicants?.length || 0;
  const clicks = task.clicks_count || 0;
  const views = task.views_count || 0;
  const ageMinutes = (Date.now() - new Date(task.created_date || Date.now()).getTime()) / 60000;

  if (apps > 0) return null; // No recommendation needed

  if (views < 5 && ageMinutes >= 10) {
    return {
      text: 'המשימה טרם נחשפה למספיק עובדים.',
      cta: canSignal ? '📡 שלח איתות נוסף' : null,
      action: 'signal',
    };
  }

  if (views >= 8 && clicks < 2) {
    return {
      text: 'כדאי לשפר את הכותרת או המחיר.',
      cta: '✏️ ערוך משימה',
      action: 'edit',
    };
  }

  if (clicks >= 3 && apps === 0) {
    return {
      text: 'עובדים מתעניינים אך לא מגישים בקשה.',
      cta: '✨ שפר באמצעות AI',
      action: 'ai_improve',
    };
  }

  return null;
}

// ── Signal Eligibility ────────────────────────────────────────────────────────
export function canSendSignal(task) {
  if (!task) return false;
  if (task.status !== 'OPEN') return false;
  const apps = task.applicants?.filter(a => a.status === 'pending' || a.status === 'approved') || [];
  if (apps.length > 0) return false;
  const ageHours = (Date.now() - new Date(task.created_date || Date.now()).getTime()) / 3600000;
  return ageHours >= 3;
}