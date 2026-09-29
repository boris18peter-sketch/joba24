/**
 * JOBA24 — STORE KIT DEMO CONTENT
 *
 * Content used ONLY inside the marketing frames. It is written in the app's real
 * categories and real Hebrew, with plausible Israeli prices — no invented
 * features, no invented screens, no real user data. Names are deliberately
 * reduced to first name + initial, exactly like the app's own privacy treatment.
 *
 * Task titles are taken from the categories and price ranges that already exist
 * in the Joba24 task feed.
 */

export const DEMO_TASKS = [
  {
    id: 'store-task-1',
    title: 'התקנת מנורה תקרה בסלון',
    description: 'צריך להתקין גוף תאורה חדש בתקרה. יש סולם בבית.',
    price: 180,
    category: 'electricity',
    city: 'תל אביב',
    location_name: 'פלורנטין, תל אביב',
    client_name: 'דנה כ׳',
    client_rating: 4.9,
    client_verified: true,
    payment_method: 'Cash',
    urgency_tag: 'few_hours',
    applicants: [{}, {}, {}],
    views_count: 84,
    clicks_count: 12,
    created_date: new Date(Date.now() - 22 * 60000).toISOString(),
    _distKm: 0.8,
  },
  {
    id: 'store-task-2',
    title: 'עזרה בהובלת דירה קטנה',
    description: 'רהיטים וקרטונים לקומה שלישית. יש מעלית בבניין.',
    price: 420,
    category: 'moving',
    city: 'רמת גן',
    location_name: 'רמת גן',
    client_name: 'יוסי ל׳',
    client_rating: 4.7,
    client_verified: true,
    payment_method: 'Bit',
    urgency_tag: 'immediate',
    applicants: [{}, {}, {}, {}, {}],
    views_count: 156,
    clicks_count: 31,
    created_date: new Date(Date.now() - 8 * 60000).toISOString(),
    _distKm: 1.6,
  },
  {
    id: 'store-task-3',
    title: 'הרכבת ארון בגדים חדש',
    description: 'הארון ארוז בקרטון וצריך הרכבה מלאה.',
    price: 350,
    category: 'handyman',
    city: 'גבעתיים',
    location_name: 'גבעתיים',
    client_name: 'אורי ב׳',
    client_rating: 4.6,
    client_verified: false,
    payment_method: 'Cash',
    urgency_tag: 'flexible',
    applicants: [{}, {}, {}, {}],
    views_count: 97,
    clicks_count: 18,
    created_date: new Date(Date.now() - 41 * 60000).toISOString(),
    _distKm: 3.1,
  },
  {
    id: 'store-task-4',
    title: 'טיול יומי לכלבלב',
    description: 'להוציא את הכלב לטיול של חצי שעה בסביבה.',
    price: 60,
    category: 'pets',
    city: 'הרצליה',
    location_name: 'הרצליה פיתוח',
    client_name: 'מיכל ר׳',
    client_rating: 5.0,
    client_verified: true,
    payment_method: 'PayBox',
    urgency_tag: 'evening',
    applicants: [{}, {}],
    views_count: 63,
    clicks_count: 9,
    created_date: new Date(Date.now() - 12 * 60000).toISOString(),
    _distKm: 2.4,
  },
];

/** Applicants shown on the "you choose" frame — mirrors TaskApplicants rows. */
export const DEMO_APPLICANTS = [
  {
    id: 'store-app-1',
    worker_name: 'אילנית ב׳',
    rating: 4.9,
    tasks_completed: 49,
    verified: true,
    social: true,
    message: 'אפשר להגיע היום בשעה שנוח לך. מביאה איתי כלים.',
  },
  {
    id: 'store-app-2',
    worker_name: 'ניר נ׳',
    rating: 4.6,
    tasks_completed: 46,
    verified: true,
    social: false,
    message: 'זמין כבר מחר בבוקר. עובד באזור.',
  },
  {
    id: 'store-app-3',
    worker_name: 'רועי ג׳',
    rating: 3.9,
    tasks_completed: 34,
    verified: false,
    social: false,
    message: 'אפשר להתחיל מיד.',
  },
];

/** Chat thread for the chat frame — a real task-scoped conversation. */
export const DEMO_MESSAGES = [
  { id: 'm1', sender_name: 'דנה כ׳', content: 'היי, ראיתי שהגשת בקשה למשימה 🙌', me: false },
  { id: 'm2', sender_name: 'דנה כ׳', content: 'מתי נוח לך להגיע?', me: false },
  { id: 'm3', sender_name: 'אתה', content: 'אפשר היום אחרי 17:00, מתאים?', me: true },
  { id: 'm4', sender_name: 'דנה כ׳', content: 'מעולה. הכתובת בפלורנטין, יש חניה בחניון של הבניין.', me: false },
  { id: 'm5', sender_name: 'אתה', content: 'סבבה, מגיע ב-17:00 👍', me: true },
];

/** Profile shown on the trust frame. */
export const DEMO_PROFILE = {
  name: 'אילנית ב׳',
  profession: 'ניקיון ותחזוקת בית',
  rating: 4.9,
  rating_count: 52,
  tasks_completed: 49,
  on_time_rate: 98,
  repeat_hires: 14,
  verified: true,
  social: true,
  bio: 'עובדת באזור המרכז, מגיעה עם ציוד מלא. זמינה גם בסופי שבוע.',
};

export const DEMO_REVIEWS = [
  { id: 'r1', name: 'דנה כ׳', rating: 5, text: 'הגיעה בזמן, עשתה עבודה מדויקת. ממליצה בחום.' },
  { id: 'r2', name: 'יוסי ל׳', rating: 5, text: 'תקשורת מעולה ומחיר הוגן. אשכור שוב.' },
];

/** Balance shown in the app top bar. Kept realistic and round. */
export const DEMO_BALANCE = 240;
export const DEMO_LOCKED = 35;