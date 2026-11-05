/**
 * facebookPost — the ONE place a task becomes a Facebook post.
 *
 * ── WHAT THIS REPLACED, AND WHY ────────────────────────────────────────────
 * The old post was a "card": two rows of box-drawing characters, a generic
 * "🔔 עבודה חדשה ב-Joba24" headline, then the title, the WHOLE description and a
 * divider. In a feed that reads as a system notification, and the length alone
 * pushed the task behind "See more" — the one thing a Marketplace-style post
 * cannot afford.
 *
 * A feed post is a headline, not a listing page. So the post is now four short
 * blocks: the task title, where/when how much, one line of context when it fits,
 * and the link. Nothing decorative, no separators, and the task itself is the
 * first thing on the screen.
 *
 * ── WHAT FACEBOOK DOES WITH IT ─────────────────────────────────────────────
 * The Graph API has NO font-size control and no "large text" parameter: that
 * presentation belongs to Facebook's own composer. `message` is plain text, so
 * the only levers are line breaks, emoji and LENGTH. Everything here therefore
 * optimises for the shortest post that still carries the task — see the budgets
 * below, all of which exist to keep the link inside the visible area.
 *
 * ── NOTHING IS INVENTED ────────────────────────────────────────────────────
 * City and price appear only when the task actually has them; a task with
 * neither still produces a clean post. The link keeps the existing UTM source,
 * so attribution is unchanged.
 */

export const APP_URL = 'https://joba24.com';

/** A runaway title is clipped at a word boundary rather than truncated blindly. */
const TITLE_MAX = 70;
/** One line of context at most — this is a teaser, not the description. */
const EXCERPT_MAX = 80;
/** Title + meta + excerpt budget, tuned to keep the link above "See more". */
const PRE_LINK_BUDGET = 150;
const SEP = '  |  ';

function clean(value: unknown): string {
  return String(value ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Cut at the last whole word before `max`, with an ellipsis. Never mid-word. */
function clip(text: string, max: number): string {
  if (text.length <= max) return text;
  const head = text.slice(0, max);
  const space = head.lastIndexOf(' ');
  const cut = space > max * 0.6 ? head.slice(0, space) : head;
  return `${cut.trim()}…`;
}

/**
 * Only the publisher's own free text.
 *
 * Some categories append a structured block of form fields to the description
 * (it starts with "--- emoji label ---"). That block is form furniture — it
 * belongs on the task page, not in a feed post.
 */
export function extractMainDescription(description: unknown): string {
  const text = String(description ?? '');
  if (!text) return '';
  const match = text.match(/---[^-].*?---/);
  if (!match || match.index === undefined) return clean(text);
  return clean(text.slice(0, match.index));
}

/** The first sentence, so an excerpt always reads as a finished thought. */
function firstSentence(text: string): string {
  const match = text.match(/^(.+?[.!?])(\s|$)/);
  return match ? match[1] : text;
}

/** ₪ + the number as the task stores it. Empty when the task has no price. */
export function formatPrice(value: unknown): string {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) return '';
  return `₪${new Intl.NumberFormat('he-IL', { maximumFractionDigits: 2 }).format(amount)}`;
}

/** The deep link, with the UTM source the app has always used. */
export function taskLink(task: any): string {
  return `${APP_URL}/task/${task?.id || ''}?utm_source=facebook`;
}

/** "📍 תל אביב  |  💰 ₪350" — each part only when the task provides it. */
export function metaLine(task: any): string {
  const city = clean(task?.city) || clean(task?.location_name);
  const price = formatPrice(task?.price);
  const parts: string[] = [];
  if (city) parts.push(`📍 ${city}`);
  if (price) parts.push(`💰 ${price}`);
  return parts.join(SEP);
}

/**
 * The post itself: title, meta, an optional single line of context, the link.
 *
 * The excerpt is dropped rather than shortened when it would push the post past
 * the budget — a feed post that has to be expanded to reach the link has already
 * lost the reader, and the full text is one tap away.
 */
export function formatFacebookPost(task: any): string {
  const rawTitle = clean(task?.title) || 'משימה חדשה';
  const title = clip(rawTitle, TITLE_MAX);
  const meta = metaLine(task);

  const description = extractMainDescription(task?.description);
  const sentence = description && clean(description) !== clean(task?.title)
    ? clean(firstSentence(description))
    : '';
  const excerpt = sentence && (title.length + meta.length + clip(sentence, EXCERPT_MAX).length) <= PRE_LINK_BUDGET
    ? clip(sentence, EXCERPT_MAX)
    : '';

  const blocks = [`📌 ${title}`];
  if (meta) blocks.push(meta);
  if (excerpt) blocks.push(excerpt);
  blocks.push(`🔗 ${taskLink(task)}`);

  return blocks.join('\n\n');
}