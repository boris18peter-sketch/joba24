/**
 * appleVerify — on-chain verification of Apple's signed JWS payloads.
 *
 * Verifies WITHOUT any Apple secret:
 *   1. The JWS signature is checked with the leaf certificate's public key.
 *   2. The leaf → intermediate → root certificate chain signatures are verified.
 *   3. The root certificate is pinned by SHA-256 fingerprint to
 *      "Apple Root CA - G3" (Apple's official trusted root certificates list).
 *
 * Used by BOTH the device-facing verification (verifyIosPurchase) and the
 * server-to-server App Store Server Notifications V2 endpoint
 * (appleServerNotifications), so there is exactly one verification
 * implementation in the system.
 */

// SHA-256 fingerprint (hex, no separators) of the DER form of
// "Apple Root CA - G3" — per Apple's trusted root certificates list.
const APPLE_ROOT_CA_G3_SHA256_HEX = '63343abfb89a6a03ebb57e9b3f5fa7be7c4f5c756f3017b3a8c488c3653e9179';

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

// A certificate's signatureAlgorithm OID → the WebCrypto algorithm to use.
// Apple's chain is ECDSA today, but the intermediates issued by Apple Root CA
// have historically been RSA — both must be supported or a valid chain is
// rejected as "Invalid intermediate certificate".
const SIG_ALGS = {
  '2a8648ce3d040302': { kind: 'ecdsa', hash: 'SHA-256' }, // ecdsa-with-SHA256
  '2a8648ce3d040303': { kind: 'ecdsa', hash: 'SHA-384' }, // ecdsa-with-SHA384
  '2a864886f70d01010b': { kind: 'rsa', hash: 'SHA-256' }, // sha256WithRSAEncryption
  '2a864886f70d01010c': { kind: 'rsa', hash: 'SHA-384' }, // sha384WithRSAEncryption
  '2a864886f70d01010d': { kind: 'rsa', hash: 'SHA-512' }, // sha512WithRSAEncryption
  '2a864886f70d010105': { kind: 'rsa', hash: 'SHA-1' },   // sha1WithRSAEncryption
};

function sigAlgInfo(sigAlgFull) {
  const alg = readTLV(sigAlgFull, 0);
  if (!alg) return null;
  const kids = readChildren(alg.content);
  if (!kids.length) return null;
  return SIG_ALGS[toHex(kids[0].content)] || null;
}

// The key algorithm of an SPKI, plus the SPKI itself.
function spkiKeyInfo(spkiFull) {
  const outer = readTLV(spkiFull, 0);
  if (!outer) return null;
  const kids = readChildren(outer.content);
  if (!kids.length || kids[0].tag !== 0x30) return null;
  const algKids = readChildren(kids[0].content);
  if (!algKids.length) return null;
  // AlgorithmIdentifier = SEQUENCE { keyAlgorithmOID, [parameters] }.
  // For an EC key the first OID is id-ecPublicKey and the CURVE is the second
  // element (a namedCurve OID). Reading the first one never matches a curve,
  // which made every ECDSA verification silently return false.
  const paramOid = algKids.length > 1 && algKids[1].tag === 0x06
    ? toHex(algKids[1].content)
    : null;
  return { oid: toHex(algKids[0].content), paramOid, spki: spkiFull };
}

// Curve name from the SPKI's namedCurve parameter OID.
function curveFromSpki(spkiFull) {
  const info = spkiKeyInfo(spkiFull);
  if (!info) return null;
  if (info.paramOid === '2a8648ce3d030107') return 'P-256'; // secp256r1
  if (info.paramOid === '2b81040022') return 'P-384'; // secp384r1
  return null;
}

// Raw (r||s) ECDSA signature length for a curve — the format WebCrypto expects.
function curveByteLength(curve) {
  if (curve === 'P-256') return 32;
  if (curve === 'P-384') return 48;
  return null;
}

/**
 * X.509 signatures are ASN.1 DER { r, s }, but WebCrypto's ECDSA verify wants
 * the raw IEEE-P1363 (r||s) form. Feeding DER straight to WebCrypto makes every
 * signature check fail — which is what rejected Apple's certificate chain.
 */
function derEcdsaToRaw(der, size) {
  const outer = readTLV(der, 0);
  if (!outer || outer.tag !== 0x30) return null;
  const kids = readChildren(outer.content);
  if (kids.length < 2 || kids[0].tag !== 0x02 || kids[1].tag !== 0x02) return null;
  const out = new Uint8Array(size * 2);
  const write = (intContent, offset) => {
    let v = intContent;
    while (v.length > size && v[0] === 0) v = v.slice(1); // strip DER sign padding
    if (v.length > size) return false;
    out.set(v, offset + (size - v.length));
    return true;
  };
  if (!write(kids[0].content, 0) || !write(kids[1].content, size)) return null;
  return out;
}

/**
 * Verify a signature made by `issuerSpki` over `data`, using the signature
 * algorithm declared by the signed certificate.
 */
async function verifyWithIssuer(issuerSpki, sigAlgFull, data, sigBytes) {
  const alg = sigAlgInfo(sigAlgFull);
  if (!alg) return false;
  const info = spkiKeyInfo(issuerSpki);
  if (!info) return false;

  if (alg.kind === 'rsa') {
    if (info.oid !== '2a864886f70d010101') return false; // rsaEncryption
    const key = await crypto.subtle.importKey(
      'spki', info.spki, { name: 'RSASSA-PKCS1-v1_5', hash: alg.hash }, false, ['verify'],
    );
    return await crypto.subtle.verify({ name: 'RSASSA-PKCS1-v1_5' }, key, sigBytes, data);
  }

  const curve = curveFromSpki(info.spki);
  const size = curveByteLength(curve);
  if (!size) return false;
  const raw = derEcdsaToRaw(sigBytes, size);
  if (!raw) return false;
  const key = await crypto.subtle.importKey(
    'spki', info.spki, { name: 'ECDSA', namedCurve: curve }, false, ['verify'],
  );
  return await crypto.subtle.verify({ name: 'ECDSA', hash: { name: alg.hash } }, key, raw, data);
}

// Verify a signature that is ALREADY in WebCrypto's raw (r||s) form — the JWS
// signature itself, which Apple emits as ES256.
async function ecdsaVerify(spkiFull, hashName, data, sigRaw) {
  const curve = curveFromSpki(spkiFull);
  if (!curve) return false;
  const key = await crypto.subtle.importKey('spki', spkiFull, { name: 'ECDSA', namedCurve: curve }, false, ['verify']);
  return await crypto.subtle.verify({ name: 'ECDSA', hash: { name: hashName } }, key, sigRaw, data);
}

async function sha256Hex(bytes) {
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
  return toHex(digest);
}

/**
 * Verifies an Apple-signed JWS (StoreKit transaction, renewal info, or an App
 * Store Server Notification V2 payload) and returns its decoded payload object.
 * Throws when the chain, the signature, or the structure is not valid.
 */
export async function verifySignedJws(jws) {
  if (!jws || typeof jws !== 'string') throw new Error('Malformed JWS');
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
  if (!(await verifyWithIssuer(root.spki, intermediate.sigAlg, intermediate.tbs, intermediate.sig))) {
    throw new Error('Invalid intermediate certificate');
  }

  // 3. The leaf must be signed by the intermediate
  if (!(await verifyWithIssuer(intermediate.spki, leaf.sigAlg, leaf.tbs, leaf.sig))) {
    throw new Error('Invalid leaf certificate');
  }

  // 4. The JWS payload must be signed by the leaf's key. Apple emits ES256, and
  // the JWS signature is ALREADY in the raw (r||s) form WebCrypto expects.
  const signingInput = new TextEncoder().encode(parts[0] + '.' + parts[1]);
  const sigOk = await ecdsaVerify(leaf.spki, 'SHA-256', signingInput, b64ToBytes(parts[2]));
  if (!sigOk) throw new Error('Invalid JWS signature');

  return JSON.parse(new TextDecoder().decode(b64ToBytes(parts[1])));
}