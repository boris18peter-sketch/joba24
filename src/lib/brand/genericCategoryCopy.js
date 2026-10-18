/**
 * The LAST-RESORT copy for a category that carries no content of its own.
 *
 * Everything else in the content layer comes from the GlobalCategory rows
 * themselves (translated there). This is what shows when even those are empty,
 * so it has to exist in every language too — otherwise the fallback would be the
 * one place Hebrew still leaks through on a French screen.
 */
export const GENERIC_CATEGORY_COPY = {
  he: {
    description_example: 'ספרו בקצרה מה צריך לעשות — כולל כל פרט שיעזור לנותן השירות להבין את העבודה.',
    examples: ['צריך עזרה עם משהו בבית', 'מחפש מישהו שיסדר לי משהו', 'צריך עזרה מקצועית'],
  },
  en: {
    description_example: 'Briefly describe what needs to be done, including any details that will help the service provider understand the job.',
    examples: ['Need help with something at home', 'Looking for someone to fix something for me', 'Need professional help'],
  },
  fr: {
    description_example: "Décrivez brièvement ce qui doit être fait, y compris tout détail qui aidera le prestataire à comprendre le travail.",
    examples: ["Besoin d'aide pour quelque chose à la maison", 'Je cherche quelqu\'un pour réparer quelque chose', "Besoin d'une aide professionnelle"],
  },
  es: {
    description_example: 'Describa brevemente lo que hay que hacer, incluyendo cualquier detalle que ayude al proveedor de servicios a entender el trabajo.',
    examples: ['Necesito ayuda con algo en casa', 'Busco a alguien para que me arregle algo', 'Necesito ayuda profesional'],
  },
  ru: {
    description_example: 'Кратко опишите, что нужно сделать, включая любые детали, которые помогут специалисту понять задачу.',
    examples: ['Нужна помощь по дому', 'Ищу кого-то, кто сможет что-то починить', 'Нужна профессиональная помощь'],
  },
  ar: {
    description_example: 'صف باختصار ما يجب القيام به، بما في ذلك أي تفاصيل ستساعد مقدم الخدمة على فهم المهمة.',
    examples: ['أحتاج إلى مساعدة في شيء ما في المنزل', 'أبحث عن شخص لإصلاح شيء ما لي', 'أحتاج إلى مساعدة مهنية'],
  },
  hi: {
    description_example: 'संक्षेप में बताएं कि क्या करना है, जिसमें ऐसी कोई भी जानकारी शामिल हो जो सेवा प्रदाता को काम समझने में मदद करे।',
    examples: ['घर पर किसी काम के लिए मदद चाहिए', 'मेरे लिए कुछ ठीक करने के लिए किसी की तलाश है', 'पेशेवर मदद की जरूरत है'],
  },
  fil: {
    description_example: 'Ilarawan nang maikli ang kailangang gawin, kasama ang anumang detalye na makakatulong sa service provider na maunawaan ang trabaho.',
    examples: ['Kailangan ng tulong sa isang bagay sa bahay', 'Naghahanap ng taong makakaayos ng isang bagay para sa akin', 'Kailangan ng propesyonal na tulong'],
  },
  zh: {
    description_example: '简要描述需要完成的工作，包括任何有助于服务提供商了解工作的细节。',
    examples: ['需要在家帮忙处理事情', '找人帮我修理东西', '需要专业帮助'],
  },
};

export function genericCategoryCopy(lang) {
  return GENERIC_CATEGORY_COPY[lang] || GENERIC_CATEGORY_COPY.he;
}