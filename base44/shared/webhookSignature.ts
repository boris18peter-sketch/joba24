/**
 * webhookSignature.ts — proof that a payment notification came from a payment
 * WE started.
 *
 * ── THE HOLE THIS CLOSES ────────────────────────────────────────────────────
 * `tranzilaNotify` is a public endpoint: Tranzila's servers have no Joba24
 * session, so it cannot require a user token. It used to grant Jobas on the
 * strength of two fields inside the posted form — `Response=000` and an
 * `index` — and BOTH are supplied by whoever makes the request.
 *
 * That made the grant forgeable end to end, without paying: any signed-in user
 * could create a pending payment (which hands them its `payment_id`), then POST
 * `Response=000&index=1` to the notify endpoint for that id and be credited the
 * full package value. Nothing in the flow proved a charge had happened.
 *
 * ── THE FIX ─────────────────────────────────────────────────────────────────
 * The notify URL now carries a token that only the SERVER can produce: an HMAC
 * over the payment id, keyed by a server-only secret. The client never sees the
 * key, so it cannot mint a token for a payment id it knows. `tranzilaNotify`
 * refuses to grant anything without a valid one.
 *
 * This is deliberately independent of Tranzila's own signature: their public
 * documentation defines no authenticity mechanism for the DirectNG iframe
 * `notify_url` (`response_hash` covers Hosted Fields only). Authenticating the
 * CALLBACK is therefore our job, and it is the only part of the chain we
 * control.
 *
 * The key is an existing server secret rather than a new one, so no setup step
 * can be missed and a forgotten configuration cannot silently stop payments
 * from being credited. The message is domain-separated, so the same secret used
 * for a Tranzila API call can never be replayed as a callback token.
 */

const enc = new TextEncoder();

/** The secret that keys the token. Server-only; never sent to a client. */
function signingKey(): string {
  return Deno.env.get('TRANZILA_JOBA24_PRIVATE_KEY') || '';
}

async function hmacHex(key: string, message: string): Promise<string> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw', enc.encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, enc.encode(message));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * The token for one payment's callback URL. Empty string when the key is
 * unavailable — callers must treat that as "cannot be signed" and refuse to
 * start the payment rather than fall back to an unsigned URL.
 */
export async function signPaymentCallback(paymentId: string): Promise<string> {
  const key = signingKey();
  if (!key || !paymentId) return '';
  return await hmacHex(key, `joba24:tranzila-notify:${paymentId}`);
}

/**
 * True only when `token` is the token we would have issued for this payment.
 * Compared in constant time so a wrong token leaks nothing about the right one.
 */
export async function verifyPaymentCallback(paymentId: string, token: string | null | undefined): Promise<boolean> {
  if (!paymentId || !token) return false;
  const expected = await signPaymentCallback(paymentId);
  if (!expected || expected.length !== token.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ token.charCodeAt(i);
  }
  return diff === 0;
}

/** The one host a callback URL may point at. */
export const CALLBACK_ORIGIN = 'https://joba24.base44.app';
export const CALLBACK_PATH = '/functions/tranzilaNotify';

/** The signed callback URL for a payment — built server-side, never in a client. */
export async function buildSignedCallbackUrl(paymentId: string): Promise<string> {
  const token = await signPaymentCallback(paymentId);
  if (!token) return '';
  return `${CALLBACK_ORIGIN}${CALLBACK_PATH}?payment_id=${encodeURIComponent(paymentId)}&t=${token}`;
}