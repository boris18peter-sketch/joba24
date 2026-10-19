/**
 * Joba24 — HEBREW copy for the FIRST-RUN flow.
 *
 * This is the ONE part of the onboarding copy that is compiled into the entry
 * bundle, and it is here for a single reason: /welcome is the first screen a
 * brand-new visitor sees, and a new visitor has no saved language, so the app
 * paints in Hebrew immediately. Holding /welcome behind a network fetch would
 * put a spinner in front of the very first impression.
 *
 * The eight other languages live in i18n-onboarding.js and load on demand —
 * see loadLanguage() in i18n.js.
 *
 * Keys, by screen:
 *   onb_choice_*        the track picker (TrackChoice)
 *   onb_box_*           its two journey boxes
 *   onb_back/skip/next  the explainer's own controls
 *   onb_switch_track    "switch track"
 *   onb_pub_s1..s3      the publish journey's three explainer screens
 *   onb_wrk_s1..s3      the worker journey's three explainer screens
 *   onb_cta_*           each journey's closing button
 *   onb_joined_count    the join step's live sign-up line
 *   onb_demo_*          the ONE demo job every illustration shows
 *   onb_v_*             the labels inside the illustrations
 *   onb_a1..a4_*        the illustration's example applicants
 *   onb_prof_*          the illustration's profession chips
 *
 * `{name}` and `{n}` are filled by t()'s second argument.
 */

const he = {
  onb_choice_title: 'מה תרצו לעשות היום?',
  onb_choice_body: 'ב-Joba24 מוצאים עזרה או מרוויחים מביצוע משימות.',
  onb_box_publish_title: 'צריכים עזרה?',
  onb_box_publish_body: 'פרסמו משימה בחינם, קבלו פניות מעובדים ובחרו מי יעזור לכם.',
  onb_box_publish_cta: 'פרסמו משימה בחינם',
  onb_box_worker_title: 'רוצים להרוויח?',
  onb_box_worker_body: 'מצאו משימות באזור שלכם, הגישו מועמדות והתחילו להרוויח.',
  onb_box_worker_cta: 'מצאו משימות והתחילו להרוויח',

  onb_back: 'חזרה',
  onb_skip: 'דלג',
  onb_next: 'הבא',
  onb_switch_track: 'החלפת מסלול',

  onb_pub_s1_title: 'צריכים עזרה? פשוט מפרסמים!',
  onb_pub_s1_body: 'תארו מה צריך לעשות, איפה ומתי. הפרסום בחינם.',
  onb_pub_s2_title: 'נמאס לכם ממחירים מוגזמים?',
  onb_pub_s2_body: 'אתם קובעים את המחיר, וה־AI עוזר לכם לבחור מחיר מתאים לפי תיאור המשימה. אנשים רואים את המשימה שלכם, ומי שמעוניין מגיש מועמדות.',
  onb_pub_s3_title: 'פרסמו עכשיו, קבלו מועמדויות תוך דקות!',
  onb_pub_s3_body: 'אלפי אנשים מוכנים למשימות. מי שמעוניין יגיש מועמדות, ואתם קובעים מי יגיע. פרסום המשימה לא מחייב אתכם בכלום: אפשר לאשר עובד, לערוך או למחוק אותה בכל רגע.',

  onb_wrk_s1_title: 'יש לכם כישורים? תהפכו אותם להכנסה!',
  onb_wrk_s1_body: 'בחרו מה אתם יודעים לעשות ובאילו אזורים תרצו לעבוד.',
  onb_wrk_s2_title: 'המשימות מגיעות גם אליכם!',
  onb_wrk_s2_body: 'קבלו התראות על משימות מתאימות או מצאו אותן בעצמכם בפיד.',
  onb_wrk_s3_title: 'מצאתם משימה? הגישו מועמדות!',
  onb_wrk_s3_body: 'המפרסם בוחר מי יבצע. נבחרתם? צאו לבצע והרוויחו.',

  onb_cta_publish: 'פרסמו משימה בחינם',
  onb_cta_worker: 'בוא נתחיל להרוויח',
  onb_joined_count: 'כבר הצטרפו ל-{name}',

  onb_demo_title: 'התקנת גוף תאורה בסלון',
  onb_demo_desc: 'צריך להתקין גוף תאורה חדש בתקרת הסלון. יש סולם וכלים בבית.',
  onb_demo_category: 'חשמל',
  onb_demo_location: 'רחוב פלורנטין, תל אביב',
  onb_demo_city: 'תל אביב',
  onb_demo_time: 'מחר, 10:00',
  onb_demo_client: 'דנה כ׳',

  onb_v_publish: 'פרסם משימה',
  onb_v_describe: '📝 תאר את המשימה *',
  onb_v_location: 'מיקום *',
  onb_v_price: 'קביעת מחיר',
  onb_v_you_set_price: 'אתם קובעים את המחיר',
  onb_v_price_model: 'העובדים רואים בדיוק את המחיר שכתבתם, ורק מי שהמחיר מתאים לו מגיש מועמדות. כך מקבלים פניות אמיתיות — בלי משא ומתן ובלי הפתעות.',
  onb_v_price_field: 'מחיר (₪) *',
  onb_v_new: 'חדש ב-Joba24',
  onb_v_ai_recommends: 'ה־AI ממליץ על המחיר המתאים',
  onb_v_ai_basis: 'לפי תיאור המשימה ומחירי השוק',
  onb_v_use_rec: 'השתמש בהמלצה',

  onb_v_applicants: 'הבקשות שקיבלת',
  onb_v_applicants_n: 'מועמדים ({n})',
  onb_v_recommended: 'מומלץ',
  onb_v_available_now: 'זמין עכשיו',
  onb_v_verified: 'מאומת',
  onb_v_tasks_n: '{n} משימות',
  onb_v_decline: 'דחה',
  onb_v_approve: 'אשר עובד',

  onb_a1_name: 'דניאל כהן',
  onb_a1_msg: 'אני חשמלאי מוסמך, יכול להגיע מחר בבוקר.',
  onb_a2_name: 'יוסי לוי',
  onb_a2_msg: 'מוכן להגיע במיידי',
  onb_a3_name: 'מיכל אברהם',
  onb_a3_msg: 'יש לי ניסיון בהתקנת גופי תאורה.',
  onb_a4_name: 'אבי מזרחי',

  onb_v_new_task_alert: 'משימה חדשה באזור שלך',

  onb_v_details: 'פרטי המשימה',
  onb_v_apply: 'הגש מועמדות למשימה',
  onb_v_category: 'קטגוריה',
  onb_v_exact_time: 'מועד מדויק',
  onb_v_description: 'תיאור',

  onb_v_my_profile: 'הפרופיל שלי',
  onb_v_professions: 'תחומי עיסוק',
  onb_v_areas: 'אזורי עבודה',

  onb_prof_list: ['אינסטלטור', 'חשמלאי', 'איש תיקונים / הנדימן', 'מנקה', 'נגר', 'צבע', 'הובלן', 'טכנאי מזגנים', 'מנעולן', 'גנן', 'נהג', 'מאבטח'],
  onb_prof_selected: ['חשמלאי', 'אינסטלטור', 'איש תיקונים / הנדימן'],
};

export default he;