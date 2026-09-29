/**
 * JOBA24 — STORE ASSET SPECS
 *
 * Canvas sizes verified against the current store requirements:
 *   • App Store Connect, iPhone 6.9" display class (required class):
 *       1320 × 2868 px  (also accepts 1290 × 2796 / 1260 × 2736)
 *   • App Store Connect, iPad 13" display:
 *       2064 × 2752 px
 *   • Google Play, phone screenshots: 320–3840 px per side, long side ≤ 2× short side,
 *       portrait 9:16, recommended 1080 × 1920 px.
 *
 * The iPad set IS required for Joba24 because the iOS target ships with
 * TARGETED_DEVICE_FAMILY = "1,2" (iPhone + iPad).
 *
 * `device` describes the logical (CSS px) viewport the real app UI is laid out at.
 * The frame is scaled up to the canvas, so the app renders at its native layout
 * width and stays crisp — never a stretched bitmap.
 */

export const APP_ICON =
  'https://media.base44.com/images/public/69e6bdb4986a04a256653a23/d5824a161_IMG_0357.jpg';

export const CANVASES = {
  iphone: {
    key: 'iphone',
    label: 'iPhone 6.9"',
    folder: 'iOS/iPhone',
    platform: 'ios',
    w: 1320,
    h: 2868,
    statusH: 54,
    device: { w: 393, h: 852, radius: 54, bezel: 30, outerRadius: 84 },
  },
  ipad: {
    key: 'ipad',
    label: 'iPad 13"',
    folder: 'iOS/iPad',
    platform: 'ios',
    w: 2064,
    h: 2752,
    statusH: 30,
    device: { w: 1032, h: 1376, radius: 34, bezel: 34, outerRadius: 70 },
  },
  android: {
    key: 'android',
    label: 'Android Phone',
    folder: 'Android/Phone',
    platform: 'android',
    w: 1080,
    h: 1920,
    statusH: 34,
    device: { w: 412, h: 915, radius: 42, bezel: 22, outerRadius: 64 },
  },
};

export const CANVAS_ORDER = ['iphone', 'android', 'ipad'];

/**
 * The 8-frame story. Order is the upload order.
 * `accent` is the single phrase inside the headline rendered in the brand accent
 * colour — the whole headline stays one real, editable text layer.
 */
export const SCREENS = [
  {
    id: 'need_help',
    file: '01_need_help.png',
    headline: 'צריכים עזרה?',
    accent: 'עזרה?',
    sub: 'פרסמו משימה — ואנשים מתאימים באזור שלכם יגישו בקשה.',
    theme: 'light',
  },
  {
    id: 'find_tasks',
    file: '02_find_tasks.png',
    headline: 'רוצים להרוויח?',
    accent: 'להרוויח?',
    sub: 'מצאו משימות באזור שלכם והגישו בקשה בלחיצה.',
    theme: 'light',
  },
  {
    id: 'nearby',
    file: '03_nearby.png',
    headline: 'העזרה שאתם צריכים. קרוב אליכם.',
    accent: 'קרוב אליכם.',
    sub: 'אנשים מתאימים באזור מקבלים את המשימה ויכולים להגיש בקשה.',
    theme: 'brand',
  },
  {
    id: 'post_task',
    file: '04_post_task.png',
    headline: 'פרסמו משימה בקלות',
    accent: 'בקלות',
    sub: 'ספרו מה צריך, הוסיפו תמונה וקבעו את המחיר.',
    theme: 'light',
  },
  {
    id: 'choose_helper',
    file: '05_choose_helper.png',
    headline: 'אתם בוחרים מי מתאים לכם',
    accent: 'אתם בוחרים',
    sub: 'השוו בין בקשות, פרופילים ודירוגים — ובחרו בעצמכם.',
    theme: 'light',
  },
  {
    id: 'chat',
    file: '06_chat.png',
    headline: 'סוגרים את הפרטים בצ׳אט',
    accent: 'בצ׳אט',
    sub: 'מדברים ישירות ומתאמים את המשימה במקום אחד.',
    theme: 'brand',
  },
  {
    id: 'trust',
    file: '07_trust.png',
    headline: 'אנשים אמיתיים. פרופילים אמיתיים.',
    accent: 'פרופילים אמיתיים.',
    sub: 'דירוגים, היסטוריית משימות ואימות זהות — לפני שבוחרים.',
    theme: 'light',
  },
  {
    id: 'everything',
    file: '08_everything.png',
    headline: 'כל משימה. מישהו כבר בדרך.',
    accent: 'מישהו כבר בדרך.',
    sub: 'ניקיון, הובלה, בעלי חיים, בייביסיטר, שיעורים פרטיים ועוד.',
    theme: 'brand',
  },
];

export const THEMES = {
  light: {
    key: 'light',
    bg: '#eef3fc',
    glow: 'radial-gradient(circle at 50% -6%, rgba(26,111,212,0.16) 0%, rgba(26,111,212,0) 58%)',
    headline: '#0d1e40',
    accent: '#1a6fd4',
    sub: '#4b6083',
    rule: '#fbbf24',
    brandName: '#0d1e40',
    brandSub: '#7b8cab',
  },
  brand: {
    key: 'brand',
    bg: '#0d1e40',
    glow: 'radial-gradient(circle at 50% -6%, rgba(26,111,212,0.60) 0%, rgba(13,30,64,0) 58%)',
    headline: '#ffffff',
    accent: '#fbbf24',
    sub: 'rgba(255,255,255,0.74)',
    rule: '#fbbf24',
    brandName: '#ffffff',
    brandSub: 'rgba(255,255,255,0.62)',
  },
};