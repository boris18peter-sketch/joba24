/**
 * City label translations — maps stored Hebrew city names to display labels
 * in all supported languages. Used by getCityLabel(city, lang).
 * Hebrew is the storage key (returned as-is).
 */
export const CITY_LABELS = {
  'תל אביב':     { en: 'Tel Aviv', ar: 'تل أبيب', ru: 'Тель-Авив', zh: '特拉维夫', hi: 'तेल अवीव', fil: 'Tel Aviv', es: 'Tel Aviv', fr: 'Tel Aviv' },
  'הרצליה':       { en: 'Herzliya', ar: 'هرتسليا', ru: 'Херцлия', zh: '赫尔兹利亚', hi: 'हर्ज़लिया', fil: 'Herzliya', es: 'Herzliya', fr: 'Herzliya' },
  'גבעתיים':      { en: 'Givatayim', ar: 'جفعاتايم', ru: 'Гиватаим', zh: '吉瓦塔伊姆', hi: 'गिवताइम', fil: 'Givatayim', es: 'Givatayim', fr: 'Givatayim' },
  'רמת השרון':    { en: 'Ramat HaSharon', ar: 'رمت هشارون', ru: 'Рамат-ха-Шарон', zh: '拉马特沙隆', hi: 'रमत हाशरोन', fil: 'Ramat HaSharon', es: 'Ramat HaSharon', fr: 'Ramat HaSharon' },
  'רמת גן':       { en: 'Ramat Gan', ar: 'رمت غان', ru: 'Рамат-Ган', zh: '拉马特甘', hi: 'रमत गन', fil: 'Ramat Gan', es: 'Ramat Gan', fr: 'Ramat Gan' },
  'חולון':         { en: 'Holon', ar: 'حولون', ru: 'Холон', zh: '霍隆', hi: 'होलोन', fil: 'Holon', es: 'Holon', fr: 'Holon' },
  'ראשון לציון':  { en: 'Rishon LeZion', ar: 'ريشون لتسيون', ru: 'Ришон-ле-Цион', zh: '里雄莱锡安', hi: 'रिशोन लेज़ियन', fil: 'Rishon LeZion', es: 'Rishon LeZion', fr: 'Rishon LeZion' },
  'בת ים':        { en: 'Bat Yam', ar: 'بات يام', ru: 'Бат-Ям', zh: '巴特亚姆', hi: 'बत यम', fil: 'Bat Yam', es: 'Bat Yam', fr: 'Bat Yam' },
  'בני ברק':      { en: 'Bnei Brak', ar: 'بني براك', ru: 'Бней-Брак', zh: '布内布拉克', hi: 'बनेई ब्राक', fil: 'Bnei Brak', es: 'Bnei Brak', fr: 'Bnei Brak' },
  'פתח תקווה':    { en: 'Petah Tikva', ar: 'بيتح تكفا', ru: 'Петах-Тиква', zh: '佩塔提克瓦', hi: 'पेटह तिकवा', fil: 'Petah Tikva', es: 'Petah Tikva', fr: 'Petah Tikva' },
  'רעננה':         { en: 'Raanana', ar: 'رعنانا', ru: 'Раанана', zh: '拉阿纳纳', hi: 'रानाना', fil: 'Raanana', es: 'Raanana', fr: 'Raanana' },
  'נתניה':         { en: 'Netanya', ar: 'نتانيا', ru: 'Нетания', zh: '内坦亚', hi: 'नेतान्या', fil: 'Netanya', es: 'Netanya', fr: 'Netanya' },
  'כפר סבא':      { en: 'Kfar Saba', ar: 'كفار سابا', ru: 'Кфар-Саба', zh: '卡法萨巴', hi: 'कफ़र साबा', fil: 'Kfar Saba', es: 'Kfar Saba', fr: 'Kfar Saba' },
  'הוד השרון':    { en: 'Hod HaSharon', ar: 'هود هشارون', ru: 'Ход-ха-Шарон', zh: '霍德夏隆', hi: 'होड हाशरोन', fil: 'Hod HaSharon', es: 'Hod HaSharon', fr: 'Hod HaSharon' },
  'נס ציונה':     { en: 'Nes Ziona', ar: 'نس تسيونا', ru: 'Нес-Циона', zh: '内斯齐奥纳', hi: 'नेस ज़ियोना', fil: 'Nes Ziona', es: 'Nes Ziona', fr: 'Nes Ziona' },
  'רחובות':        { en: 'Rehovot', ar: 'رحوفوت', ru: 'Реховот', zh: '雷霍沃特', hi: 'रेहोवोट', fil: 'Rehovot', es: 'Rehovot', fr: 'Rehovot' },
  'אור יהודה':    { en: 'Or Yehuda', ar: 'أور يهودا', ru: 'Ор-Иегуда', zh: '奥尔耶胡达', hi: 'ओर येहुदा', fil: 'Or Yehuda', es: 'Or Yehuda', fr: 'Or Yehuda' },
  'קרית אונו':    { en: 'Kiryat Ono', ar: 'كريات أونو', ru: 'Кирьят-Оно', zh: '基里亚特奥诺', hi: 'किर्यात ओनो', fil: 'Kiryat Ono', es: 'Kiryat Ono', fr: 'Kiryat Ono' },
  'ירושלים':      { en: 'Jerusalem', ar: 'القدس', ru: 'Иерусалим', zh: '耶路撒冷', hi: 'यरूशलम', fil: 'Jerusalem', es: 'Jerusalén', fr: 'Jérusalem' },
  'בית שמש':      { en: 'Beit Shemesh', ar: 'بيت شيمش', ru: 'Бейт-Шемеш', zh: '贝特谢梅什', hi: 'बेइत शेमेश', fil: 'Beit Shemesh', es: 'Beit Shemesh', fr: 'Beit Shemesh' },
  'מודיעין':      { en: 'Modiin', ar: 'موديعين', ru: 'Модиин', zh: '莫迪因', hi: 'मोदीइन', fil: 'Modiin', es: 'Modiin', fr: 'Modiin' },
  'חיפה':          { en: 'Haifa', ar: 'حيفا', ru: 'Хайфа', zh: '海法', hi: 'हैफा', fil: 'Haifa', es: 'Haifa', fr: 'Haifa' },
  'נשר':           { en: 'Nesher', ar: 'نشر', ru: 'Нешер', zh: '内谢尔', hi: 'नेशेर', fil: 'Nesher', es: 'Nesher', fr: 'Nesher' },
  'טירת כרמל':    { en: 'Tirat Carmel', ar: 'تيرات الكرمل', ru: 'Тират-Кармель', zh: '提拉特卡梅尔', hi: 'तिरात कार्मेल', fil: 'Tirat Carmel', es: 'Tirat Carmel', fr: 'Tirat Carmel' },
  'חדרה':          { en: 'Hadera', ar: 'حديرا', ru: 'Хадера', zh: '哈代拉', hi: 'हाडेरा', fil: 'Hadera', es: 'Hadera', fr: 'Hadera' },
  'באר שבע':      { en: 'Beer Sheva', ar: 'بئر السبع', ru: 'Беэр-Шева', zh: '贝尔谢巴', hi: 'बीर शेवा', fil: 'Beer Sheva', es: 'Beer Sheva', fr: 'Beer Sheva' },
  'אשדוד':         { en: 'Ashdod', ar: 'أشدود', ru: 'Ашдод', zh: '阿什杜德', hi: 'अशदोद', fil: 'Ashdod', es: 'Ashdod', fr: 'Ashdod' },
  'אשקלון':       { en: 'Ashkelon', ar: 'عسقلان', ru: 'Ашкелон', zh: '阿什凯隆', hi: 'अश्केलोन', fil: 'Ashkelon', es: 'Ashkelon', fr: 'Ashkelon' },
  'קרית גת':      { en: 'Kiryat Gat', ar: 'كريات غات', ru: 'Кирьят-Гат', zh: '基里亚特加特', hi: 'किर्यात गत', fil: 'Kiryat Gat', es: 'Kiryat Gat', fr: 'Kiryat Gat' },
  'נתיבות':        { en: 'Netivot', ar: 'نتيفوت', ru: 'Нативот', zh: '内蒂沃特', hi: 'नेतिवोत', fil: 'Netivot', es: 'Netivot', fr: 'Netivot' },
  'שדרות':         { en: 'Sderot', ar: 'سديروت', ru: 'Сдерот', zh: '斯德罗特', hi: 'स्डेरोत', fil: 'Sderot', es: 'Sderot', fr: 'Sderot' },
  'עפולה':         { en: 'Afula', ar: 'العفولة', ru: 'Афула', zh: '阿富拉', hi: 'अफुला', fil: 'Afula', es: 'Afula', fr: 'Afula' },
  'נצרת':          { en: 'Nazareth', ar: 'الناصرة', ru: 'Назарет', zh: '拿撒勒', hi: 'नाज़रथ', fil: 'Nazareth', es: 'Nazaret', fr: 'Nazareth' },
  'נוף הגליל':    { en: 'Nof HaGalil', ar: 'نوف هغاليل', ru: 'Ноф-ха-Галиль', zh: '诺夫哈加利利', hi: 'नोफ हागालिल', fil: 'Nof HaGalil', es: 'Nof HaGalil', fr: 'Nof HaGalil' },
  'טבריה':         { en: 'Tiberias', ar: 'طبريا', ru: 'Тверия', zh: '提比里亚', hi: 'टिबेरियास', fil: 'Tiberias', es: 'Tiberíades', fr: 'Tibériade' },
  'כרמיאל':       { en: 'Karmiel', ar: 'كرميئيل', ru: 'Кармиэль', zh: '卡尔米埃尔', hi: 'कार्मिएल', fil: 'Karmiel', es: 'Karmiel', fr: 'Karmiel' },
  'עכו':           { en: 'Acre', ar: 'عكا', ru: 'Акко', zh: '阿卡', hi: 'अक्को', fil: 'Acre', es: 'Acre', fr: 'Saint-Jean-d\'Acre' },
  'אילת':          { en: 'Eilat', ar: 'إيلات', ru: 'Эйлат', zh: '埃拉特', hi: 'एलात', fil: 'Eilat', es: 'Eilat', fr: 'Eilat' },
  'דימונה':        { en: 'Dimona', ar: 'ديمونا', ru: 'Димона', zh: '迪莫纳', hi: 'डिमोना', fil: 'Dimona', es: 'Dimona', fr: 'Dimona' },
  'ערד':           { en: 'Arad', ar: 'عراد', ru: 'Арад', zh: '阿拉德', hi: 'अराद', fil: 'Arad', es: 'Arad', fr: 'Arad' },
  'ירוחם':         { en: 'Yeruham', ar: 'يروحام', ru: 'Иерухам', zh: '耶鲁哈姆', hi: 'यरुहाम', fil: 'Yeruham', es: 'Yeruham', fr: 'Yeruham' },
  'אום אל פחם':   { en: 'Umm al-Fahm', ar: 'أم الفحم', ru: 'Умм-эль-Фахм', zh: '乌姆法赫姆', hi: 'उम्म अल-फ़ह्म', fil: 'Umm al-Fahm', es: 'Umm al-Fahm', fr: 'Umm al-Fahm' },
  'טייבה':         { en: 'Tayibe', ar: 'الطيبة', ru: 'Тайбе', zh: '泰伊贝', hi: 'तयिबे', fil: 'Tayibe', es: 'Tayibe', fr: 'Tayibe' },
  'טירה':          { en: 'Tira', ar: 'الطيرة', ru: 'Тира', zh: '提拉', hi: 'तिरा', fil: 'Tira', es: 'Tira', fr: 'Tira' },
  'קלנסווה':      { en: 'Kalansua', ar: 'قلنسوة', ru: 'Калансуа', zh: '卡兰苏瓦', hi: 'कलांसुवा', fil: 'Kalansua', es: 'Kalansua', fr: 'Kalansua' },
  'קרית שמונה':   { en: 'Kiryat Shmona', ar: 'كريات شمونه', ru: 'Кирьят-Шмона', zh: '基里亚特什莫纳', hi: 'किर्यात श्मोना', fil: 'Kiryat Shmona', es: 'Kiryat Shmona', fr: 'Kiryat Shmona' },
  'בית שאן':      { en: 'Beit Shean', ar: 'بيسان', ru: 'Бейт-Шеан', zh: '贝特谢安', hi: 'बेइत शेआन', fil: 'Beit Shean', es: 'Beit Shean', fr: 'Beit Shean' },
  'מעלות':         { en: 'Maalot', ar: 'معالوت', ru: 'Маалот', zh: '马阿洛特', hi: 'मालोत', fil: 'Maalot', es: 'Maalot', fr: 'Maalot' },
  'צפת':           { en: 'Safed', ar: 'صفد', ru: 'Цфат', zh: '采法特', hi: 'सफ़ेद', fil: 'Safed', es: 'Safed', fr: 'Safed' },
  'אחר':           { en: 'Other', ar: 'أخرى', ru: 'Другое', zh: '其他', hi: 'अन्य', fil: 'Iba', es: 'Otros', fr: 'Autres' },
};

/**
 * Returns the display label for a city in the given language.
 * Falls back to the original stored value (Hebrew) if no translation found.
 */
export function getCityLabel(city, lang) {
  if (!city) return '';
  if (!lang || lang === 'he') return city;
  const entry = CITY_LABELS[city];
  if (entry && entry[lang]) return entry[lang];
  return city;
}