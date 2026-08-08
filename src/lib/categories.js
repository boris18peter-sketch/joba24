export const CATEGORIES = [
  { value: 'plumbing',      label: '🔧 אינסטלציה' },
  { value: 'electricity',   label: '⚡ חשמלאות' },
  { value: 'handyman',      label: '🔨 הנדימן / תיקונים' },
  { value: 'cleaning',      label: '🧹 ניקיון' },
  { value: 'moving',        label: '🚛 הובלה' },
  { value: 'heavy_lifting', label: '💪 עזרה פיזית' },
  { value: 'painting',      label: '🎨 צביעה' },
  { value: 'carpentry',     label: '🪵 נגרות' },
  { value: 'ac',            label: '❄️ מזגנים' },
  { value: 'locksmith',     label: '🔐 מנעולן' },
  { value: 'gardening',     label: '🌿 גינון' },
  { value: 'home_maintenance', label: '🏠 תחזוקת בית' },
  { value: 'car',           label: '🚗 רכב' },
  { value: 'transportation', label: '🚙 הסעות וטרמפים' },
  { value: 'delivery',      label: '📦 משלוח' },
  { value: 'shopping',      label: '🛒 קניות' },
  { value: 'pets',          label: '🐶 בעלי חיים' },
  { value: 'babysitting',   label: '👶 בייביסיטר' },
  { value: 'elderly_care',  label: '👵 סיוע לקשישים' },
  { value: 'tutoring',      label: '📚 שיעורים פרטיים' },
  { value: 'fitness',       label: '🏋️ כושר וספורט' },
  { value: 'photography',   label: '📸 צילום ותוכן' },
  { value: 'events',        label: '🎉 אירועים' },
  { value: 'personal_help', label: '🤝 עזרה אישית' },
  { value: 'it_support',    label: '💻 מחשבים' },
  { value: 'other',         label: '📋 אחר' },
];

export const getCategoryLabel = (value, t) => {
  if (t) {
    const key = `cat_${value}`;
    const translated = t(key);
    if (translated && translated !== key) return translated;
  }
  return CATEGORIES.find(c => c.value === value)?.label || '📋 אחר';
};

export const getCategoryPluralLabel = (value, t) => {
  if (t) {
    const key = `catp_${value}`;
    const translated = t(key);
    if (translated && translated !== key) return translated;
  }
  return CATEGORIES.find(c => c.value === value)?.label || 'עובדים';
};

// Categories that use hourly pricing (rate × hours = total)
// getCategoryPluralLabel — pluralized category label with i18n support
export const HOURLY_CATEGORIES = ['babysitting', 'elderly_care', 'pets', 'tutoring', 'fitness'];
export const isHourlyCategory = (category) => HOURLY_CATEGORIES.includes(category);