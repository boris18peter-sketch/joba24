export const PROFESSIONS = [
  'אינסטלטור',
  'חשמלאי',
  'איש תיקונים / הנדימן',
  'מנקה',
  'נגר',
  'צבע',
  'הובלן',
  'טכנאי מזגנים',
  'מנעולן',
  'גנן',
  'נהג',
  'מאבטח',
  'טבח',
  'מורה פרטי',
  'מאמן כושר',
  'צלם',
  'דייסת',
  'מטפל',
  'מעצב גרפי',
  'מפתח תוכנה',
  'אחר',
];

const PROFESSION_KEYS = {
  'אינסטלטור': 'prof_plumber',
  'חשמלאי': 'prof_electrician',
  'איש תיקונים / הנדימן': 'prof_handyman',
  'מנקה': 'prof_cleaner',
  'נגר': 'prof_carpenter',
  'צבע': 'prof_painter',
  'הובלן': 'prof_mover',
  'טכנאי מזגנים': 'prof_ac_tech',
  'מנעולן': 'prof_locksmith',
  'גנן': 'prof_gardener',
  'נהג': 'prof_driver',
  'מאבטח': 'prof_security',
  'טבח': 'prof_cook',
  'מורה פרטי': 'prof_tutor',
  'מאמן כושר': 'prof_fitness',
  'צלם': 'prof_photographer',
  'דייסת': 'prof_nanny',
  'מטפל': 'prof_caregiver',
  'מעצב גרפי': 'prof_designer',
  'מפתח תוכנה': 'prof_developer',
  'אחר': 'prof_other',
};

export const getProfessionLabel = (profession, t) => {
  if (!profession) return '';
  const key = PROFESSION_KEYS[profession];
  if (key && t) {
    const translated = t(key);
    if (translated && translated !== key) return translated;
  }
  return profession;
};