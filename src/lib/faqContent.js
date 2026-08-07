/**
 * FAQ content — localized Q&A arrays.
 * Hebrew is the canonical source; English is provided for non-Hebrew users.
 * Other languages fall back to English.
 */

const he = [
  // ── כללי ─────────────────────────────────────────────────────────────
  {
    cat: 'general',
    q: 'מה זה Joba24?',
    a: 'Joba24 היא פלטפורמה שמחברת בין אנשים שצריכים עזרה במשימות ("מפרסמים") לבין אנשים שרוצים לבצע אותן ולהרוויח ("עובדים"). המשימות מכסות כל תחום — ניקיון, הובלות, שיפוצים, שליחויות, IT, בייביסיטר ועוד. Joba24 עצמה אינה מעסיקה ואינה צד בהסכם — כל ההתקשרות נעשית ישירות בין המשתמשים.',
  },
  {
    cat: 'general',
    q: 'האם Joba24 חינמי?',
    a: 'הרשמה, גלישה ופרסום משימות חינמיים לחלוטין. עובדים משתמשים בג\'ובות (יתרת עבודה) להגשת בקשות — ראו סעיף ג\'ובות.',
  },
  {
    cat: 'general',
    q: 'מי יכול להשתמש בפלטפורמה?',
    a: 'כל מי שמעל גיל 18 ויכולת חוקית לבצע התקשרויות. נדרש חשבון פעיל ומידע אמיתי. Joba24 רשאית לדרוש אימות טלפון או זהות.',
  },

  // ── פרסום ────────────────────────────────────────────────────────────
  {
    cat: 'publish',
    q: 'איך מפרסמים ג\'ובה?',
    a: 'לחצו על "פרסם ג\'ובה" בתפריט. בחרו קטגוריה, מלאו כותרת ותיאור מפורטים, הגדירו מחיר, בחרו מיקום מהרשימה (חובה לבחור מהצעת האוטוקומפליט), הגדירו אפשרות אישור (מיידי / ידני), בחרו אמצעי תשלום (מזומן / Bit / PayBox) ולחצו על "פרסם". ניתן גם לצרף תמונות וסרטון. הג\'ובה תופיע בפיד ובמפה מיידית.',
  },
  {
    cat: 'publish',
    q: 'מה ההבדל בין אישור "מיידי" לאישור "ידני"?',
    a: 'אישור מיידי — העובד הראשון שמגיש מועמדות מקבל את הג\'ובה אוטומטית.\nאישור ידני — מספר עובדים מגישים מועמדויות עם הודעה אישית, ואתם בוחרים את המתאים ביותר. מומלץ למשימות שדורשות ניסיון ספציפי.',
  },
  {
    cat: 'publish',
    q: 'מה זה "תוקף ג\'ובה"?',
    a: 'ניתן להגדיר תוקף של 6 שעות, יום, יומיים, שבוע — או ללא תוקף. ג\'ובה שפג תוקפה עוברת לסטטוס "פג תוקף" ונסגרת אוטומטית. תמיד אפשר לפרסם אותה מחדש.',
  },
  {
    cat: 'publish',
    q: 'מה זה "העלאת מחיר אוטומטית" (Auto-Bump)?',
    a: 'פיצ\'ר שמעלה את מחיר הג\'ובה כל 5 דקות באופן אוטומטי, עד לתקרה שהגדרתם, כל עוד אין מועמדים פעילים. זה מגביר את האטרקטיביות של הג\'ובה לאורך זמן ומשך יותר עובדים.',
  },
  {
    cat: 'publish',
    q: 'האם ניתן לבטל ג\'ובה?',
    a: 'כן, כל עוד הסטטוס הוא "פתוחה" — ניתן לבטל מעמוד פרטי הג\'ובה. אם כבר אושר עובד, ביטול יפגע בציון האמינות שלכם ועשוי לגרור תג אזהרה.',
  },

  // ── עובדים ───────────────────────────────────────────────────────────
  {
    cat: 'worker',
    q: 'איך מגישים מועמדות לג\'ובה?',
    a: 'לוחצים על "הגש מועמדות" בכרטיס המשימה. אם מדובר באישור ידני — כותבים הודעה קצרה למפרסם. הגשת בקשה מעבירה ג\'ובות להתחייבות (ראו סעיף ג\'ובות).',
  },
  {
    cat: 'worker',
    q: 'מה קורה אחרי שאושרתי לג\'ובה?',
    a: 'אתם עוברים לסטטוס "מאושר". כשאתם יוצאים לדרך, לחצו "יצאתי לדרך" — הסטטוס ישתנה ל"בדרך" ו-WorkerTracker יופעל. לאחר הגעה לחצו "הגעתי", ולאחר השלמת העבודה — "סיימתי". הלקוח מקבל התראה ומאשר את ההשלמה. לאחר אישור הלקוח שני הצדדים מדרגים אחד את השני.',
  },
  {
    cat: 'worker',
    q: 'מה זה WorkerTracker?',
    a: 'מערכת מעקב בזמן אמת שמאפשרת ללקוח לראות את מיקום העובד, ETA ומסלול — בדיוק כמו Waze. הנתונים משותפים רק בזמן משימה פעילה ונמחקים בסיומה.',
  },
  {
    cat: 'worker',
    q: 'מה הסטטוסים האפשריים של ג\'ובה?',
    a: '• פתוחה (OPEN) — זמינה לכולם\n• נלקחה (TAKEN) — עובד שוייך ומשימה פעילה\n• הושלמה (COMPLETED) — שני הצדדים אישרו\n• בוטלה (CANCELLED) — בוטל על ידי אחד הצדדים\n• פגת תוקף (EXPIRED) — פג תוקף ללא שהתקבל עובד\n\nסטטוסי WorkerTracker (במהלך ג\'ובה פעילה):\n• בדרך, הגיע, סיים',
  },
  {
    cat: 'worker',
    q: 'האם ניתן לצאת מג\'ובה שכבר לקחתי?',
    a: 'כן — לחצו על "עזוב משימה" מעמוד המשימה הפעילה. הג\'ובות שעברו להתחייבות בהגשת הבקשה חוזרות ליתרה במלואן. שימו לב שביטולים חוזרים עשויים להוריד את ציון האמינות שלכם.',
  },

  // ── ג'ובות (יתרת עבודה) ───────────────────────────────────────────────
  {
    cat: 'credits',
    q: 'מה זה ג\'ובות?',
    a: 'ג\'ובות הן יתרת העבודה שלך ב-Joba24. הן נגבות רק כאשר אתה מגיש בקשה למשימה — אז הן עוברות ל"התחייבות". אם לא נבחרת, הן חוזרות אוטומטית ליתרה הזמינה. לג\'ובות אין ערך כספי ואינן ניתנות להעברה או החלפה במזומן.',
  },
  {
    cat: 'credits',
    q: 'איך מקבלים ג\'ובות?',
    a: '• בונוס הרשמה — כל משתמש חדש מקבל ג\'ובות חינם עם ההרשמה.\n• החזר דחייה — אם הגשתם בקשה ולא נבחרתם, הג\'ובות חוזרות.\n• החזר פקיעה — אם המשימה פגה לפני שנלקחה, הג\'ובות חוזרות.\n• פרס נאמנות — בונוסים על ביצוע משימות רצופות.\n• טעינת יתרה — ניתן לטעון ג\'ובות נוספות בכל עת.',
  },
  {
    cat: 'credits',
    q: 'כמה ג\'ובות עולה הגשת בקשה?',
    a: 'הג\'ובות שעוברות להתחייבות נקבעות לפי ערך המשימה — ככל שהמשימה משתלמת יותר, כך ערך ההתחייבות גבוה יותר. המערכת מציגה את הכמות לפני ההגשה, והיא חוזרת ליתרה הזמינה אוטומטית אם לא נבחרת.',
  },
  {
    cat: 'credits',
    q: 'מה זה Story ג\'ובה?',
    a: 'Story הוא פיצ\'ר חשיפה גבוהה — עולה 10 ג\'ובות ומציג את המשימה שלכם בשורת ה-Stories בראש הפיד למשך 24 שעות. חשיפה גבוהה פי 3 ממשימה רגילה.',
  },
  {
    cat: 'credits',
    q: 'מה זה Boost לג\'ובה?',
    a: 'Boost הוא פיצ\'ר שמעלה את הג\'ובה שלכם לראש הפיד ושולח התראה לעובדים מתאימים באזור. ניתן להפעיל Boost מעמוד פרטי הג\'ובה. עלות ה-Boost נקבעת לפי מחיר הג\'ובה.',
  },

  // ── תשלום ────────────────────────────────────────────────────────────
  {
    cat: 'payment',
    q: 'איך עובד התשלום על הג\'ובה?',
    a: 'התשלום מתבצע ישירות בין המפרסם לעובד, מחוץ לפלטפורמה. Joba24 אינה מעבדת תשלומים ואינה מחזיקה כספים. בעת פרסום הג\'ובה מפרסמים מה אמצעי התשלום — מזומן, Bit או PayBox.',
  },
  {
    cat: 'payment',
    q: 'האם יש Escrow?',
    a: 'לא. Joba24 אינה מספקת שירותי נאמנות (Escrow). כל הסכמה על תשלום, ביצועו ואישורו היא באחריות המשתמשים בלבד.',
  },
  {
    cat: 'payment',
    q: 'מה קורה במקרה של מחלוקת כספית?',
    a: 'Joba24 אינה אחראית למחלוקות כספיות בין משתמשים. ניתן לדווח על תקלות ב-WorkerTracker — ביצוע "דיווח על אי-הגעה" אם העובד לא הגיע — מה שמשפיע על ציון האמינות שלו.',
  },

  // ── אמינות ───────────────────────────────────────────────────────────
  {
    cat: 'trust',
    q: 'מה מערכת האמינות?',
    a: 'לכל משתמש יש ציון אמינות המשפיע על הדירוג בפיד ועל הזמינות לג\'ובות. הציון מבוסס על היסטוריית ביצוע, דירוגים, ביטולים ודיווחים.',
  },
  {
    cat: 'trust',
    q: 'מה מוריד את ציון האמינות?',
    a: '• ביטולים חוזרים אחרי אישור\n• אי-הגעה למשימה\n• תלונות תשלום\n• התנהגות פוגענית\n• פרסום משימות כוזבות\n• חוסר תגובה עקבי',
  },
  {
    cat: 'trust',
    q: 'איך מדרגים עובד / לקוח?',
    a: 'לאחר סיום הג\'ובה, שני הצדדים מקבלים בקשת דירוג עם 1–5 כוכבים ואפשרות לכתוב ביקורת. הדירוגים גלויים בפרופיל הציבורי ומשפיעים על דירוג בפיד.',
  },
  {
    cat: 'trust',
    q: 'מה זה "מאומת"?',
    a: 'סטטוס "מאומת" ניתן למשתמשים שעברו תהליך אימות זהות (מסמך ותמונה). בעת פרסום ג\'ובה מוצג שם אם הלקוח מאומת — מגביר אמון מצד העובדים.',
  },

  // ── פיצ'רים ──────────────────────────────────────────────────────────
  {
    cat: 'features',
    q: 'מה זה InstantMatch?',
    a: 'מנגנון התאמה חכם שמציע לעובד ג\'ובות מתאימות על סמך מיקומו הנוכחי, קטגוריות מועדפות, ניסיון ופעילות קודמת — בזמן אמת. ההתאמה מוצגת כ-popup בתחתית הפיד.',
  },
  {
    cat: 'features',
    q: 'מה זה "מטרת היום"?',
    a: 'פיצ\'ר גיימיפיקציה שמציב לעובד יעד יומי — כגון 3 ג\'ובות ביום — ומעניק בונוסים בהשגת היעד. עוזר לשמור על מוטיבציה ולצבור ג\'ובות.',
  },
  {
    cat: 'features',
    q: 'מה לוח המובילים?',
    a: 'דירוג שבועי של העובדים עם הכי הרבה משימות שהושלמו, הכי הרבה ג\'ובות שנצברו ועוד. מיועד ליצור תחרות בריאה ולתגמל עובדים פעילים.',
  },
  {
    cat: 'features',
    q: 'איך עובד הצ\'אט?',
    a: 'לכל ג\'ובה פעילה יש ערוץ צ\'אט ייעודי בין הלקוח לעובד. ניתן לשלוח הודעות ולתאם פרטים. גם עובדים עם מועמדות פעילה (ממתינה או מאושרת) יכולים לשלוח הודעה ישירות מעמוד הג\'ובה.',
  },
  {
    cat: 'features',
    q: 'מה זה "Auto-Bump" (העלאת מחיר אוטומטית)?',
    a: 'פיצ\'ר שמעלה את מחיר הג\'ובה כל כמה דקות עד לתקרה שהגדרתם, כל עוד אין מועמדים פעילים. ברגע שנכנסת מועמדות — המחיר נקפא. עוזר למשוך עובדים לג\'ובות שלא מקבלות מענה.',
  },
  {
    cat: 'features',
    q: 'מה זה Stories בפיד?',
    a: 'שורת Stories בראש הפיד מציגה ג\'ובות שפרסמו בפורמט Story — בדיוק כמו Stories ברשתות חברתיות. לחיצה על Story מציגה את פרטי הג\'ובה בתצוגה מלאה עם כפתור "קח".',
  },
];

const en = [
  // ── General ─────────────────────────────────────────────────────────────
  {
    cat: 'general',
    q: 'What is Joba24?',
    a: 'Joba24 is a platform that connects people who need help with tasks ("posters") with people who want to perform them and earn ("workers"). Tasks cover every field — cleaning, moving, renovations, deliveries, IT, babysitting, and more. Joba24 itself is not an employer and is not a party to any agreement — all arrangements are made directly between users.',
  },
  {
    cat: 'general',
    q: 'Is Joba24 free?',
    a: 'Registration, browsing, and posting tasks are completely free. Workers use Jobas (work balance) to submit applications — see the Jobas section.',
  },
  {
    cat: 'general',
    q: 'Who can use the platform?',
    a: 'Anyone aged 18 and over with legal capacity to enter agreements. An active account and truthful information are required. Joba24 may require phone or identity verification.',
  },

  // ── Posting ─────────────────────────────────────────────────────────────
  {
    cat: 'publish',
    q: 'How do I post a job?',
    a: 'Tap "Post a Job" in the menu. Choose a category, fill in a detailed title and description, set a price, choose a location from the list (you must select from the autocomplete suggestions), set the approval mode (instant / manual), choose a payment method (cash / Bit / PayBox), and tap "Post". You can also attach photos and a video. The job will appear in the feed and on the map immediately.',
  },
  {
    cat: 'publish',
    q: 'What is the difference between "instant" and "manual" approval?',
    a: 'Instant approval — the first worker to apply gets the job automatically.\nManual approval — several workers apply with a personal message, and you choose the most suitable one. Recommended for tasks that require specific experience.',
  },
  {
    cat: 'publish',
    q: 'What is "job expiry"?',
    a: 'You can set an expiry of 6 hours, 1 day, 2 days, a week — or no expiry. A job that expires moves to "Expired" status and closes automatically. You can always repost it.',
  },
  {
    cat: 'publish',
    q: 'What is "Auto-Bump" (automatic price increase)?',
    a: 'A feature that automatically raises the job price every 5 minutes, up to a ceiling you set, as long as there are no active applicants. This increases the job\'s attractiveness over time and attracts more workers.',
  },
  {
    cat: 'publish',
    q: 'Can I cancel a job?',
    a: 'Yes, as long as the status is "Open" — you can cancel from the job details page. If a worker has already been approved, canceling will hurt your trust score and may result in a warning tag.',
  },

  // ── Workers ─────────────────────────────────────────────────────────────
  {
    cat: 'worker',
    q: 'How do I apply for a job?',
    a: 'Tap "Apply" on the task card. If it\'s manual approval — write a short message to the poster. Submitting an application moves Jobas to commitment (see the Jobas section).',
  },
  {
    cat: 'worker',
    q: 'What happens after I\'m approved for a job?',
    a: 'You move to "Approved" status. When you set out, tap "On My Way" — the status changes to "On the Way" and WorkerTracker activates. After arriving, tap "I Arrived", and after completing the work — "I\'m Done". The client receives a notification and confirms completion. After the client confirms, both parties rate each other.',
  },
  {
    cat: 'worker',
    q: 'What is WorkerTracker?',
    a: 'A real-time tracking system that lets the client see the worker\'s location, ETA, and route — just like Waze. Data is shared only during an active task and is deleted upon completion.',
  },
  {
    cat: 'worker',
    q: 'What are the possible job statuses?',
    a: '• Open (OPEN) — available to everyone\n• Taken (TAKEN) — a worker is assigned and the task is active\n• Completed (COMPLETED) — both parties confirmed\n• Cancelled (CANCELLED) — cancelled by one of the parties\n• Expired (EXPIRED) — expired without a worker being assigned\n\nWorkerTracker statuses (during an active job):\n• On the way, Arrived, Done',
  },
  {
    cat: 'worker',
    q: 'Can I leave a job I\'ve already taken?',
    a: 'Yes — tap "Leave Task" from the active task page. The Jobas that were committed when you applied are returned to your balance in full. Note that repeated cancellations may lower your trust score.',
  },

  // ── Jobas (work balance) ─────────────────────────────────────────────────
  {
    cat: 'credits',
    q: 'What are Jobas?',
    a: 'Jobas are your work balance on Joba24. They are only charged when you apply for a task — then they move to "commitment". If you\'re not selected, they automatically return to your available balance. Jobas have no monetary value and cannot be transferred or exchanged for cash.',
  },
  {
    cat: 'credits',
    q: 'How do I get Jobas?',
    a: '• Signup bonus — every new user gets free Jobas upon registration.\n• Rejection refund — if you applied and weren\'t selected, the Jobas are returned.\n• Expiry refund — if the task expired before being taken, the Jobas are returned.\n• Loyalty reward — bonuses for completing consecutive tasks.\n• Balance top-up — you can purchase additional Jobas at any time.',
  },
  {
    cat: 'credits',
    q: 'How many Jobas does an application cost?',
    a: 'The Jobas that go to commitment are determined by the task\'s value — the higher the task payout, the higher the commitment amount. The system shows the amount before you apply, and it returns to your available balance automatically if you\'re not selected.',
  },
  {
    cat: 'credits',
    q: 'What is a Job Story?',
    a: 'Story is a high-exposure feature — costs 10 Jobas and displays your task in the Stories bar at the top of the feed for 24 hours. 3x the exposure of a regular task.',
  },
  {
    cat: 'credits',
    q: 'What is a Job Boost?',
    a: 'Boost is a feature that raises your job to the top of the feed and sends a notification to suitable workers in the area. You can activate Boost from the job details page. The Boost cost is based on the job\'s price.',
  },

  // ── Payment ─────────────────────────────────────────────────────────────
  {
    cat: 'payment',
    q: 'How does payment for a job work?',
    a: 'Payment is made directly between the poster and the worker, outside the platform. Joba24 does not process payments and does not hold funds. When posting a job, the poster specifies the payment method — cash, Bit, or PayBox.',
  },
  {
    cat: 'payment',
    q: 'Is there Escrow?',
    a: 'No. Joba24 does not provide escrow services. Any agreement on payment, its execution, and its confirmation is solely the responsibility of the users.',
  },
  {
    cat: 'payment',
    q: 'What happens in case of a financial dispute?',
    a: 'Joba24 is not responsible for financial disputes between users. You can report WorkerTracker issues — filing a "no-show report" if the worker didn\'t show up — which affects their trust score.',
  },

  // ── Trust ────────────────────────────────────────────────────────────────
  {
    cat: 'trust',
    q: 'What is the trust system?',
    a: 'Every user has a trust score that affects their ranking in the feed and their availability for jobs. The score is based on execution history, ratings, cancellations, and reports.',
  },
  {
    cat: 'trust',
    q: 'What lowers the trust score?',
    a: '• Repeated cancellations after approval\n• No-show for a task\n• Payment complaints\n• Abusive behavior\n• Posting fake tasks\n• Consistent lack of response',
  },
  {
    cat: 'trust',
    q: 'How do you rate a worker / client?',
    a: 'After a job ends, both parties receive a rating request with 1–5 stars and the option to write a review. Ratings are visible on the public profile and affect feed ranking.',
  },
  {
    cat: 'trust',
    q: 'What does "verified" mean?',
    a: 'The "verified" status is given to users who have gone through an identity verification process (document and photo). When posting a job, it\'s shown whether the client is verified — increasing trust from workers.',
  },

  // ── Features ─────────────────────────────────────────────────────────────
  {
    cat: 'features',
    q: 'What is InstantMatch?',
    a: 'A smart matching mechanism that offers workers suitable jobs based on their current location, preferred categories, experience, and past activity — in real time. The match appears as a popup at the bottom of the feed.',
  },
  {
    cat: 'features',
    q: 'What is "Daily Goal"?',
    a: 'A gamification feature that sets a daily target for the worker — such as 3 jobs a day — and awards bonuses for achieving the goal. Helps maintain motivation and accumulate Jobas.',
  },
  {
    cat: 'features',
    q: 'What is the leaderboard?',
    a: 'A weekly ranking of workers with the most completed tasks, the most accumulated Jobas, and more. Designed to create healthy competition and reward active workers.',
  },
  {
    cat: 'features',
    q: 'How does chat work?',
    a: 'Every active job has a dedicated chat channel between the client and the worker. You can send messages and coordinate details. Workers with an active application (pending or approved) can also send a message directly from the job page.',
  },
  {
    cat: 'features',
    q: 'What is "Auto-Bump" (automatic price increase)?',
    a: 'A feature that raises the job price every few minutes up to a ceiling you set, as long as there are no active applicants. Once an application comes in — the price freezes. Helps attract workers to jobs that aren\'t getting responses.',
  },
  {
    cat: 'features',
    q: 'What are Stories in the feed?',
    a: 'A Stories bar at the top of the feed shows jobs posted in Story format — just like Stories on social networks. Tapping a Story displays the job details in full view with a "Take" button.',
  },
];

export function getFaqs(lang) {
  if (lang === 'he') return he;
  return en;
}