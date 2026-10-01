# JOBA24 MULTI-BRAND PLATFORM — BLUEPRINT

> **Living architecture document.** The authoritative record of *decisions* (ADRs), invariants, the entity model and the phase plan.
> **Companion documents:** `BASE44_DEPENDENCY_REGISTER.md` · `MULTIBRAND_RESTORE_RUNBOOK.md`
> **Status:** Phase 1 deployed · Phase 2 (Joba24 attribution backfill) **deployed** · Package #2.1 (default attribution for new records) **deployed** · Package #3.1B (internal endpoint security closure) **source complete, not yet published** · Package #3.1C (internal tooling closure) **source complete, not yet published** · Package #3.1D (review integrity closure) **source complete, not yet published** · **⛔ Tranzila payments frozen — must NOT be reactivated until Package #3.1A completes (see runbook blocker)** · Phase 3 otherwise **not approved**.
> **Governing rule:** the live Joba24 product is the regression baseline and must not change unintentionally at any phase.

---

## 1. Invariants (non-negotiable)

1. **One task row, forever.** `origin_brand_id` is set once at creation; never edited by ordinary flows.
2. **Origin ≠ surface.** Every attributable action records both where the resource originated and where the action happened. Neither is inferred.
3. **Authorization precedes distribution.** Brand context is resolved **before** authentication, so guests are scoped too.
4. **Configuration is data.** Brands, categories, field schemas, features, commercials and notification templates are records.
5. **Additive-first.** add nullable → backfill → verify → switch read path → retire legacy (much later). No destructive step early.
6. **Joba24 is the baseline.** Any change that cannot be introduced without altering existing behaviour is flagged, not assumed acceptable.
7. **Base44 is infrastructure, not the business architecture.** The domain model stays Joba24-owned and portable.
8. **One canonical relational Brand identifier.** `Brand.id` is the only value stored in any `brand_id` field. `Brand.slug` is a human-readable / routing / lookup key and is never a relational identifier (ADR-23).
9. **Joba24 is the reference implementation for core marketplace behavior.** All Brands inherit Joba24's core marketplace lifecycle, permissions and business rules by default. Multi-Brand architecture may parameterize Brand **configuration** and **distribution**, but must not silently fork or redefine core marketplace behavior. A Brand-specific behavioral difference requires an explicit, documented, configurable override approved in its own package. Corollary: when auditing a security-sensitive field or action, the intended permission is determined from the existing Joba24 lifecycle, UI, backend functions and business rules — **never** inferred from the current technical exposure, which may itself be the defect.
10. **Payment providers are Core infrastructure, not Brand infrastructure.** Future Brands may originate and attribute purchases through the shared Joba24 Core, but payment-provider logic (including Tranzila) must not be duplicated or hardcoded separately per Brand. The architecture must preserve the ability to record which Brand originated a purchase **without** coupling that Brand directly to the payment provider. *(Recorded as a forward-looking invariant. Nothing in this entry is implemented: it implies no payment, credit, schema, configuration or commercial change.)*

---

## 2. Architecture Decision Record

| # | Decision | Status |
|---|---|---|
| ADR-01 | One database, one codebase, one core | Accepted |
| ADR-02 | `origin_brand_id` immutable after set | Accepted |
| ADR-03 | Distinguish `origin_brand_id` vs `surface_brand_id` | Accepted |
| ADR-04 | **No `TaskDistribution` projection table** — rules are brand-level; distribution is derived | Accepted |
| ADR-05 | `User` gains **no** brand fields — identity stays global | Accepted |
| ADR-06 | Partner admin is a `BrandMembership.role`, never a `User.role` | Accepted |
| ADR-07 | KYC stays platform-level, read via redacted projection | Accepted |
| ADR-08 | Commercial attribution via **immutable snapshots**, not a separate entity | Accepted |
| ADR-09 | Merge the four `Category*Config` entities into one `CategoryConfig` | Accepted |
| ADR-10 | RLS is **Phase 3**, before any brand work — hard gate | Accepted |
| ADR-11 | Brand resolution happens **before** authentication | Accepted |
| ADR-12 | Never accept client-supplied `brand_id` for authorization | Accepted |
| ADR-13 | Joba24 continues on the legacy path until parity is proven by shadow comparison | Accepted |
| ADR-14 | Brand #2 launches **web-only** | Accepted |
| ADR-15 | `Task.applicants[]` is frozen, not removed, in early phases | Accepted |
| **ADR-16** | **Base44 is an implementation/infrastructure layer, never the business architecture. The domain model is owned by Joba24.** | **Accepted** |
| **ADR-17** | **Brand identity is Joba24-owned. The canonical internal Brand identifier is `Brand.id`. `Brand.slug` is a human-readable / routing / lookup key only — never a relational identifier. A Base44 project ID, app ID or hostname must never be the canonical Brand identity.** | **Accepted** |
| **ADR-18** | **No Base44 brand leakage in user-facing surfaces** (URLs, login, OAuth redirects, emails, share links, deep links, QR, canonical/OG, support/legal links). | **Accepted** |
| **ADR-19** | **Provider-independent domain model:** `hostname → BrandDomain → Brand Resolver → slug/lookup key → Brand record → Brand.id → BrandContext` (see ADR-23). `BrandDomain` holds Joba24-owned configuration and must not assume `*.base44.app`. A Brand keeps its identity if its domain changes — `Brand.id` is stable across domain changes. | **Accepted** |
| **ADR-20** | **Portability boundaries are introduced only when a new Multi-Brand subsystem is built** — smallest reasonable adapter, never a speculative framework. Business logic expresses Joba24 concepts, not provider details. | **Accepted** |
| **ADR-21** | **Portability documentation precedes Brand #2; execution of any migration is never implied.** No premature rewrite. | **Accepted** |
| **ADR-22** | **No speculative provider fields.** Add `provider_metadata` only if a real infrastructure identifier is technically unavoidable, and never as the domain identity. | **Accepted** |
| **ADR-23** | **The canonical relational Brand identifier is `Brand.id`.** Every field or entity reference named `brand_id` — including `origin_brand_id` and `surface_brand_id` — stores a **`Brand.id`**, never a slug. `Brand.slug` is reserved for human-readable identification, URL/subdomain routing, hostname resolution and admin/config lookup. Where routing begins with a slug, the slug is resolved to a `Brand` record and then to `Brand.id` **before** any relational authorization or distribution logic runs. | **Accepted** |
| **ADR-25** | **A relationship field is never trusted from the client.** Who a record refers to, and in which direction the relationship runs, is derived exclusively from persisted records and the authenticated caller — never from a request body. `revieweeId` and `role` on a Review are the reference case: both are computed from the persisted Task (`isOwner ? task.worker_id : task.client_id`, `isOwner ? 'client' : 'worker'`), a caller who is not a party to the task is rejected, and a missing legitimate counterpart is rejected safely. Corollary of Invariant 9: the legitimate relationship is read from the existing Joba24 lifecycle, never inferred from what the client currently sends. | **Accepted** |
| **ADR-24** | **Internal tooling is enforced server-side, never by hiding navigation.** A screen reachable by typing its URL is still reachable; internal / QA / Platform-Admin surfaces must be gated by the platform `User.role` (`role === 'admin'`) **at the route** *and* by the same role check **inside every backend function that tool uniquely owns**. The existing `role === 'admin'` check is the single authority — no new role, permission model or capability system is introduced. Corollary of Invariant 9: the intended permission for a security-sensitive action is read from the existing Joba24 lifecycle and UI conventions, never inferred from the action's current technical exposure, which may itself be the defect. | **Accepted** |

---

## 3. Global vs brand-scoped ownership (summary)

| Scope | Entities |
|---|---|
| **GLOBAL** | `User` · `JobaSettings` · `Category` · `CategoryConfig` · `WorkerStat` · `DemoUser` · `UserPresence` · `OAuthHandshake` · `Brand` (tenant registry) |
| **ORIGIN-ATTRIBUTED** | `Task` (`origin_brand_id`) |
| **SURFACE-ATTRIBUTED** | `TaskApplication` · `ChatMessage` · `Review` · `NotificationLog` · `SupportMessage` |
| **DERIVED (no brand field)** | `Report` · `WorkerStat` |
| **SNAPSHOT (financial)** | `CreditTransaction` · `TranzilaPayment` · `IosPurchase` · `Transaction` |
| **BRAND-SCOPED** | `BrandMembership` · `BrandDomain` · `BrandConfig` · `BrandFeature` · `BrandCommercials` · `BrandCategory` · `BrandAuditLog` · `TaskDistributionRule` |
| **BRAND-CONFIGURABLE** | `NotificationConfig` · `CategoryFieldSchema` (nullable `brand_id`) |
| **GLOBAL or BRAND** | `ConsentRecord` (`scope` field) |

> **Identifier rule (ADR-23):** every `brand_id` field above — `Task.origin_brand_id`, `TaskApplication.surface_brand_id`, and every future brand-scoped entity — stores a **`Brand.id`**, never a slug.

---

## 4. Entity model (summary)

**New:** `Brand` · `BrandMembership` · `BrandDomain` · `BrandConfig` · `BrandFeature` · `BrandCommercials` · `BrandAuditLog` · `Category` · `BrandCategory` · `CategoryFieldSchema` · `CategoryConfig` · `TaskDistributionRule` · `ConsentRecord`

**Rejected / merged:** `TaskDistribution` (rejected, ADR-04) · separate attribution entity (rejected, ADR-08) · `BrandAdminRole` (merged into `BrandMembership`) · four `Category*Config` (merged, ADR-09).

**Modified (all nullable, additive):** `Task` + `origin_brand_id` · `TaskApplication` + `surface_brand_id` · `ChatMessage` + `surface_brand_id` · `Review` + `surface_brand_id` · `NotificationConfig` + `brand_id` · `NotificationLog` + `surface_brand_id` · `SupportMessage` + `surface_brand_id` · financial entities + attribution/commercial snapshots · `ReferralEvent` + `brand_id` · `EarlySignup` + `brand_id`.

**Unchanged by design:** `User` (ADR-05) · `JobaSettings` (platform defaults) · `feedRanker.js` · `Task.applicants[]` (ADR-15).

---

## 5. Distribution engine

```
Tasks
  ↓ 1. AUTHORIZATION   may this actor read at all?
  ↓ 2. DISTRIBUTION    is it visible on the resolved surface?
  ↓ 3. ELIGIBILITY     may this actor apply? (credits, verification, requirements)
  ↓ 4. feedRanker.js   UNCHANGED
  ↓ Feed
```

```
// surface = the resolved Brand.id of the current surface (ADR-23)
visibleOn(task, surface) =
      task.origin_brand_id === surface
   || rule[task.origin_brand_id].publish_to_joba24 && surface === JOBA24_BRAND_ID
   || rule[task.origin_brand_id].allow_other_brands_visibility
   || task.distribution_overrides?.[surface] === true
```

> **Routing (ADR-23):** a hostname resolves to a slug/lookup key, which resolves to a `Brand` record, which yields `Brand.id`. Every comparison above uses **`Brand.id`**, never a slug. `JOBA24_BRAND_ID` is the `Brand.id` of the default Joba24 brand.

`TaskDistributionRule` is brand-level (N rows). No projection table (ADR-04). Per-task exceptions use the nullable `distribution_overrides` object.

---

## 6. Phase plan (summary)

| Phase | Goal | Risk |
|---|---|---|
| 0 | Architecture freeze · authorization matrix · external verification · regression baseline | LOW |
| 1 | Safe Brand Foundation — `Brand` entity, Joba24 seed, nullable attribution fields | LOW |
| 2 | Backfill + reconciliation (existing data → Joba24) — **deployed** | MEDIUM |
| 3 | **Security hardening — RLS + server authorization, entity by entity** | **CRITICAL** |
| 4 | Categories / configuration as data | HIGH |
| 5 | Distribution engine | HIGH |
| 6 | Brand runtime (config, features, commercials, notifications, analytics) | MEDIUM |
| 7 | Joba24 Brand Engine parity (shadow comparison) | MEDIUM |
| 8 | First external Brand — **web only** + Partner Admin | MEDIUM |
| 9 | Custom-domain production hardening | HIGH |
| 10 | Branded native applications | HIGH |
| 11 | Self-service Brand Factory | MEDIUM |

**Critical path:** 3 → 5 → 6 → 7 → 8. Phase 4 is parallelisable. Phase 3 is independently valuable to Joba24 today.

---

## 7. Portability principle (ADR-16…ADR-22)

```
        JOBA24 PLATFORM            ← owned by Joba24
              ↓
         BRAND ENGINE              ← configuration-driven
              ↓
   N independent marketplace brands
              ↓
   Base44 (or any provider)        ← infrastructure layer only
```

- Brand identity is **Joba24-owned**; domains are **Joba24-owned** (custom domain or `brand.joba24.com`).
- Provider-specific identifiers, if ever unavoidable, are isolated as provider metadata — **never** the domain identity.
- Adapters are introduced **per subsystem**, not as a framework.
- Portability is **documented**, not executed. See `BASE44_DEPENDENCY_REGISTER.md`.
- Portability must **never** split the core: one user, one task, one application, one chat, one marketplace.