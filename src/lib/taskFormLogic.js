/**
 * taskFormLogic.js — Pure helpers powering the synchronized task form.
 * Single source of truth for: schedule ↔ duration ↔ price mode ↔ suggestions ↔ validation.
 * No React, no state — just functions. Every component reads/writes through these.
 */
import { getCategoryPriceRange } from '@/lib/taskFlowConfig';

export const DEFAULT_SCHEDULE = {
  mode: 'exact',          // 'exact' | 'flexible'
  date: null,             // 'YYYY-MM-DD'
  start: null,            // 'HH:MM'
  end: null,              // 'HH:MM'
  duration_minutes: null, // auto-calculated, editable
  recurring: false,
  recurring_days: [],     // 0=Sun … 6=Sat
  overnight: false,
};

export const WEEKDAYS_HE = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

/* ── Per-category scheduler capabilities ── */
export const SCHEDULER_CATEGORY_CONFIG = {
  babysitting:  { supportsRecurring: true,  supportsOvernight: true,  label: 'מתי נדרשת הבייביסיטר?' },
  cleaning:     { supportsRecurring: true,  supportsOvernight: false, label: 'מתי להגיע לניקיון?' },
  tutoring:     { supportsRecurring: true,  supportsOvernight: false, label: 'מתי נדרש השיעור?' },
  fitness:      { supportsRecurring: true,  supportsOvernight: false, label: 'מתי נדרש האימון?' },
  pets:         { supportsRecurring: true,  supportsOvernight: true,  label: 'מתי נדרש הטיפול בחיית המחמד?' },
  elderly_care: { supportsRecurring: true,  supportsOvernight: false, label: 'מתי נדרש הסיוע?' },
  personal_help:{ supportsRecurring: false, supportsOvernight: false, label: 'מתי נדרשת העזרה?' },
  gardening:    { supportsRecurring: true,  supportsOvernight: false, label: 'מתי נדרשת העבודה בגינה?' },
  moving:       { supportsRecurring: false, supportsOvernight: false, label: 'מתי מתוכננת ההובלה?' },
  plumbing:     { supportsRecurring: false, supportsOvernight: false, label: 'מתי נדרש האינסטלטור?' },
  electricity:  { supportsRecurring: false, supportsOvernight: false, label: 'מתי נדרש החשמלאי?' },
  handyman:     { supportsRecurring: false, supportsOvernight: false, label: 'מתי נדרש ההנדימן?' },
  painting:     { supportsRecurring: false, supportsOvernight: false, label: 'מתי נדרשת הצביעה?' },
  carpentry:    { supportsRecurring: false, supportsOvernight: false, label: 'מתי נדרשת הנגרות?' },
  ac:           { supportsRecurring: false, supportsOvernight: false, label: 'מתי נדרש טכנאי המזגנים?' },
  locksmith:    { supportsRecurring: false, supportsOvernight: false, label: 'מתי נדרש המנעולן?' },
  shopping:     { supportsRecurring: false, supportsOvernight: false, label: 'מתי נדרשות הקניות?' },
  delivery:     { supportsRecurring: false, supportsOvernight: false, label: 'מתי נדרש המשלוח?' },
  transportation:{ supportsRecurring: false, supportsOvernight: false, label: 'מתי נדרשת הנסיעה?' },
  heavy_lifting:{ supportsRecurring: false, supportsOvernight: false, label: 'מתי נדרשת העזרה הפיזית?' },
  home_maintenance:{ supportsRecurring: false, supportsOvernight: false, label: 'מתי נדרשת תחזוקת הבית?' },
  it_support:   { supportsRecurring: false, supportsOvernight: false, label: 'מתי נדרשת התמיכה הטכנית?' },
  photography:  { supportsRecurring: false, supportsOvernight: false, label: 'מתי נדרש הצילום?' },
  events:       { supportsRecurring: false, supportsOvernight: false, label: 'מתי נדרש האירוע?' },
  other:        { supportsRecurring: false, supportsOvernight: false, label: 'מתי נדרש הביצוע?' },
};

export const getSchedulerConfig = (category) =>
  SCHEDULER_CATEGORY_CONFIG[category] || SCHEDULER_CATEGORY_CONFIG.other;

/* ── Time math ── */
export const timeToMinutes = (t) => {
  if (!t) return null;
  const parts = String(t).split(':').map(Number);
  return parts[0] * 60 + (parts[1] || 0);
};

export const calcDurationMinutes = (start, end) => {
  const s = timeToMinutes(start);
  const e = timeToMinutes(end);
  if (s == null || e == null) return null;
  let diff = e - s;
  if (diff < 0) diff += 1440; // overnight wrap-around
  return diff;
};

export const addMinutesToTime = (start, minutes) => {
  const s = timeToMinutes(start);
  if (s == null || minutes == null) return null;
  const total = (((s + minutes) % 1440) + 1440) % 1440;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

/* ── Price mode derived from duration ── */
export const derivePriceMode = (durationMinutes) => {
  if (durationMinutes == null || durationMinutes <= 0) return 'fixed';
  if (durationMinutes < 60) return 'visit';
  if (durationMinutes <= 480) return 'hourly';
  return 'daily';
};

export const formatDuration = (minutes) => {
  if (minutes == null || minutes <= 0) return '';
  if (minutes < 60) return `${minutes} דקות`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (m === 0) return h === 1 ? 'שעה' : `${h} שעות`;
  return `${h} שעות ו-${m} דקות`;
};

export const formatDateLabel = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  if (isNaN(d.getTime())) return dateStr;
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const isTomorrow = d.toDateString() === tomorrow.toDateString();
  const weekday = WEEKDAYS_HE[d.getDay()];
  const datePart = d.toLocaleDateString('he-IL', { day: 'numeric', month: 'short' });
  if (isToday) return `היום (${weekday})`;
  if (isTomorrow) return `מחר (${weekday})`;
  return `${weekday}, ${datePart}`;
};

/* ── Category-aware dynamic suggestions ── */
const DURATION_HINTS = {
  cleaning: 'ניקיון דירה לוקח בדרך כלל 2–4 שעות',
  babysitting: 'בייביסיטר לרוב נדרשת ל-3–5 שעות',
  moving: 'הובלת דירה אורכת 3–6 שעות',
  tutoring: 'שיעור פרטי אורך בדרך כלל שעה',
  gardening: 'עבודת גינה בינונית לוקחת 2–3 שעות',
  painting: 'צביעת חדר לוקחת כ-3 שעות',
  fitness: 'אימון אישי אורך בדרך כלל שעה',
  pets: 'טיול כלב אורך 30–60 דקות',
  plumbing: 'תיקון אינסטלציה אורך 1–2 שעות',
  electricity: 'עבודת חשמלאי אורכת 1–2 שעות',
  handyman: 'עבודת הנדימן אורכת כשעה',
  carpentry: 'הרכבת רהיט אורכת 1–3 שעות',
  delivery: 'משלוח מהיר אורך עד שעה',
  transportation: 'נסיעה עירונית אורכת חצי שעה עד שעה',
};

export const getSuggestions = (category, schedule, price) => {
  const out = [];
  const range = getCategoryPriceRange(category);

  if ((!schedule?.start && !schedule?.end) && DURATION_HINTS[category]) {
    out.push({ icon: '⏱️', text: DURATION_HINTS[category] });
  }
  if (!price) {
    out.push({ icon: '💰', text: `עובדים בתחום גובים בדרך כלל ₪${range.min}–${range.max}` });
  }
  if (schedule?.start) {
    const h = timeToMinutes(schedule.start) / 60;
    if (category === 'babysitting' && h < 17 && h >= 0) {
      out.push({ icon: '🌙', text: 'רוב הבייביסיטריות זמינות אחרי השעה 17:00' });
    }
  }
  if (schedule?.date) {
    const d = new Date(schedule.date + 'T00:00:00');
    const day = d.getDay();
    if (day === 5 || day === 6) {
      out.push({ icon: '⚡', text: 'משימות בסופ״ש מקבלות תגובה מהירה יותר כשמציעים ₪20–30 יותר' });
    }
  }
  return out;
};

/* ── Validation — prevent inconsistent data ── */
export const validateSchedule = (schedule) => {
  const errors = {};
  if (!schedule) return errors;
  if (schedule.mode === 'exact' && schedule.start && schedule.end) {
    const dur = calcDurationMinutes(schedule.start, schedule.end);
    if (dur === 0) errors.end = 'שעת הסיום חייבת להיות אחרי שעת ההתחלה';
  }
  if (schedule.recurring && (!schedule.recurring_days || schedule.recurring_days.length === 0)) {
    errors.recurring_days = 'בחר לפחות יום אחד בשבוע';
  }
  return errors;
};

/* ── Sync schedule → legacy backend fields ── */
export const scheduleToLegacy = (schedule) => {
  const out = {};
  if (!schedule) return out;
  if (schedule.mode === 'exact' && schedule.date && schedule.start) {
    const dt = new Date(schedule.date + 'T' + schedule.start + ':00');
    if (!isNaN(dt.getTime())) out.scheduled_time = dt.toISOString();
  }
  const dur = schedule.duration_minutes;
  if (dur != null && dur > 0) {
    if (dur < 60) out.estimated_time = `${dur}m`;
    else if (dur % 60 === 0) out.estimated_time = `${dur / 60}h`;
    else out.estimated_time = 'custom';
  }
  if (schedule.date) {
    const d = new Date(schedule.date + 'T00:00:00');
    const now = new Date();
    const diffH = (d - now) / 3600000;
    if (diffH < 6) out.urgency_tag = 'immediate';
    else if (diffH < 24) out.urgency_tag = 'few_hours';
    else if (diffH < 48) out.urgency_tag = 'evening';
    else out.urgency_tag = 'flexible';
  }
  return out;
};

/* ── Sync legacy backend fields → schedule (edit mode) ── */
export const legacyToSchedule = (task) => {
  const schedule = { ...DEFAULT_SCHEDULE };
  if (task.scheduled_time) {
    const d = new Date(task.scheduled_time);
    if (!isNaN(d.getTime())) {
      const pad = (n) => String(n).padStart(2, '0');
      schedule.date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
      schedule.start = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
      schedule.mode = 'exact';
    }
  }
  if (task.estimated_time) {
    const m = String(task.estimated_time).match(/(\d+)([hm])/);
    if (m) {
      const mins = m[2] === 'h' ? Number(m[1]) * 60 : Number(m[1]);
      schedule.duration_minutes = mins;
      if (schedule.start) schedule.end = addMinutesToTime(schedule.start, mins);
    }
  }
  return schedule;
};

export const DURATION_PRESETS = [
  { mins: 30, label: 'חצי שעה' },
  { mins: 60, label: 'שעה' },
  { mins: 90, label: 'שעה וחצי' },
  { mins: 120, label: 'שעתיים' },
  { mins: 180, label: '3 שעות' },
  { mins: 240, label: '4 שעות' },
  { mins: 360, label: '6 שעות' },
];