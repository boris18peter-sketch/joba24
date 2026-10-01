# JOBA24 MULTI-BRAND — RESTORE RUNBOOK & ROLLBACK POLICY

> Living document. **Every implementation package, migration and phase MUST be recorded here before it is deployed.**
> Purpose: allow any developer to restore the system to a verified state **without relying on memory**.

---

# ⛔ MANDATORY SECURITY BLOCKER — TRANZILA MUST NOT BE REACTIVATED

**Recorded 2026-10-01 (Package #3.1B). Status: OPEN.**

Tranzila payments are frozen and **not active in production**.

> **Tranzila payments must NOT be reactivated until Package #3.1A is completed, after the required answers are received from Tranzila support.**

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