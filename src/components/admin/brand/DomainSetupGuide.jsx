export default function DomainSetupGuide({ hostname }) {
  return <div className="rounded-lg border border-jborder-1 bg-surface-1 p-4 text-sm text-jtext-2 space-y-2">
    <p className="font-bold text-jtext-1">חיבור אמיתי של <b dir="ltr">{hostname}</b></p>
    <ol className="list-decimal ps-5 space-y-2">
      <li>בעמוד <b>Domains</b> של האפליקציה ב-Base44, בחרו <b>Connect existing domain</b>, הזינו <b dir="ltr">{hostname}</b> ולחצו <b>Add</b>.</li>
      <li>פתחו <b>DNS instructions</b> והעתיקו את Type / Name / Value לספק ה-DNS, או אשרו את ההגדרה האוטומטית של הספק דרך Base44. הערכים שמוצגים שם קובעים.</li>
      <li>לתת-דומיין: היעד המתועד הוא <b dir="ltr">CNAME → base44.onrender.com</b>, בשם תת-הדומיין בלבד. לדוגמה events תחת joba24.com. אין לשנות את רשומת השורש של Joba24.</li>
      <li>לדומיין שורש: ההוראות המתועדות הן ANAME/ALIAS בשם @ אל base44.onrender.com, או A בשם @ אל 216.24.57.1 אם אין תמיכה; www הוא CNAME אל base44.onrender.com. יש לאשר מול ההוראות בפועל, במיוחד עבור saveadate.co.il.</li>
      <li>הסירו A/AAAA מתנגשות רק בשם המחובר; עדכנו CAA חוסמות לפי הצורך. שמרו MX/TXT. אם יש proxy ב-DNS, השתמשו ב-DNS only.</li>
      <li>לחצו <b>Verify</b> ב-Base44 והמתינו ל-DNS/SSL, עד 48 שעות. אין להגדיר הפניית דומיין מלאה אל מותג אחר.</li>
      <li>כאן: הוספה למותג הנכון → בדיקה מחדש → הפעלת מיפוי. www צריך מיפוי נפרד לאותו מותג אם הוא בשימוש. הבדיקה משווה את האפליקציה שמוגשת ב-HTTPS לגרסה המפורסמת.</li>
    </ol>
    <p><b>Wildcard אינו נתמך.</b> יש לחבר כל תת-דומיין בנפרד ב-Base44; רשומת DNS מסוג * אינה מחברת אותו לאירוח.</p>
    <p>הסרה כאן מסירה רק את מיפוי המותג. להסרת האירוח: ב-<b>Domains</b> של Base44 בחרו את הדומיין ולחצו <b>Unlink Domain</b>; <b>Delete</b> מסיר גם מהרשימה. רשומות DNS יש להסיר אצל הספק בנפרד.</p>
    <a className="text-brand-primary underline" href="https://docs.base44.com/Setting-up-your-app/Connecting-an-external-domain" target="_blank" rel="noreferrer">הוראות Base44 הרשמיות</a>
  </div>;
}