import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Mail, Check, Zap, Clock, MapPin, CheckCircle2, Loader2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

export default function Landing() {
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [interestType, setInterestType] = useState('both');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) {
      toast.error('אנא הכנס כתובת אימייל');
      return;
    }

    setLoading(true);
    try {
      await base44.entities.EarlySignup.create({
        email,
        full_name: fullName,
        phone,
        interest_type: interestType,
      });
      setSubmitted(true);
      setEmail('');
      setFullName('');
      setPhone('');
      toast.success('תודה! נשמרת להרשמה מוקדמת 🎉');
      setTimeout(() => setSubmitted(false), 3000);
    } catch (error) {
      toast.error('שגיאה בשמירה. נסה שוב');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Navigation */}
      <nav className="sticky top-0 z-40 border-b" style={{ background: 'rgba(244,247,251,0.95)', borderColor: '#dce8f5', backdropFilter: 'blur(8px)' }}>
        <div className="px-4 py-4 flex items-center justify-between">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <img src="https://media.base44.com/images/public/69e6bdb4986a04a256653a23/d5824a161_IMG_0357.jpg" alt="Joba24" style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 10 }} />
            <h1 className="text-2xl font-black" style={{ color: '#0f2b6b' }}>Joba<span style={{ color: '#fbbf24' }}>24</span></h1>
          </div>
          <a href="#signup" className="text-sm font-semibold text-primary hover:text-primary/80">הרשם עכשיו</a>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="px-4 pt-12 pb-24" style={{ background: 'linear-gradient(135deg, #0f2b6b 0%, #1a6fd4 100%)' }}>
        <div className="max-w-2xl mx-auto text-center">
          <div style={{ fontSize: 80, marginBottom: 24, animation: 'float 3s ease-in-out infinite' }}>⚡</div>
          <h2 className="text-5xl font-black mb-6 text-white leading-tight">
            יש לך משימה?<br />אנחנו מחברים אותך לפתרון
          </h2>
          <p className="text-xl text-white/90 mb-10 leading-relaxed">
            בין אם זה הובלה, תיקון, ניקיון או כל משימה אחרת — מצא עוזר מוכשר בתוך דקות ובמחיר הוגן.
          </p>
          <a href="#signup" className="inline-block">
            <Button className="h-14 px-10 text-base font-bold rounded-2xl bg-white hover:bg-gray-100 text-primary shadow-xl">
              הרשם עכשיו ✨
            </Button>
          </a>
        </div>
      </section>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
      `}</style>

      {/* How It Works */}
      <section className="px-4 py-20" style={{ background: '#f4f7fb' }}>
        <div className="max-w-4xl mx-auto">
          <h3 className="text-3xl font-black text-center mb-16" style={{ color: '#0f2b6b' }}>
            תהליך פשוט בשלוש צעדים
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            {/* Step 1 */}
            <div className="text-center">
              <div style={{ width: 80, height: 80, borderRadius: 20, background: 'linear-gradient(135deg, #1a6fd4, #0a52b0)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 36 }}>
                ✏️
              </div>
              <h4 className="font-bold text-xl mb-3" style={{ color: '#0f2b6b' }}>1. תאר את המשימה</h4>
              <p className="text-gray-600 text-sm leading-relaxed">
                בחר קטגוריה, תן כותרת, מחיר ומיקום. ממש כמו לשלוח הודעה בוואטס.
              </p>
            </div>

            {/* Step 2 */}
            <div className="text-center">
              <div style={{ width: 80, height: 80, borderRadius: 20, background: 'linear-gradient(135deg, #fbbf24, #f59e0b)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 36 }}>
                🔔
              </div>
              <h4 className="font-bold text-xl mb-3" style={{ color: '#0f2b6b' }}>2. עובדים מגיבים</h4>
              <p className="text-gray-600 text-sm leading-relaxed">
                תוך דקות יתחילו עובדים לבקש את המשימה. בחר את המתאים ביותר.
              </p>
            </div>

            {/* Step 3 */}
            <div className="text-center">
              <div style={{ width: 80, height: 80, borderRadius: 20, background: 'linear-gradient(135deg, #10b981, #059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 36 }}>
                ✅
              </div>
              <h4 className="font-bold text-xl mb-3" style={{ color: '#0f2b6b' }}>3. המשימה הושלמה</h4>
              <p className="text-gray-600 text-sm leading-relaxed">
                העובד מבצע, אתה מאשר, והוא מקבל תשלום. אתה שומר דירוג.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-4 py-20">
        <div className="max-w-4xl mx-auto">
          <h3 className="text-2xl font-black text-center mb-12" style={{ color: '#0f2b6b' }}>
            למה Joba24?
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
            {/* Feature 1 */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
              <div className="w-14 h-14 rounded-xl bg-blue-100 flex items-center justify-center mb-4">
                <Zap className="w-7 h-7 text-primary" />
              </div>
              <h4 className="font-bold text-lg mb-2" style={{ color: '#0f2b6b' }}>
                מהיר וקל
              </h4>
              <p className="text-sm text-gray-600">
                פרסם משימה בדקה. תוך רגעים יקבל עובד המבקש עזרה.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
              <div className="w-14 h-14 rounded-xl bg-green-100 flex items-center justify-center mb-4">
                <CheckCircle2 className="w-7 h-7 text-green-600" />
              </div>
              <h4 className="font-bold text-lg mb-2" style={{ color: '#0f2b6b' }}>
                בטוח ומאובטח
              </h4>
              <p className="text-sm text-gray-600">
                כל התשלומים דרכנו. Escrow מגן על שני הצדדים.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
              <div className="w-14 h-14 rounded-xl bg-purple-100 flex items-center justify-center mb-4">
                <MapPin className="w-7 h-7 text-purple-600" />
              </div>
              <h4 className="font-bold text-lg mb-2" style={{ color: '#0f2b6b' }}>
                קרוב אליך
              </h4>
              <p className="text-sm text-gray-600">
                מצא עובדים בקרבת מקום. חסוך זמן ותחבורה.
              </p>
            </div>
          </div>

          {/* Examples of Tasks */}
          <h3 className="text-3xl font-black text-center mb-14" style={{ color: '#0f2b6b' }}>
            משימות קטנות וגדולות
          </h3>
          
          {/* Big Tasks */}
          <div className="mb-12">
            <h4 className="text-lg font-bold mb-6 text-gray-700 flex items-center gap-2">
              <span style={{ fontSize: 24 }}>🏗️</span> משימות גדולות
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { task: 'הובלה מדירה', price: '₪800-1500', time: '3-4 שעות', desc: 'העברת רהיטים ותיקיות לדירה חדשה' },
                { task: 'תיקון תנור', price: '₪400-700', time: '2 שעות', desc: 'התקנה או תיקון של תנור חשמלי' },
                { task: 'עבודות צביעה', price: '₪1000-2000', time: 'יום עבודה', desc: 'צביעת חדר או דירה שלמה' },
                { task: 'שינוע ציוד', price: '₪600-1200', time: '2-3 שעות', desc: 'הובלת ציוד כבד או ריהוט' },
              ].map((item, i) => (
                <div key={i} className="bg-white border border-blue-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all">
                  <div className="flex items-start justify-between mb-2">
                    <h5 className="font-bold text-lg text-gray-900">{item.task}</h5>
                    <span style={{ color: '#1a6fd4', fontSize: 20, fontWeight: 900 }}>{item.price}</span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{item.desc}</p>
                  <p className="text-xs text-gray-500">⏱️ {item.time}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Small Tasks */}
          <div>
            <h4 className="text-lg font-bold mb-6 text-gray-700 flex items-center gap-2">
              <span style={{ fontSize: 24 }}>⚡</span> משימות קטנות וקצרות
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { task: 'משלוח קניות', price: '₪50-100', time: '30-45 דק', desc: 'הובלת תיק קניות מחנות לבית' },
                { task: 'סידור מדפים', price: '₪60-150', time: '1-2 שעות', desc: 'סידור וארגון של ארון או מדף' },
                { task: 'ניקיון משטח', price: '₪100-250', time: '1 שעה', desc: 'ניקיון של מטבח או חדר' },
                { task: 'הדבקת תמונה', price: '₪40-80', time: '30 דק', desc: 'הדבקה או עדכון תמונה בקיר' },
                { task: 'עזרה בהעברה', price: '₪50-120', time: '1 שעה', desc: 'סיוע בהעברת חפצים קטנים' },
                { task: 'דיוור ופקסים', price: '₪30-70', time: '30 דק', desc: 'מסירה ועדכון דיוור בבניין' },
              ].map((item, i) => (
                <div key={i} className="bg-white border border-green-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-all">
                  <div className="flex items-start justify-between mb-2">
                    <h5 className="font-bold text-gray-900">{item.task}</h5>
                    <span style={{ color: '#10b981', fontSize: 16, fontWeight: 900 }}>{item.price}</span>
                  </div>
                  <p className="text-xs text-gray-600 mb-2">{item.desc}</p>
                  <p className="text-xs text-gray-500">⏱️ {item.time}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="px-4 py-16" style={{ background: 'linear-gradient(135deg, #0f2b6b 0%, #1a6fd4 100%)' }}>
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-3 gap-6 text-center">
            <div>
              <div className="text-4xl font-black text-white mb-2">⏱️</div>
              <p className="text-white/80 text-sm">בממוצע, תוך 5 דקות מישהו מחכה</p>
            </div>
            <div>
              <div className="text-4xl font-black text-white mb-2">💰</div>
              <p className="text-white/80 text-sm">מחירים הוגנים ותחרותיים</p>
            </div>
            <div>
              <div className="text-4xl font-black text-white mb-2">⭐</div>
              <p className="text-white/80 text-sm">דירוגים וביקורות אמיתיות</p>
            </div>
          </div>
        </div>
      </section>

      {/* Signup Form */}
      <section id="signup" className="px-4 py-20">
        <div className="max-w-lg mx-auto">
          <h3 className="text-3xl font-black text-center mb-4" style={{ color: '#0f2b6b' }}>
            הרשם לגישה מוקדמת
          </h3>
          <p className="text-center text-gray-600 mb-10">
            היה בין הראשונים שיגישו ויקבלו משימות בפלטפורמה החדשה
          </p>

          {submitted ? (
            <div className="bg-green-50 border border-green-200 rounded-2xl p-8 text-center">
              <Check className="w-16 h-16 text-green-600 mx-auto mb-4" />
              <h4 className="font-bold text-green-900 text-lg mb-2">תודה על ההרשמה! 🎉</h4>
              <p className="text-green-700 text-sm">
                נשלח לך אימייל. נחכה ליום ההשקה הרשמי!
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  שם מלא
                </label>
                <Input
                  type="text"
                  placeholder="יוסי כהן"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="h-12 rounded-xl text-base"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  אימייל *
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
                  <Input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-12 pl-10 rounded-xl text-base"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  טלפון
                </label>
                <Input
                  type="tel"
                  placeholder="050-123-4567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="h-12 rounded-xl text-base"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  מה אתה מחפש?
                </label>
                <div className="space-y-2">
                  {[
                    { value: 'worker', label: '👷 אני רוצה להרוויח כעובד' },
                    { value: 'client', label: '💼 אני צריך עזרה בביצוע משימות' },
                    { value: 'both', label: '🎯 שניהם' },
                  ].map((option) => (
                    <label key={option.value} className="flex items-center p-3 border border-gray-200 rounded-xl cursor-pointer hover:bg-blue-50 transition-colors" style={{ borderColor: interestType === option.value ? '#1a6fd4' : '#dce8f5', background: interestType === option.value ? '#eff6ff' : 'white' }}>
                      <input
                        type="radio"
                        name="interestType"
                        value={option.value}
                        checked={interestType === option.value}
                        onChange={(e) => setInterestType(e.target.value)}
                        className="w-4 h-4 ml-3"
                      />
                      <span className="font-medium text-gray-700">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-14 rounded-2xl text-base font-bold bg-primary hover:bg-primary/90 text-white shadow-md"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 ml-2 animate-spin" />
                    שומר...
                  </>
                ) : (
                  <>
                    <Check className="w-5 h-5 ml-2" />
                    הרשם עכשיו
                  </>
                )}
              </Button>

              <p className="text-xs text-center text-gray-500 mt-4">
                אתה לא תקבל ספאם. אנו רק נשלח לך עדכון כשאנחנו חיים.
              </p>
            </form>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white">
        <div className="max-w-4xl mx-auto px-4 py-12 text-center">
          <p className="text-sm text-gray-600 mb-4">
            © 2026 Joba24. כל הזכויות שמורות.
          </p>
          <p className="text-xs text-gray-500">
            אתה על דף הרשמה מוקדם. בקרוב נפתח לכולם!
          </p>
        </div>
      </footer>
    </div>
  );
}