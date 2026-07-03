/**
 * PLUMBING — Specialized Vertical Configuration
 * ───────────────────────────────────────────────────────────────────────────
 * The first specialized vertical. Every section is tuned specifically for
 * plumbing — not generic. This is the "learning" vertical.
 *
 * Layer 2 of the 3-layer merge:
 *   Layer 1: Generic defaults (defaults.js) — reproduces current behavior
 *   Layer 2: THIS FILE — specialized plumbing behavior
 *   Layer 3: VerticalConfig entity — admin runtime overrides
 *
 * Only fields specified here override the defaults. Everything else
 * falls through to the generic default.
 */

export const PLUMBING_VERTICAL = {

  general: {
    id: 'plumbing',
    name: 'אינסטלציה',
    icon: '🔧',
    description: 'תיקוני אינסטלציה, נזילות, סתימות, דודי שמש, התקנת מכשירים',
  },

  ai: {
    publishing_prompt: `You are a plumbing intake assistant for Joba24. Your job is to help users describe their plumbing issue accurately and quickly.

Key behaviors:
- ALWAYS ask for a photo of the problem — plumbers need to see it
- Detect emergencies: if water is actively flowing, flooding, or the user says "מיידי", tag as IMMEDIATE
- Identify the issue type (leak, clog, faucet, toilet, boiler, installation, other)
- Ask WHERE in the home (kitchen, bathroom, toilet, balcony, outdoors)
- For boilers: ask the brand and model (Dany, Hamum, Nisko, etc.) — parts compatibility matters
- For installations: ask what appliance (dishwasher, washing machine, etc.)
- NEVER quote a final price — say "the plumber will confirm after seeing the photos"
- If emergency: reassure the user that nearby licensed plumbers are being notified

Be concise, warm, and action-oriented. The user is often stressed (water = panic).`,
    required_questions: [
      { key: 'issue_type', label: 'מה הבעיה?', type: 'select', options: [
        'נזילה ממקום מסוים', 'סתימה בכיור / אמבטיה / שירותים', 'החלפת ברז',
        'אסלה שלא נסגרת / זורמת', 'דוד שמש / בוילר', 'התקנת מכשיר חדש', 'בדיקה כללית', 'אחר',
      ]},
      { key: 'urgency', label: 'כמה דחוף?', type: 'select', options: [
        '🔴 מיידי — מים זורמים עכשיו', '🟡 היום', '🟢 תוך יום-יומיים', '⚪ לא דחוף',
      ]},
      { key: 'location_in_home', label: 'איפה בבית?', type: 'select', options: [
        'מטבח', 'חדר אמבטיה', 'שירותים', 'מרפסת', 'מחוץ לבית', 'אחר',
      ]},
      { key: 'photos', label: 'צילום הבעיה', type: 'image', required_for_urgency: 'immediate' },
    ],
    optional_questions: [
      { key: 'brand_model', label: 'מותג ודגם (לדודים/מכשירים)', type: 'text', placeholder: 'למשל: דוד די-ני מודל 150 ליטר' },
      { key: 'duration', label: 'מתי התחיל?', type: 'text', placeholder: 'למשל: לפני שעה, אתמול, לפני שבוע' },
      { key: 'notes', label: 'פרטים נוספים', type: 'text', placeholder: 'למשל: צינור תחת הכיור, רטיבות בקיר...' },
    ],
    question_order: ['issue_type', 'urgency', 'location_in_home', 'photos', 'brand_model', 'duration', 'notes'],
    follow_up_rules: [
      { trigger_field: 'urgency', trigger_value: '🔴 מיידי — מים זורמים עכשיו', follow_up_question: { key: 'water_flowing', label: 'האם מים זורמים כרגע באופן פעיל?', type: 'boolean' }},
      { trigger_field: 'issue_type', trigger_value: 'דוד שמש / בוילר', follow_up_question: { key: 'brand_model', label: 'מה המותג והדגם של הדוד?', type: 'text' }},
      { trigger_field: 'issue_type', trigger_value: 'התקנת מכשיר חדש', follow_up_question: { key: 'appliance_type', label: 'איזה מכשיר מתקינים?', type: 'text' }},
    ],
  },

  task_form: {
    required_fields: ['title', 'price', 'category', 'location_name', 'city', 'lat', 'lng', 'payment_method', 'issue_type', 'urgency'],
    optional_fields: [
      { key: 'issue_type', type: 'select', label: 'מה הבעיה? 🔧', options: [
        'נזילה ממקום מסוים', 'סתימה בכיור / אמבטיה / שירותים', 'החלפת ברז',
        'אסלה שלא נסגרת / זורמת', 'דוד שמש / בוילר', 'התקנת מכשיר חדש (מדיח, מכונת כביסה...)', 'בדיקה כללית', 'אחר',
      ]},
      { key: 'urgency', type: 'select', label: 'כמה דחוף? ⏰', options: [
        '🔴 מיידי — מים זורמים עכשיו', '🟡 היום', '🟢 תוך יום-יומיים', '⚪ לא דחוף',
      ]},
      { key: 'location_in_home', type: 'select', label: 'איפה בבית?', options: ['מטבח', 'חדר אמבטיה', 'שירותים', 'מרפסת', 'מחוץ לבית', 'אחר'] },
      { key: 'brand_model', type: 'text', label: 'מותג ודגם (לא חובה)', placeholder: 'למשל: דוד די-ני 150 ליטר' },
      { key: 'notes', type: 'text', label: 'פרטים נוספים', placeholder: 'למשל: צינור תחת הכיור, רטיבות בקיר...' },
    ],
    validation_rules: {
      price_range: { min: 200, max: 600 },
      require_photos_for_urgency: ['immediate'],
    },
  },

  matching: {
    // Plumbing emergencies need NEARBY workers — distance weighted higher
    // Urgency weighted higher — a flooding house can't wait
    ranking_factors: ['distance', 'certification_match', 'recent_activity', 'task_relevance', 'personal_fit', 'urgency', 'reliability_fit'],
    weights: {
      distance: 0.35,
      certification_match: 0.20,
      recent_activity: 0.15,
      task_relevance: 0.10,
      personal_fit: 0.10,
      urgency: 0.10,
      reliability_fit: 0.10,
    },
    availability_rules: {
      require_online: false,
      max_concurrent_tasks: 1,
      emergency_response_window_minutes: 30, // must respond within 30 min for emergencies
    },
    distance_rules: {
      max_km: 50,
      // Tighter tiers for emergencies — plumbers need to be CLOSE
      tiers: [
        { km: 1,  score: 1.0 },
        { km: 2,  score: 0.95 },
        { km: 3,  score: 0.88 },
        { km: 5,  score: 0.75 },
        { km: 10, score: 0.55 },
        { km: 20, score: 0.30 },
        { km: 50, score: 0.10 },
      ],
      fallback_score: 0.02,
      // Emergency mode: even tighter — only show within 15km
      emergency_max_km: 15,
    },
  },

  trust: {
    // For plumbing, LICENSE is the #1 trust signal — an unlicensed plumber
    // can cause water damage worth tens of thousands of shekels
    trust_signals: [
      { key: 'license_verification', weight: 40, description: 'רישיון אינסטלטור מוסמך' },
      { key: 'insurance', weight: 15, description: 'ביטוח חבות מקצועית' },
      { key: 'rating_quality', weight: 25, description: 'דירוג מבוסס ביקורות' },
      { key: 'task_experience', weight: 20, description: 'ניסיון בתיקוני אינסטלציה' },
    ],
    verification_requirements: ['id', 'license'],
    minimum_trust_level: 30, // must have at least ID + some experience
  },

  reviews: {
    // Plumbing-specific review questions — focus on FIXING THE ROOT CAUSE
    // and not causing secondary damage
    review_questions: [
      { key: 'rating', label: 'דירוג כללי', type: 'number', required: true },
      { key: 'fixed_root_cause', label: 'תיקן את שורש הבעיה (לא רק את הסימפטום)', type: 'boolean' },
      { key: 'fixed_first_visit', label: 'תיקן בביקור הראשון (בלי צורך בחזרה)', type: 'boolean' },
      { key: 'clean_work', label: 'השאיר את האזור נקי אחרי העבודה', type: 'boolean' },
      { key: 'no_damage', label: 'לא גרם נזק נלווה (רטיבות, שריטות)', type: 'boolean' },
      { key: 'transparent_pricing', label: 'מחיר שקוף — ללא הפתעות', type: 'boolean' },
      { key: 'explained_problem', label: 'הסביר מה הייתה הבעיה ומה תיקן', type: 'boolean' },
      { key: 'quality_parts', label: 'השתמש בחלקים איכותיים', type: 'boolean' },
      { key: 'comment', label: 'תגובה חופשית', type: 'text' },
    ],
    review_categories: [
      { key: 'fixed_first_visit', label: '✅ תיקן בביקור אחד' },
      { key: 'clean_work', label: '🧹 עבודה נקייה' },
      { key: 'transparent_pricing', label: '💰 מחיר הוגן' },
      { key: 'explained_problem', label: '🗣️ הסביר את הבעיה' },
      { key: 'no_damage', label: '🛡️ ללא נזקים' },
    ],
  },

  worker_card: {
    // For plumbing: show LICENSE prominently, specialties, emergency availability
    fields_to_display: ['full_name', 'profile_photo', 'rating', 'tasks_completed', 'is_verified', 'license_verified', 'specialties', 'emergency_available'],
    badges: [
      { key: 'licensed', label: 'רישיון', condition: 'license_verified === true' },
      { key: 'emergency_ready', label: 'זמין לחירום', condition: 'emergency_available === true' },
      { key: 'boiler_specialist', label: 'מומחה דודים', condition: "specialties.includes('boilers')" },
      { key: 'top_rated', label: 'מוביל', condition: 'rating >= 4.5 && rating_count >= 5' },
      { key: 'experienced', label: 'מנוסה', condition: 'tasks_completed >= 20' },
    ],
    statistics: ['tasks_completed', 'rating', 'rating_count', 'first_visit_fix_rate'],
  },

  task_card: {
    // For plumbing: show EMERGENCY badge prominently, issue type, photos
    fields_to_display: ['title', 'price', 'city', 'issue_type', 'urgency_tag', 'images', 'location_in_home', 'client_name', 'client_verified'],
    badges: [
      { key: 'emergency', label: '🚨 חירום', condition: "urgency_tag === 'immediate'" },
      { key: 'licensed_required', label: '🔧 דרוש רישיון', condition: 'true' },
      { key: 'new', label: 'חדש', condition: 'age_minutes < 30' },
      { key: 'funded', label: 'ממומן', condition: "payment_status === 'funded'" },
      { key: 'nearby', label: 'קרוב אלי', condition: 'distance_km < 5' },
      { key: 'verified_client', label: 'מפרסם מאומת', condition: 'client_verified === true' },
      { key: 'low_competition', label: 'פנוי', condition: 'applicants_count === 0' },
    ],
    urgency_indicators: ['immediate', 'few_hours', 'evening', 'flexible'],
  },

  task_detail: {
    // For plumbing: urgency banner FIRST, then issue photos, then details
    layout: ['hero', 'urgency_banner', 'issue_details', 'location', 'requirements', 'client_info', 'applicants', 'cta'],
    information_blocks: [
      { key: 'hero', title: null, fields: ['images', 'video_url', 'title'] },
      { key: 'urgency_banner', title: null, fields: ['urgency_tag', 'water_flowing'] },
      { key: 'issue_details', title: 'פרטי התקלה', fields: ['issue_type', 'location_in_home', 'brand_model', 'description', 'category_details', 'duration'] },
      { key: 'location', title: 'מיקום', fields: ['location_name', 'city', 'address_building', 'address_floor', 'address_apartment', 'address_notes', 'lat', 'lng'] },
      { key: 'requirements', title: 'דרישות', fields: ['requirements'] },
      { key: 'client_info', title: 'פרטי המפרסם', fields: ['client_name', 'client_rating', 'client_verified'] },
      { key: 'applicants', title: 'מועמדים', fields: ['applicants'] },
    ],
    cta_buttons: [
      { key: 'emergency_dispatch', label: '🚨 שלח אינסטלטור קרוב עכשיו', condition: "status === 'OPEN' && urgency_tag === 'immediate' && !is_applicant && !is_owner", priority: 'high' },
      { key: 'apply', label: 'הגשת מועמדות', condition: "status === 'OPEN' && urgency_tag !== 'immediate' && !is_applicant && !is_owner" },
      { key: 'cancel_app', label: 'ביטול מועמדות', condition: "status === 'OPEN' && is_applicant && !is_owner" },
      { key: 'manage', label: 'ניהול מועמדים', condition: 'is_owner && status === OPEN' },
      { key: 'chat', label: 'צאט', condition: 'is_worker || is_owner' },
    ],
  },

  marketplace_metrics: {
    nearby_workers: true,
    average_response_time: true,
    average_completion_time: true,
  },

  notifications: {
    // For plumbing: emergencies get IMMEDIATE push, faster no-applicant reminder
    reminders: [
      { trigger: 'no_applicants', delay_minutes: 15, message: 'עדיין אין תגובה — להעלות את המחיר או להרחיב רדיוס?', condition: "urgency_tag === 'immediate'" },
      { trigger: 'no_applicants', delay_minutes: 30, message: 'עדיין אין מועמדים — אולי כדאי להעלות את המחיר?', condition: "urgency_tag !== 'immediate'" },
      { trigger: 'task_expiring', delay_minutes: 60, message: 'המשימה עומדת לפוג — להאריך זמן?' },
    ],
    suggestions: [
      { trigger: 'price_below_avg', message: 'המחיר נמוך מהממוצע לאינסטלציה — להגדיל סיכויי התאמה' },
      { trigger: 'no_photo', message: 'הוספת תמונה של התקלה תגדיל את הסיכוי לתגובה מהירה פי 3' },
    ],
    urgency_logic: {
      immediate: { priority: 'critical', push: true, push_to_all_nearby: true, radius_km: 15 },
      few_hours: { priority: 'high', push: true },
      evening: { priority: 'normal', push: false },
      flexible: { priority: 'low', push: false },
    },
  },

  premium_features: {
    story: false, // Stories don't make sense for plumbing
    boost: true,  // Emergency boost — push to top of nearby workers' feed
    auto_raise: true, // Auto-increase price to attract workers if no response
    recommendations: true, // Match by specialty (boilers, toilets, etc.)
  },

  analytics: {
    success_metrics: ['first_visit_fix_rate', 'emergency_response_time', 'repeat_hire_rate', 'avg_rating', 'no_damage_rate'],
    conversion_metrics: ['view_to_apply', 'apply_to_approve', 'approve_to_complete', 'emergency_dispatch_success'],
  },
};