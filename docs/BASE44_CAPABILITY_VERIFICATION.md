# PRE-PHASE 2 — BASE44 PLATFORM CAPABILITY VERIFICATION

> **Type:** verification / research only. **No code, schema, RLS, data, configuration, domain, OAuth or production change was made.**
> **Date:** 2026-10-01
> **Scope:** can one Base44 app host N independent marketplace brands on the Joba24 Core?
> **Companion documents:** `MULTIBRAND_BLUEPRINT.md` · `BASE44_DEPENDENCY_REGISTER.md` · `MULTIBRAND_RESTORE_RUNBOOK.md`
> **Evidence rule:** every claim below is either (a) quoted from Base44 documentation, or (b) an observation from the app's own source, or (c) explicitly marked **UNVERIFIED — REQUIRES BASE44 PLATFORM/SUPPORT CONFIRMATION**. Nothing is guessed.

---

# 1. VERIFY CUSTOM DOMAIN CAPABILITY

### V1 — Maximum custom domains per app — ✅ **VERIFIED SUPPORTED**

> *"You can connect up to 150 domains and subdomains to a single app, and up to 350 domains in total across your account."*
> — [Connecting a domain to your app](https://docs.base44.com/Setting-up-your-app/Setting-up-your-custom-domain)

- **One app → 150 domains/subdomains.** **One account → 350 domains.**
- Multiple custom domains owned by **different partners** are technically the same case: each is connected individually to the same app. Ownership of the DNS record is irrelevant to Base44.
- Multiple domains **do** resolve to the same application.

### V3 — SSL — ✅ **VERIFIED SUPPORTED**

> *"The SSL certificate is issued automatically once your domain is verified and DNS is resolving correctly."*
> — [Connecting an external domain](https://docs.base44.com/Setting-up-your-app/Connecting-an-external-domain)

- Provisioning **and renewal** are automatic. No manual certificate work per brand.
- **Constraint:** *"SSL certificates are issued for the exact subdomains you connect."* — certificates are **per exact hostname**, not per apex.

### V5 — Wildcard subdomains — ❌ **VERIFIED NOT SUPPORTED**

> *"Base44 supports connecting specific subdomains. Wildcard subdomains are not supported."*
> — [Connecting an external domain](https://docs.base44.com/Setting-up-your-app/Connecting-an-external-domain)

**Individual subdomains are fully supported** — `events.joba24.com`, `moving.joba24.com`, `pets.joba24.com` each connected independently, each with its own CNAME → `base44.onrender.com`.

**Operational constraints verified:**
- Each subdomain needs **its own CNAME record** (no wildcard record can substitute).
- A `www.` variant (`www.events.joba24.com`) requires an **additional CNAME** *and* **must be registered by Base44 support**.
- No `A`/`AAAA` records may exist at the same hostname.

### ⚠️ Impact

The subdomain model works — **but it is strictly manual and capped at 150.** This is the single most consequential scaling finding (see §9).

---

# 2. VERIFY MULTI-DOMAIN OAUTH

### ❌ **BLOCKER — UNVERIFIED, REQUIRES BASE44 SUPPORT CONFIRMATION**

This is the critical section, and the documentation **does not answer it**. What *is* documented:

> *"By default, an SSO login runs through `app.base44.com` even when your app has a custom domain. To keep it on your own domain, turn on **Use this app's custom domain as the SSO callback**."*
> — [Setting up SSO](https://docs.base44.com/Setting-up-your-app/Setting-up-SSO)

**Findings:**

| Question | Answer | Status |
|---|---|---|
| Can one app allow **multiple OAuth origins**? | Not documented. There is **no documented origin allowlist**. | **UNVERIFIED** |
| Can multiple `from_url` domains be allowlisted? | Not documented as a list. Behaviour is described only as "same-domain". | **UNVERIFIED** |
| Can the callback return **dynamically to the originating brand**? | The SSO callback setting is **app-level and singular** ("this app's custom domain") — not per-domain. | **LIKELY NOT** |
| Does Base44 force auth back to `*.base44.app`? | **Yes, in documented default behaviour** ("By default, an SSO login runs through `app.base44.com`"), and **yes in observed native behaviour**. | **VERIFIED (default) / configurable for SSO only** |
| Can it be configured? | Only via the single app-level SSO-callback toggle. Multi-domain selection is **not documented**. | **PARTIAL** |
| Would every brand domain need registering separately? | Not documented. Custom Google OAuth requires the app domain in Google Cloud — **singular wording**. | **UNVERIFIED** |

### Observed behaviour in the Joba24 codebase (source evidence)

| Location | Observation |
|---|---|
| `LoginPromptModal.jsx:423–444` | *"The Base44 OAuth backend only honors same-domain `from_url` values — a joba24.com `from_url` is rejected and the backend falls back to a base44.app redirect."* Native flow is therefore **hard-pinned to `https://joba24.base44.app`**. |
| `NativeOAuthBounce.jsx:32–35` | *"The Base44 OAuth backend often ignores `from_url` and redirects to the app's canonical base44.app domain (dropping the sid)."* — but also: *"the web/PWA flow returns to the branded custom domain (joba24.com), not base44.app."* |
| `index.html:54–69` | A **client-side forced redirect** from any `/auth-callback` landing on a non-base44.app origin **to `https://joba24.base44.app`**. |
| `AuthContext.jsx:392–395` | `base44.auth.logout()` redirects to `${appBaseUrl}/api/apps/auth/logout` — a Base44 URL. |

**Interpretation (must be confirmed, not assumed):** the OAuth backend appears to honour `from_url` **only when it is same-origin as the login request**. On web the login request is issued from the user's current origin, so a **single** custom domain currently works. Whether that generalises to **N** brand domains — and whether there is any origin allowlist — is **not verifiable from documentation**.

### ⛔ Verdict

**This is a hard BLOCKER for external Brand #2 with social login.** Do not design around it; get it confirmed.

**Questions to put to Base44 support:**
1. Can one app serve OAuth/SSO logins initiated from multiple custom domains, each returning to its own domain?
2. Is there an allowed-origins / allowed-redirect list, and can multiple origins be registered?
3. Which domain does the SSO callback use when several custom domains are connected?
4. Does the default `app.base44.com` fallback apply to Google / Apple / Facebook OAuth (not only SSO)?
5. Are Apple and Facebook redirect URIs configurable per domain?

---

# 3. VERIFY CORS / API ACCESS

### ⚠️ **UNVERIFIED — REQUIRES BASE44 PLATFORM/SUPPORT CONFIRMATION**

> *"Per-app CORS configuration is not currently available. Base44 manages CORS at the platform level."*
> — [Base44 security: An overview](https://docs.base44.com/Setting-up-your-app/security-overview)

**Findings:**

| Question | Answer | Status |
|---|---|---|
| How are allowed origins configured? | **Not by the app** — platform-managed. No per-app setting exists. | **VERIFIED (no per-app config)** |
| Are multiple origins supported? | Not documented. | **UNVERIFIED** |
| Are wildcard origins supported? | Not documented. | **UNVERIFIED** |
| Do sessions/auth work across those domains? | **Not documented.** The app's token is stored in `localStorage`, which is **per-origin** — so sessions do **not** automatically carry across brand domains. | **UNVERIFIED (platform) / KNOWN LIMITATION (app)** |

**Important app-level observation:** because the auth token lives in `localStorage` (per-origin), a user logged in on `joba24.com` is **not** logged in on `events.joba24.com`. Each brand domain is a separate session. This is inherent to browser storage and independent of Base44 — but it must be a deliberate design decision, not a surprise.

**Practical note:** the app already uses **relative `/api` requests** on web (`base44Client.js:6` — *"a server proxy forwards /api → Base44"*), which means same-origin calls and **no CORS at all** for the browser. CORS only matters for the native bundles, which call `https://joba24.base44.app` directly. **If the relative-proxy pattern holds per brand domain, CORS may be a non-issue for web brands** — but that must be confirmed, not assumed.

**No CORS configuration was changed.**

---

# 4. VERIFY BRAND RESOLUTION FEASIBILITY

### ✅ **VERIFIED SUPPORTED**

```
window.location.hostname → BrandDomain → brand_id → BrandContext
```

- Base44 hosting serves a **static SPA**. The browser's `window.location.hostname` is the **connected domain the user actually visited** — it is not rewritten or hidden. Static hosting does not proxy-rewrite the Host header in the browser.
- The app **already reads the hostname today** in several places (`NativeOAuthBounce.jsx:35`, `base44Client.js:17`, `AdminDashboard.jsx:223`, `TaskDetail.jsx:699`) — proving the value is intact and correct at runtime.
- `src/lib/brandResolver.js` (Phase 1, currently unimported) already implements exactly this: `resolveBrandSlug(hostname)` with a known-domain map, a `<slug>.joba24.com` one-level subdomain rule, and a safe default fallback. It is **pure, deterministic and network-free** — correct by design.

**One caveat, not a blocker:** the resolver must be **hostname-driven**, never a hardcoded brand. Today several files hardcode `https://joba24.com` / `https://joba24.base44.app` (§8).

**Verdict: the resolution chain is feasible on Base44 today.**

---

# 5. VERIFY PER-BRAND PUBLIC EXPERIENCE

### ✅ CLIENT-RUNTIME — **VERIFIED SUPPORTED** (everything dynamic)

Once `BrandContext` exists at runtime, **all** of the following can be brand-specific, with no platform constraint:

| Element | Client-runtime | Notes |
|---|---|---|
| Logo | ✅ Supported | Currently a hardcoded `media.base44.com` URL in ~10 files |
| Name | ✅ Supported | Currently in i18n strings + `manifest.json` |
| Colours | ✅ Supported | Design tokens in `index.css` — swappable at runtime |
| Categories | ✅ Supported | `CATEGORIES` is a static array today; becomes data (Phase 4) |
| Content | ✅ Supported | All content is entity-driven already |
| Navigation | ✅ Supported | Route/label config |
| Features | ✅ Supported | Flag-driven |
| Support links | ✅ Supported | Static content |
| Legal links | ✅ Supported | `termsContent.js` / `privacyContent.js` are plain strings |
| Share links | ✅ Supported | Must switch from the hardcoded `PUBLIC_BASE_URL` to a brand-aware resolver |
| Page title | ✅ Supported **after hydration only** | `document.title` can be set by JS |
| Favicon | ⚠️ **After hydration only** | Can be swapped by JS, but **not before HTML reaches a crawler/bot** |

### ❌ SERVER / EDGE — **VERIFIED NOT SUPPORTED**

> *"Base44 site hosting currently supports Single Page Applications (SPAs) only… Server-side rendering or server components are not supported."*
> — [Backend features](https://docs.base44.com/developers/backend/overview/features)

**Therefore, the following CANNOT be dynamic on Base44 hosting today:**

| Element | Cannot be dynamic |
|---|---|
| Page title (pre-HTML) | ❌ |
| Meta description (pre-HTML) | ❌ |
| Canonical URL (per domain) | ❌ |
| OpenGraph title / description / image (per domain) | ❌ |
| Favicon (pre-HTML) | ❌ |
| `manifest.json` (per brand) | ❌ (static file) |

**Clear separation:**

```
CLIENT-RUNTIME  (after JS loads)  →  ALL branding, categories, nav, features, links, content   ✅
SERVER / EDGE   (before HTML)     →  title, meta, canonical, OG, favicon, manifest             ❌
```

---

# 6. SEO / OPEN GRAPH

### ❌ **VERIFIED NOT SUPPORTED — per domain / per brand**

**What Base44 *does* support:**

| Capability | Support | Granularity |
|---|---|---|
| Page title | ✅ | **Per page**, app-wide (Dashboard → **SEO & GEO → Meta tags**) |
| Meta description | ✅ | **Per page**, app-wide |
| OpenGraph title / description | ✅ | **App-level** — from app settings |
| OpenGraph image | ✅ | **App-level** — a single social image |
| Canonical URL | ✅ self-referencing added automatically | **Rule for multiple domains NOT documented** |
| Favicon | ⚠️ | Via static `index.html` only |

> *"Base44 adds self-referencing canonical tags to every page."* — [SEO and search visibility](https://docs.base44.com/Performance-and-SEO/SEO-and-search-visibility)
> *"These previews use the title, description, and logo you configure in your app's settings."* — ibid.

**The exact limitation:**

`index.html` is a **single static file** served for the entire application on **every** connected domain. It is customised once (Code tab) and then *"served as-is — no automatic injections."* There is **no per-request, per-domain HTML rendering**, and **SSR is not supported**.

**Consequence:**
- `joba24.com` and `events.co.il` receive the **identical** `<title>`, `<meta>`, canonical, OG tags and favicon.
- Per-page meta tags are **app-wide**, not per-brand.
- A brand's link shared on WhatsApp/Facebook will show **Joba24's** title, description and image.
- **Canonical ambiguity:** with multiple domains connected and self-referencing canonicals, each domain self-canonicalises. Whether Base44 designates a preferred domain is **not documented** → **UNVERIFIED**.

**No workaround designed** — per your instruction. This is the raw constraint.

---

# 7. EMAIL / PUBLIC LINKS

### 7a. App-authored emails (from backend functions) — ✅ **VERIFIED SUPPORTED**

`SendEmail` is called from Joba24's own functions, so **the function controls the HTML and every link**. A brand-aware function can emit `https://events.co.il/task/123`.

**Current state (to be fixed in Brand Runtime, not now):**
- `sendWelcomeEmail/entry.ts:38` — CTA hardcoded to `https://joba24.com`, Hebrew-only copy, Joba24 branding.
- `i18n-*.js` (10 languages) — invoice footer `'Generated via Joba24 · joba24.com'`.
- `privacyContent.js` / `termsContent.js` — `hello@joba24.com`.

### 7b. Base44 system emails (password reset, OTP, invitations) — ❌ **VERIFIED NOT SUPPORTED per brand**

> *"Each app can connect one custom email domain, and you cannot set multiple sender addresses on the same domain."*
> — [Sending emails from your app](https://docs.base44.com/documentation/building-your-app/sending-emails)

> *"An app sends emails from one domain at a time."*
> — [Enable email sending for a domain](https://docs.base44.com/api-reference/enable-email-sending-for-a-domain)

| Question | Answer | Status |
|---|---|---|
| Can emails contain brand-specific URLs? | **App-authored: YES.** Base44 system emails: **NO**. | **VERIFIED** |
| Password-reset link on a brand domain? | *"the reset email automatically uses your app's custom domain"*, path fixed at `/reset-password`. **Which** domain with several connected: **not documented**. | **PARTIAL / UNVERIFIED** |
| Can the sender domain be per brand? | **No — one email domain per app**, one sender address per domain. | **VERIFIED NOT SUPPORTED** |
| Can the reset email template be branded? | *"cannot be customized: it uses a standard Base44 template."* | **VERIFIED NOT SUPPORTED** |
| Can authentication links use brand domains? | Not confirmed. Base44 controls the URL. | **UNVERIFIED** |

**Consequence:** **per-brand email identity is not achievable on Base44's built-in email.** A brand's users would receive password resets from a Joba24-domain sender. If per-brand sender identity is required, it needs an **external email service** (Resend/SES/Postmark) driven from backend functions — which is already the portability direction in the register.

---

# 8. BASE44 URL LEAKAGE AUDIT

**No changes made.** Classification of every place a Base44 URL can reach a user.

### 🔴 CRITICAL BRAND-LEAKAGE RISK

| Location | What leaks | Why critical |
|---|---|---|
| `index.html:54–69` | Force-redirect of any `/auth-callback` to `https://joba24.base44.app` | A brand user **lands on a base44.app URL during login**. Visible in the address bar. |
| `LoginPromptModal.jsx:442–444` | `APP_BASE44_URL = 'https://joba24.base44.app'` for both the login endpoint and `from_url` (native) | Native users are **sent to base44.app to authenticate**. |
| `src/lib/nativeEnv.js:61` | `loginUrl` pinned to `joba24.base44.app` | Same, native. |
| `src/lib/nativeAuthComplete.js:15` | `HANDSHAKE_URL = 'https://joba24.base44.app/api/functions/nativeAuthHandshake'` | Native handshake over a Base44 URL. |
| `AuthContext.jsx:392–395` | `base44.auth.logout()` → `${appBaseUrl}/api/apps/auth/logout` | **Logout can leave the branded domain** (currently mitigated by clearing `localStorage` + local reload). |
| `NativeOAuthBounce.jsx:32–35` | Base44 backend "often ignores `from_url` and redirects to base44.app" | Platform behaviour; the app already compensates. |

**All six are login/logout paths.** This is consistent with §2: **authentication is where Base44 is most likely to become visible to an end user.**

### 🟠 PUBLIC BUT REPLACEABLE

| Location | Content |
|---|---|
| `src/lib/utils.js:17` | `PUBLIC_BASE_URL = 'https://joba24.com'` — single-brand hardcode |
| `sendWelcomeEmail/entry.ts:38` | CTA `https://joba24.com` |
| `i18n-{he,en,ar,es,fr,ru,hi,fil,zh}.js` | Invoice footer `joba24.com` (10 files) |
| `privacyContent.js` / `termsContent.js` | `hello@joba24.com` |
| `Presentation.jsx:891` | QR code → `joba24.com` |
| `index.html:8,17,18,20` | `apple-mobile-web-app-title`, favicon, apple-touch-icon, `<title>` |
| `public/manifest.json` | Name, short_name, icons |
| `AdminDashboard.jsx:223,459` · `TaskDetail.jsx:699` | `window.location.origin`-based share links (correct pattern already) |

### 🟡 PUBLIC AND CURRENTLY BASE44-DEPENDENT

| Location | Content |
|---|---|
| `media.base44.com` — **24 references** | Brand logo in `AppHeader`, `SideMenu`, `Landing`, `BoostOverlay`, `LiveSearchOverlay`, `PreLaunchWaitingPage`, `WorkerOnboarding`, `InstallGuide`, `Presentation`, `storekit/specs.js`, `manifest.json` icons, `index.html` favicon + apple-touch-icon |

**Note:** the Joba24 logo is served from `media.base44.com` and is embedded in the **favicon, the PWA manifest, and the app UI**. It is user-visible on every page and in every shared link preview.

### 🟢 INTERNAL ONLY

| Location | Content |
|---|---|
| `base44Client.js:14,21` | `CANONICAL_API` — used only for native API calls, never shown |
| `nativeAuthHandshake/entry.ts` | Server-side handshake |

---

# 9. FUTURE SCALE

| Scale | Feasible on one Base44 app? | Constraint |
|---|---|---|
| **10 Brands** | ✅ Yes | 10 domains ≪ 150. Manual connection per domain. |
| **100 Brands** | ⚠️ **Yes, but at the cap and fully manual** | 100 domains < 150 ✓ — but **100 manual domain connections, 100 CNAME records, 100 SSL issuances**, and **no self-service API documented**. |
| **1,000 Brands** | ❌ **NO** | **Hard-blocked by the 150-domain-per-app limit and by the absence of wildcard subdomains.** |

**No Base44 constraint conflicts with:**
- ✅ one database (21 entities, 5,000 records per query — no per-brand DB needed)
- ✅ no duplicated Task records
- ✅ no duplicated frontend deployments
- ✅ no per-brand Base44 project
- ✅ configuration-driven brand creation (brands are just entity records)

**Base44 constraints that DO conflict:**
1. **150 domains / app, 350 / account** — caps the brand count.
2. **No wildcard subdomains** — `*.joba24.com` is impossible, so brand-per-subdomain cannot be provisioned programmatically or at scale.
3. **No documented domain-provisioning API** — brand onboarding cannot be self-service for the domain step.
4. **Single app-level SSO/OAuth callback** — see §2.

---

# 10. BRAND FACTORY REQUIREMENT

Target flow:

```
Create Brand → name → domain/subdomain → categories → branding
→ features → distribution → commercial rules → publish
```

| Step | Feasible on Base44 today? | Notes |
|---|---|---|
| Create Brand | ✅ **YES** | Entity record — Phase 1 already deployed |
| Choose name | ✅ **YES** | Data |
| Choose **subdomain** (`events.joba24.com`) | ⚠️ **MANUAL** | Must be added to the Domains page + a CNAME record created externally. No documented self-service API. |
| Choose **own domain** (`brand-a.com`) | ⚠️ **MANUAL + DNS** | Partner must point DNS; then connect + verify. Cannot be automated from inside the app today. |
| Choose categories | ✅ **YES** | Configuration as data (Phase 4) |
| Configure branding | ✅ **YES** | Client-runtime (Phase 6) |
| Configure features | ✅ **YES** | Flags (Phase 6) |
| Configure distribution | ✅ **YES** | `TaskDistributionRule` (Phase 5) |
| Configure commercial rules | ✅ **YES** | `BrandCommercials` (Phase 6) |
| Publish | ✅ **YES** (config) / ❌ (domain) | Config publishes instantly; **domain provisioning does not** |

### Verdict

**8 of 9 steps are fully feasible with no developer and no new Base44 project.**
**The domain step is the only one requiring external action** — and it requires a **manual** one per brand (no API, no wildcard).

---

# 11. CAPABILITY MATRIX

| # | CAPABILITY | STATUS | EVIDENCE | IMPACT ON MULTI-BRAND | ACTION REQUIRED |
|---|---|---|---|---|---|
| 1 | **Multiple custom domains** | ✅ VERIFIED SUPPORTED | Docs: 150/app, 350/account | Model is viable | Track the 150 cap as a real limit |
| 2 | **Custom subdomains** | ✅ VERIFIED SUPPORTED | Docs: specific subdomains supported | `events.joba24.com` works | Manual connection + CNAME per brand |
| 3 | **Wildcard subdomains** | ❌ VERIFIED NOT SUPPORTED | *"Wildcard subdomains are not supported"* | **Blocks unlimited brand-per-subdomain** | **Architectural decision required** (§12-E) |
| 4 | **SSL** | ✅ VERIFIED SUPPORTED | Docs: auto issue + renew | No per-brand cert work | None |
| 5 | **Multiple OAuth origins** | ⚠️ **UNVERIFIED** | No documented allowlist | Blocks multi-brand social login | **Support confirmation** |
| 6 | **OAuth return-to-origin** | ⛔ **BLOCKER** | SSO callback is app-level/singular; code shows base44.app fallback | Users may be bounced to a Base44 URL | **Support confirmation — blocks Brand #2** |
| 7 | **Google OAuth** | ⚠️ PARTIAL / UNVERIFIED | Custom Google OAuth callback fixed at `app.base44.com/api/apps/auth/callback`; singular "app domain" wording; Builder plan+ | Works for one domain; N domains unproven | **Support confirmation** |
| 8 | **Apple OAuth** | ⚠️ UNVERIFIED | Docs do not specify Apple redirect URIs | Same risk as Google | **Support confirmation** |
| 9 | **Facebook OAuth** | ⚠️ UNVERIFIED | Docs do not specify Facebook redirect URIs | Same risk as Google | **Support confirmation** |
| 10 | **CORS** | ⚠️ **UNVERIFIED** | *"Per-app CORS configuration is not currently available."* | Only affects native + cross-origin calls | **Support confirmation**; web may avoid it via relative `/api` |
| 11 | **Hostname resolution** | ✅ VERIFIED SUPPORTED | Static SPA; hostname read today in 4+ files; `brandResolver.js` ready | Chain is sound | None |
| 12 | **Dynamic branding** | ✅ SUPPORTED (client-runtime) / ❌ NOT SUPPORTED (pre-HTML) | SPA-only, no SSR | Post-hydration only | Accept or add an edge layer |
| 13 | **Dynamic categories** | ✅ VERIFIED SUPPORTED | Pure data | Fully feasible (Phase 4) | None |
| 14 | **Dynamic navigation / features** | ✅ VERIFIED SUPPORTED | Client-runtime config | Fully feasible (Phase 6) | None |
| 15 | **Brand-specific links** | ✅ VERIFIED SUPPORTED | App controls all link generation | Replace the hardcoded `PUBLIC_BASE_URL` | Brand-aware resolver in Phase 6 |
| 16 | **Brand-specific emails** | ⚠️ PARTIAL — content ✅ / **sender ❌** | *"Each app can connect one custom email domain"* | No per-brand sender identity | **External email service if required** |
| 17 | **SEO metadata** | ❌ VERIFIED NOT SUPPORTED per domain | Static `index.html`; per-page (not per-domain) meta; SPA-only | All brands share one title/description | **Accept, or add an edge layer** |
| 18 | **OpenGraph** | ❌ VERIFIED NOT SUPPORTED per domain | App-level title/description/image | Brand shares show Joba24 branding | **Accept, or add an edge layer** |
| 19 | **Favicon** | ❌ NOT SUPPORTED pre-HTML / ⚠️ post-hydration swap | Static `index.html` + `manifest.json` | Crawlers/bots see one favicon | **Accept, or add an edge layer** |
| 20 | **Brand-specific legal / support links** | ✅ VERIFIED SUPPORTED | Plain strings in `termsContent.js` / `privacyContent.js` | Fully feasible | None |
| 21 | **Scalability to 100+ Brands** | ⚠️ PARTIAL — 100 ✅ (manual) / 1,000 ❌ | 150-domain cap + no wildcard | Caps the business model | **Architectural decision required** (§12-E) |

---

# 12. GO / NO-GO CONDITIONS

*(Not a generic recommendation — these are the specific gates.)*

## A. Required BEFORE Phase 2

**None.**

Phase 2 is a pure data backfill (existing records → `origin_brand_id`). It touches **no** platform capability in this report: no domains, no OAuth, no CORS, no SEO, no email.

> **Phase 2 is platform-independent and may proceed on its own merits.**
> The only reason to wait is to avoid designing Phase 6–8 against unconfirmed answers — a scheduling preference, not a technical dependency.

## B. Can safely wait until Brand Runtime (Phase 6)

- Dynamic branding, logo, name, colours (client-runtime) — §5
- Dynamic categories (Phase 4), navigation, features
- Brand-specific share links (replace hardcoded `PUBLIC_BASE_URL`)
- Brand-specific legal / support links
- Hostname → BrandContext wiring — already proven feasible (§4)

## C. Required BEFORE external Brand #2 launch (Phase 8)

| # | Capability | Why |
|---|---|---|
| 1 | **OAuth return-to-origin** (matrix #6) | **Hard blocker.** A brand user must not land on a Base44 URL at login. |
| 2 | **Multiple OAuth origins** (#5) | Required for brand #2 login to work at all |
| 3 | **Google / Apple / Facebook per-domain** (#7–9) | Same |
| 4 | **CORS confirmation** (#10) | Must be known before committing to a topology |
| 5 | **Multiple custom domains + subdomains + SSL** (#1,2,4) | ✅ Already verified — no action |
| 6 | **Email identity decision** (#16) | Decide: accept Joba24-branded system email, or adopt an external provider |
| 7 | **SEO/OG/favicon decision** (#17–19) | Decide: accept shared metadata, or adopt an edge layer |
| 8 | **Session-across-domains decision** | `localStorage` is per-origin — users will have a **separate session per brand domain** unless designed otherwise |

## D. Required ONLY before native Brand apps (Phase 10)

- Per-domain **AASA** hosting (`apple-app-site-association`)
- **Multiple Firebase apps / bundle IDs** (one per branded app)
- Per-brand **native OAuth** (the native handshake is currently pinned to `joba24.base44.app` — §8 🔴)
- Per-brand **App Store / Play listings**
- Per-brand `manifest.json` / icons

*(None of these affect web Brand #2. ADR-14 already scopes Brand #2 as web-only — this confirms that was the right call.)*

## E. Architectural blockers requiring a change to the current Multi-Brand design

| # | Blocker | Why it breaks the current design | Options (not decided here) |
|---|---|---|---|
| **E1** | **No wildcard subdomains + 150-domain cap** | The model "N brands via `*.joba24.com`" cannot be provisioned programmatically, and caps at 150. | (a) Accept the cap and onboard domains manually; (b) add an **external DNS/edge layer** in front of Base44; (c) keep brand count low and treat domains as a premium, manual onboarding step. |
| **E2** | **Single app-level SSO/OAuth callback** | Breaks the core invariant *"the user returns to the Brand they started on."* Brand context is lost at the most sensitive moment. | (a) Confirm Base44 supports multi-origin `from_url`; (b) front the app with an **external auth broker / own OAuth apps**; (c) route all logins through one canonical domain and hand brand context back post-login. |
| **E3** | **No pre-HTML, per-domain metadata (SPA-only, no SSR)** | Breaks *"each Brand is publicly professional"* (Runbook §5.11) — SEO, OG and favicon would be Joba24's. | (a) Accept degraded per-brand SEO; (b) add an **edge/worker layer** that serves a brand-specific `index.html`. |
| **E4** | **One email domain per app** | Breaks per-brand email identity (sender domain, reset links, invitations). | (a) Accept Joba24-branded system email; (b) move transactional email to an **external provider** driven from backend functions. |

> **E1 and E3 point to the same solution — an external edge/DNS layer.** That is precisely the portability direction already recorded in **ADR-16…ADR-22** and Part 5 of the runbook. No design change is needed *now*; the blueprint already anticipates the seam.

---

# 13. FINAL SAFETY CONFIRMATION

✅ No code changed
✅ No schema changed
✅ No RLS changed
✅ No data changed
✅ No configuration changed
✅ No domains added
✅ No OAuth changes
✅ No backfill
✅ **Phase 2 NOT started**
✅ No production behaviour modified

**This document and the accompanying report are the only output.**

**Recommended immediate next step (no implementation):** put questions **2.1–2.5, 3 (CORS), 7 (email domain selection with multiple domains) and 12-C item 8** to Base44 support, and hold **Phase 8 (external Brand #2)** until the OAuth answer is in hand.