import PageHeader from '@/components/PageHeader';
import { useAuth } from '@/lib/AuthContext';
import AccountDeletionRequest from '@/components/AccountDeletionRequest';

export default function Privacy() {
  const { isAuthenticated } = useAuth();
  const sections = [
    {
      title: 'מבוא',
      number: '1',
      content: `פוליסת פרטיות זו ("הפוליסה") מתארת כיצד Joba24 אוספת, משתמשת, מגלה ושומרת מידע אישי הנאסף ממשתמשי הפלטפורמה.

השימוש בפלטפורמה מהווה הסכמה לאיסוף ועיבוד המידע כמתואר בפוליסה זו.

מונחים:
• "הפלטפורמה" — אפליקציית Joba24, האתר, מערכות התקשורת, שירותי ההתאמה, מערכת דירוגים, WorkerTracker וכל שירות או פיצ'ר נלווה
• "המשתמש" — כל אדם המשתמש בפלטפורמה
• "מידע אישי" — כל מידע המזהה או עשוי לזהות אדם ספציפי`
    },
    {
      title: 'מידע שאנו אוספים',
      number: '2',
      content: `אנו אוספים מידע מהסוגים הבאים:

2.1 — מידע שאתה מספק
• שם מלא
• כתובת מייל
• מספר טלפון
• מספר תעודת זהות
• צילום תעודת זהות (לצורך אימות)
• תמונת פרופיל
• תיאור מקצוע / תחומי עיסוק
• תוכן הודעות בצ'אט הפנימי

2.2 — מידע שנאסף אוטומטית
• נתוני מיקום בזמן אמת (בעת שימוש ב-WorkerTracker)
• סוג מכשיר ומערכת הפעלה
• כתובת IP
• נתוני שימוש (דפים שנצפו, פעולות שבוצעו)
• מזהה מכשיר

2.3 — מידע מצד שלישי
• נתוני התחברות מ-Google (בעת התחברות עם Google)
• נתוני תשלום מ-Tranzila (בעת רכישת קרדיטים — אנו איננו שומרים את פרטי כרטיס האשראי)`
    },
    {
      title: 'מטרות השימוש במידע',
      number: '3',
      content: `המידע שנאסף משמש למטרות הבאות:

• יצירה וניהול חשבון המשתמש
• אימות זהות ושמירה על בטיחות הקהילה
• התאמת משימות בין מפרסמים לעובדים
• תקשורת בין משתמשים דרך צ'אט פנימי
• מעקב בזמן אמת אחר עובדים (WorkerTracker)
• שליחת התראות (Push, אימייל)
• עיבוד תשלומים עבור רכישת קרדיטים
• מניעת הונאה, ספאם ופעילות פיקטיבית
• ניתוח ושיפור השירות (אנליטיקה)
• עמידה בחובות חוקיות`
    },
    {
      title: 'שיתוף מידע עם צדדים שלישיים',
      number: '4',
      content: `אנו איננו מוכרים את המידע האישי שלך.

שיתוף מידע נעשה רק במקרים הבאים:

4.1 — ספקי שירותים
• Tranzila — עיבוד תשלומים
• Firebase — שליחת התראות Push
• MapBox — שירותי מפה ומיקום
• Google Cloud — אירוח ותשתית
ספקים אלה מחויבים לשמירת סודיות ואינם רשאים להשתמש במידע למטרות אחרות.

4.2 — בין משתמשים
• שם המשתמש ותמונת הפרופיל מוצגים למשתמשים אחרים
• טלפון ליצירת קשר נחשף לעובד המאושר בלבד
• מיקום העובד משותף עם המפרסם במהלך משימה פעילה בלבד

4.3 — חובה חוקית
• במקרה של דרישה חוקית, צו בית משפט, או חובה רגולטורית
• במקרה של חקירת הונאה או פעילות עבריינית`
    },
    {
      title: 'WorkerTracker ונתוני מיקום',
      number: '5',
      content: `הפלטפורמה עושה שימוש במיקום בזמן אמת לצורך:
• מעקב אחר עובד במהלך משימה
• חישוב זמן הגעה משוער (ETA)
• הצגת מסלול
• שיפור חוויית המשתמש והאמון בפלטפורמה

השיתוף של נתוני מיקום:
• מבוצע רק במהלך משימה פעילה
• משותף רק עם המפרסם של המשימה
• מופסק מיד עם סיום המשימה

ניתן לבטל הרשאות מיקום, אך ייתכן שחלק מהשירותים לא יהיו זמינים.`
    },
    {
      title: 'אבטחת מידע',
      number: '6',
      content: `אנו נוקטים אמצעים סבירים להגן על המידע האישי שלך:

• הצפנת נתונים במעבר ובאחסון (TLS/SSL)
• הגבלת גישה למידע רגיש לצוות מורשה
• ניטור פעילות חשודה
• גיבויים מאובטחים

למרות זאת, אין מערכת אבטחה שהיא חסינה לחלוטין, ואיננו יכולים להבטיח הגנה מוחלטת.`
    },
    {
      title: 'שמירת מידע',
      number: '7',
      content: `אנו שומרים את המידע האישי שלך למשך התקופה הנדרשת למטרות שלשמן נאסף:

• נתוני חשבון — למשך קיום החשבון
• נתוני עסקאות — 7 שנים (לפי דרישות חוקיות)
• נתוני צ'אט — למשך התקופה הנדרשת למניעת הונאה
• נתוני מיקום — נמחקים מיד עם סיום המשימה
• צילום תעודת זהות — נשמר לצורך אימות ונמחק לאחר אימות

לאחר סגירת חשבון, נשמור מידע מזהה לצורך מניעת יצירת חשבונות כפולים או חשבונות שנחסמו.`
    },
    {
      title: 'זכויות המשתמש',
      number: '8',
      content: `בהתאם לחוק הגנת הפרטיות, התשמ"א-1981, ולתקנות הגנת הפרטיות (אבטחת מידע), התשע"ב-2017:

למשתמש הזכות:
• לדעת איזה מידע נשמר עליו
• לבקש עיון במידע
• לבקש תיקון מידע שגוי
• לבקש מחיקת מידע (בכפוף לחובות חוקיות)
• לבטל הסכמה לאיסוף מידע

בקשות יש להפנות בכתב לכתובת: hello@joba24.com

משך הטיפול בבקשה: עד 30 ימים ממועד הפנייה.`
    },
    {
      title: 'עוגיות (Cookies) וטכנולוגיות מעקב',
      number: '9',
      content: `הפלטפורמה עושה שימוש בעוגיות וטכנולוגיות דומות לצורך:
• זיהוי משתמש ושמירת מצב התחברות
• זכירת העדפות
• אנליטיקה ושיפור השירות
• מניעת הונאה

ניתן לבטל עוגיות בהגדרות הדפדפן, אך ייתכן שחלק מהשירותים לא יפעלו כראוי.`
    },
    {
      title: 'פרטיות קטינים',
      number: '10',
      content: `הפלטפורמה מיועדת למשתמשים בני 16 ומעלה בלבד.

איננו אוספים ביודעין מידע אישי מקטינים מתחת לגיל 16.

אם נודע לנו שנאסף מידע מקטין מתחת לגיל 16, נמחק אותו מיד.`
    },
    {
      title: 'שינויים במדיניות הפרטיות',
      number: '11',
      content: `אנו רשאים לעדכן את מדיניות הפרטיות מעת לעת.

שינויים מהותיים יפורסמו באפליקציה או יישלחו באימייל.

המשך שימוש בפלטפורמה לאחר עדכון המדיניות מהווה הסכמה למדיניות המעודכנת.`
    },
    {
      title: 'יצירת קשר',
      number: '12',
      content: `לשאלות, בקשות או הערות בנוגע למדיניות הפרטיות:

אימייל: hello@joba24.com

ניתן לפנות אלינו גם דרך הצ'אט הפנימי באפליקציה → תמיכה.`
    }
  ];

  return (
    <div style={{ background: '#f8f9fc', minHeight: '100vh' }} dir="rtl">
      <PageHeader title="מדיניות פרטיות" backTo={!isAuthenticated ? '/join' : undefined} />
      
      {/* Intro Section */}
      <div style={{ padding: '20px 16px' }}>
        <h1 style={{ fontSize: 24, fontWeight: 900, color: '#0f2b6b', marginBottom: 12, textAlign: 'center' }}>
          מדיניות פרטיות – Joba24
        </h1>
        <p style={{ fontSize: 13, color: '#64748b', textAlign: 'center', marginBottom: 8 }}>
          <strong>תאריך עדכון אחרון:</strong> 1 ביולי 2026
        </p>
        
        <div style={{ background: 'white', borderRadius: 16, border: '1px solid #e2e8f0', padding: '16px', marginBottom: 20 }}>
          <p style={{ fontSize: 14, color: '#1a2540', lineHeight: 1.8, margin: 0 }}>
            ב-<strong>Joba24</strong> אנו מתחייבים לשמירה על הפרטיות שלך.
          </p>
          <p style={{ fontSize: 14, color: '#1a2540', lineHeight: 1.8, marginTop: 12 }}>
            מדיניות פרטיות זו ("המדיניות") מתארת איזה מידע אנו אוספים, כיצד אנו משתמשים בו, עם מי אנו משתפים אותו ומה הזכויות שלך — בעת השימוש בפלטפורמת Joba24, לרבות האפליקציה, האתר, מערכות התקשורת, שירותי ההתאמה, מערכת דירוגים, WorkerTracker וכל שירות או פיצ'ר נלווה (להלן: "הפלטפורמה").
          </p>
          <p style={{ fontSize: 14, color: '#1a2540', lineHeight: 1.8, marginTop: 12 }}>
            <strong>השימוש בפלטפורמה מהווה הסכמה לאיסוף ועיבוד המידע כמתואר במדיניות זו.</strong>
          </p>
        </div>
      </div>

      {/* Sections */}
      <div style={{ paddingBottom: 40 }}>
        {sections.map((section) => (
          <div key={section.number} style={{ paddingX: 16, marginBottom: 16 }}>
            <div style={{ background: 'white', borderRadius: 16, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
              {/* Section Header */}
              <div style={{ background: 'linear-gradient(135deg, #1a6fd4, #0a52b0)', padding: '16px', borderBottom: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ color: 'white', fontWeight: 900, fontSize: 18 }}>{section.number}</span>
                  </div>
                  <h2 style={{ color: 'white', fontWeight: 800, fontSize: 16, margin: 0 }}>{section.title}</h2>
                </div>
              </div>

              {/* Section Content */}
              <div style={{ padding: '16px' }}>
                <p style={{ fontSize: 13, color: '#475569', lineHeight: 1.8, whiteSpace: 'pre-wrap', margin: 0 }}>
                  {section.content}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Account Deletion Request — Google Play requirement */}
      <div style={{ padding: '0 16px 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: '#dc2626', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 6 }}>בקשת מחיקת חשבון</div>
          <h2 style={{ fontSize: 18, fontWeight: 900, color: '#0f2b6b', margin: 0 }}>
            מחיקת החשבון והנתונים שלך ב-Joba24
          </h2>
          <p style={{ fontSize: 12, color: '#64748b', marginTop: 6, lineHeight: 1.5 }}>
            בהתאם לדרישות חוק הגנת הפרטיות ומדיניות Google Play
          </p>
        </div>
        <AccountDeletionRequest />
      </div>

      {/* Footer */}
      <div style={{ background: '#f1f5f9', borderTop: '1px solid #e2e8f0', padding: '20px 16px', textAlign: 'center' }}>
        <p style={{ fontSize: 12, color: '#64748b', margin: 0, lineHeight: 1.6 }}>
          © 2026 Joba24 — כל הזכויות שמורות.
          <br />
          <strong style={{ color: '#1a6fd4' }}>שימוש בפלטפורמה מהווה הסכמה למדיניות זו.</strong>
        </p>
      </div>
    </div>
  );
}