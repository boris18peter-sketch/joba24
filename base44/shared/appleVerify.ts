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