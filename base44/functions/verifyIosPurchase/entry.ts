import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * verifyIosPurchase — verifies an Apple In-App Purchase signed transaction
 * (StoreKit 2 JWS) server-side and grants Jobas credits.
 *
 * The JWS is verified fully on-chain with ZERO Apple secrets:
 *   1. The JWS signature is checked with the leaf certificate's public key.
 *   2. The leaf→intermediate→root certificate chain signatures are verified.
 *   3. The root certificate is pinned by SHA-256 fingerprint to
 *      "Apple Root CA - G3" (Apple's official trusted root certificates list).
 *
 * Idempotent: the Apple transaction_id is stored in IosPurchase — a receipt is
 * only ever credited once, so a replayed JWS grants nothing.
 *
 * Input:   { jws }
 * Returns: { success, credits_granted, new_balance, duplicate? }
 */

// SHA-256 fingerprint (hex, no separators) of the DER form of
// "Apple Root CA - G3" — per Apple's trusted root certificates list.
const APPLE_ROOT_CA_G3_SHA256_HEX = '63343abfb89a6a03ebb57e9b3f5fa7be7c4f5c756f3017b3a8c488c3653e9179';

// IAP product ids — must match the products created in App Store Connect
// EXACTLY. Values = Jobas credits granted per purchase / per renewal month.
const IAP_CONSUMABLES = {
  'com.joba24.jobas5': 5,
  'com.joba24.jobas14': 14,
  'com.joba24.jobas29': 29,
  'com.joba24.jobas60': 60,
  'com.joba24.jobas100': 100,
  'com.joba24.jobas135': 135,
};
const IAP_SUBSCRIPTIONS = {
  'com.joba24.sub20': 20,
  'com.joba24.sub45': 45,
  'com.joba24.sub95': 95,
  'com.joba24.sub145': 145,
  'com.joba24.sub190': 190,
};

// ── Minimal ASN.1 DER helpers ────────────────────────────────────────────────

// Parse one TLV node at `offset`. Returns { tag, content, full } slices.
function readTLV(buf, offset) {
  if (offset >= buf.length) return null;
  const tag = buf[offset];
  let pos = offset + 1;
  if (pos >= buf.length) return null;
  let len = 0;
  const first = buf[pos];
  pos += 1;
  if (first & 0x80) {
    const numBytes = first & 0x7f;
    if (numBytes === 0 || numBytes > 4 || pos + numBytes > buf.length) return null;
    for (let i = 0; i < numBytes; i++) {
      len = (len << 8) | buf[pos];
      pos += 1;
    }
  } else {
    len = first;
  }
  const contentStart = pos;
  if (contentStart + len > buf.length) return null;
  return {
    tag,
    content: buf.slice(contentStart, contentStart + len),
    full: buf.slice(offset, contentStart + len),
  };
}

// Parse the direct children of a TLV's content.
function readChildren(content) {
  const children = [];
  let offset = 0;
  while (offset < content.length) {
    const tlv = readTLV(content, offset);
    if (!tlv) break;
    children.push(tlv);
    offset += tlv.full.length;
  }
  return children;
}

function toHex(buf) {
  let out = '';
  for (const b of buf) out += b.toString(16).padStart(2, '0');
  return out;
}

// base64 / base64url string → bytes
function b64ToBytes(b64) {
  const normalized = b64.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  let bin;
  try {
    bin = atob(padded);
  } catch {
    throw new Error('Malformed JWS');
  }
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

// Minimal X.509 certificate: exposes the signed bytes (tbs), the signature,
// the signature algorithm and the SubjectPublicKeyInfo.
class Certificate {
  constructor(der) {
    const outer = readTLV(der, 0);
    if (!outer || outer.tag !== 0x30) throw new Error('Invalid certificate DER');
    const kids = readChildren(outer.content);
    if (kids.length < 3 || kids[2].tag !== 0x03) throw new Error('Invalid certificate structure');
    this.der = der;
    this.tbs = kids[0].full; // the signed bytes
    this.sigAlg = kids[1].full;
    this.sig = kids[2].content.slice(1); // skip BIT STRING unused-bits byte
    const tbsOuter = readTLV(this.tbs, 0);
    const tbsKids = readChildren(tbsOuter.content);
    // tbs children: [version?], serial, sigAlg, issuer, validity, subject, SPKI, [ext]
    const spkiIndex = tbsKids.length > 0 && tbsKids[0].tag === 0xa0 ? 6 : 5;
    if (tbsKids.length <= spkiIndex || tbsKids[spkiIndex].tag !== 0x30) {
      throw new Error('Certificate missing SPKI');
    }
    this.spki = tbsKids[spkiIndex].full;
  }
}

// Digest the certificate's signatureAlgorithm OID → WebCrypto hash name.
function ecHashFromAlg(sigAlgFull) {
  const alg = readTLV(sigAlgFull, 0);
  const kids = readChildren(alg.content);
  if (!kids.length) return null;
  const oid = toHex(kids[0].content);
  if (oid === '2a8648ce3d040302') return 'SHA-256'; // ecdsa-with-SHA256
  if (oid === '2a8648ce3d040303') return 'SHA-384'; // ecdsa-with-SHA384
  return null;
}

// Curve name from the SPKI algorithm OID.
function curveFromSpki(spkiFull) {
  const outer = readTLV(spkiFull, 0);
  const kids = readChildren(outer.content);
  if (!kids.length || kids[0].tag !== 0x30) return null;
  const algKids = readChildren(kids[0].content);
  if (!algKids.length) return null;
  const oid = toHex(algKids[0].content);
  if (oid === '2a8648ce3d030107') return 'P-256'; // secp256r1
  if (oid === '2b81040022') return 'P-384'; // secp384r1
  return null;
}

async function ecdsaVerify(spkiFull, hashName, data, sigDer) {
  const curve = curveFromSpki(spkiFull);
  if (!curve) return false;
  const key = await crypto.subtle.importKey('spki', spkiFull, { name: 'ECDSA', namedCurve: curve }, false, ['verify']);
  return await crypto.subtle.verify({ name: 'ECDSA', hash: { name: hashName } }, key, sigDer, data);
}

async function sha256Hex(bytes) {
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
  return toHex(digest);
}

// Convert a raw (r||s) JWS ECDSA signature to DER encoding for WebCrypto.
function rawEcdsaToDer(raw) {
  const half = raw.length / 2;
  const part = (buf) => {
    let start = 0;
    while (start < buf.length - 1 && buf[start] === 0) start++;
    let bytes = buf.slice(start);
    if (bytes[0] & 0x80) {
      const padded = new Uint8Array(bytes.length + 1);
      padded.set(bytes, 1);
      bytes = padded;
    }
    return new Uint8Array([0x02, bytes.length, ...bytes]);
  };
  const rInt = part(raw.slice(0, half));
  const sInt = part(raw.slice(half));
  const body = new Uint8Array(rInt.length + sInt.length);
  body.set(rInt, 0);
  body.set(sInt, rInt.length);
  return new Uint8Array([0x30, body.length, ...body]);
}

// ── JWS chain verification ───────────────────────────────────────────────────

async function verifySignedTransaction(jws) {
  const parts = jws.split('.');
  if (parts.length !== 3) throw new Error('Malformed JWS');
  const header = JSON.parse(new TextDecoder().decode(b64ToBytes(parts[0])));
  if (!Array.isArray(header.x5c) || header.x5c.length < 3) {
    throw new Error('JWS missing certificate chain');
  }

  const leaf = new Certificate(b64ToBytes(header.x5c[0]));
  const intermediate = new Certificate(b64ToBytes(header.x5c[header.x5c.length - 2]));
  const root = new Certificate(b64ToBytes(header.x5c[header.x5c.length - 1]));

  // 1. Pin the root certificate to Apple Root CA - G3
  const rootFingerprint = await sha256Hex(root.der);
  if (rootFingerprint !== APPLE_ROOT_CA_G3_SHA256_HEX) {
    throw new Error('Untrusted certificate chain');
  }

  // 2. The intermediate must be signed by the (pinned) root
  const interHash = ecHashFromAlg(intermediate.sigAlg);
  if (!interHash || !(await ecdsaVerify(root.spki, interHash, intermediate.tbs, intermediate.sig))) {
    throw new Error('Invalid intermediate certificate');
  }

  // 3. The leaf must be signed by the intermediate
  const leafHash = ecHashFromAlg(leaf.sigAlg);
  if (!leafHash || !(await ecdsaVerify(intermediate.spki, leafHash, leaf.tbs, leaf.sig))) {
    throw new Error('Invalid leaf certificate');
  }

  // 4. The JWS payload must be signed by the leaf's key (Apple uses ES256)
  const signingInput = new TextEncoder().encode(parts[0] + '.' + parts[1]);
  const sigOk = await ecdsaVerify(leaf.spki, 'SHA-256', signingInput, rawEcdsaToDer(b64ToBytes(parts[2])));
  if (!sigOk) throw new Error('Invalid JWS signature');

  return JSON.parse(new TextDecoder().decode(b64ToBytes(parts[1])));
}

// ── Handler ──────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { jws } = body;
    if (!jws || typeof jws !== 'string') {
      return Response.json({ error: 'Missing jws' }, { status: 400 });
    }

    // Full on-chain verification of Apple's signed transaction
    const tx = await verifySignedTransaction(jws);

    const productId = tx.productId;
    const isConsumable = productId in IAP_CONSUMABLES;
    const isSubscription = productId in IAP_SUBSCRIPTIONS;
    if (!isConsumable && !isSubscription) {
      return Response.json({ success: false, error: 'Unknown product' }, { status: 400 });
    }
    const expectedType = isSubscription ? 'Auto-Renewable Subscription' : 'Consumable';
    if (tx.type && tx.type !== expectedType) {
      return Response.json({ success: false, error: `Expected a ${expectedType} purchase` }, { status: 400 });
    }
    if (tx.revocationDate) {
      return Response.json({ success: false, error: 'Transaction was revoked' }, { status: 400 });
    }
    const environment = tx.environment === 'Production' ? 'Production' : 'Sandbox';

    const transactionId = String(tx.transactionId || '');
    if (!transactionId) {
      return Response.json({ error: 'Missing transactionId' }, { status: 400 });
    }

    // Idempotency — never grant twice for the same Apple transaction
    const existing = await base44.asServiceRole.entities.IosPurchase.filter({ transaction_id: transactionId });
    if (existing.length > 0) {
      return Response.json({
        success: true,
        duplicate: true,
        credits_granted: 0,
        new_balance: user.worker_credits ?? 0,
      });
    }

    // Subscriptions always grant a single monthly allowance; consumables
    // honor the purchased quantity.
    const quantity = isSubscription ? 1 : Math.max(1, Number(tx.quantity) || 1);
    const credits = (isSubscription ? IAP_SUBSCRIPTIONS[productId] : IAP_CONSUMABLES[productId]) * quantity;
    const newBalance = (user.worker_credits ?? 0) + credits;

    await base44.asServiceRole.entities.User.update(user.id, { worker_credits: newBalance });

    await base44.asServiceRole.entities.CreditTransaction.create({
      user_id: user.id,
      amount: credits,
      type: 'Purchase',
      balance_after: newBalance,
      note: isSubscription
        ? `מנוי חודשי — ${credits} ג'ובות לחודש · Apple IAP (${environment})`
        : `טעינת ${credits} ג'ובות — Apple In-App Purchase (${environment})`,
    });

    await base44.asServiceRole.entities.IosPurchase.create({
      user_id: user.id,
      product_id: productId,
      credits,
      transaction_id: transactionId,
      original_transaction_id: String(tx.originalTransactionId || ''),
      environment,
      purchase_date: tx.purchaseDate ? new Date(tx.purchaseDate).toISOString() : new Date().toISOString(),
      expiration_date: (isSubscription && tx.expiresDate) ? new Date(tx.expiresDate).toISOString() : null,
      status: 'verified',
    });

    console.log(`✅ Apple IAP ${transactionId} verified (${environment}) — ${credits} credits granted to ${user.id}, balance: ${newBalance}`);

    return Response.json({ success: true, credits_granted: credits, new_balance: newBalance });
  } catch (error) {
    console.error('❌ verifyIosPurchase error:', error);
    return Response.json({ success: false, error: error.message }, { status: 400 });
  }
});