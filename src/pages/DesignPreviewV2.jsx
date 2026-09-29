import { Link } from 'react-router-dom';
import { Search, SlidersHorizontal, ChevronLeft } from 'lucide-react';
import { DSV2_CSS } from '@/components/dsv2/styles';
import Dsv2Section from '@/components/dsv2/Dsv2Section';
import Dsv2Spec from '@/components/dsv2/Dsv2Spec';
import V2TaskCard from '@/components/dsv2/V2TaskCard';
import V2NavBar from '@/components/dsv2/V2NavBar';
import V2TaskDetails from '@/components/dsv2/V2TaskDetails';
import V2Tutorial from '@/components/dsv2/V2Tutorial';

/**
 * Joba24 — Design System V2 · preview only.
 *
 * A standalone review page. It reuses the app's real categories, cities and
 * wording, but renders its own scoped styles — nothing in the live app reads
 * from this file, and no existing screen or business logic is touched.
 */

const FEED_TASKS = [
  { id: 'a', title: 'הורדת מקרר מהדירה', city: 'תל אביב', distance: '1.8 ק״מ', postedAgo: 'לפני 47 דק׳', price: 500, category: 'עזרה פיזית', timing: 'גמיש' },
  { id: 'b', title: 'תיקון נזילת מים במטבח', city: 'רמת גן', distance: '3.2 ק״מ', postedAgo: 'לפני שעתיים', price: 350, category: 'אינסטלציה', urgent: true },
  { id: 'c', title: 'הרכבת ארונות מטבח', city: 'גבעתיים', distance: '4.6 ק״מ', postedAgo: 'לפני 5 שעות', price: 900, category: 'נגרות', timing: 'מחר 09:00' },
];

const NEXT_STEPS = [
  'V2TaskCard — כרטיס משימה אחד לכל רשימות המשימות (פיד, חיפוש, מפה, משימות שלי).',
  'V2Button — שלוש דרגות בלבד, במקום עשרות סגנונות כפתור inline.',
  'V2Chip — תגית אחת או שתיים מקסימום בכל מסך.',
  'V2Section — כרטיס/מקטע אחיד עם כותרת, ריווח וקו מפריד עקבי.',
  'V2EmptyState — מצב ריק אחיד לכל הרשימות.',
  'החלפת אמוג׳י-ממשק (📦 ⏱️ 🔥 💡) באייקוני lucide עם עובי קו אחיד.',
];

function Phone({ children }) {
  return <div className="v2-phone">{children}</div>;
}

export default function DesignPreviewV2() {
  return (
    <div className="dsv2-root" dir="rtl" style={{ height: '100%', overflowY: 'auto', background: 'var(--v2-bg-soft)' }}>
      <style>{DSV2_CSS}</style>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 20px 96px' }}>

        {/* ── Header ── */}
        <Link to="/" style={{
          display: 'inline-flex', alignItems: 'center', gap: 4, textDecoration: 'none',
          fontSize: 14, fontWeight: 700, color: 'var(--v2-blue)',
        }}>
          <ChevronLeft size={16} /> חזרה לאפליקציה
        </Link>

        <h1 className="v2-title" style={{ marginTop: 20, fontSize: 30 }}>Joba24 — Design System V2</h1>
        <p className="v2-body" style={{ marginTop: 10, maxWidth: 620 }}>
          סקירה לאישור הכיוון בלבד. שלושת המסכים כאן הם פרוטוטייפ חזותי — לא הוטמעו באפליקציה,
          ולא שונו שום מסך, לוגיקה או נתון קיים.
        </p>

        {/* ── Design system ── */}
        <section style={{ marginTop: 48 }}>
          <h2 className="v2-title">מערכת העיצוב</h2>
          <p className="v2-body" style={{ marginTop: 8, maxWidth: 660 }}>
            כל הצבעים, הגדלים והריווחים של V2. צבע אחד לפעולה, אפור אחד למידע משני,
            וצבעי סטטוס רק כשהם באמת נדרשים.
          </p>
          <div style={{ marginTop: 24 }}>
            <Dsv2Spec />
          </div>
        </section>

        {/* ── A. Task Feed ── */}
        <Dsv2Section
          title="A · פיד המשימות"
          subtitle="המסך הראשי. כרטיס אחד = החלטה אחת: לפתוח או להגיש בקשה."
          current="כל כרטיס מכיל 8–10 רכיבים: תג דחיפות, תג מועד, תג 'בשבילך', מונה מגישים, כותרת, שורת תיאור, מיקום, שם המפרסם עם דירוג, 'פורסם לפני', תמונה, מחיר, אמצעי תשלום, מרחק, שורת בוסט, מספרים, ושתי שורות כפתורים."
          problem="המשתמש צריך לסרוק 10 אותות כדי להבין משהו אחד. אין היררכיה — הכותרת, המחיר והמרחק באותו משקל חזותי, וכל נתון הפך לתג צבעוני. זה מה שיוצר את תחושת ה'עומס'."
          v2="נשארו רק מה שקובע החלטה: כותרת, מיקום · מרחק · זמן, מחיר, תכונה אחת, וכפתור אחד. כל השאר עבר לתוך המשימה. מקסימום תג אחד — ורק לדחיפות אמיתית."
        >
          <Phone>
            <div style={{ background: '#fff', padding: '20px 16px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <h3 style={{ margin: 0, fontSize: 19, fontWeight: 800, letterSpacing: '-0.3px', color: 'var(--v2-ink)' }}>
                  משימות בקרבתך
                </h3>
                <button className="v2-icon-btn" style={{ width: 40, height: 40, border: '1px solid var(--v2-line)', background: '#fff' }} aria-label="סינון">
                  <SlidersHorizontal size={18} color="var(--v2-ink-2)" strokeWidth={1.9} />
                </button>
              </div>
              <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 10, height: 46, padding: '0 14px', background: 'var(--v2-bg-soft)', borderRadius: 14 }}>
                <Search size={17} color="var(--v2-ink-3)" strokeWidth={2} />
                <span style={{ fontSize: 15, color: 'var(--v2-ink-3)' }}>חיפוש משימה</span>
              </div>
            </div>

            <div style={{ padding: '16px 16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {FEED_TASKS.map(t => <V2TaskCard key={t.id} task={t} />)}
            </div>

            <V2NavBar active="home" />
          </Phone>
        </Dsv2Section>

        {/* ── B. Task Details ── */}
        <Dsv2Section
          title="B · מסך המשימה"
          subtitle="מסך אחד, קריאה אחת מלמעלה למטה, פעולה ראשית אחת."
          current="המחיר מופיע שלוש פעמים (כותרת, כרטיס, תחתית), הכתובת פעמיים, הדחיפות ככרטיס נפרד עם אמוג׳י, התיאור גם בכרטיס וגם ב'פרטים נוספים', ולפני הפעולה יש 5–6 בלוקים חזותיים."
          problem="המשתמש גולל כדי להגיע לכפתור, ומקבל מידע כפול בדרך. כל בלוק נראה כמו כרטיס משל עצמו — ולכן אין 'מסך אחד' אלא אוסף כרטיסים."
          v2="סדר קריאה אחד: מה זה → כמה → איפה ומתי → תיאור → פעולה. כל נתון פעם אחת. הבלוקים המשניים (מיקום, פרטים, מפרסם) עברו אחרי הפעולה. הג׳ובות מוצגות כמידע משני מתחת לכפתור, לא כמתחרה לו."
        >
          <Phone>
            <V2TaskDetails />
          </Phone>
        </Dsv2Section>

        {/* ── C. Tutorial ── */}
        <Dsv2Section
          title="C · מדריך הפרסום"
          subtitle="המדריך נותן רק את הרמז האחרון — הממשק כבר אמור להיות מובן."
          current="בבת אחת: מסגרת זהב זוהרת, טבעת פועמת, חץ, תג קטגוריה, אייקון, כותרת, פסקה של שני משפטים, נקודות התקדמות, שלושה כפתורים בכל שלב — וחמישה שלבים."
          problem="המדריך מסביר מסך שכבר מוסבר מעצמו, ובזמן שהוא פתוח המשתמש לא רואה את האפליקציה. החוויה מרגישה כמו מצגת ולא כמו עזרה."
          v2="רמז אחד: כותרת, משפט אחד, כפתור אחד, ו'דלג' כקישור טקסט. הסימון על ה-+ הוא טבעת דקה בלבד — בלי זוהר, בלי פעימה, בלי חצים. אין נקודות התקדמות."
        >
          <Phone>
            <V2Tutorial />
          </Phone>
        </Dsv2Section>

        {/* ── Next steps ── */}
        <section style={{ marginTop: 72 }}>
          <h2 className="v2-title">מה יהפוך לרכיב משותף</h2>
          <p className="v2-body" style={{ marginTop: 8, maxWidth: 660 }}>
            אלה הדפוסים החוזרים היום בכמה מקומות בגרסאות שונות. הפיכתם לרכיב אחד היא מה שייצור אחידות אמיתית.
          </p>
          <div className="v2-card" style={{ marginTop: 20, padding: 24, maxWidth: 760, display: 'flex', flexDirection: 'column', gap: 14 }}>
            {NEXT_STEPS.map((s, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--v2-blue)', marginTop: 8, flexShrink: 0 }} />
                <p className="v2-body" style={{ fontSize: 14 }}>{s}</p>
              </div>
            ))}
          </div>
        </section>

        <p className="v2-meta" style={{ marginTop: 48 }}>
          תצוגה בלבד · לא הוטמע באפליקציה · אין שינוי בלוגיקה, בנתונים או במסכים קיימים
        </p>

      </div>
    </div>
  );
}