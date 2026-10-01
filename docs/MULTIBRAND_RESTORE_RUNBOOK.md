# JOBA24 MULTI-BRAND — RESTORE RUNBOOK & ROLLBACK POLICY

> Living document. **Every implementation package, migration and phase MUST be recorded here before it is deployed.**
> Purpose: allow any developer to restore the system to a verified state **without relying on memory**.

---

# ⛔ MANDATORY SECURITY BLOCKER — TRANZILA MUST NOT BE REACTIVATED

**Recorded 2026-10-01 (Package #3.1B). Status: OPEN.**

Tranzila payments are frozen and **not active in production**.

> **Tranzila payments must NOT be reactivated until Package #3.1A is completed, after the required answers are received from Tranzila support.**

> **Status clarification (2026-10-01, Package #3.1F):** the freeze is **external** — Tranzila has frozen the merchant account and it is **PARKED**. Verified during 3.1F: the Tranzila code path (`BuyCreditsModal` → `PaymentConfirm` → `tranzilaCreatePayment` → `TranzilaIframe`) is present in the published app and is **not** gated by any in-app kill switch; `tranzilaCreatePayment` / `verifyTranzilaPayment` / `checkTranzilaPayment` carry only `auth.me()` (no role gate) and `tranzilaNotify` is unauthenticated. **The freeze therefore rests on Tranzila's side, not on an application control** — recorded so the freeze is not mistaken for code enforcement, and so the 3.1A forge paths are understood to be unreachable only because Tranzila will not process the transaction. No payment flow was modified, tested or activated in 3.1F. `TranzilaPayment` = **17** records (16 pending · 1 completed), unchanged from LKGS-3.1B.

There is **no server-side verification of Tranzila payment authenticity**, and there are **two** independent credit-granting paths that trust client-supplied results:

| Path | Exposure |
|---|---|
| `verifyTranzilaPayment` | **Primary** credit path. Authenticated, but grants credits on a client-supplied `response_code === '000'` with no provider confirmation — forgeable by any signed-in user for their own pending payment. |
| `tranzilaNotify` | Unauthenticated webhook. Grants credits on a client-supplied `Response === '000'` with no signature, no source check and no replay protection. |

`response_hash` (Tranzila's documented HMAC authenticity mechanism) is scoped to **Hosted Fields only**; it is **not** documented for the DirectNG iframe or the `notify_url` callback, which is what Joba24 uses. The correct mechanism therefore **cannot be established from public documentation**.

**Gate:** Package #3.1A may not start until Tranzila support answers §M. **Reactivation gate:** Tranzila may not be switched back on until 3.1A is deployed and verified.

---

## TranzilaPayment 15 → 17 — EXPLAINED / NO UNEXPECTED ACTIVITY

**Recorded 2026-10-01. Status: CLOSED — do not investigate further.**

`TranzilaPayment` records moved from **15** (LKGS-3.0) to **17** (LKGS-3.1B) while payments were frozen.

**The owner confirms they personally initiated exactly two Tranzila payment attempts during this period, and received no credits from either attempt.**

This fully accounts for the increase: 2 attempts → 2 `pending` records → 0 credits granted. That is the **expected** behaviour of the current (unverified) flow when a payment attempt does not complete successfully, and is consistent with Tranzila being blocked from reactivation.

**No unexpected activity. No anomaly. These two records must not be investigated, modified, credited, refunded or deleted unless contradictory evidence appears.**

---

# PART 1 — ROLLBACK POLICY (NON-NEGOTIABLE)

Applies to Implementation #1 and to **every** future implementation package, migration and phase.

## 1. Core principle — always preserve a safe way back

Joba24 is a live production system. At every stage we must be able to return to the last verified working state if an unexpected bug, regression, auth failure, feed change, data-isolation failure, security issue or migration surprise appears.

**The Multi-Brand project must never put us in a position where continuing forward is the only option.**
There must always be a documented and tested path back.

## 2. Last Known Good State (LKGS)

Before **every** implementation package, capture and record:

- code / repository version
- schemas, entities
- relevant configuration, RLS / security rules
- functions affected
- database state / counts
- feature flags and runtime configuration
- Golden Joba24 Regression Suite results
- feed / query baselines
- migration state

Goal: know exactly *"what did Joba24 look like immediately before this implementation?"*

## 3. Every change must have a rollback plan BEFORE it is made

Before implementing, provide:

| | |
|---|---|
| **A** | What will change |
| **B** | What existing files / entities / data can be affected |
| **C** | Exact rollback procedure |
| **D** | Does rollback change code only, schema, configuration or data? |
| **E** | Could any data be lost during rollback? |
| **F** | Can rollback run while production stays online? |
| **G** | Estimated rollback complexity |
| **H** | Verification steps after rollback |

**If a safe rollback cannot be designed: DO NOT IMPLEMENT. Report the blocker first.**

## 4. Prefer reversible / additive changes

```
ADDITIVE FIRST  →  BACKFILL SECOND  →  VERIFY  →  SWITCH LATER  →  REMOVE LEGACY MUCH LATER
```

Prefer: new nullable fields · new entities · adapters · feature flags · shadow reads · compatibility layers · versioned configuration · reversible migrations.

Avoid early: deleting/renaming fields · deleting entities · replacing existing data · destructive or irreversible migrations · removing legacy code paths · unnecessary edits to historical records.

The existing Joba24 path stays available until the replacement has proven parity.

## 5. Do not delete legacy implementation early

When a new Brand-aware implementation replaces a Joba24 subsystem:

```
Legacy Joba24 path + New Brand-aware path
   → shadow comparison → parity verification
   → feature flag / controlled adoption → monitoring
   → only much later, consider legacy removal
```

This is what allows switching Joba24 back if necessary.

## 6. Feature flags / kill switches

Every major Multi-Brand subsystem should have a safe kill switch:

brand-aware feed · Distribution Engine · Brand Runtime · brand-specific categories · Partner Admin · brand notifications · brand commercial logic · brand-specific features.

If a new subsystem causes a production issue we must be able to disable it and return Joba24 to legacy/default behaviour **without emergency code surgery**. Do not add unnecessary complexity for trivial schema-only changes.

## 7. Data migration safety

No production data migration without: pre-migration counts · backup/recovery strategy · idempotent migration where possible · resumable batches where possible · reconciliation · post-migration counts · validation · rollback/reversal strategy.

The migration must record enough information to **safely reverse** the change. Never overwrite historical information without preserving the ability to reconstruct the previous state.

## 8. Never use DELETE as the only rollback for live business data

Distinguish:

- **TECHNICAL ROLLBACK** — revert code / configuration / schema behaviour.
- **DATA PRESERVATION** — retain valid historical marketplace records.

Early phases may remove newly added *unused* entities/fields safely. Once real brands/users/tasks/applications/payments exist, rollback must **not** blindly delete business data. Prefer: disable · suspend · feature flag OFF · route Joba24 back to legacy behaviour — never delete Tasks, Applications, Chats, Reviews, Payments or historical records.

## 9. Database / schema rollback

For every schema change document: previous schema · new schema · exact diff · rollback schema · whether new data can exist in the added fields/entity · what happens to that data during rollback.

**Do not remove a newly introduced field/entity if doing so would destroy valid production data.** In that case: disable its use → restore legacy behaviour → preserve the data → design a separate cleanup procedure later.

## 10. Security / RLS rollback

Phase 3 is especially sensitive. Every RLS/security change must be **entity-by-entity, independently deployable, testable and reversible.** Never deploy RLS changes to all entities as one irreversible package.

Per entity: `baseline → change → authorization tests → Joba24 regression tests → monitoring → approve next entity.`
If users lose legitimate access: **roll back that entity's rule immediately.**

Security rollback must never mean intentionally reopening known cross-brand access after external brands are live. Before Brand #2 goes live, the target authorization model must be proven safe.

## 11. Restore runbook

This document. For every completed package record: package/version · date · files changed · schemas changed · data migrated · configuration changed · feature flags · verification result · rollback procedure · rollback dependencies · last known good version · known limitations.

## 12. Rollback verification

A rollback is **not** successful merely because deployment succeeded. After any rollback, rerun the relevant Golden Joba24 Regression Suite (full suite for a major rollback).

**Success condition: Joba24 behaviour matches the Last Known Good State.**

## 13. Multi-brand must never become required for legacy Joba24 too early

During migration, avoid architecture where Joba24 immediately depends on every new Brand subsystem. Until a subsystem is proven, Joba24 keeps a safe legacy/default path.

**Long-term architecture = Multi-Brand. Migration strategy = controlled coexistence.** This distinction is mandatory.

## 14. Emergency priority

1. Protect and restore Joba24.
2. Preserve data integrity.
3. Investigate the Multi-Brand issue.

Do not attempt multiple speculative fixes on production when a known safe rollback is available.

## 15. Implementation #1 specific requirement

Because **no backfill and no runtime usage** are approved in Implementation #1, rollback is simple and lossless:

1. Remove the newly added unused Brand foundation safely.
2. Revert `Task` schema to its exact previous definition.
3. Revert `TaskApplication` schema to its exact previous definition.
4. Restore the previous repository/configuration version.
5. Verify no production records were unintentionally changed.
6. Rerun the Golden Joba24 Regression Suite.
7. Confirm Joba24 matches the pre-change baseline.

---

# PART 2 — PACKAGE RECORDS

## Package #1 — Safe Brand Foundation ✅ DEPLOYED

| | |
|---|---|
| **Date** | 2026-10-01 |
| **Phase** | 1 (Safe Brand Foundation) |
| **Status** | Deployed |
| **Last Known Good State** | see §LKGS-1 |

### Files changed

| File | Change |
|---|---|
| `base44/entities/Brand.jsonc` | **NEW** entity (slug, name, status, origin, is_default) + RLS (read public / write admin) |
| `base44/entities/Task.jsonc` | **+1 nullable field** `origin_brand_id` (appended; all 64 original properties byte-identical) |
| `base44/entities/TaskApplication.jsonc` | **+1 nullable field** `surface_brand_id` (appended; all 12 original properties byte-identical) |
| `src/lib/brandResolver.js` | **NEW** pure module — **not imported anywhere** (dead code until Phase 6) |
| `docs/MULTIBRAND_RESTORE_RUNBOOK.md` | **NEW** this document |

### Schemas changed
Two existing entities gained one nullable field each. **No field removed, renamed, retyped or re-required.** `required` arrays unchanged.

### Data migrated
**NONE.** No backfill, no update, no delete. Existing Task/TaskApplication records were not touched.

### Configuration / feature flags changed
**NONE.**

### Behaviour change
**NONE INTENDED.** No read path, feed, auth, notification, category or native behaviour depends on the new entity or fields.

### Verification result
- Entity JSON validates (Task 65 properties, TaskApplication 13 properties).
- All original property keys preserved in order; new key appended last.
- `required` arrays unchanged.
- Baseline counts unchanged: **272 Tasks**, **123 TaskApplications**.
- No source file references `origin_brand_id`, `surface_brand_id`, `brandResolver` or the `Brand` entity.
- Build passes.

### Rollback procedure
1. Delete `base44/entities/Brand.jsonc`.
2. Delete the seeded `Brand` record (`slug: 'joba24'`) — **not business data; no Tasks/Applications/Payments involved.**
3. Remove `origin_brand_id` from `base44/entities/Task.jsonc`.
4. Remove `surface_brand_id` from `base44/entities/TaskApplication.jsonc`.
5. Delete `src/lib/brandResolver.js`.
6. Restore the repository to the pre-change commit.

### Rollback dependencies
None. No other package depends on Package #1. No runtime path reads the new fields.

### Rollback complexity
**LOW.** Code + schema only. No data migration to reverse.

### Data loss risk on rollback
**NONE.** The only record created is the Brand seed, which is intentional configuration (not marketplace data). The two new fields are null on every record.

### Online rollback
Yes — no downtime required.

### Known limitations
- `Brand` entity is inert: nothing reads it.
- `brandResolver.js` is dead code.
- `origin_brand_id` / `surface_brand_id` are null on all existing records (backfill is Phase 2, not yet approved).
- Brand `slug` immutability is a policy, not yet enforced (RLS cannot enforce field-level immutability).

---

## Package #2 — Joba24 Historical Attribution Backfill ✅ **DEPLOYED**

| | |
|---|---|
| **Date** | 2026-10-01 |
| **Phase** | 2 (Backfill) |
| **Status** | **Deployed** |
| **Last Known Good State** | see §LKGS-2 |
| **Canonical identifier** | **`Brand.id` = `6abdfc541dc144ca0d91fde9`** (ADR-23) |
| **Production data changed** | `Task.origin_brand_id` × 272 · `TaskApplication.surface_brand_id` × 123 · `updated_date` (platform auto-bump) |

### Change plan (A–H)

| | |
|---|---|
| **A. What will change** | `Task.origin_brand_id` and `TaskApplication.surface_brand_id` set to the canonical Joba24 Brand identifier, only where the field is currently unset |
| **B. Files/entities/data affected** | `Task` (272 records), `TaskApplication` (123 records). **No schema, no code, no configuration.** |
| **C. Exact rollback procedure** | Using the migration manifest, reset **only** the record IDs listed in it to `NULL`. Never a blanket `origin_brand_id = NULL`. |
| **D. Rollback changes** | Data only (field values). No schema, code or configuration. |
| **E. Data loss risk on rollback** | None — the fields are unset on every record and carry no business meaning |
| **F. Online rollback possible** | Yes |
| **G. Rollback complexity** | LOW |
| **H. Verification after rollback** | Re-run counts; confirm all Task/TaskApplication fields identical to LKGS-2 |

### ✅ Resolved — identifier decision

**RESOLVED 2026-10-01.** Option **A — `Brand.id`** approved as the canonical relational Brand identifier and codified as **ADR-23**. The blocker record below is retained as the historical evidence of why the gate fired.

#### Original blocker — canonical Brand identifier was ambiguous

The implementation and the blueprint **disagree** on whether these fields hold the Brand **record ID** or the Brand **slug**:

| Source | Implies |
|---|---|
| `src/lib/brandResolver.js` — `resolveBrandSlug()`, `DEFAULT_BRAND_SLUG = 'joba24'`, `KNOWN_DOMAINS` values are slugs | **slug** |
| Blueprint §5 — `task.origin_brand_id === surface` where `surface === 'joba24'` | **slug** |
| Field naming `origin_brand_id` / `surface_brand_id` (`_id` suffix, consistent with `client_id`, `worker_id`, `task_id`, `reviewer_id` in this codebase) | **record ID** |
| ADR-17 — lists "`brand_id` and `brand.slug`" as two **distinct** identifiers | **record ID** |
| ADR-19 — chain ends `→ brand_id → BrandContext`, but the implemented resolver emits a **slug** | **contradiction** |

**Secondary finding:** `brandResolver.js` cites its authority as "§R בבלופרינט" — **no §R exists** in the blueprint (sections are 1–7). The resolver was written against a different blueprint revision than the one that was approved.

**Resolution required before any write.** Candidate values:

| Option | Value | Consequence |
|---|---|---|
| **A — Brand record ID** | `6abdfc541dc144ca0d91fde9` | Matches `_id` naming and ADR-17; requires `brandResolver` to return an ID (or a slug→ID lookup) |
| **B — Brand slug** | `joba24` | Matches `brandResolver`; requires reinterpreting the `_id`-suffixed field names and breaks the codebase naming convention |

**No production data may be written until one option is chosen and the blueprint, the resolver and the field semantics are aligned.**

### ✅ Execution record (deployed 2026-10-01)

| | |
|---|---|
| **Executed at** | 2026-10-01 07:27 UTC (10:27 Asia/Jerusalem) |
| **Canonical identifier written** | `Brand.id` = `6abdfc541dc144ca0d91fde9` |
| **Precondition checks** | **8/8 passed** at execution time (exactly one Brand · exactly one default · exactly one `joba24` slug · id match · slug match · `is_default=true` · `status=active` · `origin=platform`) |
| **Tasks changed** | **272** |
| **TaskApplications changed** | **123** |
| **Skipped (already non-null)** | 0 Tasks · 0 TaskApplications |
| **Remaining missing/null** | 0 Tasks · 0 TaskApplications |
| **Other Brand IDs found** | 0 |
| **Records created during execution** | 0 |
| **Migration manifest** | `docs/PACKAGE2_MIGRATION_MANIFEST.json` (272 task IDs · 123 application IDs, all unique) |
| **Method** | Read all records → select where the field was **missing OR null** → `bulkUpdate` only those records, setting only the brand field |
| **Idempotency** | Confirmed — a second run selects 0 eligible records and writes nothing |

### Data-integrity verification

Every record's only non-brand change is **`updated_date`**, which the platform bumps automatically on any write. Confirmed by field-level before/after diff against the LKGS-2 capture:

- `Task 6abd35f75c91b85155828cd4` — changed: `origin_brand_id` (intended) + `updated_date` (auto). `title`, `price`, `status`, `client_id`, `client_name`, `category`, `applicants`, `created_date`, `description`, `base_price`, `views_count`, `clicks_count`, `is_story`, `urgency_tag` — **all unchanged**.
- `TaskApplication 6ab9a98fc542590392825e7b` — changed: `surface_brand_id` (intended) + `updated_date` (auto). **All 18 other fields unchanged.**

All 272 Tasks share one `updated_date` minute (07:26) and all 123 applications another (07:27) — consistent with a single bulk write per entity, and with no other writer touching the records.

### Documentation corrected in this package

| File | Change |
|---|---|
| `docs/MULTIBRAND_BLUEPRINT.md` | New **ADR-23** (canonical `Brand.id`); **ADR-17** rewritten; **ADR-19** resolution chain corrected; new **Invariant 8**; identifier note added to §3; §5 pseudo-code `'joba24'` → `JOBA24_BRAND_ID` + routing note; Phase 2 marked deployed; status line updated |
| `src/lib/brandResolver.js` | **Documentation/contract only.** Now states the slug is a **lookup key only**, never `Brand.id`; removed the stale "§R" reference; documents the full `hostname → slug → Brand → Brand.id → BrandContext` chain. **No logic change, no lookup added, still imported nowhere.** |

### Known gap — intentionally unresolved

Task and TaskApplication **creation** runtime logic was **not** modified. Records created after this migration may still be written **without** brand attribution. This is a deliberate, explicitly reported gap, to be addressed only in a separately approved package.

### Rollback

1. Read `docs/PACKAGE2_MIGRATION_MANIFEST.json`.
2. Unset `origin_brand_id` **only** on the 272 listed task IDs.
3. Unset `surface_brand_id` **only** on the 123 listed application IDs.
4. **Never** run a global clear. No other field may be modified.

---

## Package #2.1 — Default Joba24 Attribution for New Records ✅ **DEPLOYED**

| | |
|---|---|
| **Date** | 2026-10-01 |
| **Phase** | 2.1 — closes the attribution gap recorded at the end of Package #2 |
| **Status** | **Deployed** |
| **Last Known Good State** | see §LKGS-2.1 |
| **Canonical identifier** | **`Brand.id` = `6abdfc541dc144ca0d91fde9`** (ADR-23) |
| **Production data changed** | **NONE** — code only |

### Change plan (A–H)

| | |
|---|---|
| **A. What will change** | New `Task` records receive `origin_brand_id`; new `TaskApplication` records receive `surface_brand_id`. Both set to the canonical Joba24 `Brand.id`. |
| **B. Files/entities/data affected** | 5 existing files edited + 2 new constant modules. **No entity schema change. No data migration. No configuration change.** |
| **C. Exact rollback procedure** | Remove the two new constant modules; revert the 5 added import lines and the 8 added field lines (full procedure below). |
| **D. Rollback changes** | Code only. No schema, configuration or data. |
| **E. Data loss risk on rollback** | **None.** Records created after deployment keep their attribution (valid business data). Rollback stops *future* attribution only. |
| **F. Online rollback possible** | Yes |
| **G. Rollback complexity** | **LOW** |
| **H. Verification after rollback** | Publish a task → confirm the record has no `origin_brand_id`. |

### Complete write-path inventory

**Task creation — 5 paths, all covered:**

| # | Path | Type | File |
|---|---|---|---|
| 1 | Publisher form publish | **PRODUCTION** | `src/pages/CreateTask.jsx` |
| 2 | Publisher chat-composer publish | **PRODUCTION** | `src/pages/CreateTask.jsx` |
| 3 | QA simulator — task helper | internal tool | `src/pages/SimulatorPanel.jsx` |
| 4 | QA simulator — story scenario | internal tool | `src/pages/SimulatorPanel.jsx` |
| 5 | Bulk demo-task generator | internal tool (service role) | `base44/functions/bulkSimulatorTasks/entry.ts` |

**TaskApplication creation — 3 paths, all covered:**

| # | Path | Type | File |
|---|---|---|---|
| 1 | Worker applies to a task | **PRODUCTION** | `base44/functions/applyForTask/entry.ts` |
| 2 | QA bot — apply | internal tool | `base44/functions/qaBot/entry.ts` |
| 3 | QA bot — full_flow | internal tool | `base44/functions/qaBot/entry.ts` |

No workflow, AI/automation flow, referral flow or admin tool creates either entity. Every other reference to these entities across the codebase is a **read** or an **update** — verified by full-codebase search.

### Files changed

| File | Change |
|---|---|
| `src/lib/jobaBrand.js` | **NEW** — `JOBA24_BRAND_ID` (frontend constant) |
| `base44/shared/jobaBrand.ts` | **NEW** — `JOBA24_BRAND_ID` (backend constant) |
| `src/pages/CreateTask.jsx` | +1 import · +2 `origin_brand_id` lines |
| `src/pages/SimulatorPanel.jsx` | +1 import · +2 `origin_brand_id` lines |
| `base44/functions/bulkSimulatorTasks/entry.ts` | +1 import · +1 `origin_brand_id` line |
| `base44/functions/applyForTask/entry.ts` | +1 import · +1 `surface_brand_id` line |
| `base44/functions/qaBot/entry.ts` | +1 import · +2 `surface_brand_id` lines |

### How the canonical ID is obtained

A **single named constant per runtime**: `JOBA24_BRAND_ID = '6abdfc541dc144ca0d91fde9'`.

Frontend and backend have no shared import path (separate bundles), so the constant is defined once in each — `src/lib/jobaBrand.js` and `base44/shared/jobaBrand.ts`. That is the minimum necessary duplication. **All 8 creation sites import the constant**; the literal value appears nowhere else as a value (verified by full-codebase search).

### Failure behaviour if the default Brand cannot be resolved

**There is no runtime resolution step, therefore no runtime failure mode.**

A database lookup on every creation was **explicitly rejected**: it would add latency and a failure point to the most critical write path in the marketplace (publishing a task). A lookup that *blocks* creation risks the marketplace; one that does not block is pointless.

- A record is **never** silently created unattributed — the field is always written from the constant.
- A slug, domain, hostname or Base44 identifier is **never** substituted.
- Availability is fully preserved.
- Drift between the constant and the `Brand` record is detected by a **read-only audit**, not by blocking user writes. Changing the canonical identity means updating the `Brand` record **and** the constant — documented in both module headers.

### Verification

- **Round-trip (executed):** a temporary `Task` and `TaskApplication` were created through the same entity API the production paths use, read back and asserted:
  - `Task.origin_brand_id === '6abdfc541dc144ca0d91fde9'` ✅ (not a slug, not a Base44 identifier)
  - `TaskApplication.surface_brand_id === '6abdfc541dc144ca0d91fde9'` ✅
  - **Both temporary records were deleted.** Counts verified restored: Tasks **272 → 272**, TaskApplications **123 → 123**. **No residue.**
- **Backend module load:** `qaBot` invoked and returned a normal application-level response — the shared constant import resolves.
- **Build:** passes (exit 0).
- **Gap-period audit:** **0** Tasks and **0** TaskApplications were created between Package #2 and Package #2.1. No unattributed records exist.
- **Historical records untouched:** Tasks remain 272, TaskApplications remain 123, all still carrying the Package #2 attribution.

### Zero business behaviour change

The only record-level change is the two added fields. No change to publishing, pricing, credits, application charging, duplicate protection, eligibility, feed, ranking, search, map, worker selection, chat, tracking, completion, reviews, notifications, analytics, referrals, KYC, payments, auth, OAuth or domains. **No code path reads either field.**

### Rollback

1. Delete `src/lib/jobaBrand.js` and `base44/shared/jobaBrand.ts`.
2. Remove the 5 import lines added in this package.
3. Remove the 8 added field lines (`origin_brand_id` × 5, `surface_brand_id` × 3).
4. Restore the repository to the pre-Package-2.1 commit.
5. **Do not** modify any `Task` or `TaskApplication` record — Package #2 attribution and any Package #2.1-era attribution remain valid business data.

---

## Package #3.0 — Empirical Security Baseline Verification (READ-ONLY) ✅ **COMPLETED**

| | |
|---|---|
| **Date** | 2026-10-01 |
| **Phase** | 3.0 — security prerequisites |
| **Status** | **Completed — verification only** |
| **Last Known Good State** | see §LKGS-3.0 |
| **Production data changed** | **NONE** — no entity, function, schema, RLS, workflow, OAuth or configuration change |
| **Runtime code changed** | **NONE** |
| **Documentation changed** | Blueprint Invariant 9 added; this record |

### Change plan (A–H)

| | |
|---|---|
| **A. What will change** | Nothing at runtime. Read-only inspection plus one unauthenticated GET against the public `getOpenTasks` endpoint. |
| **B. Files/entities/data affected** | Documentation only. |
| **C. Exact rollback procedure** | Revert the two documentation edits. |
| **D. Rollback changes** | Documentation only. |
| **E. Data loss risk on rollback** | None. |
| **F. Online rollback possible** | Yes — no deployment involved. |
| **G. Rollback complexity** | Trivial. |
| **H. Verification after rollback** | Confirm no runtime file differs from `a09a35d`. |

### Verification result

- **Build:** exit 0.
- **Mutation performed:** **none.** No entity record created, updated or deleted. No credit, payment, KYC, settings, chat or task state touched. No push sent.
- **Disposable test records created:** **none** (see LKGS-3.0 note on Q1/Q2).
- **Q1 / Q2 (RLS-less and `User` semantics):** **NOT empirically verified.** A controlled non-admin or anonymous session token cannot be obtained from the build environment without either creating a production function or a production user. Reported as unverified; platform RLS authoring guide supplies the authoritative documented semantics.
- **Q3 / Q4 / Q5 / Q8:** resolved by static call-site and source analysis.
- **Q9:** resolved empirically — unauthenticated `GET /functions/getOpenTasks` returned HTTP 200 with full Task records.

### Known limitations

- Q1 and Q2 remain empirically open. They are the gating inputs for Package 3.5.
- Two confirmed findings require remediation packages: unauthenticated credit-minting endpoints, and the unauthenticated Tranzila webhook.

---

## Package #3.1A-PRE — Tranzila Callback Authenticity Research (READ-ONLY) ⛔ **BLOCKED — STOP CONDITION TRIGGERED**

| | |
|---|---|
| **Date** | 2026-10-01 |
| **Status** | **Blocked on provider confirmation. Nothing implemented.** |
| **Production data changed** | **NONE** |
| **Runtime code changed** | **NONE** |
| **Documentation changed** | This record · runbook blocker banner · blueprint status line |

### Outcome

The official Tranzila authenticity mechanism for the **DirectNG iframe / `notify_url`** callback **could not be established confidently** from public documentation, so per the package's own stop condition the work **stopped before any design**. `response_hash` is documented for **Hosted Fields only**.

### Material finding — the remediation scope is wrong as originally written

Package #3.1A as scoped (`tranzilaNotify` only) is **insufficient**. There are **two** credit-granting paths, and `verifyTranzilaPayment` is the *easier* forgery:

- `verifyTranzilaPayment` is the code's own documented **"PRIMARY mechanism"** and grants credits on a **client-supplied** `response_code === '000'` — reachable by any authenticated user for their own pending payment, with **zero** Tranzila involvement.
- `tranzilaNotify` is the **fallback**, unauthenticated.

**Both must be closed by the same server-side verification primitive.** 3.1A must be re-scoped before approval.

### Required from Tranzila support (§M)

1. Does the DirectNG iframe response include `response_hash`? Exact payload construction and secret?
2. Does the `notify_url` callback include a signature — especially for **subscription renewals** (which have no browser leg)?
3. Is there a server-to-server transaction-status query endpoint (by `index` / `transaction_id`)?
4. General secret or personal secret? Is `requested_by_user` required?
5. Are the Token Module and Handshake enabled on `joba24`, `joba24ch`, `joba24tok`?
6. Is there a DirectNG test/sandbox terminal?
7. What are `TRANZILA_JOBA24_*` and `TRANZILA_JOBA24CH_*`? They exist as secrets but are referenced by **zero** files. *(Purpose only — values never needed.)*
8. Is an IP allowlist supported for notify callbacks?

**Rollback:** not applicable — nothing was implemented.

---

## Package #3.1B — Internal Endpoint Security Closure ✅ **SOURCE COMPLETE — NOT YET PUBLISHED**

| | |
|---|---|
| **Date** | 2026-10-01 |
| **Phase** | 3.1B — security enforcement only |
| **Status** | **Source complete · reviewed · build passing.** **Deliberately NOT published.** |
| **Last Known Good State** | see §LKGS-3.1B |
| **Production data changed** | **NONE** |

### Scope (exactly three functions — no expansion)

`refundApplicationCredits` · `grantLoyaltyReward` · `notificationManager`

### Change plan (A–H)

| | |
|---|---|
| **A. What will change** | A server-side authorization check is added at the top of each of the three functions, before any existing logic. |
| **B. Files/entities/data affected** | 1 new shared module + 3 function files. **No entity, schema, RLS, workflow, secret, payment or UI change.** |
| **C. Exact rollback procedure** | Per function, independently: remove its added import line and its guard block; delete `base44/shared/internalAuth.ts` only if all three are rolled back. |
| **D. Rollback changes** | Code only. |
| **E. Data loss risk on rollback** | None. |
| **F. Online rollback possible** | Yes. |
| **G. Rollback complexity** | **LOW** — each function rolls back alone. |
| **H. Verification after rollback** | Re-run build; confirm the function again returns its pre-package response for a test payload. |

### Files changed

| File | Change |
|---|---|
| `base44/shared/internalAuth.ts` | **NEW** — `getAuthenticatedUser`, `isServiceRoleCall`, `unauthorized`, `forbidden` |
| `base44/functions/refundApplicationCredits/entry.ts` | +1 import · +1 guard (requires a signed-in user) |
| `base44/functions/grantLoyaltyReward/entry.ts` | +1 import · +1 guard (requires a signed-in user) |
| `base44/functions/notificationManager/entry.ts` | +1 import · +1 guard (requires the service credential) |

### Before → after authorization

| Function | Before | After |
|---|---|---|
| `refundApplicationCredits` | **None** — any caller, including anonymous | Signed-in user required (401 otherwise) |
| `grantLoyaltyReward` | **None** — any caller, including anonymous | Signed-in user required (401 otherwise) |
| `notificationManager` | **None** — any caller, including anonymous | Service credential required (403 otherwise) |

### Why these levels (evidence-based, no invented policy)

- `refundApplicationCredits`: exactly **one** caller — `SimulatorPanel.jsx`. Production refunds do **not** use this function; they use inline logic in `approveWorker`, `declineApplication`, `cancelMyApplication`, `expireInactiveTasks`, `cancelApprovedWorker`.
- `grantLoyaltyReward`: **three** call sites — `SimulatorPanel.jsx` and `submitReview` ×2. `submitReview` authenticates the user first, then forwards that user token via `base44.functions.invoke`.
- `notificationManager`: **zero** frontend callers. All **16** callers are backend functions, **every one confirmed** to use `base44.asServiceRole.functions.invoke`.

### Joba24 behaviour parity

No refund calculation, credit amount, loyalty percentage/minimum, eligibility, timing, notification content, timing, recipient logic, segmentation, cooldown, push behaviour, email behaviour, workflow or scheduled notification was changed. Only an authorization gate was added ahead of existing logic.

### Pre-publish closure review (2026-10-01) — findings recorded, NOT fixed

Three security findings were reviewed and **deliberately deferred** to a separately approved package. None is a regression introduced by 3.1B; all three pre-date it.

| # | Finding | Disposition |
|---|---|---|
| 1 | `grantLoyaltyReward` trusts a client-supplied `rating`, so a signed-in user can mint loyalty credits for any worker. | **Deferred.** Auth guard retained. Fix requires deriving `rating` server-side from the Review. |
| 2 | `/simulator` is reachable by **any signed-in user** and can mint credits, mutate task/application lifecycle and cancel another user's approved worker. | **Deferred.** Evidence establishes it as internal QA tooling (see below). Needs route-level + server-side gating. |
| 3 | `notificationManager`'s service-role guard is unverified at runtime. | **Accepted risk, controlled.** Not weakened. See the controlled post-publish procedure below. |

**Simulator intent evidence (recorded):** the `/simulator` route is nested under `<ProtectedRoute />` (authentication only — **no role gate**); it has **no navigation entry point anywhere** in the app (no `Link`, absent from `SideMenu`, absent from the admin menu); its own heading reads "QA סימולטור — השקה"; it contains buttons that mutate credits and task lifecycle; and Joba24 already gates its other internal tooling (`NewUserSimulator`, documented as "Admin-only") behind `me?.role === 'admin'`. **Conclusion: internal QA / Platform Admin tooling, not a normal-user feature.**

**Controlled post-publish verification for `notificationManager` (do not send real notifications):**
1. Publish.
2. Trigger exactly **one** low-risk, self-addressed notification through a legitimate path (e.g. a `notify*` workflow on a test task owned by the tester).
3. Inspect the function's own log line: absence of `[NotificationManager] Rejected non-service-role invocation` proves the service credential was forwarded.
4. Confirm a `NotificationLog` row was written for the tester.
5. If the rejection warning appears, **roll back the `notificationManager` guard alone** (per the rollback above) — the other two functions are unaffected.

### Known limitations / residual risk

- `notificationManager`'s guard depends on the platform forwarding `Base44-Service-Authorization` on service-role function→function invocations. Documented behaviour, but **unverified at runtime**. If notifications stop after publishing, this guard is the first thing to check.
- Runtime verification of all three guards **requires the app to be published** — the published URL serves the published build, so pre-publish external probes necessarily still show the old behaviour.

### Rollback (per function, independent)

1. **`refundApplicationCredits`** — remove the `internalAuth` import line and the guard block above `const { applicationId, reason } = await req.json();`.
2. **`grantLoyaltyReward`** — remove the `internalAuth` import line and the guard block above `const { taskId, workerId, rating, taskTitle } = await req.json();`.
3. **`notificationManager`** — remove the `internalAuth` import line and the guard block above `const { event_key, ... } = await req.json();`.
4. Delete `base44/shared/internalAuth.ts` **only if** all three are rolled back.
5. **No data action required** — nothing was migrated.

---

## Package #3.1C — Internal Tooling Closure ✅ **SOURCE COMPLETE — NOT YET PUBLISHED**

| | |
|---|---|
| **Date** | 2026-10-01 |
| **Phase** | 3.1C — closes the three findings deferred by the Package #3.1B pre-publish closure review |
| **Status** | **Source complete · reviewed · build passing.** **Deliberately NOT published.** |
| **Last Known Good State** | see §LKGS-3.1C |
| **Production data changed** | **NONE** — code only |

### Scope (exactly what was approved — no expansion)

1. `/simulator` route gated to admin.
2. Server-side admin authorization on `bulkSimulatorTasks` · `qaBot` · `refundApplicationCredits`.
3. `grantLoyaltyReward` — reward-critical data derived server-side.
4. `submitReview` — client-supplied `isOwner` removed.
5. `notificationManager` — **not changed** (guard kept exactly as reviewed in 3.1B).
6. Tranzila — **not touched**. The 3.1A blocker remains fully in force.

### Change plan (A–H)

| | |
|---|---|
| **A. What will change** | One new admin route guard; one new shared authorization helper; admin checks added to three backend functions; the reward and review trust boundaries moved server-side. |
| **B. Files/entities/data affected** | 2 new/edited frontend files + 6 backend files. **No entity, schema, RLS, workflow, secret, payment or notification change.** |
| **C. Exact rollback procedure** | Revert the four trust-boundary edits and remove the guards (full procedure below). |
| **D. Rollback changes** | Code only. |
| **E. Data loss risk on rollback** | **None.** No record was created, updated or deleted. |
| **F. Online rollback possible** | Yes. |
| **G. Rollback complexity** | **LOW** — each function rolls back independently. |
| **H. Verification after rollback** | Re-run build; confirm `/simulator` renders for a non-admin and the pre-3.1C function contracts are restored. |

### Files changed

| File | Change |
|---|---|
| `src/components/AdminRoute.jsx` | **NEW** — admin-only route guard (`role === 'admin'`) |
| `src/App.jsx` | +1 import · `/simulator` moved inside `<AdminRoute />` |
| `base44/shared/internalAuth.ts` | +`requireInternalOperator` (admin user **or** service-role caller) |
| `base44/functions/bulkSimulatorTasks/entry.ts` | +1 import · +1 admin guard |
| `base44/functions/qaBot/entry.ts` | +1 import · +1 admin guard |
| `base44/functions/refundApplicationCredits/entry.ts` | guard raised from *signed-in* → *admin* |
| `base44/functions/grantLoyaltyReward/entry.ts` | +1 import · body reduced to `{ taskId }` · all reward inputs derived server-side |
| `base44/functions/submitReview/entry.ts` | `isOwner` derived server-side · both reward calls reduced to `{ taskId }` |

### Before → after trust boundaries

| Path | Before (trusted the client for) | After (derives server-side) |
|---|---|---|
| `/simulator` route | Authentication only | **Admin only** |
| `bulkSimulatorTasks` | Nothing (any signed-in user) | **Admin** |
| `qaBot` | Nothing (any signed-in user) | **Admin** |
| `refundApplicationCredits` | Nothing (any caller) → 3.1B: any signed-in user | **Admin** |
| `grantLoyaltyReward` | `taskId`, `workerId`, `rating`, `taskTitle` | `taskId` **only**; owner, rating, worker and title all read from persisted records |
| `submitReview` | `isOwner` (client boolean) | `task.client_id === user.id` |

`notificationManager` is unchanged — its service-role guard is exactly as reviewed in Package #3.1B.

### Parity evidence (read-only, no production writes)

- **Build:** exit 0.
- **Persisted-record parity check** across all **4** existing `Review` records and their `Task`s:
  - **3/4** are `role: 'client'` where the reviewer **is** the task's client → the new derivation yields `isOwner = true` → the 5-star reward path is reachable, exactly as before.
  - **1/4** is `role: 'worker'` where the reviewer **is** the task's worker → the new derivation yields `isOwner = false` → **no** reward, exactly as before.
  - **4/4 agreement** between the stored review `role` and the newly derived ownership. The server-side derivation reproduces the legitimate flow exactly.
- **Reward math unchanged:** `creditsCharged` → `effectiveCharged` → `max(loyalty_reward_min, round(effectiveCharged × loyalty_reward_percent / 100))`, plus the unchanged idempotency check on `(user_id, task_id, type: 'Loyalty_Reward')`. Settings still resolve to `loyalty_reward_percent: 10`, `loyalty_reward_min: 1`.
- **Order of operations preserved:** rating gate → idempotency → application lookup → bonus calculation → balance update → transaction log.
- **No caller sends a removed field.** Both `submitReview` call sites now send `{ taskId }`.

### Deliberate non-change (recorded)

`SimulatorPanel.jsx` line ~470 calls `grantLoyaltyReward` with `{ userId: me?.id }`. Under the old contract this **already** failed validation (400 — `taskId`, `workerId` and `rating` were all required), and the UI reported success unconditionally. Under the new contract it fails for the same reason (`taskId` missing). **Behaviour is identical; the button was already non-functional.** Left untouched — out of scope for this package.

### Residual risks (recorded, NOT closed by 3.1C)

1. **`submitReview` still trusts `revieweeId` and `role`.** A caller could direct a rating at an arbitrary user. This is a review-integrity issue, not a credit-minting one, and was outside the approved scope.
2. **`grantLoyaltyReward`'s admin/service-role reachability.** The function now requires the caller to be the task owner, so it is closed to forgery regardless of role.
3. **`notificationManager` runtime verification** still pending the controlled post-publish procedure (unchanged from 3.1B).
4. **The QA agent** invokes `qaBot`. `requireInternalOperator` admits a service-role caller, so the agent path is preserved **provided** the platform invokes agent tools with service authority or the agent user is an admin. Unverified at runtime — same class of dependency as the 3.1B `notificationManager` guard. If the QA agent reports 403 after publishing, this is the first thing to check.

### Rollback (per file, independent)

1. **`src/App.jsx`** — remove the `AdminRoute` import and restore `<Route path="/simulator" element={<SimulatorPanel />} />` inside the `<ProtectedRoute />` group.
2. **`src/components/AdminRoute.jsx`** — delete the file (only after step 1).
3. **`bulkSimulatorTasks` / `qaBot`** — remove the `internalAuth` import line and the `requireInternalOperator` guard block.
4. **`refundApplicationCredits`** — remove the guard block (or restore the 3.1B signed-in-user guard).
5. **`grantLoyaltyReward`** — restore the 3.1B body-trusting contract and re-add `workerId`/`rating`/`taskTitle` to both `submitReview` call sites.
6. **`submitReview`** — restore `isOwner` to the request-body destructure.
7. **No data action required** — nothing was migrated.

---

## Package #3.1D — Review Integrity Closure ✅ **SOURCE COMPLETE — NOT YET PUBLISHED**

| | |
|---|---|
| **Date** | 2026-10-01 |
| **Phase** | 3.1D — closes the review-integrity trust boundary recorded as residual risk #1 in Package #3.1C |
| **Status** | **Source complete · reviewed · build passing.** **Deliberately NOT published.** |
| **Last Known Good State** | see §LKGS-3.1D |
| **Production data changed** | **NONE** — code only |

### Scope (exactly what was approved — no expansion)

`submitReview` only. No other function, entity, schema, RLS rule, workflow or client file was touched.

### Change plan (A–H)

| | |
|---|---|
| **A. What will change** | `submitReview` stops accepting `revieweeId` and `role` from the request body and derives both from the persisted `Task` and the authenticated caller. A caller who is neither party to the task is rejected. |
| **B. Files/entities/data affected** | **1 backend file.** No entity, schema, RLS, workflow, secret, payment, credit or notification change. |
| **C. Exact rollback procedure** | Restore the 3.1C destructure (`revieweeId`, `role`), the original `!taskId \|\| !revieweeId \|\| !rating \|\| !role` validation, and the single-line `isOwner` derivation; remove the `forbidden` import. |
| **D. Rollback changes** | Code only. |
| **E. Data loss risk on rollback** | **None.** No record was created, updated or deleted. |
| **F. Online rollback possible** | Yes. |
| **G. Rollback complexity** | **LOW** — one file, one function. |
| **H. Verification after rollback** | Re-run build; confirm a review can again be submitted with a client-supplied `revieweeId`/`role`. |

### Files changed

| File | Change |
|---|---|
| `base44/functions/submitReview/entry.ts` | +1 import (`forbidden`) · destructure drops `revieweeId` + `role` · validation narrowed to `taskId` + `rating` · relationship derived server-side · non-party caller rejected · missing-counterpart rejected |

### Trust boundary — before → after

| Field | Before (3.1C) | After (3.1D) |
|---|---|---|
| `revieweeId` | **trusted from client** — any user id | **derived**: `isOwner ? task.worker_id : task.client_id` |
| `role` (direction) | **trusted from client** — `'client'` or `'worker'` | **derived**: `isOwner ? 'client' : 'worker'` |
| `isOwner` | derived server-side (3.1C) | derived server-side — unchanged |
| Caller must be a party to the task | not enforced | **enforced** — otherwise `403` |
| Task must have a counterpart for the direction | not enforced | **enforced** — otherwise `400` |

### Derivation rule (authoritative)

```
isOwner  = task.client_id === user.id      // caller is the task's client
isWorker = task.worker_id === user.id      // caller is the assigned worker

if (!isOwner && !isWorker) → 403            // caller is neither party

role       = isOwner ? 'client' : 'worker'  // direction, derived
revieweeId = isOwner ? task.worker_id : task.client_id   // counterpart, derived

if (!revieweeId) → 400                      // no legitimate counterpart
```

### Preserved behaviour (verified unchanged)

Review eligibility · when reviews may be submitted · rating values · comment/content handling · duplicate-review behaviour and the loyalty retry-on-duplicate path · loyalty trigger conditions · loyalty math · task lifecycle (`worker_confirmed`) · credits · payments · notifications · schemas · RLS · KYC · OAuth/native auth.

### Parity evidence (read-only, no production writes)

- **Build:** exit 0.
- **Caller parity (source level):** the only caller is `src/components/RatingModal.jsx`, which already derives the same values client-side — `revieweeId = isWorker ? task.client_id : task.worker_id` and `role = isWorker ? 'worker' : 'client'`. The server-side derivation reproduces the caller's own computation exactly. Its now-ignored `revieweeId`/`role`/`isOwner` fields were left in place (no client change needed).
- **Persisted-record parity** across all **4** existing `Review` records, replaying the 3.1D derivation with each record's stored reviewer as the caller:
  - **4/4** derived `role` === stored `role`.
  - **4/4** derived `reviewee_id` === stored `reviewee_id`.
  - **4/4** reviewers are a party to their task (3 client-side, 1 worker-side).
  - The server-side derivation would have produced **byte-identical** relationship fields for every review ever written through this function.
- **Loyalty parity:** the client → worker 5-star path is unchanged — `isOwner` is computed exactly as in 3.1C, so `grantLoyaltyReward` is still invoked under identical conditions with `{ taskId }`, and the worker → client review still never invokes it.
- **Duplicate path:** the `existing.length > 0` branch and its loyalty retry are untouched.

### Residual risks (recorded, NOT closed by 3.1D)

1. **A second, unvalidated Review write path exists outside `submitReview`.** `src/components/CompletionModal.jsx` creates a `Review` record **directly** through the entity SDK (`base44.entities.Review.create`). That path is gated only by the `Review` RLS create rule (`data.reviewer_id === {{user.id}}`), so an authenticated caller can still POST a Review row with an arbitrary `task_id`, `reviewee_id` and `role`. **3.1D does not close this — it was outside the approved scope.** Impact is limited to **review-list integrity**: it cannot inflate `User.rating` (only `submitReview` updates that) and it cannot mint loyalty credits (the `grantLoyaltyReward` ownership check rejects a non-owner, and an owner forging a 5-star review about their own worker is acting within their own legitimate authority). Recommended follow-up: route `CompletionModal` through `submitReview`, or add server-side validation to that path.
2. **`SimulatorPanel.jsx` also creates `Review` records directly** (two sites). Those are now behind the admin-only `/simulator` route guard from 3.1C, so they are admin-reachable only.
3. **`notificationManager` runtime verification** still pending the controlled post-publish procedure (unchanged from 3.1B).
4. **QA agent ↔ `qaBot`** service-role reachability remains unverified at runtime (unchanged from 3.1C).
5. **Tranzila remains frozen.** The 3.1A blocker is fully in force and untouched.

### Rollback

1. In `base44/functions/submitReview/entry.ts`, remove the `forbidden` import line.
2. Restore the destructure to `taskId, revieweeId, rating, comment, role,` and the validation to `if (!taskId || !revieweeId || !rating || !role)`.
3. Replace the derivation block with the 3.1C single line `const isOwner = task.client_id === user.id;`.
4. **No data action required** — nothing was migrated.

---

## Package #3.1E — Review Write Path Consolidation ✅ **SOURCE COMPLETE — NOT YET PUBLISHED**

| | |
|---|---|
| **Date** | 2026-10-01 |
| **Phase** | 3.1E — closes residual risk #1 recorded in Package #3.1D (the second, unvalidated Review write path) |
| **Status** | **Source complete · reviewed · build passing.** **Deliberately NOT published.** |
| **Last Known Good State** | see §LKGS-3.1E |
| **Production data changed** | **NONE** — code only |

### Scope (exactly what was approved — no expansion)

`src/components/CompletionModal.jsx` only. One file.

### Change plan (A–H)

| | |
|---|---|
| **A. What will change** | The direct `Review` entity creation in `CompletionModal` is replaced by a call to the secured `submitReview` function. The client-derived `revieweeId`/`role` values are deleted. |
| **B. Files/entities/data affected** | **1 frontend file.** No entity, schema, RLS, workflow, secret, payment, credit or notification change. |
| **C. Exact rollback procedure** | Restore the `const revieweeId = isWorker ? task.client_id : task.worker_id;` line and replace the `submitReview` invoke block with the original `base44.entities.Review.create({…})` call. |
| **D. Rollback changes** | Code only. |
| **E. Data loss risk on rollback** | **None.** No record was created, updated or deleted. |
| **F. Online rollback possible** | Yes. |
| **G. Rollback complexity** | **LOW** — one file, one block. |
| **H. Verification after rollback** | Re-run build; confirm completing a task again writes a Review row directly. |

### Files changed

| File | Change |
|---|---|
| `src/components/CompletionModal.jsx` | removed `const revieweeId` · replaced direct `Review.create` with `base44.functions.invoke('submitReview', { taskId, rating, comment })` · added success guard matching `RatingModal`'s established pattern |

### Complete Review write-path inventory (post-3.1E)

| # | Location | Type | Classification |
|---|---|---|---|
| 1 | `base44/functions/submitReview/entry.ts:71` | `asServiceRole.entities.Review.create` | **SECURED PRODUCTION PATH — the single authority** |
| 2 | `src/pages/SimulatorPanel.jsx:609` | `entities.Review.create` (worker-side) | **ADMIN-ONLY SIMULATOR** (behind the 3.1C `/simulator` admin route guard) |
| 3 | `src/pages/SimulatorPanel.jsx:618` | `entities.Review.create` (client-side) | **ADMIN-ONLY SIMULATOR** (behind the 3.1C `/simulator` admin route guard) |
| — | `src/components/CompletionModal.jsx` | ~~`entities.Review.create`~~ | **REMOVED by this package** |

**No `Review.update`, `Review.updateMany`, `Review.delete` or `Review.deleteMany` call exists anywhere in the codebase.** There is no update path and no delete path.

**Read-only paths** (unchanged, all reads): `AdminDashboard`, `Leaderboard`, `Profile`, `SimulatorPanel`, `TaskDetail`, `WorkerProfile`, `getPublicUserProfile`, `grantLoyaltyReward`, `runQAChecks`, `submitReview`.

**Conclusion:** for a normal production user there is now **exactly one** authoritative Review creation path — `submitReview`.

### Trust boundary — before → after

| | Before (3.1D) | After (3.1E) |
|---|---|---|
| Production Review write paths | **2** — `submitReview` *and* a direct client-side create in `CompletionModal` | **1** — `submitReview` |
| `CompletionModal` relationship inputs | client-computed `revieweeId` + `role`, written directly | **not computed, not sent** — derived server-side |
| `CompletionModal` fields sent | `task_id`, `reviewer_id`, `reviewee_id`, `rating`, `comment`, `role` | `taskId`, `rating`, `comment` |

### Behaviour parity and intentional corrections

Preserved exactly: same rating · same comment/review text · same task · same success state · same modal behaviour (close + `navigate('/')`) · same downstream refresh (`invalidateQueries` for `['tasks']`, `['task', id]`, `['me']` unchanged) · same success toast · same silent-failure behaviour (a rejected mutation still leaves the modal open with no `onError` handler, exactly as before).

**Three intentional, verified consequences of consolidation** — all previously *missing* because the direct write bypassed the secured function:

1. **`User.rating` / `rating_count` now update** for a review left at task completion. Previously a completion-time review never affected the reviewee's rating average.
2. **The loyalty bonus now triggers** for a client's 5-star review at task completion. Previously this path silently skipped the reward. The loyalty **math and eligibility are untouched** — `grantLoyaltyReward` still derives everything from the persisted review and task.
3. **Duplicate protection now covers this path.** Previously, completing a task after a review already existed created a *second* Review row. `submitReview`'s `(task_id, reviewer_id)` check now returns "Already reviewed" — a genuine duplicate-row fix.

No second rating update and no second loyalty trigger is introduced: `submitReview` performs each exactly once, and the direct create it replaced was removed rather than kept alongside it.

### Parity evidence (read-only, no production writes)

- **Build:** exit 0.
- **Direction parity:** `CompletionModal` previously computed `role = isWorker ? 'worker' : 'client'` and `revieweeId = isWorker ? task.client_id : task.worker_id`. `submitReview` derives the identical values (Package #3.1D), so both review directions — client → worker and worker → client — resolve to exactly the same relationship as before.
- **Global re-scan after the change:** zero direct `Review` creates remain in production frontend code; the only remaining ones are the two admin-only simulator sites.
- **Duplicate key unchanged:** both the old and new flows key on `task_id` + `reviewer_id`.
- **Downstream reads unchanged:** `TaskDetail`'s `Review.filter({ task_id, reviewer_id: me.id })` gate still sees the same row shape.

### Residual risks (recorded, NOT closed by 3.1E)

1. **The `Review` entity is still directly writable through the platform entity API by any authenticated user, subject only to RLS** (`create: { data.reviewer_id: "{{user.id}}" }`). No client code path remains, but a caller using the SDK directly could still POST a Review row with an arbitrary `task_id`/`reviewee_id`/`role`. Closing this requires an **RLS change** (`Review` create → admin/service-role only), which is **explicitly out of scope for 3.1E**. Note for that future package: `submitReview` writes via `asServiceRole` and would be unaffected, but the two **admin-only simulator sites use the user-scoped client** and would need to move to service role at the same time.
2. **`notificationManager` runtime verification** still pending the controlled post-publish procedure (unchanged from 3.1B).
3. **QA agent ↔ `qaBot`** service-role reachability remains unverified at runtime (unchanged from 3.1C).
4. **Tranzila remains frozen.** The 3.1A blocker is fully in force and untouched.

### Rollback

1. In `src/components/CompletionModal.jsx`, restore `const revieweeId = isWorker ? task.client_id : task.worker_id;` beneath `const isWorker = …`.
2. Replace the `submitReview` invoke block with the original `await base44.entities.Review.create({ task_id: task.id, reviewer_id: me.id, reviewee_id: revieweeId, rating, comment, role: isWorker ? 'worker' : 'client' });`.
3. **No data action required** — nothing was migrated.

---

## Package #3.1F — Review Entity Write Lockdown ✅ **IMPLEMENTED**

| | |
|---|---|
| **Date** | 2026-10-01 |
| **Phase** | 3.1F — closes residual risk #1 recorded in Package #3.1E (the entity API itself remained directly writable) |
| **Status** | **Implemented · build passing.** |
| **Last Known Good State** | see §LKGS-3.1F |
| **Production data changed** | **NONE** — configuration only (one RLS rule) |

### Scope (exactly what was approved — no expansion)

`base44/entities/Review.jsonc` — the `create` rule only. No code file changed.

### Change plan (A–H)

| | |
|---|---|
| **A. What will change** | The Review `create` rule becomes admin-only. Normal authenticated users can no longer create Review records directly through the entity API. |
| **B. Files/entities/data affected** | **1 entity file, `rls.create` only.** No code, schema property, `required`, read/update/delete rule, workflow, secret, payment, credit or notification change. |
| **C. Exact rollback procedure** | Restore `"create": { "data.reviewer_id": "{{user.id}}" }`. |
| **D. Rollback changes** | Configuration only. |
| **E. Data loss risk on rollback** | **None.** |
| **F. Online rollback possible** | Yes — rules apply immediately, no deployment. |
| **G. Rollback complexity** | **TRIVIAL** — one line. |
| **H. Verification after rollback** | A normal user can again POST a Review row via the SDK. |

### ⚠️ Critical implementation note — `false` is NOT a valid lockdown

`"create": false` **is not enforced** by the platform. Per the authoritative RLS model, a `false` value means "no one" only on `read` and `delete`; on **`create`/`update` it is treated as open**. The supported way to close a write operation is to point it at whoever should still have access. The approved rule therefore uses `user_condition` admin-only, **not** `false`. This is why the implementation matches the assessment exactly.

### Exact change

```diff
-    "create": { "data.reviewer_id": "{{user.id}}" },
+    "create": { "user_condition": { "role": "admin" } },
```

`read` · `update` · `delete` — **byte-identical, untouched.**

### Files changed

| File | Change |
|---|---|
| `base44/entities/Review.jsonc` | `rls.create` → admin-only |
| `docs/MULTIBRAND_RESTORE_RUNBOOK.md` | this record + LKGS-3.1F + Tranzila blocker clarification |
| `docs/MULTIBRAND_BLUEPRINT.md` | status line + ADR-27 |

### Caller impact — every Review CREATE path

| # | Caller | Scope | After 3.1F |
|---|---|---|---|
| 1 | `base44/functions/submitReview/entry.ts:71` | **service-role** | **Unaffected** — service role is not an app-user request, so RLS does not apply |
| 2 | `src/pages/SimulatorPanel.jsx:609` | user-scoped, **admin token** | **Unaffected** — caller is admin |
| 3 | `src/pages/SimulatorPanel.jsx:618` | user-scoped, **admin token** | **Unaffected** — caller is admin |
| 4 | any normal authenticated user via raw SDK | user-scoped | **DENIED** — the objective |

**Required code changes: ZERO.** No backend move was needed for the simulator, because the admin-only rule is satisfied by the admin's own token.

### Behaviour parity

Unchanged: `Review` read/update/delete · all 10 read sites · existing Review records · `submitReview` · `RatingModal` · `CompletionModal` · the admin simulator (both buttons) · the `Push: Review Created` entity trigger · the QA agent (holds `read`+`delete` only, no `create`) · credit/loyalty math.

The only behavioural change is that a non-admin raw-SDK create is refused — which is the purpose of the package.

### Rollback

Restore the single line in `base44/entities/Review.jsonc`:
`"create": { "data.reviewer_id": "{{user.id}}" }`.
No data action required.

---

## Package #4.0 — C3 Pre-Flight: User Field Trust Boundary (READ-ONLY) ✅ **COMPLETED**

| | |
|---|---|
| **Date** | 2026-10-01 |
| **Phase** | 4.0 — pre-flight gate for the Multibrand isolation foundation |
| **Status** | **Completed — investigation and audit only** |
| **Production data changed** | **NONE** |
| **Runtime code changed** | **NONE** |
| **Documentation changed** | Blueprint ADR-28; this record |

### Question

Can a normal authenticated user write arbitrary custom fields on their own `User` record through `base44.auth.updateMe(...)` — and therefore could a future `brand_ids` field be client-writable?

### Answer — **YES (confirmed)**

| Evidence | Source |
|---|---|
| "You can update any custom fields defined in your User entity schema." Protected: `id`, `email`, `full_name`, `created_date`, `updated_date`, `created_by`, `collaborator_role`. `role` requires editor access. | Base44 Auth SDK reference / User Schema docs |
| `updateMe(data)` → `axios.put('/apps/${appId}/entities/User/me', data)` — no client-side field filtering | `node_modules/@base44/sdk/dist/modules/auth.js:103` |
| The app already relies on this: `SimulatorPanel.jsx` writes `worker_credits`, `is_verified`, `kyc_status` through `updateMe` | `src/pages/SimulatorPanel.jsx:268,461,467,497,571,573,580,587` |
| No field-level security exists anywhere on `User` | `base44/entities/User.jsonc` — 44 fields, 0 field-level `rls`, no top-level `rls` |

### Live exposure discovered (pre-existing, independent of Multibrand)

Because no field-level rule existed, these fields were client-writable by any authenticated user:

`worker_credits` · `is_verified` · `kyc_status` · `is_approved` · `is_blocked` · `rating` · `rating_count` · `tasks_completed` · `repeat_hires` · `on_time_rate` · `score_tasks` · `commission_rate` · `agent_code` · `agent_id` · `referral_clicks` · `referred_by_agent_code` · `instagram_verified` · `facebook_verified` · `tiktok_verified`

**Reported to the owner. Remediation approved as a separate User Field Hardening package (see §"Next security package" below).**

### Resolution — the supported mechanism

Field-level security (FLS). Documented behaviour:
- `rls.write: false` on a field property → "Block all users"
- Service role bypasses both RLS and FLS entirely
- "Field-level security rules on the `User` entity apply" to the update-app-user path that `updateMe` uses

**Conclusion: `brand_ids` CAN be made server-writable / user-unwritable. The RLS-anchored Multibrand design is viable.**

### Method limitation (recorded honestly)

The live write probe was **not** executed. See Package #4.1.1 for the reason and the blocker.

### Rollback

Revert the two documentation edits (blueprint ADR-28, this record). No runtime action.

---

## Package #4.1.1 — `brand_ids` FLS Foundation ⚠️ **IMPLEMENTED — VERIFICATION BLOCKED**

| | |
|---|---|
| **Date** | 2026-10-01 |
| **Phase** | 4.1.1 — first step of the Multibrand isolation foundation |
| **Status** | **Implemented · build passing · behaviourally inert · write probes BLOCKED (no throwaway account)** |
| **Last Known Good State** | see §LKGS-4.1.1 |
| **Production data changed** | **NONE** — schema only. No backfill. |
| **Canonical identifier** | **`Brand.id` = `6abdfc541dc144ca0d91fde9`** (ADR-23) — not used by this package |

### Change plan (A–H)

| | |
|---|---|
| **A. What will change** | `User` gains one inert field, `brand_ids`, with field-level `rls.write:false`. |
| **B. Files/entities/data affected** | **1 entity file** (`base44/entities/User.jsonc`) + documentation. No code, no data, no RLS rules, no functions. |
| **C. Exact rollback procedure** | Remove the `brand_ids` property from `base44/entities/User.jsonc`. |
| **D. Rollback changes** | Schema only. |
| **E. Data loss risk on rollback** | **None** — the field is unset on every record. |
| **F. Online rollback possible** | Yes — rules and schema apply immediately, no deployment. |
| **G. Rollback complexity** | **TRIVIAL** — one property. |
| **H. Verification after rollback** | Confirm `brand_ids` is absent from the schema and from every user record. |

### Files changed

| File | Change |
|---|---|
| `base44/entities/User.jsonc` | **+1 property** `brand_ids` (appended last; all 44 original properties byte-identical, `active_brand_id` deliberately NOT added per decision P2) |
| `docs/PACKAGE4_MIGRATION_MANIFEST.json` | **NEW** — reserved, intentionally empty (no backfill has occurred) |
| `docs/MULTIBRAND_RESTORE_RUNBOOK.md` | this record + Package #4.0 record + LKGS-4.1.1 |
| `docs/MULTIBRAND_BLUEPRINT.md` | status line + ADR-28 |

### Exact change

```diff
+    "brand_ids": {
+      "type": "array",
+      "items": { "type": "string" },
+      "description": "Package 4.1.1: canonical Brand.id values this user is a member of. Server-maintained only - field-level rls.write=false blocks every app-user write (updateMe included); only a service-role backend function may set it. INERT: nothing in the application reads this field yet. Never populate it from client input - it must be derived from BrandMembership records.",
+      "rls": { "write": false }
+    }
```

### Verification performed

| Check | Result |
|---|---|
| Entity JSON parses | ✅ valid |
| Property count | ✅ **45** (was 44) |
| All 44 original properties preserved | ✅ byte-identical, in order |
| `brand_ids` present, appended last | ✅ |
| `brand_ids.rls.write === false` | ✅ |
| `active_brand_id` absent (decision P2) | ✅ |
| No top-level `rls` on `User` | ✅ |
| Only one field carries field-level `rls` | ✅ (`brand_ids`) |
| **Runtime inertness** — users carrying the field | ✅ **0 of 146** |
| Build | ✅ exit 0 |
| Production records modified | ✅ **0** |

### ⚠️ Verification NOT performed — the write probes

Both approved probes (item 5: client write rejected; item 7: service-role write succeeds) were **NOT executed**.

**Reason — no throwaway/test account can be used:**

1. **`exec_tool` runs as the owner's production admin account** (`boris18peter@gmail.com`, role `admin`). Decision P1 explicitly forbids using the production account, and the owner prohibited modifying legitimate production user data.
2. **No test/demo/QA account exists.** All **146** users were scanned; **0** match a test-account pattern.
3. **The one candidate — `hello@joba24.com`** (the app's hardcoded Play-reviewer bypass account, `LoginPromptModal.jsx:51`) — is a real, active account: id `6a5fc936327334d906e5ecae`, role `agent`, `is_approved: true`, `is_verified: true`, `kyc_status: approved`, **67 credits, 7 completed tasks**, last active 2026-09-29. It is used by Google Play reviewers, so it is **not** a throwaway and was deliberately left untouched.
4. **A probe from `exec_tool` would be unreliable anyway.** The sandbox client bypasses RLS/FLS, so a write that succeeded there would be ambiguous — it could not be distinguished from FLS being broken. A false negative would trigger the package's own STOP condition and wrongly invalidate the RLS-based architecture.
5. **A new account cannot be created** from the build environment: registration requires email OTP verification, and `User` records cannot be inserted directly.

**Therefore the only faithful probe is a real browser session as a non-admin user.** Blocked pending an owner decision.

### Probe attempt record (2026-10-02) — the sandbox CANNOT perform this probe

A dedicated throwaway account was created and verified, as authorized:

| | |
|---|---|
| **Email** | *(withheld — the throwaway test account is identified by its immutable User id below)* |
| **User id** | `6abecbd306d8b265edba72c5` |
| **Role** | `user` (non-admin) |
| **Status** | registered · **verified** · ready |
| **Owner's account** | **not touched in any way** — a brand-new, separate user record |

**Three probe attempts were made. All were refused before executing, so nothing was written.**

| # | Path attempted (session confirmed as the throwaway) | Result |
|---|---|---|
| 1 | `base44.auth.updateMe({ bio })` — control field | ❌ `Admin permissions required for this operation` |
| 2 | `base44.auth.updateMe({ brand_ids })` — target field | ❌ `Admin permissions required for this operation` |
| 3 | `base44.entities.User.update(uid, { bio })` / `{ brand_ids }` — direct entity path | ❌ `Admin permissions required for this operation` |
| — | `base44.entities.User.get(uid)` — even a **read** | ❌ `Admin permissions required for this operation` |

**Session identity was confirmed independently before any write**, so the refusals cannot be attributed to the wrong account:
- `loginViaEmailPassword` response → role `user`
- decoded JWT `sub` → the throwaway's User id

**Finding: `exec_tool` is an admin-gated context.** Once the session is a non-admin, *every* User-entity operation — read, `updateMe`, and direct entity update — is refused with the same error. The sandbox **cannot represent a normal app user**, and therefore **cannot probe FLS at all**. This is a property of the build environment, not of the app.

**Data impact: NONE.** Every attempt was refused before execution. Confirmed after the fact: the owner's account is unmodified, the throwaway is pristine, and **0 of 147 users** carry `brand_ids`.

**Consequence for the package's stop condition (item 6):** the result is **UNKNOWN — not negative.** FLS must **not** be recorded as broken, and the RLS-anchored architecture must **not** be invalidated on the strength of a sandbox artefact. Item 6 is **not triggered**; it was never exercised.

**Outstanding verification (items 5 and 7):** still open, pending a real browser session as the throwaway. Note the app's own login UI derives its password from the email (`LoginPromptModal.jsx` → `derivePassword`), so the throwaway — registered with an independent password — is **not** reachable through the normal UI login. Any browser-based probe must therefore either (a) log in programmatically via `loginViaEmailPassword`, or (b) first have its password set to the derived value.

### ✅ Probe RESULT (2026-10-02) — **PASS** · FLS runtime-verified · Package 4.1.1 CLOSED

Executed in a **real browser session** through a temporary, unlinked route (`/fls-probe`), since **completely removed** along with its credentials.

| Check | Result |
|---|---|
| Authenticated identity | ✅ the dedicated throwaway, normal `user` — asserted on **both** User id and email, from the login response **and** the live session, before any write |
| **Control** — normal client write to `bio` | ✅ **persisted** |
| **Target** — normal client write to `brand_ids` | ✅ **explicitly rejected by FLS** |
| `UNAUTHORIZED_TEST_BRAND` persisted? | ❌ **no** |
| Cleanup | ✅ succeeded |
| Original `bio` restored | ✅ |
| Final `brand_ids` | ✅ **absent** |

**Verdict: PASS.** The normal-user write path was validated (the control field persisted) *and* the FLS-protected field was rejected in the same session — so the `brand_ids` result **is** interpretable. The package's stop condition was never triggered.

**Runtime-verified conclusion:** FLS on `User.brand_ids` is **enforced for normal app users**. `brand_ids` may now be treated as a **server-controlled authorization field**, on the express condition that **every** server writer derives its value from **trusted persisted state** and **never** from client input (ADR-25 / ADR-28). FLS protects the *field*, not the *value* — the writer must still derive it.

### Probe teardown record

| Removed | Verified |
|---|---|
| `src/pages/FlsProbe411.jsx` | deleted |
| Its route, lazy import and standalone-screen entry in `src/App.jsx` | removed |
| The embedded throwaway password and all probe credentials | removed with the page |
| `fls-probe`, `UNAUTHORIZED_TEST_BRAND`, the throwaway address and password | **zero** references in runtime code, build output or credentials — named only in this teardown record |

**Throwaway record left in place (no elevated state):** User id `6abecbd306d8b265edba72c5` · role **`user`** · `bio` **null** · `brand_ids` **absent** · no credits, KYC, rating or reputation written by the probe. (`is_verified: true` is a **registration** artefact — the account was OTP-verified when created, **not** written by the probe.) Across all **147** users, **0** carry `brand_ids`.

**No backfill occurred.** `brand_ids` remains **unset on every user**. The field and its `rls.write:false` are the only runtime/schema artefacts of this phase, retained deliberately.

**Tranzila: untouched.** The 3.1A blocker remains fully in force.

### Known limitations

- `brand_ids` is **declared but not enforced anywhere** — its FLS protection is documented by the platform but not yet empirically confirmed in this app.
- Nothing reads `brand_ids`. It is inert by design.
- `brand_ids` is **empty on all 146 users** — no backfill (deliberate, per scope).

### Rollback

Remove the `brand_ids` property from `base44/entities/User.jsonc`. Delete `docs/PACKAGE4_MIGRATION_MANIFEST.json` if no other Package 4 migration has occurred. **No data action required.**

---

## Package UH — User Field Hardening (UH-1 … UH-5) ⚠️ **IMPLEMENTED — BROWSER ABUSE PROBE PENDING**

| | |
|---|---|
| **Date** | 2026-10-02 |
| **Phase** | User Field Hardening — closes the pre-existing exposure found in Package #4.0 |
| **Status** | **Implemented · build passing (exit 0) · schema audited · backend functions verified.** Browser FLS abuse probe staged, not yet run. |
| **Production data changed** | **NONE** — code + one entity schema only. |
| **Tranzila** | **Untouched.** The 3.1A blocker remains fully in force. |

### Change plan (A–H)

| | |
|---|---|
| **A. What will change** | 28 protected `User` fields gain field-level `rls.write:false`; every legitimate client writer is migrated to a trusted backend/service-role function FIRST. |
| **B. Files/entities/data affected** | `base44/entities/User.jsonc` + 4 new backend functions + 1 edited + 7 client files. No data migration. |
| **C. Exact rollback** | Remove the `rls` keys from `base44/entities/User.jsonc`; restore the 7 client call sites; delete the 4 new functions; restore `adminUpdateVerification` from HEAD. |
| **D. Rollback changes** | Code + schema. |
| **E. Data loss risk** | **None** — no record is migrated. |
| **F. Online rollback** | Yes. |
| **G. Complexity** | **MEDIUM** (per-field `rls` removal is independent and instant). |
| **H. Verify after rollback** | Re-run build; confirm the client can again write a previously-locked field. |

### New backend functions

| Function | Auth | Owns |
|---|---|---|
| `grantProfileCompletionBonus` | authenticated user | `worker_credits` (profile bonus) |
| `adminSetUserCredits` | admin / service role | `worker_credits` (absolute or delta) + `CreditTransaction` |
| `submitKyc` | authenticated user | KYC submission — **forces** `kyc_status:'pending'` + `is_verified:false` |
| `adminSetUserFields` | admin / service role | strict whitelist: access, agent/referral, reputation, social verdicts, KYC artefacts |

**Changed:** `adminUpdateVerification` — now owns the KYC verdict pair exclusively; `isVerified`/`kycStatus` individually optional; the rejection push fires only on an actual rejection; `silent` suppresses the push for internal tooling; switched to `requireInternalOperator`.

### Locked fields (28)

`role` · `is_approved` · `is_blocked` · `is_verified` · `kyc_status` · `worker_credits` · `rating` · `rating_count` · `score_tasks` · `tasks_completed` · `repeat_hires` · `avg_response_minutes` · `on_time_rate` · **`trust_score` (declared)** · `agent_code` · `referred_by_agent_code` · `agent_id` · `commission_rate` · `referral_clicks` · `id_number` · `id_photo_url` · `instagram_verified` · `facebook_verified` · `tiktok_verified` · `instagram_verify_code` · `facebook_verify_code` · `tiktok_verify_code` · `brand_ids`

**Left client-writable (18):** profile, media, profession, preferences, certificates, social handles, `notifications_enabled`, `fcm_tokens`, `last_active_at`, `registration_source`, `verified_celebration_shown`.

### Client write paths migrated

| Was | Now |
|---|---|
| `WorkerOnboarding` — `updateMe({ worker_credits })` | `grantProfileCompletionBonus` |
| `VerifyModal` — `updateMe({ … , is_verified, kyc_status })` | `submitKyc` |
| `AdminDashboard` ×5 — direct `entities.User.update` | `adminUpdateVerification` / `adminSetUserFields` |
| `AuthContext` — `updateMe({ referred_by_agent_code })` | server-derived via `linkReferralDevice` (awaited before the signup bonus) |
| `SimulatorPanel` ×7 — `updateMe` of credits/verification | `adminSetUserCredits` / `adminUpdateVerification` / `adminSetUserFields` |
| `demoMode` — `updateMe` of protected fields | split: plain → `updateMe`; protected → `adminSetUserFields`; verdict → `adminUpdateVerification` (`silent`) |

### Verification performed

- Build: **exit 0**.
- Schema audit: **46 fields · 28 locked · 0 missing locks** · `trust_score` present · `brand_ids.rls.write === false`.
- Zero client `entities.User.update` calls remain; **all** backend User writes use `asServiceRole`.
- Function smoke tests (no writes): `adminSetUserFields` rejects a non-whitelisted field (400) · `adminSetUserCredits` validates (400) · `adminUpdateVerification` validates (400) · `grantProfileCompletionBonus` returns `already_granted` (idempotency confirmed, no write).
- **Browser FLS abuse probe: STAGED, NOT RUN.** `/fls-abuse` (temporary, unlinked) — 26 protected-field write attempts + a `bio` control, against the throwaway only, with mandatory cleanup.

### Known limitations

- `uploadFile` for KYC uses the public upload path (pre-existing, out of scope).
- The throwaway's password is temporarily embedded in the probe page; both are removed with the page.

### Rollback

1. Remove every `"rls": { "write": false }` block from `base44/entities/User.jsonc` (leave `brand_ids`).
2. Restore the 7 client call sites listed above.
3. Delete `grantProfileCompletionBonus`, `adminSetUserCredits`, `submitKyc`, `adminSetUserFields`.
4. Restore `adminUpdateVerification/entry.ts` from HEAD.
5. **No data action required** — nothing was migrated.

---

## ⏭️ NEXT SECURITY PACKAGE (IMPLEMENTED — see Package UH above) — User Field Hardening

Approved as a **separate security package that must run BEFORE the Multibrand work continues**, because Package #4.0 found a **pre-existing live exposure** unrelated to Multibrand.

**Scope:** move server-derived / security-sensitive `User` fields behind field-level `rls.write:false` and service-role writers:

`worker_credits` · `is_verified` · `kyc_status` · `is_approved` · `is_blocked` · `rating` · `rating_count` · `tasks_completed` · `repeat_hires` · `on_time_rate` · `score_tasks` · `commission_rate` · `agent_code` · `agent_id` · `referral_clicks` · `referred_by_agent_code` · `instagram_verified` · `facebook_verified` · `tiktok_verified`

**Must preserve:** legitimate profile editing · KYC submission · onboarding/profile-completion bonuses · admin operations · simulator functionality.

**Known call sites that must move to service-role functions first:**

| Site | Writes | Replacement needed |
|---|---|---|
| `SimulatorPanel.jsx:268,461,467,497` | `worker_credits` | admin-gated service-role function |
| `SimulatorPanel.jsx:571,573,580,587` | `is_verified`, `kyc_status` | admin-gated service-role function |
| `WorkerOnboarding.jsx:148` | `worker_credits` (profile bonus) | `grantProfileCompletionBonus` |
| `VerifyModal.jsx:156` | `kyc_status:'pending'`, `is_verified:false` | `submitKyc` |
| `AdminDashboard.jsx:539,718,740,802` | `is_blocked`, referral/agent fields | admin service-role function |

**Status: NOT IMPLEMENTED. Awaiting explicit approval.**

---

## Packages 4.1.2 → 4.4 — Multibrand Foundation ⚠️ **IMPLEMENTED — Task/TaskApplication read-RLS NOT applied**

| | |
|---|---|
| **Date** | 2026-10-02 |
| **Phase** | 4.1 isolation foundation · 4.2 brand runtime · 4.3 attribution · 4.4 brand configuration |
| **Status** | **Implemented · build exit 0 · data verified.** One item deferred (see below). |
| **Production data changed** | `User.brand_ids` × 147 · `BrandMembership` × 147 created · attribution stamped on 6 entities (1,226 records) |
| **Tranzila** | **Untouched.** The 3.1A blocker remains fully in force. |

### New entities

`BrandDomain` · `BrandConfig` · `BrandCategory` · `BrandMembership` — all with public-read / admin-write RLS; `BrandMembership` read is own-row-or-admin, create/update/delete admin-only (ADR-27 — the server is the authoritative creator).

### Additive attribution fields

`Review.surface_brand_id` · `ChatMessage.surface_brand_id` · `NotificationLog.surface_brand_id` · `SupportMessage.surface_brand_id` · `CreditTransaction.brand_id` · `ReferralEvent.brand_id`. All nullable, all backfilled to the canonical Joba24 `Brand.id`. **No wallet, identity, KYC or rating was made Brand-specific.**

### Brand runtime (4.2)

`src/lib/brand/brandResolver.js` · `src/lib/brand/BrandProvider.jsx` · `src/components/BrandGate.jsx`, wired in `App.jsx` **above** `AuthProvider` (brand context precedes authentication — ADR-11). Chain: `hostname → BrandDomain → Brand → BrandConfig → BrandContext`. Registered domains win; platform/dev/embedded-preview hosts resolve to the platform Brand; **any other hostname resolves to nothing and the app renders a neutral notice with zero Joba24 data.**

### Seeds

`BrandDomain`: `joba24.com` (primary) · `www.joba24.com` · `joba24.base44.app`. `BrandConfig`: Joba24, locale `he`. `BrandCategory`: 26 rows (Joba24 inherits the platform labels).

### Verification (read-only)

- Build **exit 0**; zero probe/credential remnants in `src/`, `base44/`, `docs/`.
- Brands: **1** (`joba24`, default, active) — **no Brand #2 created.**
- Tasks **273/273** attributed to Joba24, **0 unattributed**, 1 distinct brand.
- TaskApplications **124/124** attributed.
- Users **147/147** carry `brand_ids: [JOBA24]`; **0** carry a foreign Brand.
- BrandMembership **147**; BrandDomain **3**; BrandConfig **1**; BrandCategory **26**.

### ⚠️ Deferred — Task / TaskApplication READ RLS

**Not applied.** Enforcing brand-scoped reads on these two entities in this cycle would regress live Joba24 behaviour, because both currently serve **public/guest** surfaces that per-user RLS cannot express without exposing the platform Brand to every domain:

| Reader | What it needs |
|---|---|
| `HomeFeed` (allTasks) · `MapView` · `StoriesBar` | guest reads — no user, so a membership rule matches nothing |
| `TaskDetail` · `LiveActivityPulse` · `BoostOverlay` | **non-party** application counts, read from `TaskApplication` by `task_id` |

**Prerequisites before it can be enforced (all server-side):** route guest reads through the existing public `getOpenTasks` (brand resolved from the request host), add a public single-task reader, denormalize `TaskApplication.client_id` + backfill so "task owner" is expressible in RLS, and move the three count readers onto `Task.applicants`. Then apply read RLS and write RLS (owner / assigned worker / applicant / admin).

**Interim posture:** the resolved Brand from the runtime is the single authoritative surface, so no Brand is served another Brand's surface. **Isolation is architectural, not yet entity-enforced.**

### Rollback

Delete the 4 new entities and their seeded rows; remove the 6 attribution fields; delete `src/lib/brand/*` and `src/components/BrandGate.jsx` and revert the `App.jsx` wiring; unset `brand_ids` on the 147 listed users (never a global clear). **No Task, TaskApplication, payment or credit value was altered.**

---

# PART 3 — LAST KNOWN GOOD STATE REGISTRY

## LKGS-1 — pre-Package #1

| | |
|---|---|
| **Captured** | 2026-10-01, before Package #1 |
| **Entities** | 20 (Brand did not exist) |
| **Task schema** | 64 properties, `required: ["title","price"]` |
| **TaskApplication schema** | 12 properties, `required: ["task_id","worker_id"]` |
| **Task records** | 272 |
| **TaskApplication records** | 123 |
| **Fields `origin_brand_id` / `surface_brand_id`** | did not exist on any record |
| **Brand entity** | did not exist |
| **RLS coverage** | 4/20 entities (`Review`, `WorkerStat`, `DemoUser`, `OAuthHandshake`) |
| **Functions** | 65 (62 use `asServiceRole`; 26 have no auth check) |
| **Golden Suite** | baseline to be recorded (Phase 0) |

**To restore to LKGS-1:** perform the Package #1 rollback procedure above.

---

## LKGS-2 — pre-Package #2

| | |
|---|---|
| **Captured** | 2026-10-01 10:14 (Asia/Jerusalem), **before any backfill** |
| **Repository version** | `71a495b4aee16b37d8c69e88d5b31687edddb382` — "Add custom domain capability verification report" |
| **Entities** | 21 |
| **Brand records** | **1** — id `6abdfc541dc144ca0d91fde9`, slug `joba24`, name `Joba24`, status `active`, origin `platform`, is_default `true` |
| **Task records** | **272** |
| **Task.origin_brand_id NULL/unset** | **272** |
| **Task.origin_brand_id non-null** | **0** |
| **TaskApplication records** | **123** |
| **TaskApplication.surface_brand_id NULL/unset** | **123** |
| **TaskApplication.surface_brand_id non-null** | **0** |
| **Task created_date range** | 2026-05-14 → 2026-09-30 |
| **RLS coverage** | 5/21 entities (`Review`, `WorkerStat`, `DemoUser`, `OAuthHandshake`, `Brand`) |
| **Production data changed by Package #2** | **NONE** |

**Observation 1 — the field is ABSENT, not `null`.** On all 272 Tasks and 123 TaskApplications the field is **missing entirely**, not set to `null`. The backfill must treat *unset* as the trigger condition and must not rely on a `null` equality filter.

**Observation 2 — two undeclared fields on `Task`.** Live `Task` records carry `is_sample` and `created_by` (email), neither of which appears in `Task.jsonc`. Pre-existing and unrelated to this package; recorded for completeness.

**To restore to LKGS-2:** no action required — Package #2 changed nothing.

---

## LKGS-2.1 — pre-Package #2.1

| | |
|---|---|
| **Captured** | 2026-10-01, **before** Package #2.1 |
| **Entities** | 21 (unchanged) |
| **Brand records** | **1** — id `6abdfc541dc144ca0d91fde9` |
| **Task records** | **272** — all attributed to Joba24 |
| **TaskApplication records** | **123** — all attributed to Joba24 |
| **Records created since Package #2** | **0 Tasks · 0 TaskApplications** — no gap records |
| **Task creation paths** | 5 (2 production · 3 internal tool) |
| **TaskApplication creation paths** | 3 (1 production · 2 internal tool) |
| **Attribution behaviour on creation** | **NONE** — new records were written without brand attribution |
| **RLS coverage** | 5/21 entities (unchanged) |

**To restore to LKGS-2.1:** perform the Package #2.1 rollback procedure above.

---

## LKGS-3.0 — pre-Package #3.0

| | |
|---|---|
| **Captured** | 2026-10-01, before Package #3.0 |
| **Repository version** | `a09a35d761d2b3b927727070af702495beb14504` — "Implement multibrand task and application support" |
| **Build result** | **exit 0** |
| **Entities** | 21 |
| **Brand records** | **1** — id `6abdfc541dc144ca0d91fde9`, slug `joba24`, is_default `true`, status `active`, origin `platform` |
| **Task records** | **272** — 272 attributed, 0 unattributed, 1 distinct `origin_brand_id` |
| **TaskApplication records** | **123** — 123 attributed, 0 unattributed, 1 distinct `surface_brand_id` |
| **ChatMessage** | 76 |
| **User** | 145 — roles: `user` 136 · `agent` 8 · `admin` 1 |
| **CreditTransaction** | 491 |
| **NotificationLog** | 476 |
| **ReferralEvent** | 157 |
| **DemoUser** | 100 |
| **NotificationConfig** | 23 |
| **TranzilaPayment** | 15 |
| **SupportMessage** | 10 |
| **UserPresence** | 6 |
| **Review** | 4 |
| **Report** | 1 |
| **WorkerStat** | 1 |
| **JobaSettings** | 1 |
| **Transaction** | 1 |
| **IosPurchase** | 0 |
| **EarlySignup** | 0 |
| **OAuthHandshake** | 0 |
| **Users holding KYC artefacts** | `id_number` 40 · `id_photo_url` 40 |
| **RLS coverage** | **5/21** — `Brand`, `DemoUser`, `OAuthHandshake`, `Review`, `WorkerStat` |
| **RLS-less entities** | **16** |
| **Open tasks at capture** | 2 (both with `contactPhone` populated) |
| **Function authorization state** | 66 functions — 40 authenticated, 26 without an auth check (11 are workflow-invoked `notify*`) |

**Note — no disposable records were created in Package #3.0**, because the Q1/Q2 cross-user tests could not be performed safely without a controlled non-admin session (see Package #3.0 record).

**To restore to LKGS-3.0:** no runtime action required — Package #3.0 changed nothing at runtime.

---

## LKGS-3.1B — pre-Package #3.1B

| | |
|---|---|
| **Captured** | 2026-10-01, **before** Package #3.1B |
| **Build result** | **exit 0** |
| **Entities** | 21 |
| **Brand records** | **1** — id `6abdfc541dc144ca0d91fde9`, slug `joba24`, is_default `true`, status `active` |
| **Task records** | **272** — 272 attributed, 0 unattributed, 1 distinct `origin_brand_id` |
| **TaskApplication records** | **123** — 123 attributed, 0 unattributed, 1 distinct `surface_brand_id` |
| **ChatMessage** | 76 |
| **User** | 145 |
| **CreditTransaction** | 491 |
| **NotificationLog** | 476 |
| **NotificationConfig** | 23 |
| **ReferralEvent** | 157 |
| **TranzilaPayment** | **17** — increase from 15 **EXPLAINED** (owner-initiated attempts, 0 credits granted; see blocker section) |
| **SupportMessage** | 10 |
| **DemoUser** | 100 |
| **Report** | 1 |
| **WorkerStat** | 1 |
| **JobaSettings** | 1 |
| **Transaction** | 1 |
| **UserPresence** | 6 |
| **Review** | 4 |
| **RLS coverage** | 5/21 entities (`Brand`, `DemoUser`, `OAuthHandshake`, `Review`, `WorkerStat`) |

**Function authorization state at capture (the three in scope):**

| Function | Auth check | Legitimate call sites |
|---|---|---|
| `refundApplicationCredits` | **none** | 1 — `SimulatorPanel.jsx` (user token) |
| `grantLoyaltyReward` | **none** | 3 — `SimulatorPanel.jsx` + `submitReview` ×2 (user token forwarded) |
| `notificationManager` | **none** | 16 — all backend, all via `asServiceRole.functions.invoke`; **0** frontend |

**To restore to LKGS-3.1B:** perform the per-function rollback in the Package #3.1B record above.

---

## LKGS-3.1C — pre-Package #3.1C

| | |
|---|---|
| **Captured** | 2026-10-01, **before** Package #3.1C |
| **Build result** | **exit 0** |
| **Entities** | 21 |
| **Brand records** | **1** — id `6abdfc541dc144ca0d91fde9`, slug `joba24`, is_default `true`, status `active` |
| **Task records** | **272** — 272 attributed, 0 unattributed, 1 distinct `origin_brand_id` |
| **TaskApplication records** | **123** — 123 attributed, 0 unattributed, 1 distinct `surface_brand_id` |
| **Review** | **4** — 3 client-role (reviewer = task client) · 1 worker-role (reviewer = task worker) |
| **Tasks with an assigned worker** | **4** |
| **JobaSettings loyalty** | `loyalty_reward_percent` **10** · `loyalty_reward_min` **1** |
| **ChatMessage** | 76 |
| **User** | 145 |
| **CreditTransaction** | 491 |
| **NotificationLog** | 476 |
| **NotificationConfig** | 23 |
| **ReferralEvent** | 157 |
| **DemoUser** | 100 |
| **TranzilaPayment** | 17 — unchanged from LKGS-3.1B, still **EXPLAINED** |
| **SupportMessage** | 10 |
| **Report** | 1 |
| **WorkerStat** | 1 |
| **Transaction** | 1 |
| **UserPresence** | 6 |
| **RLS coverage** | 5/21 entities (`Brand`, `DemoUser`, `OAuthHandshake`, `Review`, `WorkerStat`) |

**Trust-boundary state at capture (the paths 3.1C changes):**

| Path | Auth at capture | Reward-critical inputs trusted from client |
|---|---|---|
| `/simulator` route | authenticated only | — |
| `bulkSimulatorTasks` | authenticated only | — |
| `qaBot` | authenticated only | — |
| `refundApplicationCredits` | signed-in user (3.1B) | — |
| `grantLoyaltyReward` | signed-in user (3.1B) | `workerId`, `rating`, `taskTitle`, ownership |
| `submitReview` | signed-in user | `isOwner` |

**To restore to LKGS-3.1C:** perform the per-file rollback in the Package #3.1C record above.

---

## LKGS-3.1D — pre-Package #3.1D

| | |
|---|---|
| **Captured** | 2026-10-01, **before** Package #3.1D |
| **Build result** | **exit 0** |
| **Entities** | 21 |
| **Brand records** | **1** — id `6abdfc541dc144ca0d91fde9`, slug `joba24`, is_default `true`, status `active` |
| **Task records** | **272** — 272 attributed, 0 unattributed, 1 distinct `origin_brand_id` |
| **TaskApplication records** | **123** — 123 attributed, 0 unattributed, 1 distinct `surface_brand_id` |
| **Review** | **4** — 3 client-role · 1 worker-role · 4/4 reviewer is a party to their task |
| **Review write paths** | **4** — 1 via `submitReview` (RatingModal) · 1 direct entity create (CompletionModal) · 2 direct entity creates (SimulatorPanel, admin-only) |
| **Tasks with an assigned worker** | **4** |
| **JobaSettings loyalty** | `loyalty_reward_percent` **10** · `loyalty_reward_min` **1** |
| **ChatMessage** | 76 |
| **User** | 145 |
| **CreditTransaction** | 491 |
| **NotificationLog** | 476 |
| **NotificationConfig** | 23 |
| **ReferralEvent** | 157 |
| **DemoUser** | 100 |
| **TranzilaPayment** | 17 — unchanged from LKGS-3.1B, still **EXPLAINED** |
| **SupportMessage** | 10 |
| **Report** | 1 |
| **WorkerStat** | 1 |
| **Transaction** | 1 |
| **UserPresence** | 6 |
| **RLS coverage** | 5/21 entities (`Brand`, `DemoUser`, `OAuthHandshake`, `Review`, `WorkerStat`) |

**Trust-boundary state at capture (the path 3.1D changes):**

| Path | Auth at capture | Relationship inputs trusted from client |
|---|---|---|
| `submitReview` | signed-in user | `revieweeId`, `role` (`isOwner` already derived in 3.1C) |

**To restore to LKGS-3.1D:** perform the rollback in the Package #3.1D record above.

---

## LKGS-3.1E — pre-Package #3.1E

| | |
|---|---|
| **Captured** | 2026-10-01, **before** Package #3.1E |
| **Build result** | **exit 0** |
| **Entities** | 21 |
| **Brand records** | **1** — id `6abdfc541dc144ca0d91fde9`, slug `joba24`, is_default `true`, status `active` |
| **Task records** | **272** — 272 attributed, 0 unattributed, 1 distinct `origin_brand_id` |
| **TaskApplication records** | **123** — 123 attributed, 0 unattributed, 1 distinct `surface_brand_id` |
| **Review** | **4** — 3 client-role · 1 worker-role · 4/4 reviewer is a party to their task |
| **Review write paths** | **3** — 1 secured production (`submitReview`) · 2 admin-only simulator · **plus 1 unvalidated production path** (`CompletionModal`) closed by this package |
| **Review update / delete paths** | **0** — none exist in code |
| **Tasks with an assigned worker** | **4** |
| **JobaSettings loyalty** | `loyalty_reward_percent` **10** · `loyalty_reward_min` **1** |
| **ChatMessage** | 76 |
| **User** | 145 |
| **CreditTransaction** | 491 |
| **NotificationLog** | 476 |
| **NotificationConfig** | 23 |
| **ReferralEvent** | 157 |
| **DemoUser** | 100 |
| **TranzilaPayment** | 17 — unchanged from LKGS-3.1B, still **EXPLAINED** |
| **SupportMessage** | 10 |
| **Report** | 1 |
| **WorkerStat** | 1 |
| **Transaction** | 1 |
| **UserPresence** | 6 |
| **RLS coverage** | 5/21 entities (`Brand`, `DemoUser`, `OAuthHandshake`, `Review`, `WorkerStat`) |

**Review trust-boundary state at capture:**

| Path | Auth at capture | Relationship inputs trusted from client |
|---|---|---|
| `submitReview` | signed-in user, must be a party to the task (3.1D) | none — fully derived |
| `CompletionModal` direct create | signed-in user, **no server-side validation** | `reviewee_id`, `role` written straight through |

**To restore to LKGS-3.1E:** perform the rollback in the Package #3.1E record above.

---

## LKGS-3.1F — pre-Package #3.1F

| | |
|---|---|
| **Captured** | 2026-10-01, **before** Package #3.1F |
| **Build result** | **exit 0** |
| **Deployed source** | `dc3eebe` — "Refactor review submission to server-side authority" (3.1B–3.1E deployed) |
| **Entities** | 21 |
| **Brand records** | **1** — id `6abdfc541dc144ca0d91fde9`, slug `joba24`, is_default `true`, status `active` |
| **Task records** | **272** — 272 attributed, 0 unattributed, 1 distinct `origin_brand_id` |
| **TaskApplication records** | **123** — 123 attributed, 0 unattributed, 1 distinct `surface_brand_id` |
| **Review** | **4** — 3 client-role · 1 worker-role · 4/4 reviewer is a party to their task |
| **Review write paths** | **3** — 1 secured production (`submitReview`, service-role) · 2 admin-only simulator · **0** unvalidated production paths |
| **Review RLS at capture** | `read` = reviewee \| reviewer \| admin · **`create` = `data.reviewer_id` (open to any authenticated user)** · `update`/`delete` = reviewer \| admin |
| **RLS coverage** | 5/21 entities (`Brand`, `DemoUser`, `OAuthHandshake`, `Review`, `WorkerStat`) |
| **TranzilaPayment** | **17** — 16 pending · 1 completed. Unchanged from LKGS-3.1B. Tranzila is **externally frozen/parked by Tranzila** (see blocker section). |
| **JobaSettings loyalty** | `loyalty_reward_percent` **10** · `loyalty_reward_min` **1** |
| **Runtime verification (3.1B–3.1E)** | Manual production tests 1–7 **passed** (feed, application, approval, completion, client→worker 5★ review, worker rating update, loyalty reward granted, duplicate protection, worker→client review with no reward, `/simulator` admin-allow / user-deny) |

**Review trust-boundary state at capture:**

| Path | Auth at capture | Relationship inputs trusted from client |
|---|---|---|
| `submitReview` | signed-in user, must be a party to the task (3.1D) | none — fully derived |
| `SimulatorPanel` ×2 | admin only (3.1C route guard) | client-computed, admin-only tooling |
| any authenticated user via raw SDK | authenticated | **fully client-supplied — the exposure closed by this package** |

**To restore to LKGS-3.1F:** perform the rollback in the Package #3.1F record above.

---

## LKGS-4.1.1 — pre-Package #4.1.1

| | |
|---|---|
| **Captured** | 2026-10-01, **before** Package #4.1.1 |
| **Build result** | **exit 0** |
| **Entities** | 21 |
| **Brand records** | **1** — id `6abdfc541dc144ca0d91fde9`, slug `joba24`, is_default `true`, status `active` |
| **User entity schema** | **44 properties** · **0** field-level `rls` · no top-level `rls` |
| **User records** | **146** · roles: `user` 137 · `agent` 8 · `admin` 1 |
| **Users carrying `brand_ids`** | **0** — field did not exist |
| **Task records** | **273** — all attributed, 1 distinct `origin_brand_id` |
| **TaskApplication records** | **124** — all attributed |
| **Review** | **6** |
| **TranzilaPayment** | **17** — externally frozen by Tranzila; blocker unchanged |
| **RLS coverage** | 5/21 entities (`Brand`, `DemoUser`, `OAuthHandshake`, `Review`, `WorkerStat`) |
| **Client-writable security-sensitive User fields** | **19** — see Package #4.0 record |

**To restore to LKGS-4.1.1:** remove the `brand_ids` property from `base44/entities/User.jsonc`. No data action required.

---

# PART 4 — TEMPLATE FOR FUTURE PACKAGES

Copy for every new package:

```
## Package #N — <name>
Date / Phase / Status:
LKGS reference:

### Change plan (before implementation)
A. What will change:
B. Files/entities/data affected:
C. Exact rollback procedure:
D. Rollback changes (code/schema/config/data):
E. Data loss risk on rollback:
F. Online rollback possible:
G. Rollback complexity:
H. Verification steps after rollback:

### Record (after implementation)
Files changed:
Schemas changed:
Data migrated:
Configuration changed:
Feature flags:
Verification result:
Rollback dependencies:
Known limitations:
```

**Gate: no package is deployed until section 3 (A–H) is complete.**

---

# PART 5 — PLATFORM PORTABILITY & VENDOR-INDEPENDENCE (PERMANENT)

Added 2026-10-01. Applies to every future package, migration and phase. See also `BASE44_DEPENDENCY_REGISTER.md` and `MULTIBRAND_BLUEPRINT.md` (ADR-16…ADR-22).

## 5.1 Core principle

Base44 is our current **infrastructure provider**. Base44 must **not** become the **business architecture** of Joba24.

```
JOBA24 PLATFORM  →  BRAND ENGINE  →  N independent marketplace brands
        Base44 = implementation layer underneath, not the domain model
```

**We are designing an exit path, not executing an exit.**

## 5.2 Brand identity must be Joba24-owned

- Every production Brand must use **its own custom domain** (e.g. `events.co.il`) or a **Joba24-owned subdomain** (e.g. `events.joba24.com`).
- Base44 URLs may exist as internal infrastructure endpoints where unavoidable, but must **never** be a Brand's public identity.
- `brand_id` and `brand.slug` are **Joba24 platform identifiers**. A Base44 project ID, app ID or hostname must never be the canonical Brand identity.
- Add `provider_metadata` **only** if a real infrastructure identifier is technically unavoidable — never as the domain identity, and never speculatively.

## 5.3 No Base44 brand leakage

User-facing surfaces must not expose Base44 branding or infrastructure: public/navigation/login URLs · OAuth redirects · emails · notification links · share links · task links · support links · legal links · QR codes · canonical URLs · OpenGraph URLs · deep links · public API URLs where an abstraction is possible.

## 5.4 Provider-independent domain model

```
hostname → BrandDomain → Brand Resolver → brand_id → BrandContext
```

`BrandDomain` holds **Joba24-owned** domain configuration and must **not** assume `*.base44.app`. It must support custom domains, `brand.joba24.com` subdomains, future domain changes, and multiple domains per Brand. **A Brand keeps its identity if its domain changes.**

## 5.5 Entities that must remain provider-independent

`Brand` · `BrandMembership` · `BrandDomain` · `BrandConfig` · `BrandFeature` · `BrandCommercials` · `BrandCategory` · `Category` · `CategoryConfig` · `CategoryFieldSchema` · `Task` · `TaskApplication` · `TaskDistributionRule` · `BrandAuditLog` · `ConsentRecord`

No Base44-specific IDs or assumptions in these entities unless technically unavoidable.

## 5.6 Portability layer

Isolate infrastructure concerns behind clear boundaries **only when a new Multi-Brand subsystem is introduced** — the smallest reasonable adapter, never a speculative framework: auth · data repository · storage · notifications · analytics · payments · domain resolver · email.

**Goal:** business logic expresses Joba24 concepts, not Base44 implementation details.

## 5.7 Data & media portability

Document (do **not** execute) the portability of users, brands, memberships, tasks, applications, chats, reviews, categories, brand configuration, distribution rules, credits, transactions, payments, KYC status, audit logs and referral attribution — each with canonical source, export capability, relationships, provider-specific fields, media dependencies, identifiers and migration difficulty.

Media/assets: profile images, task images, completion evidence, **KYC documents**, brand logos and brand assets. Introduce a **storage indirection** (stable logical key → resolved URL) before any future move, so references survive a provider change. KYC follows the private-storage security plan.

## 5.8 Auth portability

Do **not** rewrite authentication. Document only: exportable identity data, how `User.id` relates to Base44 Auth, password portability limits, OAuth provider dependencies, session/token dependencies, native OAuth dependencies, and what a future provider move would require.

**The current Joba24 authentication flow must not change.**

## 5.9 No premature rewrite

This principle is **not** permission to refactor working code. Joba24 stays on Base44; production flows, auth, mobile apps, database and functions stay unchanged except when explicitly approved in a future implementation package.

## 5.10 Future provider-migration principle

If Joba24 ever leaves Base44: **existing Brands, domains, users, Task IDs and marketplace history all remain traceable; frontend/business behaviour remains equivalent. Only the infrastructure layer changes.**

## 5.11 Public brand professionalism — launch checklist for every Brand

- [ ] No Base44 branding visible
- [ ] Canonical Brand domain
- [ ] Brand-specific identity
- [ ] Brand-specific favicon / title
- [ ] Brand-specific emails where supported
- [ ] Brand-specific share links
- [ ] Brand-specific support / legal URLs where configured
- [ ] No accidental Joba24 branding unless intentionally required
- [ ] No accidental Base44 URLs in user-facing flows
- [ ] OAuth/login returns the user to the correct Brand
- [ ] Tasks remain synchronized with the Joba24 Core

## 5.12 Shared core remains the goal

Portability must **not** create separate databases or duplicate marketplaces per Brand.

**One Joba24 core · one global user · one task · one application · one chat · one marketplace infrastructure**, with N configurable Brands above it.

Vendor independence is about **infrastructure portability** — not about separating Brands into different backends.