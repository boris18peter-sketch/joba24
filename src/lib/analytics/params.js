/**
 * Safe analytics parameter schema.
 *
 * Only the keys listed here ever leave the device. Anything else a caller
 * passes is silently dropped — this is the single choke point that stops
 * private data reaching an advertising platform.
 *
 * NEVER add to this list:
 *   phone, email, full_name, id_number, id_photo_url, address (street /
 *   building / floor / apartment), lat, lng, tokens, card data, KYC documents.
 */

const MAX_STRING = 100;

// key → 'string' | 'number'
const ALLOWED = {
  category: 'string',
  city: 'string',
  urgency: 'string',
  source: 'string',
  content_type: 'string',
  currency: 'string',
  value: 'number',
  task_value: 'number',
  payment_value: 'number',
};

/**
 * Filter and normalise caller-supplied parameters down to the safe schema.
 * Always returns a plain object of primitives (never nested), so every
 * provider can consume it directly.
 */
export function sanitizeParams(input) {
  const out = {};
  if (!input || typeof input !== 'object') return out;

  for (const [key, raw] of Object.entries(input)) {
    const type = ALLOWED[key];
    if (!type) continue;                       // not on the whitelist → drop
    if (raw === null || raw === undefined) continue;

    if (type === 'number') {
      const n = Number(raw);
      if (Number.isFinite(n)) out[key] = n;
    } else {
      const s = String(raw).trim();
      if (s) out[key] = s.slice(0, MAX_STRING);
    }
  }
  return out;
}

/**
 * ISO-4217 currency for money events. Always ILS in Joba24, but kept explicit
 * so every provider receives a currency alongside a value.
 */
export const DEFAULT_CURRENCY = 'ILS';