# JOBA24 — BASE44 DEPENDENCY REGISTER

> **Purpose:** record every significant Base44 dependency, so the platform can be understood, audited and — if ever required — migrated without relying on memory.
> **Status:** analysis only. **Nothing in this document authorises a rewrite, a migration, or any change to production.**
> **Companion documents:** `MULTIBRAND_BLUEPRINT.md` (ADR-16…ADR-22), `MULTIBRAND_RESTORE_RUNBOOK.md` (Part 5).
> **Rule:** Joba24 stays on Base44. This register exists to guarantee we *could* leave, not to plan leaving.

**Difficulty scale:** LOW · MEDIUM · HIGH · CRITICAL
**Last reviewed:** 2026-10-01 (pre-Phase 2)

---

## 0. Verified coupling summary

| Metric | Value |
|---|---|
| Frontend files importing the Base44 SDK client | **96** |
| Backend functions importing `npm:@base44/sdk` | **65 / 65** |
| Functions using `asServiceRole` (bypasses RLS) | **62** |
| Functions with no auth check | **26** |
| Entities | **21** |
| Workflows | **18** |
| Realtime `.subscribe()` sites | **20** |
| `media.base44.com` references | **24** |
| `UploadFile` call sites | **19** |
| `base44.app` hostname references | **6** |
| Secrets read via `Deno.env.get` | **8 keys / 5 functions** |

---

## 1. Database / Entities

| | |
|---|---|
| **Dependency** | Base44 entity store (21 entities, Mongo-style filters, SDK CRUD) |
| **Where used** | 96 frontend files + 65 functions; `base44.entities.<Name>.*` |
| **Capability affected** | The entire marketplace data model |
| **Public-facing** | Indirectly (all public content originates here) |
| **Portable** | ✅ Data is plain JSON with string-id relationships — no proprietary types |
| **Difficulty** | **HIGH** |
| **Replacement** | Any document/relational store. Export per entity; re-create relationships as FKs |
| **Lock-in** | **HIGH** — schema lives in `.jsonc`, queries use SDK filter syntax |

**Notes:** relationships are untyped string IDs with no foreign keys or cascade rules. `Task.applicants[]` duplicates `TaskApplication`. 16/21 entities have **no RLS** (see §4).

---

## 2. Authentication

| | |
|---|---|
| **Dependency** | Base44 Auth (tokens, sessions, email verification, password reset) |
| **Where used** | `base44.auth.me()` · `updateMe()` · `logout()` · `redirectToLogin()` · `AuthContext.jsx` (29 Joba24 refs) |
| **Capability affected** | Every authenticated flow; identity is the root of the marketplace |
| **Public-facing** | ✅ Yes — login screens, OAuth redirects |
| **Portable** | ⚠️ Partially. **Identity data** is exportable; **credentials/sessions are not** |
| **Difficulty** | **CRITICAL** |
| **Replacement** | External IdP (Auth0/Cognito/Supabase/Firebase Auth) + custom token issuance |
| **Lock-in** | **CRITICAL** |

**What is owned/exportable:** `User` records (id, email, full_name, role, profile, KYC status, credits, social verifications).
**What is NOT exportable:** password hashes, session tokens, email-verification state, OAuth provider links.
**Consequence:** users would have to re-authenticate (password reset or social re-link) after any auth migration.

---

## 3. OAuth (Google / Apple / Facebook)

| | |
|---|---|
| **Dependency** | Base44 OAuth broker |
| **Where used** | Login flows; `LoginPromptModal.jsx`; `AuthCallback.jsx` |
| **Capability affected** | Sign-up and login conversion |
| **Public-facing** | ✅ Yes |
| **Portable** | ⚠️ Standard OAuth 2.0 — but the broker, `from_url` rules and callback handling are Base44-owned |
| **Difficulty** | **CRITICAL** |
| **Replacement** | Register own OAuth apps per provider; own callback endpoints |
| **Lock-in** | **CRITICAL** |

**Verified constraint:** in-code comments state Base44's OAuth backend **rejects cross-domain `from_url`** and falls back to `base44.app`. This directly constrains multi-brand domains (see §8 and blueprint §R).

---

## 4. Row-Level Security (RLS)

| | |
|---|---|
| **Dependency** | Base44 RLS engine (`rls` block in `.jsonc`, `{{user.*}}` templates) |
| **Where used** | **5 / 21 entities only**: `Review`, `WorkerStat`, `DemoUser`, `OAuthHandshake`, `Brand` |
| **Capability affected** | Data isolation — currently mostly *absent* |
| **Public-facing** | No (invisible when correct) |
| **Portable** | ⚠️ Concept is portable; **rule syntax is Base44-specific** |
| **Difficulty** | **HIGH** |
| **Replacement** | Re-express each rule as application-layer or database-policy checks |
| **Lock-in** | **MEDIUM** — the *rules* are few; the *gap* is the real problem |

---

## 5. Backend Functions

| | |
|---|---|
| **Dependency** | Base44 functions (Deno runtime, `base44/functions/*/entry.ts`) |
| **Where used** | **65 / 65** functions |
| **Capability affected** | All server-side business logic |
| **Public-facing** | Indirectly |
| **Portable** | ✅ Mostly — TypeScript/Deno is standard |
| **Difficulty** | **MEDIUM–HIGH** |
| **Replacement** | Any Node/Deno/edge runtime; swap `createClientFromRequest` for a repository layer |
| **Lock-in** | **MEDIUM** — portable code, platform-provided invocation + secrets |

---

## 6. Service Role

| | |
|---|---|
| **Dependency** | `base44.asServiceRole` (bypasses RLS) |
| **Where used** | **62 / 65 functions** |
| **Capability affected** | All privileged server operations |
| **Public-facing** | No |
| **Portable** | ✅ Concept is universal (admin/service credentials) |
| **Difficulty** | **HIGH** |
| **Replacement** | Service credentials in the target backend |
| **Lock-in** | **MEDIUM** — but it is the **biggest internal security risk** (blueprint §G/H) |

**Note:** `asServiceRole` gives no protection — 62 functions currently rely on their own ad-hoc checks, and 26 have none at all.

---

## 7. File / Media Storage

| | |
|---|---|
| **Dependency** | Base44 file storage + `media.base44.com` public CDN URLs |
| **Where used** | **24** `media.base44.com` references; **19** `UploadFile` sites |
| **Assets stored** | profile photos, task images, completion evidence, **KYC ID documents**, profile media, task videos, certificates |
| **Public-facing** | ✅ Yes — asset URLs are embedded in records and rendered directly |
| **Portable** | ⚠️ Files are exportable; **URLs are baked into entity records** |
| **Difficulty** | **HIGH** |
| **Replacement** | S3/GCS/R2 + CDN; requires a URL-rewrite/indirection pass over records |
| **Lock-in** | **HIGH** |

**⚠️ Security note:** `id_photo_url` currently resolves to **public media storage** — unguessable but not access-controlled. Migration of KYC documents to private storage is a **P0**, tracked in the blueprint (§N).

**Migration requirement:** introduce a storage indirection (stable logical key → resolved URL) **before** any move, so references survive a provider change.

---

## 8. Custom Domains

| | |
|---|---|
| **Dependency** | Base44 custom-domain hosting (`joba24.com` → app) |
| **Where used** | `PUBLIC_BASE_URL` (`utils.js:17`), `PROD_BASE_URL` (`LoginPromptModal.jsx:363`), `index.html` |
| **Capability affected** | Public identity, SEO, OAuth return, share links |
| **Public-facing** | ✅ Yes — **the most visible dependency** |
| **Portable** | ✅ A domain is portable by definition |
| **Difficulty** | **HIGH** (⚠️ platform limits unknown — see §21) |
| **Replacement** | Any host + DNS + certificate |
| **Lock-in** | **LOW on the domain itself**, **HIGH on the provisioning/SSL/OAuth plumbing** |

---

## 9. SSL

| | |
|---|---|
| **Dependency** | Base44-managed certificates |
| **Where used** | All HTTPS origins |
| **Capability affected** | Trust, OAuth eligibility, PWA/native |
| **Public-facing** | ✅ Yes |
| **Portable** | ✅ Standard TLS |
| **Difficulty** | **LOW–MEDIUM** |
| **Replacement** | Let's Encrypt / ACM / Cloudflare |
| **Lock-in** | **LOW** |

---

## 10. Hosting

| | |
|---|---|
| **Dependency** | Base44 static hosting + `/api` proxy for the Vite SPA |
| **Where used** | `index.html`, `src/api/base44Client.js` (relative `/api` on web) |
| **Capability affected** | Serving the app to every web user |
| **Public-facing** | ✅ Yes |
| **Portable** | ✅ Static assets + a proxy — trivially portable |
| **Difficulty** | **LOW–MEDIUM** |
| **Replacement** | Vercel/Netlify/Cloudflare/S3+CDN |
| **Lock-in** | **LOW** |

---

## 11. CORS

| | |
|---|---|
| **Dependency** | Base44 API origin policy |
| **Where used** | Native builds call `https://joba24.base44.app` directly (`base44Client.js`) |
| **Capability affected** | Native + multi-domain web access |
| **Public-facing** | No |
| **Portable** | ✅ Standard |
| **Difficulty** | **MEDIUM** |
| **Replacement** | Configure per target backend |
| **Lock-in** | **MEDIUM** — ⚠️ multiple origins must be verified (§21) |

---

## 12. Emails

| | |
|---|---|
| **Dependency** | Base44 `SendEmail` integration + `sendWelcomeEmail` function |
| **Where used** | Welcome email; notification manager email channel |
| **Capability affected** | Onboarding, notifications |
| **Public-facing** | ✅ Yes — arrives in the user's inbox |
| **Portable** | ✅ Standard SMTP/API |
| **Difficulty** | **LOW–MEDIUM** |
| **Replacement** | Resend/SES/Postmark |
| **Lock-in** | **LOW** — but sender identity/domain warm-up is a real cost |

**Verified:** `sendWelcomeEmail` hardcodes Joba24 branding (subject, H1, body, CTA `https://joba24.com`, footer).

---

## 13. Workflows

| | |
|---|---|
| **Dependency** | Base44 workflows (18, CNCF SWF `.jsonc`) |
| **Where used** | Scheduled pushes, expiry, auto-bump, daily summaries, Facebook auto-post |
| **Capability affected** | Automation, retention, notifications |
| **Public-facing** | Indirectly |
| **Portable** | ⚠️ Format is standard-ish; the **runtime is not** |
| **Difficulty** | **MEDIUM** |
| **Replacement** | Cron/queue (e.g. Cloudflare Cron, GitHub Actions, Temporal) invoking the same functions |
| **Lock-in** | **MEDIUM** — logic is mostly a call into an existing function |

---

## 14. Realtime

| | |
|---|---|
| **Dependency** | Base44 entity realtime (`base44.entities.X.subscribe()`) |
| **Where used** | **20** sites (feed, chat, tasks, applicants) |
| **Capability affected** | Live feed, chat, applicant counts |
| **Public-facing** | ✅ Yes (live UX) |
| **Portable** | ⚠️ Requires a WebSocket layer |
| **Difficulty** | **MEDIUM** |
| **Replacement** | WebSockets / SSE / Supabase Realtime / Ably |
| **Lock-in** | **MEDIUM** |

---

## 15. Push Infrastructure

| | |
|---|---|
| **Dependency** | **FCM directly** — via the app's **own** Firebase service account (`FIREBASE_*` secrets) |
| **Where used** | `sendPushNotification`, `notificationManager`, `lib/fcm.js`, `firebase-messaging-sw.js`, Capacitor Firebase plugins |
| **Capability affected** | All push notifications |
| **Public-facing** | ✅ Yes |
| **Portable** | ✅ **Already provider-independent** — Firebase is Google, not Base44 |
| **Difficulty** | **LOW** |
| **Replacement** | None required — already portable |
| **Lock-in** | **LOW** ✅ |

**Finding:** push is **not** Base44-locked. Only the *invocation path* (workflow → function) is Base44-hosted.

---

## 16. Secrets / Environment Configuration

| | |
|---|---|
| **Dependency** | Base44 secrets store, read via `Deno.env.get` |
| **Where used** | **8 keys across 5 functions** (Firebase ×3, Tranzila ×3, Mapbox, supplier) + frontend `VITE_*` |
| **Capability affected** | Payments, push, maps, third-party auth |
| **Public-facing** | No |
| **Portable** | ✅ Standard env vars |
| **Difficulty** | **LOW** |
| **Replacement** | Any secret manager |
| **Lock-in** | **LOW** |

---

## 17. Native OAuth Handshake

| | |
|---|---|
| **Dependency** | Custom flow coupling `index.html`, `nativeAuthHandshake`, `OAuthHandshake` entity, `NativeOAuthBounce`, `AuthCallback`, and the `joba24://` scheme |
| **Where used** | Native iOS/Android login |
| **Capability affected** | Native login (a documented repeat-failure area) |
| **Public-facing** | Indirectly |
| **Portable** | ❌ **Not portable as-is** — depends on Base44 OAuth + `from_url` + `base44.app` origin |
| **Difficulty** | **CRITICAL** |
| **Replacement** | Must be redesigned with any auth migration |
| **Lock-in** | **CRITICAL** |

---

## 18. Base44 SDK / Client

| | |
|---|---|
| **Dependency** | `@base44/sdk` + `@base44/vite-plugin` |
| **Where used** | **96** frontend files; `src/api/base44Client.js`; 65 functions |
| **Capability affected** | Everything — it is the single seam to the platform |
| **Public-facing** | No |
| **Portable** | ⚠️ The SDK is the abstraction; replacing it means replacing the data layer |
| **Difficulty** | **HIGH** |
| **Replacement** | A Joba24-owned API/repository layer |
| **Lock-in** | **HIGH** — but **concentrated in one file** on the frontend (`base44Client.js`) |

**Positive finding:** the frontend imports from **one module** (`@/api/base44Client`), not from the SDK directly in most places. That single seam is the natural place for a future adapter.

---

## 19. Admin Functionality

| | |
|---|---|
| **Dependency** | `AdminDashboard.jsx` (1429 lines) + admin functions (`adminBulkUpdateUsers`, `adminNotificationManager`, `adminUpdateVerification`, `resetAllVerifications`, `sendCreditsToUser`, `runQAChecks`) |
| **Where used** | Platform administration |
| **Capability affected** | Operations, KYC review, moderation |
| **Public-facing** | No |
| **Portable** | ✅ Business logic is portable; it is plain SDK calls |
| **Difficulty** | **MEDIUM** |
| **Replacement** | Rebuild against a Joba24-owned API |
| **Lock-in** | **MEDIUM** |

---

## 20. Connectors, Agents, Payments, Analytics, Maps

| Dependency | Where used | Portable | Difficulty | Lock-in |
|---|---|---|---|---|
| **Connectors** (`facebook_pages`, workspace `instagram`, `tiktok`) | Facebook auto-post, social verification | ⚠️ OAuth apps are workspace-owned, tokens Base44-brokered | MEDIUM | MEDIUM |
| **Agents** (`qa_agent`) | QA tooling | ✅ Config is JSON | LOW | LOW |
| **Payments — Tranzila** | `tranzilaCreatePayment`, `tranzilaNotify`, `verifyTranzilaPayment` | ✅ **Own merchant keys** (`TRANZILA_*` secrets) | LOW | **LOW** ✅ |
| **Payments — IAP / StoreKit** | `verifyIosPurchase`, native `SceneDelegate.swift` | ✅ **Own Apple credentials** | LOW | **LOW** ✅ |
| **Payments — Stripe** | `STRIPE_*` secrets present | ✅ Own account | LOW | **LOW** ✅ |
| **Analytics — Meta / TikTok / Firebase** | `lib/analytics/*`, native plugins | ✅ **Own SDKs & credentials** | LOW | **LOW** ✅ |
| **Maps — Mapbox** | `getMapboxToken`, map views | ✅ Own token | LOW | **LOW** ✅ |
| **Geolocation / Camera / Browser** | Capacitor plugins | ✅ Standard Capacitor | LOW | **LOW** ✅ |

**Key finding:** **payments, analytics, push and maps are already provider-independent.** Base44 is not the lock-in for the money or measurement layer.

---

## 21. ⚠️ Platform Capabilities That Must Be Verified

These are **not code questions** — they must be answered by the Base44 platform before Brand #2.

| # | Question | Blocks Web Brand #2? | Blocks native only? |
|---|---|---|---|
| V1 | Max custom domains per app? | **YES** | No |
| V2 | Are multiple OAuth origins / `from_url` values allowed? | **YES** | No |
| V3 | SSL provisioning per domain? | YES | No |
| V4 | CORS for multiple origins? | YES | No |
| V5 | Wildcard subdomains (`*.joba24.com`)? | No | No |
| V6 | Per-domain AASA hosting? | No | **YES** |
| V7 | Server-side / edge HTML meta injection? | Partial | No |
| V8 | RLS expressiveness limits? | **YES** | No |
| V9 | Entity / function count limits? | Possibly | No |
| V10 | Multiple Firebase apps per project? | No | **YES** |

---

## 22. Lock-in verdict

| Tier | Dependencies |
|---|---|
| 🔴 **CRITICAL lock-in** | Authentication · OAuth · Native OAuth handshake |
| 🟠 **HIGH lock-in** | Entities/DB · RLS · File/media storage · SDK/client · Custom-domain plumbing |
| 🟡 **MEDIUM lock-in** | Functions · Service role · Workflows · Realtime · CORS · Admin · Connectors |
| 🟢 **LOW / already portable** | Push (FCM) · Payments (Tranzila/IAP/Stripe) · Analytics (Meta/TikTok/Firebase) · Maps · Secrets · Hosting · SSL · Emails · Agents |

**Conclusion:** the lock-in is concentrated in **identity** and **data/storage plumbing** — not in money, measurement or media delivery. That is the good news: the hardest parts to replace are also the parts where a careful, staged migration is genuinely possible, because the business model itself (tasks, brands, applications, reviews) is plain data.