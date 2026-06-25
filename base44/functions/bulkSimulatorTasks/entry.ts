import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const CITY_CENTERS = {
  'תל אביב': { lat: 32.0853, lng: 34.7818 },
  'ירושלים': { lat: 31.7683, lng: 35.2137 },
  'חיפה': { lat: 32.7940, lng: 34.9896 },
  'באר שבע': { lat: 31.2518, lng: 34.7913 },
  'ראשון לציון': { lat: 31.9730, lng: 34.7925 },
  'נתניה': { lat: 32.3215, lng: 34.8532 },
  'אשדוד': { lat: 31.8044, lng: 34.6553 },
  'פתח תקווה': { lat: 32.0840, lng: 34.8878 },
  'רעננה': { lat: 32.1848, lng: 34.8713 },
  'הרצליה': { lat: 32.1663, lng: 34.8390 },
  'כפר סבא': { lat: 32.1750, lng: 34.9245 },
  'בני ברק': { lat: 32.0833, lng: 34.8333 },
  'רמת גן': { lat: 32.0684, lng: 34.8248 },
  'חולון': { lat: 32.0158, lng: 34.7894 },
  'בת ים': { lat: 32.0170, lng: 34.7470 },
  'רחובות': { lat: 31.8944, lng: 34.8094 },
  'אשקלון': { lat: 31.6688, lng: 34.5737 },
  'עפולה': { lat: 32.6090, lng: 35.2880 },
  'מודיעין': { lat: 31.9000, lng: 35.0000 },
  'נהריה': { lat: 33.0030, lng: 35.0950 },
  'קריית אונו': { lat: 32.0560, lng: 34.8550 },
  'גבעתיים': { lat: 32.0710, lng: 34.8110 },
  'אילת': { lat: 29.5577, lng: 34.9519 },
  'טבריה': { lat: 32.7940, lng: 35.5310 },
  'קרית שמונה': { lat: 33.2070, lng: 35.5680 },
};

const TASK_TITLES = [
  'תיקון ברז מדמם', 'התקנת מנורה', 'צביעת קיר', 'ניקיון דירה',
  'הובלת רהיטים', 'תיקון דלת', 'הרכבת רהיטים', 'תיקון מזגן',
  'גינון וטיפול בצמחים', 'משלוח חבילה', 'סידור מחסן', 'תיקון כיור',
  'התקנת מדף', 'צביעת דלת', 'ניקיון חלונות', 'פינוי פסולת',
  'הובלת קופסאות', 'תיקון דוד שמש', 'טיפול בגינה', 'סידור בית',
  'תיקון חשמל', 'החלפת מנעול', 'ניקיון לאחר שיפוץ', 'הרכבת מטבח',
  'תיקון אינסטלציה', 'התקנת וילון', 'צביעת מרפסת', 'הובלת מקרר',
  'ניקיון ספות', 'תיקון פרגולה', 'התקנת מאוורר', 'גיזום עצים',
];

const CATEGORIES = [
  'plumbing', 'electricity', 'handyman', 'cleaning', 'moving',
  'heavy_lifting', 'painting', 'carpentry', 'ac', 'locksmith',
  'gardening', 'home_maintenance', 'delivery', 'shopping', 'personal_help', 'other'
];

const STREETS = [
  'רוטשילד', 'הרצל', 'דיזנגוף', 'בן גוריון', 'אלנבי', 'טרומפלדור',
  'אבן גבירול', 'ז\'בוטינסקי', 'ויצמן', 'בן יהודה', 'הנביאים', 'יפו',
  'החשמונאים', 'הראשונים', 'העצמאות', 'המכבים', 'הגיבורים', 'העלייה',
  'השלום', 'הגבורה', 'משה לוי', 'דרך השלום', 'התמר', 'הזית',
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { action, city, count, minPrice, maxPrice } = body;

    if (action === 'cleanup') {
      const tasks = await base44.entities.Task.filter({ client_id: user.id }, '-created_date', 500);
      const bulkTasks = tasks.filter(t => t.title?.startsWith('🧪🏙️'));
      let deleted = 0;
      for (const t of bulkTasks) {
        await base44.entities.Task.delete(t.id);
        deleted++;
      }
      return Response.json({ success: true, deleted });
    }

    if (action === 'generate') {
      if (!city || !count) return Response.json({ error: 'city and count required' }, { status: 400 });
      const center = CITY_CENTERS[city] || { lat: 32.0853, lng: 34.7818 };
      const min = Math.max(1, Number(minPrice) || 100);
      const max = Math.max(min, Number(maxPrice) || 2000);
      const n = Math.min(100, Math.max(1, Number(count)));

      const estimatedTimes = ['15m', '30m', '1h', '2h'];
      const paymentMethods = ['Cash', 'Bit', 'PayBox'];

      const tasks = [];
      for (let i = 0; i < n; i++) {
        const title = `🧪🏙️ ${TASK_TITLES[Math.floor(Math.random() * TASK_TITLES.length)]}`;
        const category = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
        const price = Math.round(min + Math.random() * (max - min));
        const lat = center.lat + (Math.random() - 0.5) * 0.06;
        const lng = center.lng + (Math.random() - 0.5) * 0.06;
        const street = STREETS[Math.floor(Math.random() * STREETS.length)];
        const num = Math.floor(Math.random() * 120) + 1;

        tasks.push({
          title,
          description: `משימת סימולציה ב${city}`,
          price,
          base_price: price,
          city,
          location_name: `${city}, ${street} ${num}`,
          lat: parseFloat(lat.toFixed(6)),
          lng: parseFloat(lng.toFixed(6)),
          category,
          status: 'OPEN',
          payment_method: paymentMethods[Math.floor(Math.random() * paymentMethods.length)],
          payment_status: 'funded',
          approval_mode: Math.random() > 0.5 ? 'instant' : 'manual',
          estimated_time: estimatedTimes[Math.floor(Math.random() * estimatedTimes.length)],
          client_id: user.id,
          client_name: user.full_name,
          client_verified: user.is_verified || false,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          expiry_duration_hours: 24,
        });
      }

      await base44.entities.Task.bulkCreate(tasks);
      return Response.json({ success: true, count: tasks.length });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});