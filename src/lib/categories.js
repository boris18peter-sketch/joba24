export const CATEGORIES = [
  { value: 'plumbing',    label: '🔧 אינסטלציה' },
  { value: 'electricity', label: '⚡ חשמלאות' },
  { value: 'gardening',   label: '🌿 גינון' },
  { value: 'cleaning',    label: '🧹 ניקיון' },
  { value: 'moving',      label: '🚛 הובלה' },
  { value: 'painting',    label: '🎨 צביעה' },
  { value: 'carpentry',   label: '🪵 נגרות' },
  { value: 'ac',          label: '❄️ מזגנים' },
  { value: 'locksmith',   label: '🔐 מנעולן' },
  { value: 'shopping',    label: '🛒 קניות' },
  { value: 'delivery',    label: '📦 משלוח' },
  { value: 'babysitting', label: '👶 בייביסיטר' },
  { value: 'tutoring',    label: '📚 שיעורים פרטיים' },
  { value: 'it_support',  label: '💻 מחשבים' },
  { value: 'other',       label: '📋 אחר' },
];

export const getCategoryLabel = (value) =>
  CATEGORIES.find(c => c.value === value)?.label || '📋 אחר';