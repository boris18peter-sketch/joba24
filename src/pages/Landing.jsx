import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Mail, Check, Zap, Clock, MapPin, CheckCircle2, Loader2 } from 'lucide-react';
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
      <section className="px-4 pt-16 pb-20" style={{ background: 'linear-gradient(135deg, #f4f7fb 0%, #eff6ff 100%)' }}>
        <div className="max-w-2xl mx-auto text-center">
          <div className="text-6xl mb-6 animate-bounce">💡</div>
          <h2 className="text-4xl font-black mb-4" style={{ color: '#0f2b6b' }}>
            כל משימה יכולה להיפתר בדקות
          </h2>
          <p className="text-lg text-gray-600 mb-8 leading-relaxed">
            יש לך משימה קטנה או גדולה? צריך עזרה בפרוייקט? Joba24 מחברת בינך לבין עובדים מצוינים שמוכנים לעזור בתוך דקות.
          </p>
          <a href="#signup" className="inline-block">
            <Button className="h-14 px-8 text-base font-bold rounded-2xl bg-primary hover:bg-primary/90 text-white shadow-lg">
              הרשם לגישה מוקדמת
            </Button>
          </a>
        </div>
      </section>

      {/* Features */}
      <section className="px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <h3 className="text-2xl font-black text-center mb-12" style={{ color: '#0f2b6b' }}>
            למה לבחור Joba24?
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

          {/* Use Cases */}
          <h3 className="text-2xl font-black text-center mb-8" style={{ color: '#0f2b6b' }}>
            משימות שאנשים עושים
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: '🔧', label: 'תיקון בבית' },
              { icon: '🚚', label: 'הובלה' },
              { icon: '🧹', label: 'ניקיון' },
              { icon: '💻', label: 'עבודה בדיגיטל' },
              { icon: '📦', label: 'משלוח' },
              { icon: '🌳', label: 'עבודות גינה' },
              { icon: '👶', label: 'טיפול בילדים' },
              { icon: '⭐', label: 'ועוד הרבה...' },
            ].map((item, i) => (
              <div key={i} className="bg-white rounded-xl p-4 border border-gray-100 text-center shadow-sm">
                <div className="text-4xl mb-2">{item.icon}</div>
                <p className="text-sm font-semibold text-gray-700">{item.label}</p>
              </div>
            ))}
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