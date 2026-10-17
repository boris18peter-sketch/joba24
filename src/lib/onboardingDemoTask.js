/**
 * THE task the onboarding illustrations show, defined once.
 *
 * Every explainer screen — the publish form, the price step, the applicants
 * list, the feed card and the task detail — draws its title, description, price
 * and location from this one object. The visitor therefore sees the SAME job at
 * the SAME price all the way through, instead of two different prices attached
 * to two slightly different jobs.
 */
export const ONBOARDING_TASK = {
  title: 'התקנת גוף תאורה בסלון',
  description: 'צריך להתקין גוף תאורה חדש בתקרת הסלון. יש סולם וכלים בבית.',
  price: 250,
  priceLabel: '₪250',
  category: 'electricity',
  categoryLabel: 'חשמל',
  location: 'רחוב פלורנטין, תל אביב',
  city: 'תל אביב',
  time: 'מחר, 10:00',
};