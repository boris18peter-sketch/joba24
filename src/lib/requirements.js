// Shared requirement configurations per category — used by both CreateTask form and TaskChatInterface.

export const CATEGORY_REQUIREMENTS = {
  moving: [
    { label: 'כלי רכב', items: [
      { key: 'vehicle', label: 'רכב פרטי' },
      { key: 'vehicle_commercial', label: 'רכב מסחרי / ואן' },
      { key: 'truck', label: 'טנדר / משאית' },
    ]},
    { label: 'כמות אנשים', items: [
      { key: 'two_people', label: '2 אנשים' },
      { key: 'three_people', label: '3 אנשים' },
      { key: 'four_plus_people', label: '4+ אנשים' },
    ]},
    { label: 'כישורים', items: [
      { key: 'heavy_lifting', label: 'יכולת נשיאת משאות כבדים' },
      { key: 'driver', label: 'נהג מקצועי' },
    ]},
  ],
  delivery: [
    { label: 'כלי רכב', items: [
      { key: 'vehicle', label: 'רכב פרטי' },
      { key: 'vehicle_commercial', label: 'רכב מסחרי / ואן' },
      { key: 'motorcycle', label: 'קטנוע / אופנוע' },
    ]},
    { label: 'כישורים', items: [
      { key: 'driver', label: 'נהג מקצועי' },
      { key: 'experience', label: 'ניסיון במשלוחים' },
    ]},
  ],
  cleaning: [
    { label: 'ניסיון', items: [
      { key: 'cleaner_pro', label: 'מנקה מקצועי' },
      { key: 'experience', label: 'ניסיון בניקיון' },
      { key: 'certified', label: 'הסמכה' },
    ]},
    { label: 'כמות אנשים', items: [
      { key: 'two_people', label: '2 אנשים' },
      { key: 'three_people', label: '3 אנשים' },
    ]},
  ],
  plumbing: [
    { label: 'הסמכה', items: [
      { key: 'plumber', label: 'אינסטלטור מוסמך' },
      { key: 'certified', label: 'רישיון מקצועי' },
    ]},
    { label: 'כלי עבודה', items: [
      { key: 'tools_basic', label: 'ארגז כלים בסיסי' },
      { key: 'drill', label: 'מקדחה / אינבורר' },
    ]},
  ],
  electricity: [
    { label: 'הסמכה', items: [
      { key: 'electrician', label: 'חשמלאי מוסמך' },
      { key: 'certified', label: 'רישיון מקצועי' },
    ]},
    { label: 'כלי עבודה', items: [
      { key: 'tools_basic', label: 'ארגז כלים בסיסי' },
      { key: 'ladder', label: 'סולם' },
    ]},
  ],
  carpentry: [
    { label: 'הסמכה', items: [
      { key: 'carpenter', label: 'נגר מוסמך' },
      { key: 'certified', label: 'רישיון מקצועי' },
    ]},
    { label: 'כלי עבודה', items: [
      { key: 'tools_basic', label: 'ארגז כלים בסיסי' },
      { key: 'drill', label: 'מקדחה / אינבורר' },
      { key: 'grinder', label: 'מטחנה / גרינדר' },
    ]},
  ],
  painting: [
    { label: 'הסמכה', items: [
      { key: 'painter_pro', label: 'צבעי מוסמך' },
      { key: 'experience', label: 'ניסיון בצביעה' },
    ]},
    { label: 'כלי עבודה', items: [
      { key: 'ladder', label: 'סולם' },
      { key: 'tools_basic', label: 'ציוד צביעה' },
    ]},
  ],
  gardening: [
    { label: 'ניסיון', items: [
      { key: 'experience', label: 'ניסיון בגינון' },
      { key: 'certified', label: 'הסמכה' },
    ]},
    { label: 'כלי רכב', items: [
      { key: 'vehicle', label: 'רכב לפינוי פסולת' },
    ]},
    { label: 'כמות אנשים', items: [
      { key: 'two_people', label: '2 אנשים' },
    ]},
  ],
  ac: [
    { label: 'הסמכה', items: [
      { key: 'certified', label: 'רישיון טכנאי מזגנים' },
      { key: 'electrician', label: 'חשמלאי מוסמך' },
      { key: 'experience', label: 'ניסיון במזגנים' },
    ]},
    { label: 'כלי עבודה', items: [
      { key: 'tools_basic', label: 'ציוד טכנאי' },
      { key: 'ladder', label: 'סולם' },
      { key: 'drill', label: 'מקדחה' },
    ]},
  ],
  locksmith: [
    { label: 'הסמכה', items: [
      { key: 'certified', label: 'רישיון מנעולן' },
      { key: 'experience', label: 'ניסיון' },
    ]},
    { label: 'כלי עבודה', items: [
      { key: 'tools_basic', label: 'ארגז כלים' },
    ]},
  ],
  shopping: [
    { label: 'כלי רכב', items: [
      { key: 'vehicle', label: 'רכב לקניות' },
    ]},
    { label: 'כישורים', items: [
      { key: 'heavy_lifting', label: 'יכולת נשיאת משאות' },
      { key: 'english', label: 'אנגלית' },
    ]},
  ],
  babysitting: [
    { label: 'ניסיון', items: [
      { key: 'experience', label: 'ניסיון עם ילדים' },
      { key: 'experience_animals', label: 'ניסיון עם בעלי חיים' },
      { key: 'certified', label: 'הסמכה / תעודה' },
    ]},
    { label: 'כישורים', items: [
      { key: 'english', label: 'אנגלית' },
    ]},
  ],
  tutoring: [
    { label: 'ניסיון', items: [
      { key: 'experience', label: 'ניסיון בהוראה' },
      { key: 'certified', label: 'תעודת הוראה' },
    ]},
    { label: 'כישורים', items: [
      { key: 'english', label: 'אנגלית' },
    ]},
  ],
  it_support: [
    { label: 'ניסיון', items: [
      { key: 'experience', label: 'ניסיון בתמיכה' },
      { key: 'certified', label: 'הסמכה מקצועית' },
    ]},
    { label: 'כלי רכב', items: [
      { key: 'vehicle', label: 'רכב לביקורי בית' },
    ]},
  ],
};

export const DEFAULT_REQUIREMENT_CATEGORIES = [
  { label: 'כלי רכב', items: [
    { key: 'vehicle', label: 'רכב פרטי' },
    { key: 'vehicle_commercial', label: 'רכב מסחרי / ואן' },
    { key: 'motorcycle', label: 'קטנוע / אופנוע' },
  ]},
  { label: 'כלי עבודה', items: [
    { key: 'tools_basic', label: 'ארגז כלים בסיסי' },
    { key: 'drill', label: 'מקדחה / אינבורר' },
    { key: 'ladder', label: 'סולם' },
  ]},
  { label: 'ניסיון מקצועי', items: [
    { key: 'experience', label: 'ניסיון בתחום' },
    { key: 'certified', label: 'הסמכה / רישיון' },
    { key: 'heavy_lifting', label: 'יכולת נשיאת משאות כבדים' },
  ]},
  { label: 'כמות אנשים', items: [
    { key: 'two_people', label: '2 אנשים' },
    { key: 'three_people', label: '3 אנשים' },
    { key: 'four_plus_people', label: '4+ אנשים' },
  ]},
];

export const getRequirementCategories = (category) =>
  CATEGORY_REQUIREMENTS[category] || DEFAULT_REQUIREMENT_CATEGORIES;