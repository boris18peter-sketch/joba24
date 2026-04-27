import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const faqs = [
  {
    q: 'מה זה Joba24?',
    a: 'Joba24 היא פלטפורמה לחיבור בין אנשים שצריכים עזרה במשימות קצרות לבין עובדים זמינים שיכולים לבצע אותן — מהר, בקרבת מקום ובמחיר הוגן.',
  },
  {
    q: 'איך מפרסמים ג\'ובה?',
    a: 'לוחצים על כפתור "פרסם ג\'ובה" בתפריט, ממלאים את הפרטים (כותרת, מחיר, מיקום וקטגוריה) ולוחצים על פרסום. הג\'ובה תופיע מיד בפיד.',
  },
  {
    q: 'איך עובד מנגנון התשלום?',
    a: 'הלקוח מגדיר מחיר בעת פרסום הג\'ובה. לאחר שהעובד מסמן "הושלם" והלקוח מאשר — הכסף מועבר לארנק העובד. הכסף נשמר ב-Escrow עד לאישור הביצוע.',
  },
  {
    q: 'מה זה Escrow?',
    a: 'Escrow הוא מנגנון ביניים שמגן על שני הצדדים. הכסף נעול בפלטפורמה ולא מועבר לעובד עד שהלקוח מאשר שהג\'ובה הושלמה בהצלחה.',
  },
  {
    q: 'האם אני יכול לבטל ג\'ובה שפרסמתי?',
    a: 'כן, ניתן לבטל ג\'ובה שפרסמתם כל עוד היא עדיין בסטטוס "פתוח". נכנסים לפרטי הג\'ובה ולוחצים על "ביטול הג\'ובה".',
  },
  {
    q: 'כיצד מגדירים "אישור ידני" לעומת "מיידי"?',
    a: 'אישור מיידי — העובד הראשון שלוחץ על "קח" מקבל את הג\'ובה. אישור ידני — העובדים מגישים בקשות ואתם בוחרים את המתאים ביותר.',
  },
  {
    q: 'מה קורה אם פג תוקף הג\'ובה?',
    a: 'ג\'ובה שפג תוקפה עוברת לסטטוס "פג תוקף". תוכלו לפתוח אותה מחדש בלחיצה על "פתח מחדש ל-24 שעות" בעמוד פרטי הג\'ובה.',
  },
  {
    q: 'איך מושכים כסף מהארנק?',
    a: 'כרגע ניתן לפנות לתמיכה לביצוע משיכה לחשבון בנק. בקרוב תיפתח אפשרות משיכה עצמאית ישירות מעמוד הארנק.',
  },
  {
    q: 'האם יש דמי שירות?',
    a: 'Joba24 גובה עמלת שירות נמוכה על כל עסקה שמתבצעת בפלטפורמה. המחיר שאתם רואים הוא המחיר שהלקוח פרסם.',
  },
  {
    q: 'איך מדרגים עובד לאחר ביצוע ג\'ובה?',
    a: 'לאחר סיום הג\'ובה ואישורה, יפתח חלון דירוג שבו תוכלו לתת ציון ולכתוב ביקורת קצרה. הדירוג מסייע לעובדים לשפר את פרופילם.',
  },
];

function FAQItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      style={{
        background: 'white',
        borderRadius: 16,
        border: '1px solid #e8edf2',
        overflow: 'hidden',
        boxShadow: '0 1px 6px rgba(0,0,0,0.04)',
      }}
    >
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'right',
          gap: 12,
        }}
      >
        <span style={{ fontSize: 14, fontWeight: 700, color: '#111', flex: 1 }}>{q}</span>
        <ChevronDown
          size={18}
          color="#1a6fd4"
          style={{ flexShrink: 0, transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
        />
      </button>
      {open && (
        <div style={{ padding: '0 16px 16px', fontSize: 13, color: '#555', lineHeight: 1.7 }}>
          {a}
        </div>
      )}
    </div>
  );
}

export default function FAQ() {
  return (
    <div className="min-h-screen" style={{ background: '#f4f7fb' }} dir="rtl">
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #0f2b6b, #1a6fd4)',
        padding: '56px 20px 32px',
      }}>
        <div style={{ fontSize: 36, marginBottom: 8 }}>💬</div>
        <h1 style={{ color: 'white', fontSize: 24, fontWeight: 900, marginBottom: 6 }}>שאלות ותשובות</h1>
        <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 14 }}>כל מה שרצית לדעת על Joba24</p>
      </div>

      <div style={{ padding: '20px 16px 40px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {faqs.map((item, i) => (
          <FAQItem key={i} q={item.q} a={item.a} />
        ))}
      </div>

      <div style={{ textAlign: 'center', padding: '0 20px 40px', fontSize: 13, color: '#999' }}>
        לא מצאת תשובה? 📩 צור קשר עם התמיכה שלנו
      </div>
    </div>
  );
}