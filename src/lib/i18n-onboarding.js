/**
 * Joba24 — translations for the FIRST-RUN flow (the new onboarding screens).
 *
 * Kept in its own module on purpose. The nine main language files are already
 * ~1400 lines each and hold the whole app; the first-run flow is a self-contained
 * set of screens with its own copy, so its strings live together here where they
 * can be read and corrected as one piece.
 *
 * Merged into `translations` in i18n.js, so `t('onb_…')` behaves exactly like
 * every other key: falls back to Hebrew, then to the key itself.
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
  onb_pub_s3_body: 'אלפי אנשים מוכנים למשימות. מי שמעוניין יגיש מועמדות, ואתם בוחרים מי יגיע.',

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
  onb_v_apply_n: 'הגש מועמדות למשימה — {n}',
  onb_v_apply_note: '💡 הג\'ובות חוזרות ליתרה אוטומטית אם הבקשה לא תאושר או המשימה תבוטל',
  onb_v_category: 'קטגוריה',
  onb_v_exact_time: 'מועד מדויק',
  onb_v_description: 'תיאור',

  onb_v_my_profile: 'הפרופיל שלי',
  onb_v_professions: 'תחומי עיסוק',
  onb_v_areas: 'אזורי עבודה',

  onb_prof_list: ['אינסטלטור', 'חשמלאי', 'איש תיקונים / הנדימן', 'מנקה', 'נגר', 'צבע', 'הובלן', 'טכנאי מזגנים', 'מנעולן', 'גנן', 'נהג', 'מאבטח'],
  onb_prof_selected: ['חשמלאי', 'אינסטלטור', 'איש תיקונים / הנדימן'],
};

const en = {
  onb_choice_title: 'What would you like to do today?',
  onb_choice_body: 'On Joba24 you get help, or earn by doing tasks.',
  onb_box_publish_title: 'Need help?',
  onb_box_publish_body: 'Post a task for free, get offers from workers and choose who helps you.',
  onb_box_publish_cta: 'Post a task for free',
  onb_box_worker_title: 'Want to earn?',
  onb_box_worker_body: 'Find tasks in your area, apply and start earning.',
  onb_box_worker_cta: 'Find tasks and start earning',

  onb_back: 'Back',
  onb_skip: 'Skip',
  onb_next: 'Next',
  onb_switch_track: 'Switch track',

  onb_pub_s1_title: 'Need help? Just post it!',
  onb_pub_s1_body: 'Describe what needs doing, where and when. Posting is free.',
  onb_pub_s2_title: 'Tired of overpriced quotes?',
  onb_pub_s2_body: 'You set the price, and the AI helps you pick a fair one from your task description. People see your task, and whoever is interested applies.',
  onb_pub_s3_title: 'Post now, get applicants within minutes!',
  onb_pub_s3_body: 'Thousands of people are ready for tasks. Whoever is interested applies, and you choose who shows up.',

  onb_wrk_s1_title: 'Got skills? Turn them into income!',
  onb_wrk_s1_body: 'Choose what you know how to do and the areas you want to work in.',
  onb_wrk_s2_title: 'Tasks come to you too!',
  onb_wrk_s2_body: 'Get alerts for matching tasks, or find them yourself in the feed.',
  onb_wrk_s3_title: 'Found a task? Apply for it!',
  onb_wrk_s3_body: 'The poster chooses who does it. Chosen? Go do it and earn.',

  onb_cta_publish: 'Post a task for free',
  onb_cta_worker: "Let's start earning",
  onb_joined_count: 'already joined {name}',

  onb_demo_title: 'Installing a ceiling light in the living room',
  onb_demo_desc: 'Need to install a new light fixture on the living-room ceiling. There is a ladder and tools at home.',
  onb_demo_category: 'Electricity',
  onb_demo_location: 'Florentin St, Tel Aviv',
  onb_demo_city: 'Tel Aviv',
  onb_demo_time: 'Tomorrow, 10:00',
  onb_demo_client: 'Dana K.',

  onb_v_publish: 'Post a task',
  onb_v_describe: '📝 Describe the task *',
  onb_v_location: 'Location *',
  onb_v_price: 'Set a price',
  onb_v_you_set_price: 'You set the price',
  onb_v_price_model: 'Workers see exactly the price you wrote, and only those it suits apply. That is how you get real applicants, with no haggling and no surprises.',
  onb_v_price_field: 'Price (₪) *',
  onb_v_new: 'New in Joba24',
  onb_v_ai_recommends: 'The AI recommends the right price',
  onb_v_ai_basis: 'Based on your task description and market rates',
  onb_v_use_rec: 'Use the suggestion',

  onb_v_applicants: 'The requests you received',
  onb_v_applicants_n: 'Applicants ({n})',
  onb_v_recommended: 'Recommended',
  onb_v_available_now: 'Available now',
  onb_v_verified: 'Verified',
  onb_v_tasks_n: '{n} tasks',
  onb_v_decline: 'Decline',
  onb_v_approve: 'Approve worker',

  onb_a1_name: 'Daniel Cohen',
  onb_a1_msg: 'I am a certified electrician, I can come tomorrow morning.',
  onb_a2_name: 'Yossi Levi',
  onb_a2_msg: 'Ready to come right away',
  onb_a3_name: 'Michal Avraham',
  onb_a3_msg: 'I have experience installing light fixtures.',
  onb_a4_name: 'Avi Mizrahi',

  onb_v_new_task_alert: 'New task in your area',

  onb_v_details: 'Task details',
  onb_v_apply_n: 'Apply for the task — {n}',
  onb_v_apply_note: '💡 Jobas return to your balance automatically if the request is not approved or the task is cancelled',
  onb_v_category: 'Category',
  onb_v_exact_time: 'Exact time',
  onb_v_description: 'Description',

  onb_v_my_profile: 'My profile',
  onb_v_professions: 'Professions',
  onb_v_areas: 'Work areas',

  onb_prof_list: ['Plumber', 'Electrician', 'Handyman', 'Cleaner', 'Carpenter', 'Painter', 'Mover', 'AC technician', 'Locksmith', 'Gardener', 'Driver', 'Security guard'],
  onb_prof_selected: ['Electrician', 'Plumber', 'Handyman'],
};

const ar = {
  onb_choice_title: 'ماذا تريد أن تفعل اليوم؟',
  onb_choice_body: 'في Joba24 تجد المساعدة أو تربح من تنفيذ المهام.',
  onb_box_publish_title: 'تحتاج مساعدة؟',
  onb_box_publish_body: 'انشر مهمة مجانًا، واستقبل طلبات من العمال واختر من سيساعدك.',
  onb_box_publish_cta: 'انشر مهمة مجانًا',
  onb_box_worker_title: 'تريد أن تربح؟',
  onb_box_worker_body: 'اعثر على مهام في منطقتك، تقدّم بطلب وابدأ الربح.',
  onb_box_worker_cta: 'اعثر على مهام وابدأ الربح',

  onb_back: 'رجوع',
  onb_skip: 'تخطٍ',
  onb_next: 'التالي',
  onb_switch_track: 'تغيير المسار',

  onb_pub_s1_title: 'تحتاج مساعدة؟ انشرها فقط!',
  onb_pub_s1_body: 'اوصف ما يجب فعله، وأين ومتى. النشر مجاني.',
  onb_pub_s2_title: 'تعبت من الأسعار المبالغ فيها؟',
  onb_pub_s2_body: 'أنت تحدد السعر، والذكاء الاصطناعي يساعدك على اختيار سعر مناسب حسب وصف المهمة. الناس يرون مهمتك، ومن يهتم يتقدم بطلب.',
  onb_pub_s3_title: 'انشر الآن، واحصل على متقدمين خلال دقائق!',
  onb_pub_s3_body: 'آلاف الأشخاص مستعدون للمهام. من يهتم يتقدم بطلب، وأنت تختار من سيأتي.',

  onb_wrk_s1_title: 'لديك مهارات؟ حوّلها إلى دخل!',
  onb_wrk_s1_body: 'اختر ما تجيده والمناطق التي تريد العمل فيها.',
  onb_wrk_s2_title: 'المهام تأتي إليك أيضًا!',
  onb_wrk_s2_body: 'استقبل تنبيهات بالمهام المناسبة أو اعثر عليها بنفسك في الخلاصة.',
  onb_wrk_s3_title: 'وجدت مهمة؟ تقدّم بطلب!',
  onb_wrk_s3_body: 'الناشر يختار من سينفذ. تم اختيارك؟ اذهب ونفّذ واربح.',

  onb_cta_publish: 'انشر مهمة مجانًا',
  onb_cta_worker: 'لنبدأ الربح',
  onb_joined_count: 'انضم بالفعل إلى {name}',

  onb_demo_title: 'تركيب وحدة إضاءة في غرفة المعيشة',
  onb_demo_desc: 'بحاجة لتركيب وحدة إضاءة جديدة في سقف غرفة المعيشة. يوجد سلّم وأدوات في المنزل.',
  onb_demo_category: 'كهرباء',
  onb_demo_location: 'شارع فلورنتين، تل أبيب',
  onb_demo_city: 'تل أبيب',
  onb_demo_time: 'غدًا، 10:00',
  onb_demo_client: 'دانا ك.',

  onb_v_publish: 'انشر مهمة',
  onb_v_describe: '📝 اوصف المهمة *',
  onb_v_location: 'الموقع *',
  onb_v_price: 'تحديد السعر',
  onb_v_you_set_price: 'أنت تحدد السعر',
  onb_v_price_model: 'يرى العمال بالضبط السعر الذي كتبته، ومن يناسبه السعر فقط يتقدم بطلب. هكذا تحصل على طلبات حقيقية — بلا مساومة وبلا مفاجآت.',
  onb_v_price_field: 'السعر (₪) *',
  onb_v_new: 'جديد في Joba24',
  onb_v_ai_recommends: 'الذكاء الاصطناعي يوصي بالسعر المناسب',
  onb_v_ai_basis: 'حسب وصف المهمة وأسعار السوق',
  onb_v_use_rec: 'استخدم التوصية',

  onb_v_applicants: 'الطلبات التي استلمتها',
  onb_v_applicants_n: 'المتقدمون ({n})',
  onb_v_recommended: 'موصى به',
  onb_v_available_now: 'متاح الآن',
  onb_v_verified: 'موثّق',
  onb_v_tasks_n: '{n} مهام',
  onb_v_decline: 'رفض',
  onb_v_approve: 'اعتماد العامل',

  onb_a1_name: 'دانيال كوهين',
  onb_a1_msg: 'أنا كهربائي معتمد، يمكنني القدوم غدًا صباحًا.',
  onb_a2_name: 'يوسي ليفي',
  onb_a2_msg: 'مستعد للقدوم فورًا',
  onb_a3_name: 'ميشال أفراهام',
  onb_a3_msg: 'لدي خبرة في تركيب وحدات الإضاءة.',
  onb_a4_name: 'آفي مزراحي',

  onb_v_new_task_alert: 'مهمة جديدة في منطقتك',

  onb_v_details: 'تفاصيل المهمة',
  onb_v_apply_n: 'تقدّم بطلب للمهمة — {n}',
  onb_v_apply_note: '💡 تعود الجوبات إلى رصيدك تلقائيًا إذا لم يُعتمد الطلب أو أُلغيت المهمة',
  onb_v_category: 'الفئة',
  onb_v_exact_time: 'الموعد المحدد',
  onb_v_description: 'الوصف',

  onb_v_my_profile: 'ملفي الشخصي',
  onb_v_professions: 'مجالات العمل',
  onb_v_areas: 'مناطق العمل',

  onb_prof_list: ['سبّاك', 'كهربائي', 'صيانة عامة', 'منظّف', 'نجّار', 'دهّان', 'نقّال', 'فني تكييف', 'صانع أقفال', 'بستاني', 'سائق', 'حارس أمن'],
  onb_prof_selected: ['كهربائي', 'سبّاك', 'صيانة عامة'],
};

const es = {
  onb_choice_title: '¿Qué quieres hacer hoy?',
  onb_choice_body: 'En Joba24 encuentras ayuda o ganas dinero haciendo tareas.',
  onb_box_publish_title: '¿Necesitas ayuda?',
  onb_box_publish_body: 'Publica una tarea gratis, recibe solicitudes de trabajadores y elige quién te ayuda.',
  onb_box_publish_cta: 'Publica una tarea gratis',
  onb_box_worker_title: '¿Quieres ganar?',
  onb_box_worker_body: 'Encuentra tareas en tu zona, postúlate y empieza a ganar.',
  onb_box_worker_cta: 'Encuentra tareas y empieza a ganar',

  onb_back: 'Atrás',
  onb_skip: 'Omitir',
  onb_next: 'Siguiente',
  onb_switch_track: 'Cambiar de recorrido',

  onb_pub_s1_title: '¿Necesitas ayuda? ¡Solo publícala!',
  onb_pub_s1_body: 'Describe qué hay que hacer, dónde y cuándo. Publicar es gratis.',
  onb_pub_s2_title: '¿Cansado de precios exagerados?',
  onb_pub_s2_body: 'Tú pones el precio y la IA te ayuda a elegir uno justo según la descripción de la tarea. La gente ve tu tarea y quien está interesado se postula.',
  onb_pub_s3_title: '¡Publica ahora y recibe candidatos en minutos!',
  onb_pub_s3_body: 'Miles de personas están listas para las tareas. Quien esté interesado se postula y tú eliges quién viene.',

  onb_wrk_s1_title: '¿Tienes habilidades? ¡Conviértelas en ingresos!',
  onb_wrk_s1_body: 'Elige lo que sabes hacer y las zonas donde quieres trabajar.',
  onb_wrk_s2_title: '¡Las tareas también llegan a ti!',
  onb_wrk_s2_body: 'Recibe avisos de tareas que encajan o encuéntralas tú mismo en el feed.',
  onb_wrk_s3_title: '¿Encontraste una tarea? ¡Postúlate!',
  onb_wrk_s3_body: 'El anunciante elige quién la hace. ¿Te eligieron? Ve, hazla y gana.',

  onb_cta_publish: 'Publica una tarea gratis',
  onb_cta_worker: 'Empecemos a ganar',
  onb_joined_count: 'ya se unieron a {name}',

  onb_demo_title: 'Instalar una lámpara de techo en el salón',
  onb_demo_desc: 'Hay que instalar una lámpara nueva en el techo del salón. Hay escalera y herramientas en casa.',
  onb_demo_category: 'Electricidad',
  onb_demo_location: 'Calle Florentin, Tel Aviv',
  onb_demo_city: 'Tel Aviv',
  onb_demo_time: 'Mañana, 10:00',
  onb_demo_client: 'Dana K.',

  onb_v_publish: 'Publicar una tarea',
  onb_v_describe: '📝 Describe la tarea *',
  onb_v_location: 'Ubicación *',
  onb_v_price: 'Definir el precio',
  onb_v_you_set_price: 'Tú pones el precio',
  onb_v_price_model: 'Los trabajadores ven exactamente el precio que escribiste, y solo se postula a quien le encaja. Así consigues solicitudes reales, sin regateos y sin sorpresas.',
  onb_v_price_field: 'Precio (₪) *',
  onb_v_new: 'Nuevo en Joba24',
  onb_v_ai_recommends: 'La IA recomienda el precio adecuado',
  onb_v_ai_basis: 'Según la descripción de la tarea y los precios del mercado',
  onb_v_use_rec: 'Usar la recomendación',

  onb_v_applicants: 'Las solicitudes que recibiste',
  onb_v_applicants_n: 'Candidatos ({n})',
  onb_v_recommended: 'Recomendado',
  onb_v_available_now: 'Disponible ahora',
  onb_v_verified: 'Verificado',
  onb_v_tasks_n: '{n} tareas',
  onb_v_decline: 'Rechazar',
  onb_v_approve: 'Aprobar trabajador',

  onb_a1_name: 'Daniel Cohen',
  onb_a1_msg: 'Soy electricista certificado, puedo venir mañana por la mañana.',
  onb_a2_name: 'Yossi Levi',
  onb_a2_msg: 'Listo para venir de inmediato',
  onb_a3_name: 'Michal Avraham',
  onb_a3_msg: 'Tengo experiencia instalando lámparas.',
  onb_a4_name: 'Avi Mizrahi',

  onb_v_new_task_alert: 'Nueva tarea en tu zona',

  onb_v_details: 'Detalles de la tarea',
  onb_v_apply_n: 'Postúlate a la tarea — {n}',
  onb_v_apply_note: '💡 Las Jobas vuelven a tu saldo automáticamente si la solicitud no se aprueba o la tarea se cancela',
  onb_v_category: 'Categoría',
  onb_v_exact_time: 'Hora exacta',
  onb_v_description: 'Descripción',

  onb_v_my_profile: 'Mi perfil',
  onb_v_professions: 'Áreas de trabajo',
  onb_v_areas: 'Zonas de trabajo',

  onb_prof_list: ['Fontanero', 'Electricista', 'Manitas', 'Limpiador', 'Carpintero', 'Pintor', 'Mudancero', 'Técnico de A/A', 'Cerrajero', 'Jardinero', 'Conductor', 'Guardia de seguridad'],
  onb_prof_selected: ['Electricista', 'Fontanero', 'Manitas'],
};

const fr = {
  onb_choice_title: "Que voulez-vous faire aujourd'hui ?",
  onb_choice_body: "Sur Joba24, on trouve de l'aide ou on gagne en réalisant des tâches.",
  onb_box_publish_title: "Besoin d'aide ?",
  onb_box_publish_body: "Publiez une tâche gratuitement, recevez des demandes de travailleurs et choisissez qui vous aidera.",
  onb_box_publish_cta: 'Publiez une tâche gratuitement',
  onb_box_worker_title: 'Envie de gagner ?',
  onb_box_worker_body: 'Trouvez des tâches près de chez vous, postulez et commencez à gagner.',
  onb_box_worker_cta: 'Trouvez des tâches et commencez à gagner',

  onb_back: 'Retour',
  onb_skip: 'Passer',
  onb_next: 'Suivant',
  onb_switch_track: 'Changer de parcours',

  onb_pub_s1_title: "Besoin d'aide ? Publiez, c'est tout !",
  onb_pub_s1_body: "Décrivez ce qu'il faut faire, où et quand. La publication est gratuite.",
  onb_pub_s2_title: 'Marre des prix exagérés ?',
  onb_pub_s2_body: "C'est vous qui fixez le prix, et l'IA vous aide à en choisir un juste d'après la description. Les gens voient votre tâche, et les intéressés postulent.",
  onb_pub_s3_title: 'Publiez maintenant, recevez des candidatures en quelques minutes !',
  onb_pub_s3_body: "Des milliers de personnes sont prêtes. Les intéressés postulent, et c'est vous qui choisissez qui viendra.",

  onb_wrk_s1_title: 'Des compétences ? Transformez-les en revenus !',
  onb_wrk_s1_body: 'Choisissez ce que vous savez faire et les zones où vous voulez travailler.',
  onb_wrk_s2_title: 'Les tâches viennent aussi à vous !',
  onb_wrk_s2_body: 'Recevez des alertes pour les tâches qui correspondent, ou trouvez-les vous-même dans le fil.',
  onb_wrk_s3_title: 'Une tâche trouvée ? Postulez !',
  onb_wrk_s3_body: "L'annonceur choisit qui l'exécute. Choisi ? Allez-y et gagnez.",

  onb_cta_publish: 'Publiez une tâche gratuitement',
  onb_cta_worker: 'Commençons à gagner',
  onb_joined_count: 'ont déjà rejoint {name}',

  onb_demo_title: 'Installer une lampe au plafond du salon',
  onb_demo_desc: "Il faut installer un nouveau luminaire au plafond du salon. Il y a une échelle et des outils à la maison.",
  onb_demo_category: 'Électricité',
  onb_demo_location: 'Rue Florentin, Tel-Aviv',
  onb_demo_city: 'Tel-Aviv',
  onb_demo_time: 'Demain, 10h00',
  onb_demo_client: 'Dana K.',

  onb_v_publish: 'Publier une tâche',
  onb_v_describe: '📝 Décrivez la tâche *',
  onb_v_location: 'Lieu *',
  onb_v_price: 'Fixer le prix',
  onb_v_you_set_price: "C'est vous qui fixez le prix",
  onb_v_price_model: "Les travailleurs voient exactement le prix que vous avez écrit, et seuls ceux à qui il convient postulent. Vous recevez ainsi de vraies candidatures, sans marchandage et sans surprise.",
  onb_v_price_field: 'Prix (₪) *',
  onb_v_new: 'Nouveau sur Joba24',
  onb_v_ai_recommends: "L'IA recommande le prix adapté",
  onb_v_ai_basis: "D'après la description de la tâche et les prix du marché",
  onb_v_use_rec: 'Utiliser la recommandation',

  onb_v_applicants: 'Les demandes reçues',
  onb_v_applicants_n: 'Candidats ({n})',
  onb_v_recommended: 'Recommandé',
  onb_v_available_now: 'Disponible maintenant',
  onb_v_verified: 'Vérifié',
  onb_v_tasks_n: '{n} tâches',
  onb_v_decline: 'Refuser',
  onb_v_approve: 'Approuver le travailleur',

  onb_a1_name: 'Daniel Cohen',
  onb_a1_msg: 'Je suis électricien certifié, je peux venir demain matin.',
  onb_a2_name: 'Yossi Levi',
  onb_a2_msg: 'Prêt à venir tout de suite',
  onb_a3_name: 'Michal Avraham',
  onb_a3_msg: "J'ai de l'expérience dans l'installation de luminaires.",
  onb_a4_name: 'Avi Mizrahi',

  onb_v_new_task_alert: 'Nouvelle tâche dans votre secteur',

  onb_v_details: 'Détails de la tâche',
  onb_v_apply_n: 'Postulez à la tâche — {n}',
  onb_v_apply_note: "💡 Les Jobas reviennent automatiquement sur votre solde si la demande n'est pas approuvée ou si la tâche est annulée",
  onb_v_category: 'Catégorie',
  onb_v_exact_time: 'Heure exacte',
  onb_v_description: 'Description',

  onb_v_my_profile: 'Mon profil',
  onb_v_professions: "Domaines d'activité",
  onb_v_areas: 'Zones de travail',

  onb_prof_list: ['Plombier', 'Électricien', 'Bricoleur', "Agent d'entretien", 'Menuisier', 'Peintre', 'Déménageur', 'Technicien clim', 'Serrurier', 'Jardinier', 'Chauffeur', 'Agent de sécurité'],
  onb_prof_selected: ['Électricien', 'Plombier', 'Bricoleur'],
};

const ru = {
  onb_choice_title: 'Что вы хотите сделать сегодня?',
  onb_choice_body: 'В Joba24 находят помощь или зарабатывают, выполняя задачи.',
  onb_box_publish_title: 'Нужна помощь?',
  onb_box_publish_body: 'Опубликуйте задачу бесплатно, получайте отклики исполнителей и выбирайте, кто вам поможет.',
  onb_box_publish_cta: 'Опубликовать задачу бесплатно',
  onb_box_worker_title: 'Хотите заработать?',
  onb_box_worker_body: 'Находите задачи рядом с вами, откликайтесь и начинайте зарабатывать.',
  onb_box_worker_cta: 'Найти задачи и начать зарабатывать',

  onb_back: 'Назад',
  onb_skip: 'Пропустить',
  onb_next: 'Далее',
  onb_switch_track: 'Сменить путь',

  onb_pub_s1_title: 'Нужна помощь? Просто опубликуйте!',
  onb_pub_s1_body: 'Опишите, что нужно сделать, где и когда. Публикация бесплатна.',
  onb_pub_s2_title: 'Надоели завышенные цены?',
  onb_pub_s2_body: 'Цену назначаете вы, а ИИ помогает выбрать подходящую по описанию задачи. Люди видят вашу задачу, и заинтересованные откликаются.',
  onb_pub_s3_title: 'Публикуйте сейчас — отклики придут за минуты!',
  onb_pub_s3_body: 'Тысячи людей готовы к задачам. Заинтересованные откликаются, а вы выбираете, кто придёт.',

  onb_wrk_s1_title: 'Есть навыки? Превратите их в доход!',
  onb_wrk_s1_body: 'Выберите, что вы умеете делать, и районы, где хотите работать.',
  onb_wrk_s2_title: 'Задачи приходят и к вам!',
  onb_wrk_s2_body: 'Получайте уведомления о подходящих задачах или находите их сами в ленте.',
  onb_wrk_s3_title: 'Нашли задачу? Откликнитесь!',
  onb_wrk_s3_body: 'Заказчик выбирает исполнителя. Выбрали вас? Вперёд — выполняйте и зарабатывайте.',

  onb_cta_publish: 'Опубликовать задачу бесплатно',
  onb_cta_worker: 'Начнём зарабатывать',
  onb_joined_count: 'уже присоединились к {name}',

  onb_demo_title: 'Установка светильника в гостиной',
  onb_demo_desc: 'Нужно установить новый светильник на потолке в гостиной. Лестница и инструменты есть дома.',
  onb_demo_category: 'Электрика',
  onb_demo_location: 'ул. Флорентин, Тель-Авив',
  onb_demo_city: 'Тель-Авив',
  onb_demo_time: 'Завтра, 10:00',
  onb_demo_client: 'Дана К.',

  onb_v_publish: 'Опубликовать задачу',
  onb_v_describe: '📝 Опишите задачу *',
  onb_v_location: 'Место *',
  onb_v_price: 'Назначение цены',
  onb_v_you_set_price: 'Цену назначаете вы',
  onb_v_price_model: 'Исполнители видят ровно ту цену, которую вы указали, и откликаются только те, кому она подходит. Так приходят настоящие отклики — без торга и без сюрпризов.',
  onb_v_price_field: 'Цена (₪) *',
  onb_v_new: 'Новое в Joba24',
  onb_v_ai_recommends: 'ИИ рекомендует подходящую цену',
  onb_v_ai_basis: 'По описанию задачи и рыночным ценам',
  onb_v_use_rec: 'Использовать рекомендацию',

  onb_v_applicants: 'Полученные заявки',
  onb_v_applicants_n: 'Кандидаты ({n})',
  onb_v_recommended: 'Рекомендуем',
  onb_v_available_now: 'Доступен сейчас',
  onb_v_verified: 'Проверен',
  onb_v_tasks_n: '{n} задач',
  onb_v_decline: 'Отклонить',
  onb_v_approve: 'Утвердить исполнителя',

  onb_a1_name: 'Даниэль Коэн',
  onb_a1_msg: 'Я сертифицированный электрик, могу прийти завтра утром.',
  onb_a2_name: 'Йоси Леви',
  onb_a2_msg: 'Готов приехать немедленно',
  onb_a3_name: 'Михаль Авраам',
  onb_a3_msg: 'У меня есть опыт установки светильников.',
  onb_a4_name: 'Ави Мизрахи',

  onb_v_new_task_alert: 'Новая задача в вашем районе',

  onb_v_details: 'Детали задачи',
  onb_v_apply_n: 'Откликнуться на задачу — {n}',
  onb_v_apply_note: '💡 Джобы возвращаются на баланс автоматически, если заявку не одобрят или задачу отменят',
  onb_v_category: 'Категория',
  onb_v_exact_time: 'Точное время',
  onb_v_description: 'Описание',

  onb_v_my_profile: 'Мой профиль',
  onb_v_professions: 'Сферы деятельности',
  onb_v_areas: 'Районы работы',

  onb_prof_list: ['Сантехник', 'Электрик', 'Мастер на час', 'Уборщик', 'Столяр', 'Маляр', 'Грузчик', 'Мастер по кондиционерам', 'Слесарь', 'Садовник', 'Водитель', 'Охранник'],
  onb_prof_selected: ['Электрик', 'Сантехник', 'Мастер на час'],
};

const fil = {
  onb_choice_title: 'Ano ang gusto mong gawin ngayon?',
  onb_choice_body: 'Sa Joba24, makakahanap ka ng tulong o kikita sa paggawa ng mga gawain.',
  onb_box_publish_title: 'Kailangan ng tulong?',
  onb_box_publish_body: 'Mag-post ng gawain nang libre, tumanggap ng alok mula sa mga manggagawa at piliin kung sino ang tutulong sa iyo.',
  onb_box_publish_cta: 'Mag-post ng gawain nang libre',
  onb_box_worker_title: 'Gusto mong kumita?',
  onb_box_worker_body: 'Maghanap ng mga gawain sa lugar mo, mag-apply at magsimulang kumita.',
  onb_box_worker_cta: 'Maghanap ng gawain at magsimulang kumita',

  onb_back: 'Bumalik',
  onb_skip: 'Laktawan',
  onb_next: 'Susunod',
  onb_switch_track: 'Palitan ang landas',

  onb_pub_s1_title: 'Kailangan ng tulong? I-post lang!',
  onb_pub_s1_body: 'Ilarawan ang kailangang gawin, saan at kailan. Libre ang pag-post.',
  onb_pub_s2_title: 'Sawa na sa sobrang mahal na presyo?',
  onb_pub_s2_body: 'Ikaw ang nagtatakda ng presyo, at tinutulungan ka ng AI na pumili ng angkop na presyo mula sa paglalarawan ng gawain. Nakikita ng mga tao ang gawain mo, at ang interesado ay nag-aaplay.',
  onb_pub_s3_title: 'I-post ngayon, makakuha ng aplikante sa ilang minuto!',
  onb_pub_s3_body: 'Libu-libong tao ang handa sa mga gawain. Ang interesado ay nag-aaplay, at ikaw ang pumipili kung sino ang darating.',

  onb_wrk_s1_title: 'May kasanayan ka? Gawin itong kita!',
  onb_wrk_s1_body: 'Piliin ang alam mong gawin at ang mga lugar na gusto mong pagtrabahuhan.',
  onb_wrk_s2_title: 'Dumarating din sa iyo ang mga gawain!',
  onb_wrk_s2_body: 'Tumanggap ng abiso sa mga angkop na gawain o hanapin ang mga ito sa feed.',
  onb_wrk_s3_title: 'Nakahanap ng gawain? Mag-apply!',
  onb_wrk_s3_body: 'Ang nag-post ang pipili kung sino ang gagawa. Napili ka? Pumunta at kumita.',

  onb_cta_publish: 'Mag-post ng gawain nang libre',
  onb_cta_worker: 'Simulan nating kumita',
  onb_joined_count: 'sumali na sa {name}',

  onb_demo_title: 'Pag-install ng ilaw sa kisame ng sala',
  onb_demo_desc: 'Kailangang mag-install ng bagong ilaw sa kisame ng sala. May hagdan at kagamitan sa bahay.',
  onb_demo_category: 'Elektrisidad',
  onb_demo_location: 'Florentin St, Tel Aviv',
  onb_demo_city: 'Tel Aviv',
  onb_demo_time: 'Bukas, 10:00',
  onb_demo_client: 'Dana K.',

  onb_v_publish: 'Mag-post ng gawain',
  onb_v_describe: '📝 Ilarawan ang gawain *',
  onb_v_location: 'Lokasyon *',
  onb_v_price: 'Pagtatakda ng presyo',
  onb_v_you_set_price: 'Ikaw ang nagtatakda ng presyo',
  onb_v_price_model: 'Nakikita ng mga manggagawa ang eksaktong presyong isinulat mo, at ang mga angkop lang dito ang nag-aaplay. Ganoon makakakuha ka ng tunay na aplikante — walang tawaran at walang sorpresa.',
  onb_v_price_field: 'Presyo (₪) *',
  onb_v_new: 'Bago sa Joba24',
  onb_v_ai_recommends: 'Inirerekomenda ng AI ang angkop na presyo',
  onb_v_ai_basis: 'Batay sa paglalarawan ng gawain at presyo sa merkado',
  onb_v_use_rec: 'Gamitin ang rekomendasyon',

  onb_v_applicants: 'Ang mga natanggap na kahilingan',
  onb_v_applicants_n: 'Mga aplikante ({n})',
  onb_v_recommended: 'Inirerekomenda',
  onb_v_available_now: 'Available ngayon',
  onb_v_verified: 'Beripikado',
  onb_v_tasks_n: '{n} gawain',
  onb_v_decline: 'Tanggihan',
  onb_v_approve: 'Aprubahan ang manggagawa',

  onb_a1_name: 'Daniel Cohen',
  onb_a1_msg: 'Sertipikado akong elektrisyan, makakapunta ako bukas ng umaga.',
  onb_a2_name: 'Yossi Levi',
  onb_a2_msg: 'Handa akong pumunta agad',
  onb_a3_name: 'Michal Avraham',
  onb_a3_msg: 'May karanasan ako sa pag-install ng ilaw.',
  onb_a4_name: 'Avi Mizrahi',

  onb_v_new_task_alert: 'Bagong gawain sa lugar mo',

  onb_v_details: 'Detalye ng gawain',
  onb_v_apply_n: 'Mag-apply sa gawain — {n}',
  onb_v_apply_note: '💡 Awtomatikong bumabalik ang mga Joba sa balanse mo kung hindi maaprubahan ang kahilingan o makansela ang gawain',
  onb_v_category: 'Kategorya',
  onb_v_exact_time: 'Eksaktong oras',
  onb_v_description: 'Paglalarawan',

  onb_v_my_profile: 'Aking profile',
  onb_v_professions: 'Mga larangan',
  onb_v_areas: 'Mga lugar ng trabaho',

  onb_prof_list: ['Tubero', 'Elektrisyan', 'Handyman', 'Tagalinis', 'Karpintero', 'Pintor', 'Tagalipat', 'Teknik sa aircon', 'Locksmith', 'Hardinero', 'Driver', 'Guwardiya'],
  onb_prof_selected: ['Elektrisyan', 'Tubero', 'Handyman'],
};

const hi = {
  onb_choice_title: 'आज आप क्या करना चाहेंगे?',
  onb_choice_body: 'Joba24 पर आप मदद पाते हैं या काम करके कमाते हैं।',
  onb_box_publish_title: 'मदद चाहिए?',
  onb_box_publish_body: 'मुफ़्त में काम पोस्ट करें, कामगारों से अनुरोध पाएं और चुनें कि कौन आपकी मदद करेगा।',
  onb_box_publish_cta: 'मुफ़्त में काम पोस्ट करें',
  onb_box_worker_title: 'कमाना चाहते हैं?',
  onb_box_worker_body: 'अपने इलाके में काम खोजें, आवेदन करें और कमाना शुरू करें।',
  onb_box_worker_cta: 'काम खोजें और कमाना शुरू करें',

  onb_back: 'वापस',
  onb_skip: 'छोड़ें',
  onb_next: 'आगे',
  onb_switch_track: 'मार्ग बदलें',

  onb_pub_s1_title: 'मदद चाहिए? बस पोस्ट करें!',
  onb_pub_s1_body: 'बताएं क्या करना है, कहाँ और कब। पोस्ट करना मुफ़्त है।',
  onb_pub_s2_title: 'बढ़ी हुई कीमतों से थक गए?',
  onb_pub_s2_body: 'कीमत आप तय करते हैं, और AI काम के विवरण के अनुसार उचित कीमत चुनने में मदद करता है। लोग आपका काम देखते हैं, और जिसे दिलचस्पी होती है वह आवेदन करता है।',
  onb_pub_s3_title: 'अभी पोस्ट करें, मिनटों में आवेदन पाएं!',
  onb_pub_s3_body: 'हज़ारों लोग काम के लिए तैयार हैं। जिसे दिलचस्पी होती है वह आवेदन करता है, और आप चुनते हैं कि कौन आएगा।',

  onb_wrk_s1_title: 'कौशल है? उसे आमदनी बनाएं!',
  onb_wrk_s1_body: 'चुनें कि आप क्या कर सकते हैं और किन इलाकों में काम करना चाहते हैं।',
  onb_wrk_s2_title: 'काम आपके पास भी आते हैं!',
  onb_wrk_s2_body: 'मेल खाते कामों के अलर्ट पाएं या उन्हें फ़ीड में खुद खोजें।',
  onb_wrk_s3_title: 'काम मिला? आवेदन करें!',
  onb_wrk_s3_body: 'पोस्ट करने वाला चुनता है कि कौन करेगा। चुने गए? जाएं, करें और कमाएं।',

  onb_cta_publish: 'मुफ़्त में काम पोस्ट करें',
  onb_cta_worker: 'चलिए कमाना शुरू करें',
  onb_joined_count: 'पहले से {name} से जुड़े',

  onb_demo_title: 'लिविंग रूम में छत की लाइट लगाना',
  onb_demo_desc: 'लिविंग रूम की छत पर नई लाइट लगानी है। घर पर सीढ़ी और औज़ार हैं।',
  onb_demo_category: 'बिजली',
  onb_demo_location: 'फ्लोरेंटिन स्ट्रीट, तेल अवीव',
  onb_demo_city: 'तेल अवीव',
  onb_demo_time: 'कल, 10:00',
  onb_demo_client: 'डाना के.',

  onb_v_publish: 'काम पोस्ट करें',
  onb_v_describe: '📝 काम का विवरण दें *',
  onb_v_location: 'स्थान *',
  onb_v_price: 'कीमत तय करना',
  onb_v_you_set_price: 'कीमत आप तय करते हैं',
  onb_v_price_model: 'कामगार ठीक वही कीमत देखते हैं जो आपने लिखी, और सिर्फ़ जिसे वह ठीक लगती है वही आवेदन करता है। इस तरह असली आवेदन मिलते हैं — बिना मोलभाव और बिना आश्चर्य।',
  onb_v_price_field: 'कीमत (₪) *',
  onb_v_new: 'Joba24 में नया',
  onb_v_ai_recommends: 'AI उचित कीमत का सुझाव देता है',
  onb_v_ai_basis: 'काम के विवरण और बाज़ार की कीमतों के अनुसार',
  onb_v_use_rec: 'सुझाव इस्तेमाल करें',

  onb_v_applicants: 'आपको मिले अनुरोध',
  onb_v_applicants_n: 'आवेदक ({n})',
  onb_v_recommended: 'सुझाया गया',
  onb_v_available_now: 'अभी उपलब्ध',
  onb_v_verified: 'सत्यापित',
  onb_v_tasks_n: '{n} काम',
  onb_v_decline: 'अस्वीकार',
  onb_v_approve: 'कामगार स्वीकृत करें',

  onb_a1_name: 'डेनियल कोहेन',
  onb_a1_msg: 'मैं प्रमाणित इलेक्ट्रीशियन हूँ, कल सुबह आ सकता हूँ।',
  onb_a2_name: 'योसी लेवी',
  onb_a2_msg: 'तुरंत आने के लिए तैयार',
  onb_a3_name: 'मिखल अवराहम',
  onb_a3_msg: 'मुझे लाइट लगाने का अनुभव है।',
  onb_a4_name: 'अवी मिज़राही',

  onb_v_new_task_alert: 'आपके इलाके में नया काम',

  onb_v_details: 'काम का विवरण',
  onb_v_apply_n: 'काम के लिए आवेदन करें — {n}',
  onb_v_apply_note: '💡 अगर अनुरोध स्वीकृत न हो या काम रद्द हो जाए, तो जोबा अपने आप आपके बैलेंस में वापस आ जाते हैं',
  onb_v_category: 'श्रेणी',
  onb_v_exact_time: 'सटीक समय',
  onb_v_description: 'विवरण',

  onb_v_my_profile: 'मेरी प्रोफ़ाइल',
  onb_v_professions: 'कार्य क्षेत्र',
  onb_v_areas: 'कार्य इलाके',

  onb_prof_list: ['प्लंबर', 'इलेक्ट्रीशियन', 'हैंडीमैन', 'सफ़ाईकर्मी', 'बढ़ई', 'पेंटर', 'शिफ्टिंग', 'AC तकनीशियन', 'ताला बनाने वाला', 'माली', 'ड्राइवर', 'सुरक्षा गार्ड'],
  onb_prof_selected: ['इलेक्ट्रीशियन', 'प्लंबर', 'हैंडीमैन'],
};

const zh = {
  onb_choice_title: '今天你想做什么？',
  onb_choice_body: '在 Joba24，你可以找到帮手，也可以接任务赚钱。',
  onb_box_publish_title: '需要帮忙？',
  onb_box_publish_body: '免费发布任务，收到工人的申请，自己选择由谁来帮你。',
  onb_box_publish_cta: '免费发布任务',
  onb_box_worker_title: '想赚钱？',
  onb_box_worker_body: '在你附近找任务，申请后开始赚钱。',
  onb_box_worker_cta: '找任务并开始赚钱',

  onb_back: '返回',
  onb_skip: '跳过',
  onb_next: '下一步',
  onb_switch_track: '切换路径',

  onb_pub_s1_title: '需要帮忙？直接发布！',
  onb_pub_s1_body: '说明要做什么、在哪里、什么时候。发布免费。',
  onb_pub_s2_title: '受够了漫天要价？',
  onb_pub_s2_body: '价格由你定，AI 会根据任务描述帮你选一个合适的价。大家看到你的任务，有兴趣的人就会申请。',
  onb_pub_s3_title: '现在发布，几分钟内收到申请！',
  onb_pub_s3_body: '成千上万的人随时可以接单。有兴趣的人会申请，由你来选谁来。',

  onb_wrk_s1_title: '有技能？把它变成收入！',
  onb_wrk_s1_body: '选择你会做什么，以及想在哪些区域工作。',
  onb_wrk_s2_title: '任务也会主动找上你！',
  onb_wrk_s2_body: '收到匹配任务的提醒，或者自己在信息流里找。',
  onb_wrk_s3_title: '找到任务了？提交申请！',
  onb_wrk_s3_body: '发布者决定由谁来做。被选中了？去完成并赚钱。',

  onb_cta_publish: '免费发布任务',
  onb_cta_worker: '开始赚钱吧',
  onb_joined_count: '已加入 {name}',

  onb_demo_title: '在客厅安装吸顶灯',
  onb_demo_desc: '需要在客厅天花板上安装一盏新灯。家里有梯子和工具。',
  onb_demo_category: '电工',
  onb_demo_location: '弗洛伦廷街，特拉维夫',
  onb_demo_city: '特拉维夫',
  onb_demo_time: '明天，10:00',
  onb_demo_client: 'Dana K.',

  onb_v_publish: '发布任务',
  onb_v_describe: '📝 描述任务 *',
  onb_v_location: '位置 *',
  onb_v_price: '设定价格',
  onb_v_you_set_price: '价格由你定',
  onb_v_price_model: '工人看到的就是你写的价格，只有觉得合适的人才会申请。这样收到的都是真实申请——不砍价，也没有意外。',
  onb_v_price_field: '价格（₪）*',
  onb_v_new: 'Joba24 新功能',
  onb_v_ai_recommends: 'AI 推荐合适的价格',
  onb_v_ai_basis: '根据任务描述和市场行情',
  onb_v_use_rec: '使用推荐',

  onb_v_applicants: '你收到的申请',
  onb_v_applicants_n: '申请人（{n}）',
  onb_v_recommended: '推荐',
  onb_v_available_now: '现在可接单',
  onb_v_verified: '已认证',
  onb_v_tasks_n: '{n} 个任务',
  onb_v_decline: '拒绝',
  onb_v_approve: '通过该工人',

  onb_a1_name: 'Daniel Cohen',
  onb_a1_msg: '我是持证电工，明天早上可以来。',
  onb_a2_name: 'Yossi Levi',
  onb_a2_msg: '可以马上过来',
  onb_a3_name: 'Michal Avraham',
  onb_a3_msg: '我有安装灯具的经验。',
  onb_a4_name: 'Avi Mizrahi',

  onb_v_new_task_alert: '你附近有新任务',

  onb_v_details: '任务详情',
  onb_v_apply_n: '申请该任务 — {n}',
  onb_v_apply_note: '💡 如果申请未被通过或任务被取消，Joba 会自动退回你的余额',
  onb_v_category: '类别',
  onb_v_exact_time: '具体时间',
  onb_v_description: '描述',

  onb_v_my_profile: '我的资料',
  onb_v_professions: '专业领域',
  onb_v_areas: '工作区域',

  onb_prof_list: ['水管工', '电工', '杂活师傅', '保洁', '木工', '油漆工', '搬家', '空调技师', '开锁', '园丁', '司机', '保安'],
  onb_prof_selected: ['电工', '水管工', '杂活师傅'],
};

export const onboardingI18n = { he, en, ar, es, fr, ru, fil, hi, zh };